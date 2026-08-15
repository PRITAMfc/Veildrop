'use client';

import { Buffer } from 'buffer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';
import type { ConnectedAPI, ConnectionStatus } from '@midnight-ntwrk/dapp-connector-api';
import { submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { asContractAddress } from '@midnight-ntwrk/midnight-js-types';
import { VeilDrop, CompiledVeilDropContract } from '../contract/src/index';
import { createVeilDropPrivateState } from '../contract/src/witnesses';
import {
  Contract,
  ReportCategory,
  ReportStatus,
} from '../contract/managed/veildrop/contract/index';
import { DEMO_CREDENTIAL_SECRET } from '../lib/demo-credential';
import { bytesToHex, hexToBytes, shorten } from '../lib/format';
import {
  computeReportCommitment,
  findOwnedReport,
  makeCommitmentSalt,
  storeReportSalts,
} from '../lib/midnight/commitment';
import {
  getEnvAuthorizedCredentialHash,
  getEnvContractAddress,
  getNetworkConfig,
} from '../lib/midnight/config';
import {
  deployVeilDropContract,
  PRIVATE_STATE_ID,
  submitVeilDropReport,
  updateVeilDropReportStatus,
} from '../lib/midnight/contract';
import { ledgerToReports, REPORT_CATEGORIES, REPORT_STATUSES } from '../lib/midnight/ledger';
import { buildBrowserProviders, type VeilDropProviders } from '../lib/midnight/providers';
import { withTimeout } from '../lib/midnight/timeout';
import { listWallets } from '../lib/midnight/wallet';
import { getFirstCompatibleWallet } from '../lib/midnight/wallet';
import type {
  ProofStage,
  ReportCategoryId,
  ReportInput,
  ReportStatusId,
  ReportView,
  SubmitOutcome,
} from '../types';
import { VeilDropContext, type CredentialCheck } from './wallet-context';

if (typeof globalThis !== 'undefined' && !(globalThis as { Buffer?: unknown }).Buffer) {
  (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}

const SECRET_KEY = 'veildrop:reporter-secret';
const CONTRACT_KEY = 'veildrop:contract-address';

const toMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const CONNECT_TIMEOUT_MS = 30_000;
const STATUS_POLL_TIMEOUT_MS = 20_000;
const PROVIDERS_TIMEOUT_MS = 30_000;
const ADDRESS_TIMEOUT_MS = 10_000;

/**
 * Waits until the wallet reports an established connection to the expected
 * network. Polls `getConnectionStatus()` because the wallet may need a moment
 * to flip to "connected" after the user approves the popup, and nudges Lace
 * with `hintUsage()` once so it surfaces a permission prompt if none appeared.
 */
const waitForWalletConnection = async (
  api: ConnectedAPI,
  expectedNetworkId: string,
  networkLabel: string,
): Promise<void> => {
  const deadline = Date.now() + STATUS_POLL_TIMEOUT_MS;
  let hintAttempted = false;
  let lastStatus: ConnectionStatus | null = null;
  while (Date.now() < deadline) {
    const remaining = Math.max(1_000, deadline - Date.now());
    const status = await withTimeout(
      api.getConnectionStatus(),
      Math.min(5_000, remaining),
      'Connection status check',
    );
    lastStatus = status;
    if (status.status === 'connected') {
      if (status.networkId !== expectedNetworkId) {
        throw new Error(
          `Network ID mismatch: DApp expects "${expectedNetworkId}", but your wallet is connected to "${status.networkId}". Open Lace and switch to ${networkLabel}, then retry.`,
        );
      }
      return;
    }
    if (!hintAttempted && typeof api.hintUsage === 'function') {
      hintAttempted = true;
      try {
        console.info('[VeilDrop] Requesting wallet permissions');
        await withTimeout(
          api.hintUsage(['getUnshieldedAddress', 'getConfiguration']),
          5_000,
          'Wallet permission prompt',
        );
      } catch {
        // hintUsage is optional; some wallets reject when no prompt is pending.
      }
    }
    await sleep(750);
  }
  console.error('[VeilDrop] Wallet never reported connected. Last status:', lastStatus);
  throw new Error(
    `Wallet connection was not established in time. Make sure Lace is unlocked, is on the ${networkLabel} network, and approve the connection popup when it appears, then try again.`,
  );
};

const getOrCreateReporterSecret = (): Uint8Array => {
  const stored = window.localStorage.getItem(SECRET_KEY);
  if (stored && stored.length === 64) {
    return hexToBytes(stored);
  }
  const secret = crypto.getRandomValues(new Uint8Array(32));
  window.localStorage.setItem(SECRET_KEY, bytesToHex(secret));
  return secret;
};

const resolveContractAddress = (): string | null => {
  const envAddress = getEnvContractAddress();
  if (envAddress) return envAddress;
  return window.localStorage.getItem(CONTRACT_KEY);
};

const categoryToEnum = (id: ReportCategoryId): ReportCategory =>
  REPORT_CATEGORIES.find((c) => c.id === id)?.enum ?? ReportCategory.OTHER;

const statusToEnum = (id: ReportStatusId): ReportStatus =>
  REPORT_STATUSES.find((s) => s.id === id)?.enum ?? ReportStatus.REGISTERED;

const getAuthorizedCredentialHash = (): Uint8Array => {
  const envHash = getEnvAuthorizedCredentialHash();
  if (envHash) return hexToBytes(envHash);
  return VeilDrop.pureCircuits.credentialCommitment(DEMO_CREDENTIAL_SECRET);
};

const idleProof: ProofStage = { step: 1, label: 'Idle', running: false };

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const network = useMemo(() => getNetworkConfig(), []);

  const [walletStatus, setWalletStatus] = useState<
    'detecting' | 'no-wallet' | 'ready' | 'connecting' | 'connected'
  >('detecting');
  const [walletError, setWalletError] = useState<string | null>(null);
  const [connectingStep, setConnectingStep] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<
    'idle' | 'connecting' | 'deploying' | 'deployed' | 'failed'
  >('idle');
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [contractAddress, setContractAddressState] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportView[]>([]);
  const [reportsStatus, setReportsStatus] = useState<
    'idle' | 'loading' | 'loaded' | 'error'
  >('idle');
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [proofStage, setProofStage] = useState<ProofStage>(idleProof);
  const [pseudonym, setPseudonym] = useState<string | null>(null);

  const providersRef = useRef<VeilDropProviders | null>(null);
  const connectedApiRef = useRef<ConnectedAPI | null>(null);
  const contractAddressRef = useRef<string | null>(null);
  const reportsSubRef = useRef<Subscription | null>(null);
  const reporterSecretRef = useRef<Uint8Array | null>(null);
  const credentialSecretRef = useRef<Uint8Array>(DEMO_CREDENTIAL_SECRET);

  const setContractAddress = useCallback((value: string | null) => {
    contractAddressRef.current = value;
    setContractAddressState(value);
  }, []);

  const startReports = useCallback((address: string) => {
    reportsSubRef.current?.unsubscribe();
    setReportsStatus('loading');
    setReportsError(null);
    const { indexerUri, indexerWsUri } = network;
    const publicDataProvider = indexerPublicDataProvider(indexerUri, indexerWsUri);
    const subscription = publicDataProvider
      .contractStateObservable(asContractAddress(address), { type: 'latest' })
      .subscribe({
        next: (state) => {
          try {
            const ledger = VeilDrop.ledger(state.data);
            setReports(ledgerToReports(ledger));
            setReportsStatus('loaded');
          } catch (err) {
            setReportsError(toMessage(err));
            setReportsStatus('error');
          }
        },
        error: (err) => {
          setReportsError(toMessage(err));
          setReportsStatus('error');
        },
      });
    reportsSubRef.current = subscription;
  }, [network]);

  useEffect(() => {
    reporterSecretRef.current = getOrCreateReporterSecret();
    try {
      const p = VeilDrop.pureCircuits.reporterPseudonym(reporterSecretRef.current);
      setPseudonym(shorten(bytesToHex(p), 10, 8));
    } catch {
      setPseudonym(null);
    }
    const wallets = listWallets();
    if (wallets.length === 0) {
      if (typeof window !== 'undefined' && !window.midnight) {
        setWalletError('No Midnight wallet detected. Install the Lace browser extension, enable Midnight, and refresh.');
      } else if (typeof window !== 'undefined' && window.midnight) {
        const installed = Object.values(window.midnight).filter(
          (w) => w && typeof w === 'object' && typeof (w as { connect?: unknown }).connect === 'function',
        );
        const versions = installed
          .map((w) => (w as { apiVersion?: string }).apiVersion)
          .filter(Boolean);
        setWalletError(
          `Midnight wallet detected, but version is incompatible. Detected API versions: ${versions.join(', ') || 'unknown'}. Expected 4.x. Please update Lace.`,
        );
      }
      setWalletStatus('no-wallet');
    } else {
      setWalletStatus('ready');
      setWalletError(null);
    }
    const existing = resolveContractAddress();
    if (existing) {
      setContractAddress(existing);
      startReports(existing);
    }
    return () => reportsSubRef.current?.unsubscribe();
  }, [network, setContractAddress, startReports]);

  const connectWallet = useCallback(async () => {
    setWalletStatus('connecting');
    setWalletError(null);
    setConnectingStep('Waiting for approval in the Lace popup…');
    try {
      const initial = getFirstCompatibleWallet();
      if (!initial) {
        console.error('[VeilDrop] No compatible wallet found. window.midnight=', window.midnight);
        throw new Error(
          'No Midnight Lace wallet detected. Install the Lace browser extension, enable Midnight, and refresh.',
        );
      }
      console.info('[VeilDrop] Connecting wallet', initial.name, 'apiVersion=', initial.apiVersion, 'network=', network.networkId);
      setNetworkId(network.networkId);
      let api: ConnectedAPI;
      try {
        api = await withTimeout(
          initial.connect(network.networkId),
          CONNECT_TIMEOUT_MS,
          'Wallet connection',
        );
      } catch (err) {
        console.error('[VeilDrop] Wallet connect failed', err);
        const message = toMessage(err).toLowerCase();
        if (
          message.includes('network id mismatch') ||
          message.includes('network mismatch') ||
          message.includes('different network')
        ) {
          throw new Error(
            `Network ID mismatch: DApp expects "${network.networkId}", but your wallet is on a different network. Open Lace and switch to ${network.label}, then retry.`,
          );
        }
        throw err;
      }
      console.info('[VeilDrop] Connected, checking status');
      connectedApiRef.current = api;
      setConnectingStep('Verifying wallet connection…');
      await waitForWalletConnection(api, network.networkId, network.label);

      setConnectingStep('Initializing contract providers…');
      const providers = await withTimeout(
        buildBrowserProviders(api),
        PROVIDERS_TIMEOUT_MS,
        'Building wallet providers',
      );
      providersRef.current = providers;
      console.info('[VeilDrop] Fetching unshielded address');
      setConnectingStep('Fetching your wallet address…');
      const { unshieldedAddress } = await withTimeout(
        api.getUnshieldedAddress(),
        ADDRESS_TIMEOUT_MS,
        'Fetching wallet address',
      );
      console.info('[VeilDrop] Wallet connected successfully', unshieldedAddress);
      setAddress(unshieldedAddress);
      setWalletStatus('connected');
      setConnectingStep(null);
      const existing = resolveContractAddress();
      if (existing) {
        setContractAddress(existing);
        startReports(existing);
        setDeploymentStatus('deployed');
      } else {
        setDeploymentStatus('idle');
      }
    } catch (err) {
      console.error('[VeilDrop] Connection error', err);
      setWalletError(toMessage(err));
      setWalletStatus('ready');
      setConnectingStep(null);
    }
  }, [network, setContractAddress, startReports]);

  const disconnectWallet = useCallback(() => {
    connectedApiRef.current = null;
    providersRef.current = null;
    setAddress(null);
    setConnectingStep(null);
    setWalletStatus(getFirstCompatibleWallet() ? 'ready' : 'no-wallet');
    setDeploymentStatus('idle');
  }, []);

  const deployNewContract = useCallback(async () => {
    const providers = providersRef.current;
    if (!providers) {
      setDeploymentError('Connect your wallet first.');
      setDeploymentStatus('failed');
      return;
    }
    setDeploymentStatus('deploying');
    setDeploymentError(null);
    try {
      const authorizedCredentialHash = getAuthorizedCredentialHash();
      const address = await deployVeilDropContract(
        providers,
        reporterSecretRef.current ?? crypto.getRandomValues(new Uint8Array(32)),
        credentialSecretRef.current,
        authorizedCredentialHash,
        setProofStage,
      );
      window.localStorage.setItem(CONTRACT_KEY, address);
      setContractAddress(address);
      setDeploymentStatus('deployed');
      startReports(address);
    } catch (err) {
      setDeploymentError(toMessage(err));
      setDeploymentStatus('failed');
    }
  }, [setContractAddress, startReports]);

  const submitReport = useCallback(
    async (input: ReportInput): Promise<SubmitOutcome> => {
      const providers = providersRef.current;
      const address = contractAddressRef.current;
      if (!providers || !address) {
        return { ok: false, error: 'Connect your wallet and a contract first.' };
      }
      try {
        const saltHex = makeCommitmentSalt();
        const createdAt = Date.now();
        const commitment = await computeReportCommitment({
          title: input.title,
          description: input.description,
          category: input.category,
          saltHex,
          createdAt,
        });
        const tx = await submitVeilDropReport(
          providers,
          address,
          reporterSecretRef.current ?? crypto.getRandomValues(new Uint8Array(32)),
          credentialSecretRef.current,
          {
            commitment: hexToBytes(commitment),
            category: categoryToEnum(input.category),
            timestamp: BigInt(createdAt),
          },
          setProofStage,
        );
        storeReportSalts({
          commitment,
          title: input.title,
          description: input.description,
          category: input.category,
          saltHex,
          createdAt,
        });
        window.setTimeout(() => startReports(address), 5000);
        return { ok: true, commitment, txId: tx.txId };
      } catch (err) {
        const message = toMessage(err);
        setProofStage({
          step: 3,
          label: 'Proof generation failed',
          running: false,
          error: message,
        });
        return { ok: false, error: message };
      }
    },
    [startReports],
  );

  const updateStatus = useCallback(
    async (reportId: string, status: ReportStatusId): Promise<SubmitOutcome> => {
      const providers = providersRef.current;
      const address = contractAddressRef.current;
      if (!providers || !address) {
        return { ok: false, error: 'Connect your wallet and a contract first.' };
      }
      try {
        await updateVeilDropReportStatus(
          providers,
          address,
          reporterSecretRef.current ?? crypto.getRandomValues(new Uint8Array(32)),
          credentialSecretRef.current,
          BigInt(reportId),
          statusToEnum(status),
        );
        window.setTimeout(() => startReports(address), 5000);
        return { ok: true, reportId };
      } catch (err) {
        return { ok: false, error: toMessage(err) };
      }
    },
    [startReports],
  );

  const verifyCredential = useCallback(async (): Promise<CredentialCheck> => {
    const providers = providersRef.current;
    const address = contractAddressRef.current;
    if (!providers || !address) {
      return {
        ok: false,
        pseudonym: '',
        error: 'Connect your wallet and a contract first.',
      };
    }
    try {
      const privateState = createVeilDropPrivateState(
        reporterSecretRef.current ?? crypto.getRandomValues(new Uint8Array(32)),
        credentialSecretRef.current,
      );
      providers.privateStateProvider.setContractAddress(asContractAddress(address));
      await providers.privateStateProvider.set(PRIVATE_STATE_ID, privateState);
      await submitCallTx<Contract, 'proveAuthorization'>(providers, {
        compiledContract: CompiledVeilDropContract,
        contractAddress: asContractAddress(address),
        privateStateId: PRIVATE_STATE_ID,
        circuitId: 'proveAuthorization',
      });
      const rawPseudonym = VeilDrop.pureCircuits.reporterPseudonym(
        reporterSecretRef.current ?? crypto.getRandomValues(new Uint8Array(32)),
      );
      return { ok: true, pseudonym: shorten(bytesToHex(rawPseudonym), 10, 8) };
    } catch (err) {
      return { ok: false, pseudonym: '', error: toMessage(err) };
    }
  }, []);

  const isOwnedReport = useCallback(
    (commitment: string): boolean => findOwnedReport(commitment) !== undefined,
    [],
  );

  const value = useMemo(
    () => ({
      networkLabel: network.label,
      networkId: network.networkId,
      walletStatus,
      walletError,
      connectingStep,
      address,
      connectWallet,
      disconnectWallet,
      deploymentStatus,
      deploymentError,
      contractAddress,
      deployNewContract,
      reports,
      reportsStatus,
      reportsError,
      isOwnedReport,
      submitReport,
      proofStage,
      updateStatus,
      verifyCredential,
      pseudonym,
    }),
    [
      network,
      walletStatus,
      walletError,
      connectingStep,
      address,
      connectWallet,
      disconnectWallet,
      deploymentStatus,
      deploymentError,
      contractAddress,
      deployNewContract,
      reports,
      reportsStatus,
      reportsError,
      isOwnedReport,
      submitReport,
      proofStage,
      updateStatus,
      verifyCredential,
      pseudonym,
    ],
  );

  return (
    <VeilDropContext.Provider value={value}>
      {children}
    </VeilDropContext.Provider>
  );
}
