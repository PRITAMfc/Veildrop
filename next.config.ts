import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
    };
    config.module.rules.push({
      test: /midnight_onchain_runtime_wasm\.js$/,
      use: path.resolve(process.cwd(), 'scripts/next/wasm-entry-loader.mjs'),
    });
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      net: false,
      tls: false,
      child_process: false,
      crypto: false,
    };
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.js'],
    };
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'isomorphic-ws': path.resolve(process.cwd(), 'scripts/next/isomorphic-ws-shim.mjs'),
      };
    }
    if (!isServer) {
      config.output = {
        ...config.output,
        webassemblyModuleFilename: 'static/wasm/[modulehash].wasm',
      };
    }
    return config;
  },
};

export default nextConfig;
