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
  const { walletStatus, connectWallet, walletError, connectingStep } = useVeilDrop();

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
              : walletStatus === 'connecting'
                ? 'A Lace popup should appear — approve the connection to continue. If no popup appears, make sure Lace is unlocked and Midnight is enabled in Lace settings.'
                : 'Connect your Lace wallet to continue. Make sure Lace is unlocked and Midnight is enabled in Lace settings.'}
        </p>
        {connectingStep && (
          <p className="mono mt-3 text-xs text-neon">{connectingStep}</p>
        )}
        {walletError && (
          <p className="mono mt-3 break-words rounded-lg border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
            {walletError}
          </p>
        )}
        {walletStatus === 'connecting' ? (
          <button type="button" disabled className="btn-secondary mt-5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-neon" />
            Connecting…
          </button>
        ) : walletStatus !== 'no-wallet' && walletStatus !== 'detecting' ? (
          <button
            type="button"
            onClick={() => void connectWallet()}
            className="btn-primary mt-5"
          >
            Connect Lace Wallet
          </button>
        ) : null}
      </div>
    );
  }

  return <>{children}</>;
}
