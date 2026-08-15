/**
 * Deploy VeilDrop to Midnight Preprod.
 *
 * Prerequisites:
 *   1. A local proof server on http://127.0.0.1:6300
 *      (docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0)
 *   2. A Preprod wallet seed with test tokens. Set it as VEILDROP_SEED
 *      (a 64-char hex master seed, or a space-separated mnemonic). The
 *      script requests a faucet drip automatically if the wallet is empty.
 *
 * Usage:
 *   $env:VEILDROP_SEED='<seed>'   # PowerShell
 *   npm run deploy:preprod
 *
 * On success it prints the on-ledger contract address and writes
 * docs/preprod-deployment.md with the deployment evidence.
 */
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pino from 'pino';
import {
  DustSecretKey,
  LedgerParameters,
  ZswapSecretKeys,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { FluentWalletBuilder, FaucetClient } from '@midnight-ntwrk/testkit-js';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import * as Rx from 'rxjs';
import { CompiledVeilDropContract, VeilDrop } from '../contract/dist/index.js';
import { createVeilDropPrivateState } from '../contract/dist/witnesses.js';

// The public, well-known demo credential. The contract only stores its
// commitment; the raw value lives here so anyone can exercise the flow.
const DEMO_CREDENTIAL_SECRET_HEX =
  '7665696c64726f702d64656d6f2d63726564656e7469616c2d73656372657421';

const hexToBytes = (hex) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
};

const bytesToHex = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const PREPROD_CONFIG = {
  walletNetworkId: 'preprod',
  networkId: 'preprod',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  nodeWS: 'wss://rpc.preprod.midnight.network',
  faucet: 'https://faucet.preprod.midnight.network/api/drips',
  proofServer: process.env.VEILDROP_PROOF_SERVER ?? 'http://127.0.0.1:6300',
};

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');

class VeilDropWallet {
  constructor(logger, wallet, zswapSecretKeys, dustSecretKey, unshieldedKeystore) {
    this.logger = logger;
    this.wallet = wallet;
    this.zswapSecretKeys = zswapSecretKeys;
    this.dustSecretKey = dustSecretKey;
    this.unshieldedKeystore = unshieldedKeystore;
  }

  getCoinPublicKey() {
    return this.zswapSecretKeys.coinPublicKey;
  }

  getEncryptionPublicKey() {
    return this.zswapSecretKeys.encryptionPublicKey;
  }

  async balanceTx(tx, ttl = ttlOneHour()) {
    const recipe = await this.wallet.balanceUnboundTransaction(
      tx,
      {
        shieldedSecretKeys: this.zswapSecretKeys,
        dustSecretKey: this.dustSecretKey,
      },
      { ttl },
    );
    return await this.wallet.finalizeRecipe(recipe);
  }

  submitTx(tx) {
    return this.wallet.submitTransaction(tx);
  }

  async start() {
    this.logger.info('Starting wallet...');
    await this.wallet.start(this.zswapSecretKeys, this.dustSecretKey);
  }

  async stop() {
    return this.wallet.stop();
  }

  static async build(logger, env, secret) {
    const dustOptions = {
      ledgerParams: LedgerParameters.initialParameters(),
      additionalFeeOverhead: 1_000n,
      feeBlocksMargin: 5,
    };
    let builder = FluentWalletBuilder.forEnvironment(env).withDustOptions(dustOptions);
    if (secret.includes(' ')) {
      builder = builder.withMnemonic(secret);
    } else {
      builder = builder.withSeed(secret);
    }
    const buildResult = await builder.buildWithoutStarting();
    const { wallet, seeds, keystore } = buildResult;
    return new VeilDropWallet(
      logger,
      wallet,
      ZswapSecretKeys.fromSeed(seeds.shielded),
      DustSecretKey.fromSeed(seeds.dust),
      keystore,
    );
  }
}

function isProgressStrictlyComplete(progress) {
  if (!progress || typeof progress !== 'object') return false;
  const candidate = progress;
  if (typeof candidate.isStrictlyComplete !== 'function') return false;
  return candidate.isStrictlyComplete();
}

async function syncWallet(logger, wallet, timeout = 300_000) {
  logger.info('Syncing wallet...');
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.filter(
        (state) =>
          isProgressStrictlyComplete(state.shielded.state.progress) &&
          isProgressStrictlyComplete(state.dust.state.progress) &&
          isProgressStrictlyComplete(state.unshielded.progress),
      ),
      Rx.timeout({
        each: timeout,
        with: () =>
          Rx.throwError(() => new Error(`Wallet sync timeout after ${timeout}ms`)),
      }),
    ),
  );
}

