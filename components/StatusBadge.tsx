'use client';

import type { ReportStatusId } from '../types';

const STATUS_STYLES: Record<ReportStatusId, string> = {
  REGISTERED: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  UNDER_INVESTIGATION: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  RESOLVED: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
};

export function StatusBadge({ status, label }: { status: ReportStatusId; label: string }) {
  return (
    <span className={`badge ${STATUS_STYLES[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
