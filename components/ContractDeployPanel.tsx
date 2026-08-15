'use client';

import { useVeilDrop } from './wallet-context';

export function ContractDeployPanel() {
  const {
    walletStatus,
    connectWallet,
    deploymentStatus,
    deploymentError,
    contractAddress,
    deployNewContract,
    networkLabel,
  } = useVeilDrop();

  const showDeployControls = walletStatus === 'connected';

  return (
    <section className="card card-hover p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">VeilDrop contract</h2>
          <p className="mt-1 text-xs text-mist">
            One contract instance stores every report's commitment, pseudonym
            and status. Deploy your own instance, or join a shared one.
          </p>
        </div>
        <span className="badge border-edge bg-white/5 text-mist">
          {networkLabel}
        </span>
      </div>

      {deploymentStatus === 'deployed' && contractAddress && (
        <div className="mb-4 rounded-xl border border-neon/30 bg-neon/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-neon">
            Contract live
          </p>
          <p className="mono mt-1 break-all text-xs text-slate-200">
            {contractAddress}
          </p>
        </div>
      )}

      {deploymentStatus === 'deploying' && (
        <div className="animate-shimmer mb-4 rounded-xl border border-edge p-4 text-sm text-slate-200">
          Deploying contract… this runs the deployment proof and can take a
          minute.
        </div>
      )}

      {deploymentStatus === 'failed' && (
        <div className="mono mb-4 break-words rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          {deploymentError}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {showDeployControls ? (
          <button
            type="button"
            onClick={() => void deployNewContract()}
            disabled={
              deploymentStatus === 'deploying' || deploymentStatus === 'deployed'
            }
            className="btn-primary"
          >
            {deploymentStatus === 'deployed'
              ? 'Contract deployed ✓'
              : deploymentStatus === 'deploying'
                ? 'Deploying…'
                : 'Deploy new contract'}
          </button>
        ) : (
          <button type="button" onClick={() => void connectWallet()} className="btn-primary">
            Connect wallet to deploy
          </button>
        )}
      </div>

      {!showDeployControls && (
        <p className="mt-4 text-xs text-mist">
          Deploying requires a Lace wallet funded with tNIGHT and tDUST.
        </p>
      )}
    </section>
  );
}
