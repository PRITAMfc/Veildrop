'use client';

import { useVeilDrop } from './wallet-context';

export function Footer() {
  const { networkLabel } = useVeilDrop();

  return (
    <footer className="border-t border-edge/70 bg-ink/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-mist sm:flex-row">
        <p>
          VeilDrop — a privacy-first whistleblowing demo on the Midnight Network.
        </p>
        <p className="mono">
          {networkLabel} · powered by zkSNARKs
        </p>
      </div>
    </footer>
  );
}
