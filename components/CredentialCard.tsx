'use client';

import { useState } from 'react';
import { useVeilDrop } from './wallet-context';

export function CredentialCard() {
  const {
    walletStatus,
    connectWallet,
    contractAddress,
    verifyCredential,
    pseudonym,
    deploymentStatus,
  } = useVeilDrop();
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'checking' }
    | { kind: 'ok'; pseudonym: string }
    | { kind: 'error'; error: string }
  >({ kind: 'idle' });

  const needsContract = walletStatus !== 'connected' || !contractAddress;

  const run = async () => {
    setState({ kind: 'checking' });
    const result = await verifyCredential();
    if (result.ok) {
      setState({ kind: 'ok', pseudonym: result.pseudonym });
    } else {
      setState({ kind: 'error', error: result.error ?? 'Credential check failed.' });
    }
  };

  return (
    <section className="card card-hover p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Reporter credential</h2>
          <p className="mt-1 text-xs text-mist">
            A demo credential authorizes reporters. The proof never publishes
            the credential itself.
          </p>
        </div>
        <span className="badge border-neon/30 bg-neon/10 text-neon">Demo</span>
      </div>

      <dl className="mb-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-mist">Authorized by contract</dt>
          <dd className="mono text-xs text-slate-200">
            {deploymentStatus === 'deployed' && contractAddress
              ? 'Yes — contract on-chain'
              : 'Deploy or join a contract first'}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-mist">Your pseudonym</dt>
          <dd className="mono text-xs text-neon">
            {pseudonym ?? 'not computed yet'}
          </dd>
        </div>
        {state.kind === 'ok' && (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-mist">Credential status</dt>
            <dd className="text-xs font-semibold text-emerald-400">
              Valid · identity hidden
            </dd>
          </div>
        )}
        {state.kind === 'error' && (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-mist">Credential status</dt>
            <dd className="text-xs font-semibold text-danger">{state.error}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void run()}
          disabled={state.kind === 'checking' || needsContract}
          className="btn-primary"
        >
          {state.kind === 'checking' ? 'Proving…' : 'Prove my credential'}
        </button>
        {needsContract && (
          <button type="button" onClick={() => void connectWallet()} className="btn-secondary">
            Connect wallet first
          </button>
        )}
      </div>

      <p className="mt-4 rounded-lg border border-edge bg-ink/50 p-3 text-xs leading-relaxed text-mist">
        Clicking <strong className="text-slate-200">Prove my credential</strong>{' '}
        runs the <span className="mono text-neon">proveAuthorization</span>{' '}
        circuit. The on-chain contract only ever sees a commitment to your
        credential — never the credential itself.
      </p>
    </section>
  );
}
