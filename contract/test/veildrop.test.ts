import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomBytes } from 'node:crypto';
import pino from 'pino';
import {
  submitCallTx,
  deployContract,
  type DeployedContract,
} from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type EnvironmentConfiguration, waitForFunds } from '@midnight-ntwrk/testkit-js';
import { getConfig } from './config.js';
import { MidnightWalletProvider, type WalletSecret } from './wallet.js';
import { buildProviders, type VeilDropProviders } from './providers.js';
import {
  CompiledVeilDropContract,
  VeilDrop,
} from '../src/index.js';
import { createVeilDropPrivateState } from '../src/witnesses.js';
import {
  ReportStatus,
  ReportCategory,
  Contract,
} from '../managed/veildrop/contract/index.js';
import type { FinalizedCallTxData } from '@midnight-ntwrk/midnight-js-contracts';

const ALICE_SEED = '0000000000000000000000000000000000000000000000000000000000000001';
const MALLORY_SEED = '0000000000000000000000000000000000000000000000000000000000000002';

const ALICE_PRIVATE_ID = 'alicePrivateState';
const MALLORY_PRIVATE_ID = 'malloryPrivateState';

// Demo credential used to authorize reporters. This is a public, shared demo
// value: the circuit proves knowledge of it without ever publishing it.
const VALID_CREDENTIAL = new Uint8Array(32).fill(7);
const WRONG_CREDENTIAL = new Uint8Array(32).fill(9);

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: { target: 'pino-pretty' },
});

const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

