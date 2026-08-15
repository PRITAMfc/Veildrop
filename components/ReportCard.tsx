'use client';

import { useVeilDrop } from './wallet-context';
import { StatusBadge } from './StatusBadge';
import type { ReportView } from '../types';

export function ReportCard({ report }: { report: ReportView }) {
  const { isOwnedReport } = useVeilDrop();
  const owned = isOwnedReport(report.commitment);

  return (
    <article className="card card-hover p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={report.status} label={report.statusLabel} />
          <span className="badge border-edge bg-white/5 text-mist">
            #{report.id}
          </span>
          {owned && (
            <span className="badge border-violet-glow/40 bg-violet-glow/10 text-violet-glow">
              Yours
            </span>
          )}
        </div>
        <span className="text-xs text-mist">{report.dateLabel}</span>
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-mist">Category</dt>
          <dd className="font-medium text-slate-200">{report.categoryLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-mist">Report commitment</dt>
          <dd className="mono text-xs text-slate-300">
            {report.commitmentShort}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-mist">Reporter pseudonym</dt>
          <dd className="mono text-xs text-neon">{report.pseudonymShort}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-mist">Full commitment</dt>
          <dd
            className="mono max-w-64 truncate text-[11px] text-slate-500"
            title={report.commitment}
          >
            {report.commitment}
          </dd>
        </div>
      </dl>
    </article>
  );
}
