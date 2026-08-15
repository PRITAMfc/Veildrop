'use client';

import { ContractDeployPanel } from '../../components/ContractDeployPanel';
import { ReportCard } from '../../components/ReportCard';
import { useVeilDrop } from '../../components/wallet-context';

export default function DashboardPage() {
  const { reports, reportsStatus, reportsError, contractAddress, deploymentStatus } =
    useVeilDrop();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-white">Public ledger</h1>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Every report is a commitment, a pseudonym and a status. No identities,
          no content — just the cryptographic shadow of what was reported.
        </p>
      </header>

      <div className="mb-8">
        <ContractDeployPanel />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            Registered reports{' '}
            {reportsStatus === 'loaded' && (
              <span className="ml-1 text-sm font-medium text-mist">
                ({reports.length})
              </span>
            )}
          </h2>
          <span className="mono text-xs text-mist">
            {contractAddress ? 'live' : deploymentStatus === 'deploying' ? 'deploying…' : 'no contract'}
          </span>
        </div>

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
            <p className="text-lg text-slate-200">No reports yet.</p>
            <p className="mt-1 text-sm text-mist">
              Be the first to blow the whistle — submit a report.
            </p>
          </div>
        )}

        {reportsStatus === 'loaded' && reports.length > 0 && (
          <div className="grid gap-4">
            {reports.map((report) => (
              <ReportCard key={report.commitment} report={report} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
