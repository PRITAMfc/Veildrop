import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type MidnightWalletProvider } from './wallet.js';
import { type NetworkConfig } from './config.js';

export type VeilDropCircuitKeys =
  | 'proveAuthorization'
  | 'submitReport'
  | 'updateReportStatus';

export type VeilDropProviders = MidnightProviders<any>;

export function buildProviders(
  wallet: MidnightWalletProvider,
  zkConfigPath: string,
  config: NetworkConfig,
): VeilDropProviders {
  const zkConfigProvider = new NodeZkConfigProvider<VeilDropCircuitKeys>(zkConfigPath);
  return {
    privateStateProvider: levelPrivateStateProvider({
      midnightDbName: 'veildrop-test-db',
      privateStateStoreName: `veildrop-private-${Date.now()}`,
      signingKeyStoreName: `veildrop-signing-${Date.now()}`,
      privateStoragePasswordProvider: () => 'VeilDropTestPassword#2026',
      accountId: wallet.getCoinPublicKey(),
    }),
    publicDataProvider: indexerPublicDataProvider(
      config.indexer,
      config.indexerWS,
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(
      config.proofServer,
      zkConfigProvider,
    ),
    walletProvider: wallet,
    midnightProvider: wallet,
  };
}