describe('VeilDrop Smart Contract via midnight-js', async () => {
  let aliceWallet: MidnightWalletProvider;
  let malloryWallet: MidnightWalletProvider;
  let aliceProviders: VeilDropProviders;
  let malloryProviders: VeilDropProviders;
  let contractAddress: ContractAddress;

  const config = getConfig();
  const aliceSk = randomBytes(32);
  const mallorySk = randomBytes(32);
  const authorizedCredentialHash = VeilDrop.pureCircuits.credentialCommitment(VALID_CREDENTIAL);
  const alicePseudonym = VeilDrop.pureCircuits.reporterPseudonym(aliceSk);

  async function queryLedger(providers: VeilDropProviders) {
    const state = await providers.publicDataProvider.queryContractState(contractAddress);
    expect(state).not.toBeNull();
    return VeilDrop.ledger(state!.data);
  }

  beforeAll(async () => {
    setNetworkId(config.networkId);
    const envConfig: EnvironmentConfiguration = {
      walletNetworkId: config.networkId,
      networkId: config.networkId,
      indexer: config.indexer,
      indexerWS: config.indexerWS,
      node: config.node,
      nodeWS: config.nodeWS,
      faucet: config.faucet,
      proofServer: config.proofServer,
    };
    aliceWallet = await MidnightWalletProvider.build(logger, envConfig, ALICE_SEED);
    await aliceWallet.start();
    await waitForFunds(aliceWallet.wallet, envConfig, false, aliceWallet.unshieldedKeystore);
    malloryWallet = await MidnightWalletProvider.build(logger, envConfig, MALLORY_SEED);
    await malloryWallet.start();
    await waitForFunds(malloryWallet.wallet, envConfig, false, malloryWallet.unshieldedKeystore);
    aliceProviders = buildProviders(aliceWallet, './contract/managed/veildrop', config);
    malloryProviders = buildProviders(malloryWallet, './contract/managed/veildrop', config);
    logger.info('Providers initialized, ready to test.');
  });

  afterAll(async () => {
    if (aliceWallet) {
      logger.info('Stopping aliceWallet...');
      await aliceWallet.stop();
    }
    if (malloryWallet) {
      logger.info('Stopping malloryWallet...');
      await malloryWallet.stop();
    }
  });

  it('deploys the contract with the authorized credential commitment', async () => {
    const alicePrivateState = createVeilDropPrivateState(aliceSk, VALID_CREDENTIAL);
    const deployed: DeployedContract<Contract> = await deployContract<Contract>(
      aliceProviders,
      {
        compiledContract: CompiledVeilDropContract,
        privateStateId: ALICE_PRIVATE_ID,
        initialPrivateState: alicePrivateState,
        args: [authorizedCredentialHash],
      },
    );
    contractAddress = deployed.deployTxData.public.contractAddress;
    aliceProviders.privateStateProvider.setContractAddress(contractAddress);
    await aliceProviders.privateStateProvider.set(ALICE_PRIVATE_ID, alicePrivateState);
    logger.info(`Contract deployed at: ${contractAddress}`);
    expect(contractAddress).toBeDefined();
    expect(contractAddress.length).toBeGreaterThan(0);

    const state = await queryLedger(aliceProviders);
    expect(bytesToHex(state.authorizedCredentialHash)).toEqual(
      bytesToHex(authorizedCredentialHash),
    );
    expect(state.nextReportId).toEqual(0n);
    expect(state.reports.size()).toEqual(0n);
  });

  it('proves authorization with a valid credential without revealing it', async () => {
    const txData: FinalizedCallTxData<Contract, 'proveAuthorization'> =
      await submitCallTx<Contract, 'proveAuthorization'>(aliceProviders, {
        compiledContract: CompiledVeilDropContract,
        contractAddress,
        privateStateId: ALICE_PRIVATE_ID,
        circuitId: 'proveAuthorization',
      });
    logger.info('Alice proved authorization.');
    expect(txData).toBeDefined();

    // The ledger must not contain the raw credential bytes anywhere.
    const state = await queryLedger(aliceProviders);
    const ledgerHex = JSON.stringify({
      authorizedCredentialHash: bytesToHex(state.authorizedCredentialHash),
    });
    expect(ledgerHex).not.toContain(bytesToHex(VALID_CREDENTIAL));
  });

  it('rejects a report from a reporter with an invalid credential', async () => {
    const malloryPrivateState = createVeilDropPrivateState(mallorySk, WRONG_CREDENTIAL);
    malloryProviders.privateStateProvider.setContractAddress(contractAddress);
    await malloryProviders.privateStateProvider.set(MALLORY_PRIVATE_ID, malloryPrivateState);

    await expect(async () => {
      await submitCallTx<Contract, 'submitReport'>(malloryProviders, {
        compiledContract: CompiledVeilDropContract,
        contractAddress,
        privateStateId: MALLORY_PRIVATE_ID,
        circuitId: 'submitReport',
        args: [randomBytes(32), ReportCategory.FINANCIAL, 1n],
      });
    }).rejects.toThrow();
    logger.info('Mallory (invalid credential) was rejected.');

    const state = await queryLedger(aliceProviders);
    expect(state.reports.size()).toEqual(0n);
  });

  it('registers a report commitment after authorization', async () => {
    const commitment = randomBytes(32);
    const timestamp = BigInt(Date.now());
    const txData: FinalizedCallTxData<Contract, 'submitReport'> =
      await submitCallTx<Contract, 'submitReport'>(aliceProviders, {
        compiledContract: CompiledVeilDropContract,
        contractAddress,
        privateStateId: ALICE_PRIVATE_ID,
        circuitId: 'submitReport',
        args: [commitment, ReportCategory.GOVERNMENT, timestamp],
      });
    logger.info('Alice registered a report commitment.');
    expect(txData).toBeDefined();

    const state = await queryLedger(aliceProviders);
    expect(state.nextReportId).toEqual(1n);
    expect(state.reports.size()).toEqual(1n);
    const [reportId, entry] = state.reports[Symbol.iterator]().next().value as [
      bigint,
      { commitment: Uint8Array; category: ReportCategory; status: ReportStatus; pseudonym: Uint8Array; timestamp: bigint },
    ];
    expect(reportId).toEqual(1n);
    expect(bytesToHex(entry.commitment)).toEqual(bytesToHex(commitment));
    expect(entry.category).toEqual(ReportCategory.GOVERNMENT);
    expect(entry.status).toEqual(ReportStatus.REGISTERED);
    expect(bytesToHex(entry.pseudonym)).toEqual(bytesToHex(alicePseudonym));
    expect(entry.timestamp).toEqual(timestamp);
  });

  it('keeps the raw credential out of the public ledger', async () => {
    const state = await queryLedger(aliceProviders);
    const serialized = JSON.stringify(state);
    expect(serialized).not.toContain(bytesToHex(VALID_CREDENTIAL));
    expect(serialized).not.toContain(bytesToHex(aliceSk));
  });

  it('allows a second authorized reporter to register a report', async () => {
    const bobSeed: WalletSecret = '0000000000000000000000000000000000000000000000000000000000000003';
    const envConfig: EnvironmentConfiguration = {
      walletNetworkId: config.networkId,
      networkId: config.networkId,
      indexer: config.indexer,
      indexerWS: config.indexerWS,
      node: config.node,
      nodeWS: config.nodeWS,
      faucet: config.faucet,
      proofServer: config.proofServer,
    };
    const bobWallet = await MidnightWalletProvider.build(logger, envConfig, bobSeed);
    await bobWallet.start();
    await waitForFunds(bobWallet.wallet, envConfig, false, bobWallet.unshieldedKeystore);
    const bobProviders = buildProviders(bobWallet, './contract/managed/veildrop', config);

    const bobSk = randomBytes(32);
    const bobPrivateState = createVeilDropPrivateState(bobSk, VALID_CREDENTIAL);
    bobProviders.privateStateProvider.setContractAddress(contractAddress);
    await bobProviders.privateStateProvider.set('bobPrivateState', bobPrivateState);

    const bobPseudonym = VeilDrop.pureCircuits.reporterPseudonym(bobSk);
    await submitCallTx<Contract, 'submitReport'>(bobProviders, {
      compiledContract: CompiledVeilDropContract,
      contractAddress,
      privateStateId: 'bobPrivateState',
      circuitId: 'submitReport',
      args: [randomBytes(32), ReportCategory.ENVIRONMENTAL, BigInt(Date.now())],
    });
    logger.info('Bob (valid credential, distinct secret) registered a report.');

    const state = await queryLedger(aliceProviders);
    expect(state.nextReportId).toEqual(2n);
    expect(state.reports.size()).toEqual(2n);
    const entries = [...state.reports];
    const aliceEntry = entries.find(([id]) => id === 1n)![1];
    const bobEntry = entries.find(([id]) => id === 2n)![1];
    expect(bytesToHex(aliceEntry.pseudonym)).toEqual(bytesToHex(alicePseudonym));
    expect(bytesToHex(bobEntry.pseudonym)).toEqual(bytesToHex(bobPseudonym));
    expect(aliceEntry.category).toEqual(ReportCategory.GOVERNMENT);
    expect(bobEntry.category).toEqual(ReportCategory.ENVIRONMENTAL);
    await bobWallet.stop();
  });

  it('updates a report status publicly without exposing identity', async () => {
    await submitCallTx<Contract, 'updateReportStatus'>(aliceProviders, {
      compiledContract: CompiledVeilDropContract,
      contractAddress,
      privateStateId: ALICE_PRIVATE_ID,
      circuitId: 'updateReportStatus',
      args: [1n, ReportStatus.UNDER_INVESTIGATION],
    });
    logger.info('Report #1 status updated to UNDER_INVESTIGATION.');

    const state = await queryLedger(aliceProviders);
    const entry = state.reports.lookup(1n);
    expect(entry.status).toEqual(ReportStatus.UNDER_INVESTIGATION);
    // Identity fields remain untouched.
    expect(entry.pseudonym.length).toEqual(32);
    expect(bytesToHex(entry.commitment)).not.toEqual(bytesToHex(aliceSk));
  });

  it('rejects a status update for a nonexistent report', async () => {
    await expect(async () => {
      await submitCallTx<Contract, 'updateReportStatus'>(aliceProviders, {
        compiledContract: CompiledVeilDropContract,
        contractAddress,
        privateStateId: ALICE_PRIVATE_ID,
        circuitId: 'updateReportStatus',
        args: [99n, ReportStatus.RESOLVED],
      });
    }).rejects.toThrow();
    logger.info('Status update for a nonexistent report was rejected.');
  });
});
