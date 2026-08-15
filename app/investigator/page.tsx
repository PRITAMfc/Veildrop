'use client';

import { useState } from 'react';
import { ConnectionGate } from '../../components/ConnectionGate';
import { StatusBadge } from '../../components/StatusBadge';
import { useVeilDrop } from '../../components/wallet-context';
import { REPORT_STATUSES } from '../../lib/midnight/ledger';
import type { ReportStatusId, ReportView, SubmitOutcome } from '../../types';

function StatusRow({ report }: { report: ReportView }) {
  const { updateStatus, walletStatus } = useVeilDrop();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<SubmitOutcome | null>(null);

  const advance = async (status: ReportStatusId) => {
    setBusy(true);
    setMessage(null);
    const outcome = await updateStatus(report.id, status);
    setMessage(outcome);
    setBusy(false);
  };

  return (
    <article className="card card-hover p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="badge border-edge bg-white/5 text-mist">#{report.id}</span>
          <StatusBadge status={report.status} label={report.statusLabel} />
        </div>
        <span className="text-xs text-mist">{report.dateLabel}</span>
      </div>

      <dl className="mb-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-mist">Category</dt>
          <dd className="font-medium text-slate-200">{report.categoryLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-mist">Reporter pseudonym</dt>
          <dd className="mono text-xs text-neon">{report.pseudonymShort}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-mist">Commitment</dt>
          <dd className="mono text-xs text-slate-300">{report.commitmentShort}</dd>
        </div>
      </dl>

      {walletStatus === 'connected' ? (
        <div className="flex flex-wrap items-center gap-2">
          {REPORT_STATUSES.filter((s) => s.id !== report.status).map((status) => (
            <button
              key={status.id}
              type="button"
              disabled={busy}
              onClick={() => void advance(status.id)}
              className="btn-secondary !px-3 !py-1.5 text-xs"
            >
              {busy ? '…' : `Set ${status.label}`}
            </button>
          ))}
          {message?.ok ? (
            <span className="text-xs font-semibold text-emerald-400">
              Status updated on-chain ✓
            </span>
          ) : message?.error ? (
            <span className="mono max-w-64 break-words text-xs text-danger">
              {message.error}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-mist">Connect a wallet to update status.</p>
      )}
    </article>
  );
}

export default function InvestigatorPage() {
  const { reports, reportsStatus, reportsError } = useVeilDrop();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-white">Investigator console</h1>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Investigators only ever see what the reporter chose to reveal — a
          commitment, a pseudonym and a category. Advance cases from registered
          to under investigation to resolved. Every change is a public,
          verifiable on-chain transaction.
        </p>
      </header>

      <ConnectionGate hint="Connect your Lace wallet to update report statuses.">
        <section className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <strong>What you cannot see:</strong> the report content, the
          reporter's identity, or any link between them. That is the point —
          whistleblowers stay safe, and you stay accountable.
        </section>

        {reportsStatus === 'loading' && (
          <div className="animate-shimmer card p-8 text-center text-sm text-mist">
            Streaming ledger state from the indexer…
          </div>
        )}

        {reportsStatus === 'error' && (
          <div className="mono card break-words border-danger/30 p-6 text-xs text-danger">
            {reportsError}
          </div>
        )}

        {reportsStatus === 'loaded' && reports.length === 0 && (
          <div className="card p-10 text-center">
            <p className="text-lg text-slate-200">Nothing to investigate yet.</p>
          </div>
        )}

        {reportsStatus === 'loaded' && reports.length > 0 && (
          <div className="grid gap-4">
            {reports.map((report) => (
              <StatusRow key={report.commitment} report={report} />
            ))}
          </div>
        )}
      </ConnectionGate>
    </div>
  );
}
