# VeilDrop

A privacy-first whistleblower DApp on the **Midnight blockchain**. Reporters submit
salted report commitments, investigators update report statuses, and the raw report —
together with the reporter's identity credential — is never published.

Built with **Compact**, **midnight-js**, and **Next.js**. Everything a reporter sees is
proven in zero knowledge on a public ledger while the sensitive details stay in the
browser (and nowhere else).

---

## Why Midnight?

Midnight lets you publish *state transitions* without publishing the data that caused
them. VeilDrop uses this directly:

| Data | Visibility | Why |
| --- | --- | --- |
| Report `commitment` (SHA-256 of title + description + category + salt) | **Public** | Everyone can see *that* a report exists |
| Report `category`, `status`, `timestamp`, reporter `pseudonym` | **Public** | Reports can be followed and prioritized without identifying anyone |
| Report title / description / raw content | **Private (browser only)** | Never leaves the reporter's device |
| Reporter credential (`veildrop-demo-credential-secret!`) | **Private (in the proof)** | `proveAuthorization` proves possession without revealing it |
| Reporter secret key | **Private (in the proof)** | Only a domain-separated `pseudonym` is disclosed |

## How authorization works (zero-knowledge credential check)

The contract stores only `authorizedCredentialHash`. To submit a report, a client runs
`submitReport`, which calls the pure circuit `credentialCommitment(credential)` and
asserts it equals the on-ledger hash. The Compact compiler turns this into a zk-SNARK —
the node sees a proof, not the credential.

> **Demo disclosure:** this repository ships with a *public, well-known* demo credential
> (`7665696c64726f702d64656d6f2d63726564656e7469616c2d73656372657421`, ASCII
> `veildrop-demo-credential-secret!`). It exists so you can try the flow without
> provisioning your own. Do **not** use it for anything real — the whole point of the
> system is that only the *commitment* is ever published, so in production you would
> distribute the raw credential to authorized reporters out-of-band and publish only its
> hash.

## Circuits

| Circuit | Inputs | Ledger effect | Disclosed |
| --- | --- | --- | --- |
| `proveAuthorization` | witness secret + witness credential | — | reporter `pseudonym` |
| `submitReport` | `commitment`, `category`, `timestamp` + witnesses | inserts `ReportEntry` | commitment, category, status, pseudonym, timestamp |
| `updateReportStatus` | `reportId`, `newStatus` | updates `ReportEntry.status` | reportId, newStatus |

The credential hash, report commitments, and statuses live on-chain. Secrets live in the
witnesses and stay in the zk-SNARK.

## Requirements

- **Node.js ≥ 22** (npm scripts)
- **Lace wallet** (Midnight) for the browser DApp
- **Docker** for the local devnet used by the contract tests
- The **Compact compiler** (`compact`) if you want to recompile the contract —
  see [Recompiling the contract](#recompiling-the-contract)

## Quick start (browser DApp)

```bash
npm install
cp .env.example .env.local   # default targets Midnight Preprod
npm run dev
```

Open http://localhost:3000, connect Lace (switch its network to *Midnight Preprod*), and:

1. **Deploy** — the app deploys a fresh contract from your wallet (or set
   `NEXT_PUBLIC_VEILDROP_CONTRACT_ADDRESS` in `.env.local` to reuse one).
2. **File a report** — the demo credential is preloaded; the 5-step proof pipeline shows
   commit → prove → submit → finalize → verified.
3. **Investigate** — update a report's status; only the status changes on-ledger.
4. **Verify** — pick one of *your* local reports and re-derive the commitment to prove
   you authored it.

## Contract tests (local devnet)

```bash
docker compose up -d --wait   # proof-server, indexer, midnight-node
npm run test:contract         # 8 integration tests via vitest
```

The suite covers: deployment, zero-knowledge authorization, invalid-credential
rejection, commitment registration, second-reporter authorization, public status
updates, credential secrecy on the ledger, and rejection of updates to nonexistent
reports.

## Deploying to Midnight Preprod

1. Set your contract's authorized credential hash:

   ```bash
   # from a Node REPL, or see README notes in contract/test:
   #   VeilDrop.pureCircuits.credentialCommitment(<credential bytes>)
   ```

2. Deploy the contract from the DApp's **Deploy** panel (your Lace wallet signs the
   deployment transaction and pays the fee).

3. Copy the deployed `contractAddress` into `.env.local`:

   ```bash
   NEXT_PUBLIC_VEILDROP_CONTRACT_ADDRESS=<64 lowercase hex chars>
   NEXT_PUBLIC_VEILDROP_AUTHORIZED_CREDENTIAL_HASH=<64 lowercase hex chars>
   NEXT_PUBLIC_VEILDROP_NETWORK_ID=preprod
   ```

4. Rebuild/restart the app. The DApp will now read from the deployed contract instead of
   deploying a new one.

> **Tip:** verify a deployment quickly by checking the contract address on the
> [Preprod explorer](https://explorer.1am.xyz/?network=preprod).

## Project structure

```
contract/
  src/main.compact              # the Compact contract
  src/witnesses.ts              # private-state witnesses (reporterSecret, credentialSecret)
  src/index.ts                  # CompiledContract entry (compiled file + witnesses)
  managed/veildrop/             # compiler output (contract JS, keys, zkir)
  test/                         # vitest integration suite + devnet providers
app/ components/                # Next.js pages and React components
lib/midnight/                   # browser integration (wallet, providers, commitment)
scripts/                        # asset copy + webpack wasm shims
compose.yml                     # local devnet (proof-server / indexer / node)
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server (webpack; the onchain runtime needs it) |
| `npm run build` | Production build (emits the onchain-runtime wasm) |
| `npm run typecheck` | TypeScript check |
| `npm run test:contract` | Contract integration tests against a local devnet |
| `npm run compile` | Recompile `main.compact` (requires the `compact` toolchain) |
| `npm run env:up` / `env:down` | Start / stop the local devnet |

## Notes for maintainers

- Next.js 16 defaults to Turbopack, which ignores the custom webpack config; the
  `--webpack` flag on `dev`/`build` is required.
- `@midnight-ntwrk/onchain-runtime-v3` is pinned as a **direct** dependency to force a
  single hoisted copy; with two nested copies its `StateValue` class identity diverges
  and circuit execution fails with `expected instance of StateValue`.
- The onchain runtime's browser entry imports its wasm synchronously; the loader in
  `scripts/next/wasm-entry-loader.mjs` rewrites it to an async import so webpack can
  emit the wasm under `static/wasm/`.
