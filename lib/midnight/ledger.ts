import { VeilDrop } from '../../contract/src/index';
import {
  ReportCategory,
  ReportStatus,
} from '../../contract/managed/veildrop/contract/index';
import type { ReportCategoryId, ReportStatusId, ReportView } from '../../types';
import { bytesToHex, shorten } from '../format';

export const REPORT_CATEGORIES: ReadonlyArray<{
  readonly id: ReportCategoryId;
  readonly label: string;
  readonly enum: ReportCategory;
  readonly description: string;
}> = [
  {
    id: 'FINANCIAL',
    label: 'Financial',
    enum: ReportCategory.FINANCIAL,
    description: 'Fraud, embezzlement, accounting irregularities, bribery.',
  },
  {
    id: 'GOVERNMENT',
    label: 'Government',
    enum: ReportCategory.GOVERNMENT,
    description: 'Misuse of public funds, abuse of power, procurement fraud.',
  },
  {
    id: 'ENVIRONMENTAL',
    label: 'Environmental',
    enum: ReportCategory.ENVIRONMENTAL,
    description: 'Pollution, illegal dumping, environmental compliance breaches.',
  },
  {
    id: 'HEALTH',
    label: 'Health',
    enum: ReportCategory.HEALTH,
    description: 'Public health hazards, medical fraud, unsafe products.',
  },
  {
    id: 'OTHER',
    label: 'Other',
    enum: ReportCategory.OTHER,
    description: 'Anything else worth blowing the whistle on.',
  },
];

export const REPORT_STATUSES: ReadonlyArray<{
  readonly id: ReportStatusId;
  readonly label: string;
  readonly enum: ReportStatus;
}> = [
  { id: 'REGISTERED', label: 'Registered', enum: ReportStatus.REGISTERED },
  {
    id: 'UNDER_INVESTIGATION',
    label: 'Under investigation',
    enum: ReportStatus.UNDER_INVESTIGATION,
  },
  { id: 'RESOLVED', label: 'Resolved', enum: ReportStatus.RESOLVED },
];

const categoryLabel = (category: ReportCategory): ReportCategoryId =>
  (REPORT_CATEGORIES.find((c) => c.enum === category)?.id ?? 'OTHER');

const statusLabel = (status: ReportStatus): ReportStatusId =>
  (REPORT_STATUSES.find((s) => s.enum === status)?.id ?? 'REGISTERED');

export type VeilDropLedger = ReturnType<typeof VeilDrop.ledger>;

export function ledgerToReports(ledger: VeilDropLedger): ReportView[] {
  const reports: ReportView[] = [];
  for (const [id, entry] of ledger.reports) {
    const commitment = bytesToHex(entry.commitment);
    const pseudonym = bytesToHex(entry.pseudonym);
    const timestampMs = Number(entry.timestamp);
    const category = categoryLabel(entry.category);
    const status = statusLabel(entry.status);
    reports.push({
      id: id.toString(),
      commitment,
      commitmentShort: shorten(commitment, 10, 8),
      pseudonym,
      pseudonymShort: shorten(pseudonym, 8, 8),
      category,
      categoryLabel: REPORT_CATEGORIES.find((c) => c.id === category)?.label ?? 'Other',
      status,
      statusLabel: REPORT_STATUSES.find((s) => s.id === status)?.label ?? 'Registered',
      timestampMs,
      dateLabel: new Date(timestampMs).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    });
  }
  return reports.sort((a, b) => b.timestampMs - a.timestampMs);
}
