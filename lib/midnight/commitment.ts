import type { ReportCategoryId } from '../../types';
import { bytesToHex } from '../format';

export type CommitmentPayload = {
  readonly title: string;
  readonly description: string;
  readonly category: ReportCategoryId;
  readonly saltHex: string;
  readonly createdAt: number;
};

export const makeCommitmentSalt = (): string =>
  bytesToHex(crypto.getRandomValues(new Uint8Array(32)));

export async function computeReportCommitment(
  payload: CommitmentPayload,
): Promise<string> {
  const data = new TextEncoder().encode(
    JSON.stringify({
      title: payload.title,
      description: payload.description,
      category: payload.category,
      salt: payload.saltHex,
      createdAt: payload.createdAt,
    }),
  );
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

const STORAGE_KEY = 'veildrop:report-salts';

export type StoredReport = {
  commitment: string;
  title: string;
  description: string;
  category: ReportCategoryId;
  saltHex: string;
  createdAt: number;
};

export function storeReportSalts(entry: StoredReport): void {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '[]',
    ) as StoredReport[];
    stored.push(entry);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // localStorage unavailable; the demo still works, ownership proofs won't persist.
  }
}

export function listOwnedReports(): StoredReport[] {
  try {
    return JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '[]',
    ) as StoredReport[];
  } catch {
    return [];
  }
}

export function findOwnedReport(commitment: string): StoredReport | undefined {
  return listOwnedReports().find((entry) => entry.commitment === commitment);
}
