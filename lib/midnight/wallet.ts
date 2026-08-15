import semver from 'semver';
import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import '@midnight-ntwrk/dapp-connector-api';

export type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

const COMPATIBLE_CONNECTOR_API_VERSION = '4.x';

export function listWallets(): InitialAPI[] {
  if (typeof window === 'undefined' || !window.midnight) {
    return [];
  }
  return Object.values(window.midnight).filter(
    (wallet): wallet is InitialAPI =>
      !!wallet &&
      typeof wallet === 'object' &&
      'apiVersion' in wallet &&
      typeof (wallet as InitialAPI).connect === 'function' &&
      semver.satisfies((wallet as InitialAPI).apiVersion, COMPATIBLE_CONNECTOR_API_VERSION),
  );
}

export function getFirstCompatibleWallet(): InitialAPI | undefined {
  return listWallets()[0];
}
