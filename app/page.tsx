import Link from 'next/link';
import { PrivacyDiagram } from '../components/PrivacyDiagram';

export default function HomePage() {
  return (
    <div className="animate-float-in mx-auto max-w-6xl px-4 py-14">
      <section className="mx-auto max-w-3xl text-center">
        <span className="badge mx-auto mb-6 border-violet-glow/40 bg-violet-glow/10 text-violet-glow">
          Built on Midnight · zero-knowledge proofs
        </span>
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
          Blow the whistle.{' '}
          <span className="text-gradient">Keep your identity.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-mist">
          VeilDrop lets you submit a confidential whistleblower report that is
          <strong className="text-slate-200"> cryptographically provable</strong>{' '}
          without ever revealing who you are. A zero-knowledge proof convinces
          the on-chain contract you hold a valid reporter credential — your
          wallet, your identity and the report content never touch the ledger.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/report" className="btn-primary text-base">
            Submit a report →
          </Link>
          <Link href="/dashboard" className="btn-secondary text-base">
            Browse the ledger
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Prove, don't reveal",
            body: 'Every report carries a zkSNARK proving authorization. The raw credential is never published on-chain.',
          },
          {
            title: 'Unlinkable pseudonyms',
            body: 'Each browser derives a distinct pseudonym per report, so reports cannot be tied back to you.',
          },
          {
            title: 'Verifiable integrity',
            body: 'The report content is sealed with a one-way SHA-256 commitment. You can prove ownership later, on demand.',
          },
        ].map((item) => (
          <div key={item.title} className="card card-hover p-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-neon">
              {item.title}
            </h2>
            <p className="text-sm leading-relaxed text-mist">{item.body}</p>
          </div>
        ))}
      </section>

      <div className="mt-14">
        <PrivacyDiagram />
      </div>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        {[
          {
            href: '/dashboard',
            title: 'Dashboard',
            body: 'See every report commitment, status and pseudonym on the live ledger.',
          },
          {
            href: '/investigator',
            title: 'Investigator',
            body: 'Advance reports from registered to under investigation to resolved — all public, all accountable.',
          },
          {
            href: '/verify',
            title: 'Verify',
            body: 'Prove you authored a report by recomputing its commitment from your secret.',
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card card-hover group p-6"
          >
            <h2 className="mb-1 text-base font-bold text-white group-hover:text-violet-glow">
              {item.title} →
            </h2>
            <p className="text-sm text-mist">{item.body}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
