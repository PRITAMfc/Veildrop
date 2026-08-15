'use client';

import { createContext, useContext } from 'react';
import type {
  DeploymentStatus,
  ProofStage,
  ReportInput,
  ReportStatusId,
  ReportView,
  SubmitOutcome,
  WalletStatus,
} from '../types';

export type CredentialCheck = {
  readonly ok: boolean;
  readonly pseudonym: string;
  readonly error?: string;
};

export type VeilDropContextValue = {
  readonly networkLabel: string;
  readonly networkId: string;
  readonly walletStatus: WalletStatus;
  readonly walletError: string | null;
  readonly connectingStep: string | null;
  readonly address: string | null;
  readonly connectWallet: () => Promise<void>;
  readonly disconnectWallet: () => void;
  readonly deploymentStatus: DeploymentStatus;
  readonly deploymentError: string | null;
  readonly contractAddress: string | null;
  readonly deployNewContract: () => Promise<void>;
  readonly reports: ReportView[];
  readonly reportsStatus: 'idle' | 'loading' | 'loaded' | 'error';
  readonly reportsError: string | null;
  readonly isOwnedReport: (commitment: string) => boolean;
  readonly submitReport: (input: ReportInput) => Promise<SubmitOutcome>;
  readonly proofStage: ProofStage;
  readonly updateStatus: (
    reportId: string,
    status: ReportStatusId,
  ) => Promise<SubmitOutcome>;
  readonly verifyCredential: () => Promise<CredentialCheck>;
  readonly pseudonym: string | null;
};

export const VeilDropContext = createContext<VeilDropContextValue | null>(null);

export const useVeilDrop = (): VeilDropContextValue => {
  const ctx = useContext(VeilDropContext);
  if (!ctx) {
    throw new Error('useVeilDrop must be used within VeilDropProvider.');
  }
  return ctx;
};
