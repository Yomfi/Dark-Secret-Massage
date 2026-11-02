#!/usr/bin/env node
/**
 * Remove local runtime state from the build output.
 *
 * Vite copies `public/` verbatim into `dist/`, which would ship local smoke-test
 * SQLite databases, session files, rate-limit counters, outbox messages and
 * `mail.log` to the server and overwrite the host's existing storage.
 *
 * The PHP API creates what it needs on first use:
 *   - api/config/auth.php   → api/storage/sessions (0700)
 *   - api/config/mailer.php → api/storage/private/{outbox,logs} (0700)
 *
 * So the directory is removed from `dist` rather than shipped.
 */
import { existsSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.cwd(), 'dist');
const targets = ['api/storage'];

// Never ship local secrets: a developer's config.local.php would otherwise be
// copied from public/ into dist/ and uploaded by the Git deployment.
const secretFiles = [
  'api/config/config.local.php',
  'api/config/massager-studio.config.local.php',
];
for (const rel of secretFiles) {
  const file = path.join(dist, rel);
  if (existsSync(file)) {
    rmSync(file, { force: true });
    console.log(`pruned ${rel} (local secret, never deploy)`);
  }
}

let removed = 0;
for (const rel of targets) {
  const dir = path.join(dist, rel);
  if (!existsSync(dir)) continue;
  removed += readdirSync(dir).length;
  rmSync(dir, { recursive: true, force: true });
  console.log(`pruned ${rel} (local runtime state, recreated by PHP with 0700)`);
}

if (!removed) {
  console.log('nothing to prune in dist/api/storage');
}
