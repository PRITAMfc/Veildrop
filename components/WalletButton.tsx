'use client';

import { useVeilDrop } from './wallet-context';

export function WalletButton() {
  const {
    walletStatus,
    address,
    connectWallet,
    disconnectWallet,
    networkLabel,
    connectingStep,
  } = useVeilDrop();

  if (walletStatus === 'detecting') {
    return (
      <button type="button" disabled className="btn-secondary">
        <span className="h-2 w-2 animate-pulse rounded-full bg-mist" />
        Detecting wallet…
      </button>
    );
  }

  if (walletStatus === 'no-wallet') {
    return (
      <button
        type="button"
        disabled
        title="Install the Lace extension and enable Midnight, then refresh."
        className="btn-secondary"
      >
        <span className="h-2 w-2 rounded-full bg-danger" />
        No wallet
      </button>
    );
  }

  if (walletStatus === 'connecting') {
    return (
      <button type="button" disabled className="btn-secondary">
        <span className="h-2 w-2 animate-pulse rounded-full bg-neon" />
        {connectingStep ?? 'Connecting…'}
      </button>
    );
  }

  if (walletStatus === 'connected' && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-[11px] font-medium text-mist sm:block">
          {networkLabel}
        </span>
        <span className="mono rounded-lg border border-neon/30 bg-neon/10 px-2.5 py-1 text-xs text-neon">
          {address.slice(0, 10)}…{address.slice(-6)}
        </span>
        <button type="button" onClick={disconnectWallet} className="btn-secondary !px-3 !py-1.5 text-xs">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => void connectWallet()} className="btn-primary">
      <span className="h-2 w-2 rounded-full bg-neon" />
      Connect Lace Wallet
    </button>
  );
}