function buildProviders(wallet, zkConfigPath) {
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  return {
    privateStateProvider: levelPrivateStateProvider({
      midnightDbName: 'veildrop-deploy-db',
      privateStateStoreName: `veildrop-private-${Date.now()}`,
      signingKeyStoreName: `veildrop-signing-${Date.now()}`,
      privateStoragePasswordProvider: () => 'VeilDropDeploy#2026',
      accountId: wallet.getCoinPublicKey(),
    }),
    publicDataProvider: indexerPublicDataProvider(
      PREPROD_CONFIG.indexer,
      PREPROD_CONFIG.indexerWS,
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(
      PREPROD_CONFIG.proofServer,
      zkConfigProvider,
    ),
    walletProvider: wallet,
    midnightProvider: wallet,
  };
}

async function ensureProofServer(proofServer) {
  try {
    const response = await fetch(`${proofServer}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(`proof server /health returned ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Proof server not reachable at ${proofServer}. Start one with: ` +
        `docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0\n(${String(error)})`,
    );
  }
}

async function requestFaucetDrip(faucetUrl, unshieldedAddress) {
  const faucet = new FaucetClient(faucetUrl, pino({ level: 'silent' }));
  try {
    await faucet.requestTokens(unshieldedAddress);
    console.log(`Requested a faucet drip to ${unshieldedAddress}`);
  } catch (error) {
    console.warn(`Faucet drip failed (wallet may already be funded): ${String(error)}`);
  }
}

async function main() {
  const seed = process.env.VEILDROP_SEED?.trim();
  if (!seed) {
    throw new Error(
      'Set VEILDROP_SEED to a Preprod wallet seed (64-char hex master seed or mnemonic).',
    );
  }

  const authorizedCredentialHashHex =
    process.env.VEILDROP_AUTHORIZED_CREDENTIAL_HASH?.trim() ?? '';
  const authorizedCredentialHash = authorizedCredentialHashHex
    ? hexToBytes(authorizedCredentialHashHex)
    : VeilDrop.pureCircuits.credentialCommitment(
        hexToBytes(DEMO_CREDENTIAL_SECRET_HEX),
      );

  console.log('== VeilDrop deploy to Midnight Preprod ==');
  console.log(`proof server : ${PREPROD_CONFIG.proofServer}`);
  console.log(`authorized credential hash: ${bytesToHex(authorizedCredentialHash)}`);

  await ensureProofServer(PREPROD_CONFIG.proofServer);
  setNetworkId(PREPROD_CONFIG.networkId);

  const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport: { target: 'pino-pretty' },
  });

  console.log('Building wallet from seed...');
  const wallet = await VeilDropWallet.build(logger, PREPROD_CONFIG, seed);
  await wallet.start();
  await syncWallet(logger, wallet.wallet, 600_000);

  const unshieldedAddress = wallet.unshieldedKeystore
    .getBech32Address()
    .asString();
  console.log(`Wallet ready. Unshielded address: ${unshieldedAddress}`);

  await requestFaucetDrip(PREPROD_CONFIG.faucet, unshieldedAddress);
  await syncWallet(logger, wallet.wallet, 600_000);

  const providers = buildProviders(wallet, './contract/managed/veildrop');

  const reporterSecret = randomBytes(32);
  const credentialSecret = hexToBytes(DEMO_CREDENTIAL_SECRET_HEX);
  const privateState = createVeilDropPrivateState(
    reporterSecret,
    credentialSecret,
  );

  console.log('Deploying VeilDrop contract...');
  const deployed = await deployContract(providers, {
    compiledContract: CompiledVeilDropContract,
    privateStateId: 'veildrop',
    initialPrivateState: privateState,
    args: [authorizedCredentialHash],
  });

  const contractAddress = deployed.deployTxData.public.contractAddress;
  console.log(`\n=== Deployed on Midnight Preprod ===`);
  console.log(`contract address: ${contractAddress}`);
  console.log(
    `explorer        : https://explorer.1am.xyz/?network=preprod&contractAddress=${contractAddress}`,
  );
  console.log('Point the DApp at it with:');
  console.log(`NEXT_PUBLIC_VEILDROP_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(
    `NEXT_PUBLIC_VEILDROP_AUTHORIZED_CREDENTIAL_HASH=${bytesToHex(authorizedCredentialHash)}`,
  );

  await mkdir(resolve(ROOT, 'docs'), { recursive: true });
  await writeFile(
    resolve(ROOT, 'docs/preprod-deployment.md'),
    [
      '# VeilDrop — Midnight Preprod deployment',
      '',
      `Deployed on **${new Date().toISOString()}** via \`scripts/deploy-preprod.mjs\`.`,
      '',
      `- **Contract address**: \`${contractAddress}\``,
      `- **Authorized credential hash**: \`${bytesToHex(authorizedCredentialHash)}\``,
      '- **Network**: Midnight Preprod (`networkId=preprod`)',
      '- **Verification**: open the address in the [Preprod explorer](https://explorer.1am.xyz/?network=preprod).',
      '',
      'The contract state is public; the reporter credential and report content never appear on the ledger.',
      '',
    ].join('\n'),
    'utf8',
  );
  console.log('Evidence written to docs/preprod-deployment.md');

  await wallet.stop();
  console.log('Done.');
}

main().catch((error) => {
  console.error(`\nDeployment failed: ${String(error)}`);
  process.exitCode = 1;
});
