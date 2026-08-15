'use client';

import { useVeilDrop } from './wallet-context';

export function ConnectionGate({
  children,
  title = 'Wallet required',
  hint,
}: {
  children: React.ReactNode;
  title?: string;
  hint?: string;
}) {
  const { walletStatus, connectWallet, walletError } = useVeilDrop();

  if (walletStatus !== 'connected') {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-edge bg-white/5 text-2xl">
          🔒
        </div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm text-mist">
          {walletStatus === 'no-wallet'
            ? 'No Midnight Lace wallet was detected. Install the Lace extension, enable Midnight, and refresh.'
            : walletStatus === 'detecting'
              ? 'Detecting your Midnight Lace wallet…'
              : (hint ?? 'Connect your Lace wallet to continue.')}
        </p>
        {walletError && (
          <p className="mono mt-3 break-words rounded-lg border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
            {walletError}
          </p>
        )}
        {walletStatus !== 'no-wallet' && walletStatus !== 'detecting' && (
          <button
            type="button"
            onClick={() => void connectWallet()}
            className="btn-primary mt-5"
          >
            Connect Lace Wallet
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
