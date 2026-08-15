import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30_000,
    include: ['lib/**/*.test.ts'],
    reporters: ['default'],
  },
});
