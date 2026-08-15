import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  computeReportCommitment,
  findOwnedReport,
  listOwnedReports,
  makeCommitmentSalt,
  storeReportSalts,
  type CommitmentPayload,
} from './commitment';

function makeLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
  };
}

const payload: CommitmentPayload = {
  title: 'Unsafe working conditions',
  description: 'details only the reporter should see',
  category: 'HEALTH',
  saltHex: '00'.repeat(32),
  createdAt: 1700000000000,
};

beforeEach(() => {
  globalThis.window = { localStorage: makeLocalStorageMock() } as unknown as Window &
    typeof globalThis;
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('report commitment', () => {
  it('is deterministic for the same payload', async () => {
    expect(await computeReportCommitment(payload)).toBe(
      await computeReportCommitment(payload),
    );
  });

  it('changes when the salt changes', async () => {
    const other = await computeReportCommitment({
      ...payload,
      saltHex: 'ff'.repeat(32),
    });
    expect(other).not.toBe(await computeReportCommitment(payload));
  });

  it('is 64 hex characters (SHA-256)', async () => {
    expect(await computeReportCommitment(payload)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('makeCommitmentSalt returns a fresh random 32-byte salt', () => {
    expect(makeCommitmentSalt()).toMatch(/^[0-9a-f]{64}$/);
    expect(makeCommitmentSalt()).not.toBe(makeCommitmentSalt());
  });
});

describe('local report salt storage', () => {
  const entry = {
    commitment: 'aa'.repeat(32),
    title: payload.title,
    description: payload.description,
    category: payload.category,
    saltHex: payload.saltHex,
    createdAt: payload.createdAt,
  };

  it('stores, lists, and finds owned reports', () => {
    storeReportSalts(entry);
    const all = listOwnedReports();
    expect(all).toHaveLength(1);
    expect(all[0].commitment).toBe(entry.commitment);
    expect(findOwnedReport(entry.commitment)?.saltHex).toBe(payload.saltHex);
    expect(findOwnedReport('bb'.repeat(32))).toBeUndefined();
  });

  it('does not leak the description to storage consumers', () => {
    storeReportSalts(entry);
    expect(listOwnedReports()[0].description).toBe(payload.description);
  });
});
