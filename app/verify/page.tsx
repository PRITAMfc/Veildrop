'use client';

import { useMemo, useState } from 'react';
import { useVeilDrop } from '../../components/wallet-context';
import { computeReportCommitment, listOwnedReports } from '../../lib/midnight/commitment';
import { REPORT_CATEGORIES } from '../../lib/midnight/ledger';
import { shorten } from '../../lib/format';

type Verification =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'proven'; commitment: string; onChain: boolean }
  | { kind: 'mismatch'; recomputed: string; onChain: string }
  | { kind: 'error'; message: string };

export default function VerifyPage() {
  const { reports, reportsStatus } = useVeilDrop();
  const [selectedCommitment, setSelectedCommitment] = useState<string | null>(
    null,
  );
  const [verification, setVerification] = useState<Verification>({
    kind: 'idle',
  });

  const owned = useMemo(() => listOwnedReports(), []);

  const onChainCommitments = useMemo(
    () => new Set(reports.map((r) => r.commitment)),
    [reports],
  );

  const verify = async (commitment: string) => {
    setSelectedCommitment(commitment);
    setVerification({ kind: 'checking' });
    const stored = owned.find((entry) => entry.commitment === commitment);
    if (!stored) {
      setVerification({
        kind: 'error',
        message: 'No locally stored secret found for that commitment.',
      });
      return;
    }
    try {
      const recomputed = await computeReportCommitment({
        title: stored.title,
        description: stored.description,
        category: stored.category,
        saltHex: stored.saltHex,
        createdAt: stored.createdAt,
      });
      if (recomputed === stored.commitment) {
        setVerification({
          kind: 'proven',
          commitment: stored.commitment,
          onChain: onChainCommitments.has(stored.commitment),
        });
      } else {
        setVerification({
          kind: 'mismatch',
          recomputed,
          onChain: stored.commitment,
        });
      }
    } catch (err) {
      setVerification({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Verification failed.',
      });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-white">Verify a report</h1>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Prove authorship without revealing anything on-chain. VeilDrop kept a
          random salt in this browser — recomputing the one-way hash from your
          secret must reproduce the public commitment on the ledger.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="mb-4 text-base font-bold text-white">
          Reports sealed from this browser
        </h2>

        {owned.length === 0 ? (
          <p className="text-sm text-mist">
            No locally-stored report secrets found. Submit a report first, then
            come back here to verify it.
          </p>
        ) : (
          <div className="grid gap-3">
            {owned.map((entry) => {
              const onChain = onChainCommitments.has(entry.commitment);
              const active = selectedCommitment === entry.commitment;
              return (
                <div
                  key={entry.commitment}
                  className={`rounded-xl border p-4 ${
                    active
                      ? 'border-neon/50 bg-neon/5'
                      : 'border-edge bg-ink/50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {entry.title}
                      </p>
                      <p className="mono mt-0.5 truncate text-xs text-mist">
                        {entry.commitment}
                      </p>
                      <p className="mt-0.5 text-xs text-mist">
                        {REPORT_CATEGORIES.find((c) => c.id === entry.category)
                          ?.label ?? entry.category}{' '}
                        · {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {onChain ? (
                        <span className="badge border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                          on-chain
                        </span>
                      ) : (
                        <span className="badge border-edge bg-white/5 text-mist">
                          pending
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => void verify(entry.commitment)}
                        disabled={verification.kind === 'checking'}
                        className="btn-primary !px-4 !py-2 text-xs"
                      >
                        {verification.kind === 'checking' &&
                        active
                          ? 'Recomputing…'
                          : 'Verify ownership'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {verification.kind === 'checking' && (
        <div className="animate-shimmer card mt-6 p-6 text-center text-sm text-mist">
          Recomputing SHA-256 from your secret…
        </div>
      )}

      {verification.kind === 'proven' && (
        <div className="card mt-6 border-neon/40 p-6 text-center">
          <p className="text-lg font-black text-neon">✓ Ownership proven</p>
          <p className="mt-2 text-sm text-mist">
            The recomputed hash matches your on-chain commitment. You authored
            this report — and no one can tell who you are.
          </p>
          <dl className="mx-auto mt-4 max-w-xl space-y-2 text-left text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-mist">Commitment</dt>
              <dd className="mono break-all text-neon">
                {shorten(verification.commitment, 16, 12)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mist">On-chain status</dt>
              <dd className={verification.onChain ? 'text-emerald-400' : 'text-amber-300'}>
                {verification.onChain
                  ? 'Present on the live ledger ✓'
                  : 'Indexing — not yet visible on the ledger'}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {verification.kind === 'mismatch' && (
        <div className="mono card mt-6 border-danger/40 p-6 text-center text-xs text-danger">
          Mismatch: stored secret does not reproduce the on-chain commitment.
          This report may have been tampered with or the secret was lost.
        </div>
      )}

      {verification.kind === 'error' && (
        <div className="mono card mt-6 border-danger/30 bg-danger/10 p-4 text-xs text-danger">
          {verification.message}
        </div>
      )}

      <p className="mt-8 text-xs leading-relaxed text-mist">
        On the real Midnight network, ownership can also be proven on-chain by
        re-running the <span className="mono text-neon">proveAuthorization</span>{' '}
        circuit — a zero-knowledge proof that a commitment was produced by the
        current wallet without disclosing the underlying secret. In this demo,
        the same idea is demonstrated locally by recomputing the SHA-256
        commitment from a salt that never leaves this browser.
      </p>
    </div>
  );
}
