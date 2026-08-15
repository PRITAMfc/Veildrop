'use client';

export function PrivacyDiagram() {
  return (
    <section className="card p-6">
      <h2 className="mb-5 text-base font-bold text-white">How VeilDrop protects you</h2>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="relative rounded-xl border border-edge bg-ink/60 p-4">
          <span className="badge mb-2 border-edge bg-white/5 text-mist">1 · You</span>
          <p className="text-sm text-slate-200">Write your report.</p>
          <p className="mt-1 text-xs text-mist">
            Content lives only in your browser &amp; is hashed locally.
          </p>
        </div>

        <div className="flex items-center justify-center text-2xl text-mist md:pb-8">
          →
        </div>

        <div className="relative rounded-xl border border-violet-glow/40 bg-violet-glow/5 p-4">
          <span className="badge mb-2 border-violet-glow/40 bg-violet-glow/10 text-violet-glow">
            2 · ZK proof
          </span>
          <p className="text-sm text-slate-200">
            Prove you hold a reporter credential.
          </p>
          <p className="mt-1 text-xs text-mist">
            A zkSNARK proves authorization without revealing the credential or
            your identity.
          </p>
        </div>

        <div className="flex items-center justify-center text-2xl text-mist md:pb-8">
          →
        </div>

        <div className="rounded-xl border border-neon/40 bg-neon/5 p-4">
          <span className="badge mb-2 border-neon/40 bg-neon/10 text-neon">
            3 · On-chain
          </span>
          <p className="text-sm text-slate-200">
            Only a hash reaches the ledger.
          </p>
          <p className="mt-1 text-xs text-mist">
            Contract stores your commitment, pseudonym, category &amp; status —
            never your identity.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <h3 className="mb-1 text-sm font-bold text-emerald-400">
            What stays private
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
            <li>Report title &amp; full description</li>
            <li>The reporter credential secret</li>
            <li>Your wallet identity and link to the report</li>
          </ul>
        </div>
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
          <h3 className="mb-1 text-sm font-bold text-sky-400">
            What is public on-chain
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
            <li>A one-way SHA-256 commitment of the report</li>
            <li>An unlinkable pseudonym</li>
            <li>Category, timestamp &amp; investigation status</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
