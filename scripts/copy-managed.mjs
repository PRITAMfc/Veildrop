import { cpSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const contractDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'contract');
rmSync(resolve(contractDir, 'dist'), { recursive: true, force: true });
cpSync(
  resolve(contractDir, 'managed'),
  resolve(contractDir, 'dist', 'managed'),
  { recursive: true },
);
console.log('contract/dist cleared and managed/ copied into dist/managed');
