/**
 * Copy repo-root Vite `dist/` into `server/dist/public/` so Express can serve
 * the SPA from a path colocated with the compiled entry (`server/dist/server.js`).
 * Hostinger-safe: does not rely on process.cwd() alone.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'dist');
const dest = path.join(root, 'server', 'dist', 'public');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    const fromPath = path.join(from, ent.name);
    const toPath = path.join(to, ent.name);
    if (ent.isDirectory()) copyDir(fromPath, toPath);
    else fs.copyFileSync(fromPath, toPath);
  }
}

if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.error('Frontend dist/index.html missing. Run build:frontend first.');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
copyDir(src, dest);
console.info(`Synced frontend → ${dest}`);
