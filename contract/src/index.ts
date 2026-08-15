import { CompiledContract } from '@midnight-ntwrk/compact-js';

export * as VeilDrop from '../managed/veildrop/contract/index.js';
export { createWitnesses, createVeilDropPrivateState } from './witnesses.js';
export type { VeilDropPrivateState } from './witnesses.js';

import * as VeilDropContract from '../managed/veildrop/contract/index.js';
import { createWitnesses } from './witnesses.js';

export const CompiledVeilDropContract = CompiledContract.make(
  'veildrop',
  VeilDropContract.Contract,
).pipe(
  CompiledContract.withWitnesses(createWitnesses()),
  CompiledContract.withCompiledFileAssets('./managed/veildrop'),
);
