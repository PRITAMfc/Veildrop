import type { WitnessContext } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { Ledger } from '../managed/veildrop/contract/index.js';

export type VeilDropPrivateState = {
  readonly reporterSecret: Uint8Array;
  readonly credentialSecret: Uint8Array;
};

export const createVeilDropPrivateState = (
  reporterSecret: Uint8Array,
  credentialSecret: Uint8Array,
): VeilDropPrivateState => ({
  reporterSecret,
  credentialSecret,
});

export const createWitnesses = () => ({
  reporterSecret: ({
    privateState,
  }: WitnessContext<Ledger, VeilDropPrivateState>): [VeilDropPrivateState, Uint8Array] => [
    privateState,
    privateState.reporterSecret,
  ],
  credentialSecret: ({
    privateState,
  }: WitnessContext<Ledger, VeilDropPrivateState>): [VeilDropPrivateState, Uint8Array] => [
    privateState,
    privateState.credentialSecret,
  ],
});
