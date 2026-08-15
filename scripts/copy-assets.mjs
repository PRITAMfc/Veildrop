import { mkdir, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const managed = join(root, 'contract', 'managed', 'veildrop');

const targets = [
  { src: join(managed, 'keys'), dest: join(root, 'public', 'keys') },
  { src: join(managed, 'zkir'), dest: join(root, 'public', 'zkir') },
];

for (const { src, dest } of targets) {
  if (!existsSync(src)) {
    console.warn(`[assets] Skipping missing managed assets: ${src}`);
    console.warn('[assets] Run `npm run compile` first to generate circuit keys.');
    continue;
  }
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true, force: true });
  console.log(`[assets] Copied ${src} -> ${dest}`);
}
