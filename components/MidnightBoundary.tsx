'use client';

import dynamic from 'next/dynamic';

const WalletProvider = dynamic(
  () => import('./WalletProvider').then((m) => m.WalletProvider),
  { ssr: false },
);

export function MidnightBoundary({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
