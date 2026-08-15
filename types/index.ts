export type ReportCategoryId =
  | 'FINANCIAL'
  | 'GOVERNMENT'
  | 'ENVIRONMENTAL'
  | 'HEALTH'
  | 'OTHER';

export type ReportStatusId =
  | 'REGISTERED'
  | 'UNDER_INVESTIGATION'
  | 'RESOLVED';

export type ReportView = {
  readonly id: string;
  readonly commitment: string;
  readonly commitmentShort: string;
  readonly pseudonym: string;
  readonly pseudonymShort: string;
  readonly category: ReportCategoryId;
  readonly categoryLabel: string;
  readonly status: ReportStatusId;
  readonly statusLabel: string;
  readonly timestampMs: number;
  readonly dateLabel: string;
};

export type ReportInput = {
  readonly title: string;
  readonly description: string;
  readonly category: ReportCategoryId;
};

export type ProofStage = {
  readonly step: number;
  readonly label: string;
  readonly running: boolean;
  readonly error?: string;
};

export type SubmitOutcome = {
  readonly ok: boolean;
  readonly commitment?: string;
  readonly txId?: string;
  readonly reportId?: string;
  readonly error?: string;
};

export type WalletStatus =
  | 'detecting'
  | 'no-wallet'
  | 'ready'
  | 'connecting'
  | 'connected';

export type DeploymentStatus =
  | 'idle'
  | 'connecting'
  | 'deploying'
  | 'deployed'
  | 'failed';
