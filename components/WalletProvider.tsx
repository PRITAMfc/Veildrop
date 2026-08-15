'use client';

import { Buffer } from 'buffer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
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
    const wallet = getFirstCompatibleWallet();
    setWalletStatus(wallet ? 'ready' : 'no-wallet');
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
    try {
      const initial = getFirstCompatibleWallet();
      if (!initial) {
        throw new Error(
          'No Midnight Lace wallet detected. Install the Lace browser extension, enable Midnight, and refresh.',
        );
      }
      setNetworkId(network.networkId);
      let api;
      try {
        api = await initial.connect(network.networkId);
      } catch (err) {
        const message = toMessage(err);
        if (message.toLowerCase().includes('network id mismatch')) {
          throw new Error(
            `Network ID mismatch: DApp expects "${network.networkId}", but your wallet is on a different network. Open Lace and switch to Midnight ${network.label}, then retry.`,
          );
        }
        throw err;
      }
      const connectionStatus = await api.getConnectionStatus();
      if (connectionStatus.status !== 'connected') {
        throw new Error('Wallet connection was not established.');
      }
      if (connectionStatus.networkId !== network.networkId) {
        throw new Error(
          `Network ID mismatch: DApp expects "${network.networkId}", but wallet is connected to "${connectionStatus.networkId}". Open Lace and switch to Midnight ${network.label}.`,
        );
      }
      connectedApiRef.current = api;
      const providers = await buildBrowserProviders(api);
      providersRef.current = providers;
      const { unshieldedAddress } = await api.getUnshieldedAddress();
      setAddress(unshieldedAddress);
      setWalletStatus('connected');
      const existing = resolveContractAddress();
      if (existing) {
        setContractAddress(existing);
        startReports(existing);
        setDeploymentStatus('deployed');
      } else {
        setDeploymentStatus('idle');
      }
    } catch (err) {
      setWalletError(toMessage(err));
      setWalletStatus('ready');
    }
  }, [network, setContractAddress, startReports]);

  const disconnectWallet = useCallback(() => {
    connectedApiRef.current = null;
    providersRef.current = null;
    setAddress(null);
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
