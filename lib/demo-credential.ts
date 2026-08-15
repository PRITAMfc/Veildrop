import { bytesToHex, hexToBytes } from './format';

export const DEMO_CREDENTIAL_SECRET_HEX =
  '7665696c64726f702d64656d6f2d63726564656e7469616c2d73656372657421';

export const DEMO_CREDENTIAL_SECRET: Uint8Array =
  hexToBytes(DEMO_CREDENTIAL_SECRET_HEX);

export const isDemoCredential = (credential: Uint8Array): boolean =>
  bytesToHex(credential) === DEMO_CREDENTIAL_SECRET_HEX;
