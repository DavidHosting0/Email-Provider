import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const standalone = join(root, '.next/standalone/apps/web');

if (!existsSync(join(standalone, 'server.js'))) {
  console.error('Standalone build not found. Run next build first.');
  process.exit(1);
}

mkdirSync(join(standalone, '.next'), { recursive: true });
cpSync(join(root, '.next/static'), join(standalone, '.next/static'), { recursive: true });

if (existsSync(join(root, 'public'))) {
  cpSync(join(root, 'public'), join(standalone, 'public'), { recursive: true });
}

console.log('Copied static assets into standalone output.');
