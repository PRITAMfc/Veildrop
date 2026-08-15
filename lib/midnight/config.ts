export type VeilDropNetworkId = 'preprod' | 'undeployed';

export type VeilDropNetworkConfig = {
  readonly id: VeilDropNetworkId;
  readonly label: string;
  readonly networkId: string;
  readonly indexerUri: string;
  readonly indexerWsUri: string;
  readonly nodeUri: string;
  readonly explorerUrl?: string;
};

export const NETWORKS: Record<VeilDropNetworkId, VeilDropNetworkConfig> = {
  preprod: {
    id: 'preprod',
    label: 'Midnight Preprod',
    networkId: 'preprod',
    indexerUri: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWsUri: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    nodeUri: 'https://rpc.preprod.midnight.network',
    explorerUrl: 'https://explorer.1am.xyz/?network=preprod',
  },
  undeployed: {
    id: 'undeployed',
    label: 'Midnight Local Devnet',
    networkId: 'undeployed',
    indexerUri: 'http://127.0.0.1:8088/api/v4/graphql',
    indexerWsUri: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
    nodeUri: 'http://127.0.0.1:9944',
  },
};

export const getVeilDropNetworkId = (): VeilDropNetworkId => {
  const configured = process.env.NEXT_PUBLIC_VEILDROP_NETWORK_ID ?? 'preprod';
  return configured === 'undeployed' ? 'undeployed' : 'preprod';
};

export const getNetworkConfig = (): VeilDropNetworkConfig =>
  NETWORKS[getVeilDropNetworkId()];

export const getEnvContractAddress = (): string =>
  (process.env.NEXT_PUBLIC_VEILDROP_CONTRACT_ADDRESS ?? '').trim();

export const getEnvAuthorizedCredentialHash = (): string =>
  (process.env.NEXT_PUBLIC_VEILDROP_AUTHORIZED_CREDENTIAL_HASH ?? '').trim();

export const getExplorerUrl = (): string | undefined =>
  process.env.NEXT_PUBLIC_VEILDROP_EXPLORER_URL ||
  getNetworkConfig().explorerUrl;
