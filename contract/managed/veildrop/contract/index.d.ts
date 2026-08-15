import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum ReportStatus { REGISTERED = 0, UNDER_INVESTIGATION = 1, RESOLVED = 2
}

export enum ReportCategory { FINANCIAL = 0,
                             GOVERNMENT = 1,
                             ENVIRONMENTAL = 2,
                             HEALTH = 3,
                             OTHER = 4
}

export type ReportEntry = { commitment: Uint8Array;
                            category: ReportCategory;
                            status: ReportStatus;
                            pseudonym: Uint8Array;
                            timestamp: bigint
                          };

export type Witnesses<PS> = {
  reporterSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  credentialSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  proveAuthorization(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  submitReport(context: __compactRuntime.CircuitContext<PS>,
               commitment_0: Uint8Array,
               category_0: ReportCategory,
               timestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  updateReportStatus(context: __compactRuntime.CircuitContext<PS>,
                     reportId_0: bigint,
                     newStatus_0: ReportStatus): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  proveAuthorization(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  submitReport(context: __compactRuntime.CircuitContext<PS>,
               commitment_0: Uint8Array,
               category_0: ReportCategory,
               timestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  updateReportStatus(context: __compactRuntime.CircuitContext<PS>,
                     reportId_0: bigint,
                     newStatus_0: ReportStatus): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  reporterPseudonym(sk_0: Uint8Array): Uint8Array;
  credentialCommitment(credential_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  reporterPseudonym(context: __compactRuntime.CircuitContext<PS>,
                    sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  credentialCommitment(context: __compactRuntime.CircuitContext<PS>,
                       credential_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  proveAuthorization(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  submitReport(context: __compactRuntime.CircuitContext<PS>,
               commitment_0: Uint8Array,
               category_0: ReportCategory,
               timestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  updateReportStatus(context: __compactRuntime.CircuitContext<PS>,
                     reportId_0: bigint,
                     newStatus_0: ReportStatus): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly authorizedCredentialHash: Uint8Array;
  readonly nextReportId: bigint;
  reports: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): ReportEntry;
    [Symbol.iterator](): Iterator<[bigint, ReportEntry]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               _authorizedCredentialHash_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
