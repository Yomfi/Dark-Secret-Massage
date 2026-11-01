/**
 * Wrapper for the PHP SMTP acceptance check.
 *
 * Prefers a native `php` binary (required for PHPMailer's stream_select).
 * Falls back to reporting that local WASM php-cli cannot complete SMTP.
 *
 * Run: npm run test:smtp
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'public', 'api', 'tools', 'send-smtp-test.php');
const configLocal = path.join(root, 'public', 'api', 'config', 'config.local.php');

function whichPhp() {
  const probe = spawnSync('php', ['-r', 'echo PHP_SAPI;'], { encoding: 'utf8' });
  if (probe.status === 0 && String(probe.stdout || '').includes('cli')) {
    return 'php';
  }
  return null;
}

const php = whichPhp();
if (!php) {
  console.log('SMTP_ACCEPTANCE_SKIPPED');
  console.log('Native PHP CLI is required for a real SMTP conversation.');
  console.log('The bundled WASM php-cli cannot complete PHPMailer SMTP (no stream_select).');
  console.log('On Hostinger (or any host with native PHP), run:');
  console.log('  php public/api/tools/send-smtp-test.php');
  if (!fs.existsSync(configLocal)) {
    console.log('');
    console.log('No config.local.php found locally. Enter SMTP settings privately on the server:');
    console.log('  smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, mail_from');
    console.log('  mail_from_name=Massager Studio');
    console.log('  mail_reply_to=contact@massagerstudio.com');
    console.log('Do not paste the mailbox password into chat.');
  }
  process.exit(0);
}

console.log(`Using native PHP: ${php}`);
console.log(`config.local.php present: ${fs.existsSync(configLocal) ? 'yes' : 'no'}`);

const result = spawnSync(php, [script], {
  cwd: root,
  encoding: 'utf8',
  env: process.env,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status == null ? 1 : result.status);
