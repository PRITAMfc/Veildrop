import { deployContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { asContractAddress } from '@midnight-ntwrk/midnight-js-types';
import { CompiledVeilDropContract } from '../../contract/src/index';
import { createVeilDropPrivateState } from '../../contract/src/witnesses';
import {
  Contract,
  ReportCategory,
  ReportStatus,
} from '../../contract/managed/veildrop/contract/index';
import type { ProofStage } from '../../types';
import type { VeilDropProviders } from './providers';

export const PRIVATE_STATE_ID = 'veildrop';

export type ProgressHandler = (stage: ProofStage) => void;

const idStage = (step: number, label: string, running = true): ProofStage => ({
  step,
  label,
  running,
});

export async function deployVeilDropContract(
  providers: VeilDropProviders,
  reporterSecret: Uint8Array,
  credentialSecret: Uint8Array,
  authorizedCredentialHash: Uint8Array,
  onProgress: ProgressHandler,
): Promise<string> {
  onProgress(idStage(1, 'Preparing contract deployment', true));
  const privateState = createVeilDropPrivateState(
    reporterSecret,
    credentialSecret,
  );
  onProgress(idStage(4, 'Building the deployment transaction', true));
  const deployed = await deployContract<Contract>(providers, {
    compiledContract: CompiledVeilDropContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: privateState,
    args: [authorizedCredentialHash],
  });
  const address = deployed.deployTxData.public.contractAddress;
  providers.privateStateProvider.setContractAddress(address);
  await providers.privateStateProvider.set(PRIVATE_STATE_ID, privateState);
  onProgress(idStage(5, 'Contract deployed', false));
  return address;
}

export type SubmitReportArgs = {
  readonly commitment: Uint8Array;
  readonly category: ReportCategory;
  readonly timestamp: bigint;
};

export async function submitVeilDropReport(
  providers: VeilDropProviders,
  contractAddress: string,
  reporterSecret: Uint8Array,
  credentialSecret: Uint8Array,
  args: SubmitReportArgs,
  onProgress: ProgressHandler,
): Promise<{ txId: string }> {
  const privateState = createVeilDropPrivateState(
    reporterSecret,
    credentialSecret,
  );
  providers.privateStateProvider.setContractAddress(asContractAddress(contractAddress));
  await providers.privateStateProvider.set(PRIVATE_STATE_ID, privateState);

  onProgress(idStage(1, 'Sealing your report with a one-way hash', true));
  onProgress(
    idStage(2, 'Proving you hold a valid reporter credential (zkSNARK)', true),
  );
  onProgress(
    idStage(3, 'Generating the zero-knowledge proof on the proof server', true),
  );

  const txData = await submitCallTx<Contract, 'submitReport'>(providers, {
    compiledContract: CompiledVeilDropContract,
    contractAddress: asContractAddress(contractAddress),
    privateStateId: PRIVATE_STATE_ID,
    circuitId: 'submitReport',
    args: [args.commitment, args.category, args.timestamp],
  });

  onProgress(idStage(4, 'Transaction balanced in your Lace wallet', false));
  onProgress(idStage(5, 'Report submitted to the Midnight network', false));
  return { txId: txData.public.txId };
}

export async function updateVeilDropReportStatus(
  providers: VeilDropProviders,
  contractAddress: string,
  reporterSecret: Uint8Array,
  credentialSecret: Uint8Array,
  reportId: bigint,
  newStatus: ReportStatus,
): Promise<{ txId: string }> {
  const privateState = createVeilDropPrivateState(
    reporterSecret,
    credentialSecret,
  );
  providers.privateStateProvider.setContractAddress(asContractAddress(contractAddress));
  await providers.privateStateProvider.set(PRIVATE_STATE_ID, privateState);
  const txData = await submitCallTx<Contract, 'updateReportStatus'>(providers, {
    compiledContract: CompiledVeilDropContract,
    contractAddress: asContractAddress(contractAddress),
    privateStateId: PRIVATE_STATE_ID,
    circuitId: 'updateReportStatus',
    args: [reportId, newStatus],
  });
  return { txId: txData.public.txId };
}
