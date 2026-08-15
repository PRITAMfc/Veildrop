import type {
  ConnectedAPI,
  InitialAPI,
} from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type Binding,
  type FinalizedTransaction,
  type Proof,
  SignatureEnabled,
  type Transaction as LedgerTransaction,
  Transaction,
  type TransactionId,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  MidnightProviders,
  UnboundTransaction,
} from '@midnight-ntwrk/midnight-js-types';
import type { VeilDropPrivateState } from '../../contract/src/witnesses';
import { inMemoryPrivateStateProvider } from './in-memory-private-state-provider';
import { getVeilDropNetworkId } from './config';

export type VeilDropCircuitKeys =
  | 'proveAuthorization'
  | 'submitReport'
  | 'updateReportStatus';

export type VeilDropProviders = MidnightProviders<
  VeilDropCircuitKeys,
  string,
  VeilDropPrivateState
>;

/**
 * A read-only public data provider for querying ledger state without a wallet.
 */
export const createReadOnlyPublicDataProvider = () =>
  indexerPublicDataProvider(
    getVeilDropNetworkId() === 'preprod'
      ? 'https://indexer.preprod.midnight.network/api/v4/graphql'
      : 'http://127.0.0.1:8088/api/v4/graphql',
    getVeilDropNetworkId() === 'preprod'
      ? 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws'
      : 'ws://127.0.0.1:8088/api/v4/graphql/ws',
  );

/**
 * Builds the full set of providers used to submit and deploy transactions,
 * wiring the connected Lace wallet as both the balancing and submission layer.
 */
export async function buildBrowserProviders(
  connectedAPI: ConnectedAPI,
): Promise<VeilDropProviders> {
  const config = await connectedAPI.getConfiguration();
  const proofServerUri = config.proverServerUri;
  if (!proofServerUri) {
    throw new Error(
      'Your Lace wallet has no proof server configured. Point it at a local proof server on http://localhost:6300.',
    );
  }
  const shieldedAddresses = await connectedAPI.getShieldedAddresses();
  const zkConfigProvider = new FetchZkConfigProvider<VeilDropCircuitKeys>(
    window.location.origin,
    fetch.bind(window),
  );

  return {
    privateStateProvider: inMemoryPrivateStateProvider(),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(proofServerUri, zkConfigProvider),
    publicDataProvider: indexerPublicDataProvider(
      config.indexerUri,
      config.indexerWsUri,
    ),
    walletProvider: {
      getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () =>
        shieldedAddresses.shieldedEncryptionPublicKey,
      balanceTx: async (
        tx: UnboundTransaction,
      ): Promise<FinalizedTransaction> => {
        const received = await connectedAPI.balanceUnsealedTransaction(
          toHex(tx.serialize()),
        );
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          'signature',
          'proof',
          'binding',
          fromHex(received.tx),
        );
      },
    },
    midnightProvider: {
      submitTx: async (tx: LedgerTransaction<SignatureEnabled, Proof, Binding>): Promise<TransactionId> => {
        await connectedAPI.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  };
}

export type { ConnectedAPI, InitialAPI };
