'use client';

import { useState } from 'react';
import { ConnectionGate } from '../../components/ConnectionGate';
import { CredentialCard } from '../../components/CredentialCard';
import { ProofProgress } from '../../components/ProofProgress';
import { useVeilDrop } from '../../components/wallet-context';
import { REPORT_CATEGORIES } from '../../lib/midnight/ledger';
import type { ReportCategoryId, ReportInput } from '../../types';

type FormState = {
  title: string;
  description: string;
  category: ReportCategoryId;
  acknowledge: boolean;
};

const initialForm: FormState = {
  title: '',
  description: '',
  category: 'FINANCIAL',
  acknowledge: false,
};

export default function ReportPage() {
  const {
    submitReport,
    proofStage,
    contractAddress,
    deploymentStatus,
    deployNewContract,
  } = useVeilDrop();

  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<
    | { kind: 'idle' }
    | { kind: 'error'; message: string }
    | { kind: 'done'; commitment: string; txId: string; reportId?: string }
  >({ kind: 'idle' });

  const readyToSubmit =
    form.title.trim().length >= 3 &&
    form.description.trim().length >= 10 &&
    form.acknowledge &&
    !submitting;

  const submit = async () => {
    if (!readyToSubmit) return;
    setSubmitting(true);
    setOutcome({ kind: 'idle' });
    const input: ReportInput = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
    };
    const result = await submitReport(input);
    setSubmitting(false);
    if (result.ok) {
      setOutcome({
        kind: 'done',
        commitment: result.commitment ?? '',
        txId: result.txId ?? '',
      });
    } else {
      setOutcome({ kind: 'error', message: result.error ?? 'Submission failed.' });
    }
  };

  if (outcome.kind === 'done') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="card border-neon/40 p-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border-2 border-neon bg-neon/10 text-3xl">
            ✓
          </div>
          <h1 className="text-2xl font-black text-white">
            Privacy proof verified
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-mist">
            Your report commitment is now on the Midnight ledger. Only the hash
            is public — your identity, credential and report content never left
            this browser.
          </p>
          <dl className="mt-6 space-y-3 rounded-xl border border-edge bg-ink/60 p-5 text-left text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-mist">
                On-chain commitment
              </dt>
              <dd className="mono mt-1 break-all text-xs text-neon">
                {outcome.commitment}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-mist">
                Transaction id
              </dt>
              <dd className="mono mt-1 break-all text-xs text-slate-300">
                {outcome.txId}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href="/dashboard" className="btn-primary">
              View the ledger
            </a>
            <a href="/verify" className="btn-secondary">
              Verify this report later
            </a>
          </div>
          <p className="mt-6 text-xs text-mist">
            Save the commitment above — it is your receipt. To prove authorship
            later, your browser also stored a random salt locally in
            localStorage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-white">Submit a report</h1>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Describe what you know. The details are hashed locally with a random
          salt, and a zero-knowledge proof registers the commitment on-chain —
          with your identity shielded.
        </p>
      </header>

      <ConnectionGate hint="Connect your Lace wallet to prove you are an authorized reporter.">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="card p-6 lg:col-span-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
              className="space-y-5"
            >
              <div>
                <label htmlFor="title" className="label">
                  Report title
                </label>
                <input
                  id="title"
                  className="input"
                  placeholder="e.g. Misuse of public funds in procurement"
                  value={form.title}
                  maxLength={120}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="description" className="label">
                  What do you know?
                </label>
                <textarea
                  id="description"
                  className="input min-h-40 resize-y"
                  placeholder="Facts, figures, dates, people, evidence… The more specific the better for investigators. Only you ever see this in plain text."
                  value={form.description}
                  maxLength={4000}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
                <p className="mt-1 text-right text-xs text-mist">
                  {form.description.length}/4000
                </p>
              </div>

              <div>
                <span className="label">Category</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {REPORT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setForm({ ...form, category: cat.id })}
                      className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors ${
                        form.category === cat.id
                          ? 'border-violet-glow bg-violet-glow/15 text-white'
                          : 'border-edge bg-white/5 text-mist hover:border-mist/40'
                      }`}
                      title={cat.description}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-edge bg-ink/50 p-4 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.acknowledge}
                  onChange={(e) =>
                    setForm({ ...form, acknowledge: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 accent-violet-glow"
                />
                <span>
                  I understand that once submitted, a commitment to this report
                  is permanently stored on the public Midnight ledger. The raw
                  content cannot be edited or deleted, and neither can the
                  pseudonym I use.
                </span>
              </label>

              {outcome.kind === 'error' && (
                <div className="mono break-words rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                  {outcome.message}
                </div>
              )}

              <button
                type="submit"
                disabled={!readyToSubmit}
                className="btn-primary w-full !py-3 text-base"
              >
                {submitting ? 'Generating proof…' : 'Seal & submit report'}
              </button>
            </form>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <CredentialCard />

            <ProofProgress stage={proofStage} />

            <div className="card p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-mist">
                Privacy checklist
              </h3>
              <ul className="list-disc space-y-2 pl-5 text-xs leading-relaxed text-slate-300">
                <li>
                  Your report is hashed in this browser before anything is
                  transmitted.
                </li>
                <li>
                  The on-chain contract verifies you hold a reporter credential
                  via zkSNARK — the credential never appears on-chain.
                </li>
                <li>
                  Your pseudonym is derived from a random, per-browser secret.
                </li>
                <li>
                  The ledger stores a commitment, category, timestamp and status
                  — nothing else.
                </li>
              </ul>
            </div>

            {contractAddress ? (
              <p className="mono text-xs text-mist">
                Contract: {contractAddress.slice(0, 12)}…{contractAddress.slice(-8)}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void deployNewContract()}
                disabled={deploymentStatus === 'deploying'}
                className="btn-secondary w-full"
              >
                {deploymentStatus === 'deploying'
                  ? 'Deploying contract…'
                  : 'Deploy a contract first'}
              </button>
            )}
          </div>
        </div>
      </ConnectionGate>
    </div>
  );
}
