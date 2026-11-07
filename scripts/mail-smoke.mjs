/**
 * Local mail smoke test for the PHP API.
 *
 * Boots the PHP API against SQLite with two transports:
 *  - development + file transport: the rendered message lands in the private
 *    outbox, so the whole pipeline (template → endpoint → token → single use)
 *    can be exercised without a mailbox.
 *  - production + SMTP: unreachable host, so honest 503s, rollback and
 *    no-token-leak behaviour are exercised against the real SMTP path.
 *
 * Run with: npm run test:mail
 *
 * Note: the bundled php-cli (WASM) runtime has no working stream_select, so a
 * full SMTP conversation cannot complete locally. SMTP acceptance itself is
 * verified on the server once real mailbox credentials are configured; see
 * HOSTINGER.md.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nativePhp = process.env.DS_SMOKE_PHP || '';
const phpBin = path.join(root, 'node_modules', 'php-cli', 'php-cli.js');
const apiRoot = path.join(root, 'public', 'api');
const sqlitePath = path.join(apiRoot, 'storage', 'mail-smoke.sqlite');
const mailLog = path.join(apiRoot, 'storage', 'private', 'logs', 'mail.log');
const outboxDir = path.join(apiRoot, 'storage', 'private', 'outbox');
const phpPort = 8766;
const base = `http://127.0.0.1:${phpPort}`;
const smtpClosedPort = 2599;
// The repository may carry a developer's config.local.php, which takes precedence
// over environment variables. Point the smoke run at an explicit config that
// reflects each phase's environment so local settings cannot mask production paths.
const smokeConfigPath = path.join(apiRoot, 'storage', 'mail-smoke.config.local.php');
fs.mkdirSync(path.dirname(smokeConfigPath), { recursive: true });
fs.writeFileSync(
  smokeConfigPath,
  `<?php
$map = [
    'db_driver' => 'DS_DB_DRIVER',
    'sqlite_path' => 'DS_SQLITE_PATH',
    'app_env' => 'DS_APP_ENV',
    'app_url' => 'DS_APP_URL',
    'cookie_secure' => 'DS_COOKIE_SECURE',
    'mail_transport' => 'DS_MAIL_TRANSPORT',
    'smtp_host' => 'DS_SMTP_HOST',
    'smtp_port' => 'DS_SMTP_PORT',
    'smtp_secure' => 'DS_SMTP_SECURE',
    'smtp_user' => 'DS_SMTP_USER',
    'smtp_pass' => 'DS_SMTP_PASS',
    'mail_from' => 'DS_MAIL_FROM',
    'mail_from_name' => 'DS_MAIL_FROM_NAME',
    'mail_reply_to' => 'DS_MAIL_REPLY_TO',
    'membership_fee_enabled' => 'DS_MEMBERSHIP_FEE_ENABLED',
    'membership_fee_amount' => 'DS_MEMBERSHIP_FEE_AMOUNT',
    'membership_currency' => 'DS_MEMBERSHIP_CURRENCY',
];
$out = [];
foreach ($map as $key => $env) {
    $value = getenv($env);
    if ($value !== false && $value !== '') {
        $out[$key] = $value;
    }
}
if (isset($out['cookie_secure'])) {
    $out['cookie_secure'] = filter_var($out['cookie_secure'], FILTER_VALIDATE_BOOLEAN);
}
foreach (['smtp_port', 'membership_fee_amount'] as $numeric) {
    if (isset($out[$numeric])) {
        $out[$numeric] = (float) $out[$numeric];
    }
}
if (isset($out['membership_fee_enabled'])) {
    $out['membership_fee_enabled'] = filter_var($out['membership_fee_enabled'], FILTER_VALIDATE_BOOLEAN);
}
return $out;`,
);

const collectedTokens = [];
const failures = [];
const passes = [];

function check(label, condition, detail = '') {
  if (condition) {
    passes.push(label);
    console.log(`PASS ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function runPhp(args, env = {}) {
  const [command, commandArgs] = nativePhp
    ? [nativePhp, args]
    : [process.execPath, [phpBin, ...args]];
  return spawn(command, commandArgs, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runPhpCheck(env, code) {
  return new Promise((resolve, reject) => {
    const [command, commandArgs] = nativePhp
      ? [nativePhp, ['-r', code]]
      : [process.execPath, [phpBin, '-r', code]];
    const proc = spawn(command, commandArgs, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    proc.stdout.on('data', (d) => (out += d));
    proc.stderr.on('data', (d) => (out += d));
    proc.on('exit', (status) => (status === 0 ? resolve(out) : reject(new Error(out))));
  });
}

function sqlite(code) {
  const pathSql = sqlitePath.replace(/\\/g, '/');
  return runPhpCheck({}, `$pdo = new PDO('sqlite:${pathSql}');\n${code}`);
}

async function bootPhpServer(env) {
  const server = runPhp(['-S', `127.0.0.1:${phpPort}`, '-t', apiRoot, path.join(apiRoot, 'router.php')], env);
  let log = '';
  server.stdout.on('data', (d) => (log += d));
  server.stderr.on('data', (d) => {
    log += d;
    if (process.env.DS_SMOKE_DEBUG) process.stderr.write(d);
  });

  for (let i = 0; i < 40; i += 1) {
    if (server.exitCode !== null) {
      throw new Error(`PHP server exited during startup:\n${log.slice(-1500)}`);
    }
    try {
      const res = await fetch(`${base}/health`);
      if (res.ok) return { server, log: () => log };
    } catch {
      // not ready yet
    }
    await sleep(150);
  }
  throw new Error(`PHP server did not start:\n${log.slice(-1500)}`);
}

async function stopServer(server) {
  if (!server) return;
  await new Promise((resolve) => {
    if (server.exitCode !== null) return resolve();
    server.once('exit', resolve);
    server.kill('SIGTERM');
    setTimeout(resolve, 2000);
  });
  // Do not let the next phase start while a previous listener still owns the port.
  for (let i = 0; i < 30; i += 1) {
    try {
      await fetch(`${base}/health`, { signal: AbortSignal.timeout(300) });
    } catch {
      return;
    }
    await sleep(100);
  }
  throw new Error('Previous PHP server did not release the port.');
}

function mergeCookies(existing, setCookieHeaders) {
  const map = new Map();
  for (const part of (existing || '').split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k) map.set(k, rest.join('='));
  }
  for (const header of setCookieHeaders) {
    const first = header.split(';')[0];
    const [k, ...rest] = first.split('=');
    if (!k) continue;
    const value = rest.join('=');
    if (!value || header.toLowerCase().includes('max-age=0')) map.delete(k.trim());
    else map.set(k.trim(), value);
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function request(method, urlPath, { body, cookie } = {}) {
  const res = await fetch(`${base}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, text, setCookie: res.headers.getSetCookie?.() || [] };
}

/** Outbox messages written since `known` (a previous outbox snapshot). */
function outboxMessages(known = new Set()) {
  if (!fs.existsSync(outboxDir)) return [];
  return fs
    .readdirSync(outboxDir)
    .filter((name) => name.endsWith('.eml') && !known.has(name))
    .sort()
    .map((name) => parseMessage(fs.readFileSync(path.join(outboxDir, name), 'utf8')));
}

function outboxSnapshot() {
  if (!fs.existsSync(outboxDir)) return new Set();
  return new Set(fs.readdirSync(outboxDir).filter((name) => name.endsWith('.eml')));
}

function parseMessage(raw) {
  const split = raw.indexOf('\r\n\r\n');
  const headers = split === -1 ? raw : raw.slice(0, split);
  const body = split === -1 ? '' : raw.slice(split + 4);
  const header = (name) => (headers.match(new RegExp(`^${name}:\\s*(.*)$`, 'im'))?.[1] || '').trim();
  return { headers, body, header, raw };
}

function tokenFrom(message, route) {
  const match = message.body.match(new RegExp(`${route.replace(/\//g, '\\/')}\\?token=([a-f0-9]{64})`));
  return match ? match[1] : null;
}

function setupDatabase() {
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  if (fs.existsSync(sqlitePath)) fs.unlinkSync(sqlitePath);
  if (fs.existsSync(mailLog)) fs.unlinkSync(mailLog);
  if (fs.existsSync(outboxDir)) fs.rmSync(outboxDir, { recursive: true, force: true });
  fs.mkdirSync(outboxDir, { recursive: true });

  return sqlite(`
      $pdo->exec("CREATE TABLE users (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        account_status TEXT NOT NULL DEFAULT 'active',
        email_verified_at TEXT NULL,
        phone_verified_at TEXT NULL,
        last_login_at TEXT NULL,
        terms_accepted_at TEXT NOT NULL,
        onboarding_choice TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )");
      $pdo->exec("CREATE TABLE email_verification_tokens (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL, used_at TEXT NULL, created_at TEXT NOT NULL
      )");
      $pdo->exec("CREATE TABLE password_reset_tokens (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL, used_at TEXT NULL, created_at TEXT NOT NULL
      )");
      $pdo->exec('CREATE TABLE provider_profiles (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, slug TEXT, display_name TEXT,
        provider_type TEXT, gender TEXT, business_name TEXT, contact_first_name TEXT,
        contact_last_name TEXT, city TEXT, country TEXT, about TEXT, services_json TEXT,
        rates_json TEXT, starting_price REAL, primary_image TEXT, profile_completion INTEGER,
        profile_completed_at TEXT, created_at TEXT, updated_at TEXT
      )');
      $pdo->exec('CREATE TABLE provider_verification (
        id TEXT PRIMARY KEY, provider_user_id TEXT NOT NULL, phone_verified_at TEXT,
        email_verified_at TEXT, identity_status TEXT, payment_status TEXT,
        verification_status TEXT, verification_fee_amount REAL, currency TEXT,
        submitted_for_review_at TEXT, verified_at TEXT, admin_notes TEXT,
        rejection_reason TEXT, created_at TEXT, updated_at TEXT
      )');
      $pdo->exec('CREATE TABLE provider_verification_payments (
        id TEXT PRIMARY KEY, provider_user_id TEXT NOT NULL, amount REAL, currency TEXT,
        status TEXT, gateway TEXT, created_at TEXT, updated_at TEXT
      )');
      $pdo->exec('CREATE TABLE provider_identity_documents (
        id TEXT PRIMARY KEY, provider_user_id TEXT NOT NULL, id_type TEXT, status TEXT,
        created_at TEXT, updated_at TEXT
      )');
      echo 'ok';
  `);
}

function promoteToProvider(email) {
  return sqlite(`$pdo->prepare("UPDATE users SET role = 'massage_provider' WHERE email = ?")->execute(['${email}']);
    echo 'ok';`);
}

function countTokens(table, email) {
  return sqlite(`$stmt = $pdo->prepare("SELECT COUNT(*) FROM ${table} WHERE user_id = (SELECT id FROM users WHERE email = ?)");
    $stmt->execute(['${email}']);
    echo (string) $stmt->fetchColumn();`);
}

function registerBody(email, phoneSuffix) {
  return {
    firstName: 'Mail',
    lastName: 'Smoke',
    email,
    phone: `+23320${phoneSuffix}`,
    password: 'Testpass1',
    confirmPassword: 'Testpass1',
    termsAccepted: true,
  };
}

async function main() {
  if (!nativePhp && !fs.existsSync(phpBin)) {
    console.error('php-cli missing; installing temporarily…');
    const inst = spawn('npm', ['install', '--no-save', 'php-cli@0.1.5'], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    });
    await new Promise((resolve, reject) => {
      inst.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('php-cli install failed'))));
    });
  }

  await setupDatabase();

  const rateLimitDir = path.join(apiRoot, 'storage', 'mail-smoke-rate');
  fs.rmSync(rateLimitDir, { recursive: true, force: true });
  fs.mkdirSync(rateLimitDir, { recursive: true });

  const devEnv = {
    DS_CONFIG_PATH: smokeConfigPath,
    DS_DB_DRIVER: 'sqlite',
    DS_SQLITE_PATH: sqlitePath,
    DS_APP_ENV: 'development',
    DS_COOKIE_SECURE: 'false',
    DS_APP_URL: 'https://massagerstudio.com',
    DS_MAIL_TRANSPORT: 'file',
    DS_MAIL_FROM: 'info@massagerstudio.com',
    DS_MAIL_FROM_NAME: 'Massager Studio',
    DS_MAIL_REPLY_TO: 'contact@massagerstudio.com',
    DS_RATE_LIMIT_DIR: rateLimitDir,
  };

  const stamp = Date.now();
  const email = `mail_smoke_${stamp}@example.com`;
  // Monotonic suffix so fixtures never collide on the users.phone unique index.
  let phoneSeq = 0;
  const nextPhoneSuffix = () => `${String(stamp).slice(-6)}${String((phoneSeq += 1)).padStart(2, '0')}`;

  let php = await bootPhpServer(devEnv);
  try {
    // 1 — registration renders and delivers a confirmation email
    let seen = outboxSnapshot();
    const reg = await request('POST', '/auth/register', { body: registerBody(email, nextPhoneSuffix()) });
    check('register returns 201', reg.status === 201, `got ${reg.status}: ${reg.text}`);
    check('register reports the confirmation email was sent', reg.json?.data?.verificationEmailSent === true);

    const regMessages = outboxMessages(seen);
    check('one confirmation message was delivered', regMessages.length === 1, `count=${regMessages.length}`);
    const verifyMessage = regMessages[0];

    if (verifyMessage) {
      check('confirmation is addressed to the registered address', verifyMessage.header('To').includes(email));
      check(
        'confirmation is sent from the info@ sender',
        /info@massagerstudio\.com/i.test(verifyMessage.header('From')),
        verifyMessage.header('From'),
      );
      check('sender display name is Massager Studio', /Massager Studio/.test(verifyMessage.header('From')));
      check(
        'Reply-To is the public contact inbox',
        /contact@massagerstudio\.com/i.test(verifyMessage.header('Reply-To')),
        verifyMessage.header('Reply-To'),
      );
      check(
        'subject is branded',
        verifyMessage.header('Subject') === 'Confirm your Massager Studio email address',
        verifyMessage.header('Subject'),
      );
      check('message carries the Massager Studio wordmark', /MASSAGER STUDIO/.test(verifyMessage.body));
      check(
        'message links to the configured app URL',
        verifyMessage.body.includes('https://massagerstudio.com/verify-email?token='),
      );

      const verifyToken = tokenFrom(verifyMessage, '/verify-email');
      check('confirmation token found in the message', Boolean(verifyToken));

      // 1b — resend issues a fresh link and retires the previous one
      const regCookie = mergeCookies('', reg.setCookie);
      seen = outboxSnapshot();
      const resend = await request('POST', '/auth/resend-verification', {
        cookie: regCookie,
        body: {},
      });
      check(
        'resend sends a new confirmation email',
        resend.status === 200 && resend.json?.data?.sent === true,
        resend.text,
      );
      const resentMessages = outboxMessages(seen);
      check('resend delivers exactly one message', resentMessages.length === 1, `count=${resentMessages.length}`);
      const resentToken = resentMessages[0] ? tokenFrom(resentMessages[0], '/verify-email') : null;
      check('resent link carries a token', Boolean(resentToken));

      if (verifyToken) {
        const stale = await request('POST', '/auth/verify-email', { body: { token: verifyToken } });
        check('resend retires the earlier confirmation link', stale.status === 400, stale.text);
      }

      // Expired links are rejected even when unused.
      const expiredToken = 'e'.repeat(64);
      await sqlite(`$pdo->prepare("INSERT INTO email_verification_tokens
          (id, user_id, token_hash, expires_at, used_at, created_at)
          SELECT 'exp_${stamp}', id, ?, '2020-01-01 00:00:00', NULL, '2020-01-01 00:00:00'
          FROM users WHERE email = ?")
        ->execute([hash('sha256', '${'e'.repeat(64)}'), '${email}']);
        echo 'ok';`);
      const expired = await request('POST', '/auth/verify-email', { body: { token: expiredToken } });
      check('expired confirmation tokens are rejected', expired.status === 400, expired.text);

      if (resentToken) {
        collectedTokens.push(resentToken);
        const verified = await request('POST', '/auth/verify-email', { body: { token: resentToken } });
        check('emailed confirmation token verifies the account', verified.json?.data?.verified === true, verified.text);

        const reuse = await request('POST', '/auth/verify-email', { body: { token: resentToken } });
        check('confirmation token is single-use', reuse.status === 400, reuse.text);
      }
    }

    // 2 — password reset delivers a working, single-use link
    seen = outboxSnapshot();
    const forgot = await request('POST', '/auth/forgot-password', { body: { email } });
    check('forgot-password returns 200', forgot.status === 200);
    check(
      'forgot-password stays generic',
      forgot.json?.data?.message === 'If an account exists for that email, reset instructions have been sent.',
    );
    check('forgot-password reports delivery in development', forgot.json?.data?.emailSent === true);

    const resetMessages = outboxMessages(seen);
    check('one reset message was delivered', resetMessages.length === 1, `count=${resetMessages.length}`);
    const resetMessage = resetMessages[0];
    if (resetMessage) {
      check(
        'reset subject is branded',
        resetMessage.header('Subject') === 'Reset your Massager Studio password',
        resetMessage.header('Subject'),
      );
      check('reset message is addressed to the account holder', resetMessage.header('To').includes(email));
      const resetToken = tokenFrom(resetMessage, '/reset-password');
      check('reset token found in the message', Boolean(resetToken));
      if (resetToken) {
        collectedTokens.push(resetToken);
        const newPassword = 'Newpass123';
        const reset = await request('POST', '/auth/reset-password', {
          body: { token: resetToken, password: newPassword, confirmPassword: newPassword },
        });
        check('reset link sets a new password', reset.status === 200, reset.text);

        const loginNew = await request('POST', '/auth/login', {
          body: { identifier: email, password: newPassword },
        });
        check('login works with the reset password', loginNew.status === 200, loginNew.text);

        const reuseReset = await request('POST', '/auth/reset-password', {
          body: { token: resetToken, password: 'Another123', confirmPassword: 'Another123' },
        });
        check('reset token is single-use', reuseReset.status === 400, reuseReset.text);
      }
      check('reset message has no HTML in the plain-text part', !/<html|<table/i.test(resetMessage.headers));
    }

    // 3 — unknown address sends nothing but answers identically
    seen = outboxSnapshot();
    const unknown = await request('POST', '/auth/forgot-password', { body: { email: `nobody_${stamp}@example.com` } });
    check(
      'unknown address gets the same generic response',
      unknown.status === 200 && unknown.json?.data?.emailSent === undefined,
      unknown.text,
    );
    check('unknown address sends no email', outboxMessages(seen).length === 0);

    // 4 — provider + agency signup: exactly one confirmation link, shared flow
    const providerEmail = `mail_provider_dev_${stamp}@example.com`;
    seen = outboxSnapshot();
    const regProvider = await request('POST', '/provider/register.php', {
      body: {
        ...registerBody(providerEmail, nextPhoneSuffix()),
        displayName: 'Mail Provider',
        providerType: 'individual',
        gender: 'female',
      },
    });
    check('provider registration returns 201', regProvider.status === 201, regProvider.text);
    check(
      'provider registration reports the confirmation email was sent',
      regProvider.json?.data?.verificationEmailSent === true,
    );
    const providerCookie = mergeCookies('', regProvider.setCookie);
    check('provider registration signs the account in', Boolean(providerCookie), regProvider.text);

    const initialProviderMessages = outboxMessages(seen);
    check('provider signup sends exactly one email', initialProviderMessages.length === 1, `count=${initialProviderMessages.length}`);
    const initialProviderToken = initialProviderMessages[0]
      ? tokenFrom(initialProviderMessages[0], '/verify-email')
      : null;
    check('provider signup email carries a confirmation link', Boolean(initialProviderToken));

    // 4b — the legacy resend endpoint now sends the same link and retires the older one
    seen = outboxSnapshot();
    const providerResend = await request('POST', '/provider/send-email-code.php', {
      cookie: providerCookie,
      body: {},
    });
    check(
      'legacy provider resend delegates to the shared flow',
      providerResend.status === 200 && providerResend.json?.data?.sent === true,
      providerResend.text,
    );
    const providerResentMessages = outboxMessages(seen);
    check('provider resend delivers exactly one email', providerResentMessages.length === 1, `count=${providerResentMessages.length}`);
    const providerResent = providerResentMessages[0];
    check(
      'provider resend uses the shared confirmation subject',
      providerResent
        ? providerResent.header('Subject') === 'Confirm your Massager Studio email address'
        : false,
      providerResent ? providerResent.header('Subject') : 'missing',
    );
    const providerToken = providerResent ? tokenFrom(providerResent, '/verify-email') : null;
    check('provider resend carries a confirmation link', Boolean(providerToken));
    if (initialProviderToken) {
      const staleProvider = await request('POST', '/auth/verify-email', { body: { token: initialProviderToken } });
      check('provider resend retires the earlier link', staleProvider.status === 400, staleProvider.text);
    }

    // 4c — confirming without a session updates users and provider_verification
    if (providerToken) {
      collectedTokens.push(providerToken);
      const providerVerified = await request('POST', '/auth/verify-email', { body: { token: providerToken } });
      check(
        'provider link verifies without a signed-in session',
        providerVerified.status === 200 && providerVerified.json?.data?.verified === true,
        providerVerified.text,
      );
      const providerState = await sqlite(
        `$stmt = $pdo->prepare("SELECT u.email_verified_at, v.email_verified_at AS provider_email_verified_at
           FROM users u LEFT JOIN provider_verification v ON v.provider_user_id = u.id WHERE u.email = ?");
         $stmt->execute(['${providerEmail}']); echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));`,
      );
      let state = {};
      try {
        state = JSON.parse(providerState.trim());
      } catch {
        state = {};
      }
      check('provider confirmation updates users.email_verified_at', Boolean(state.email_verified_at), providerState);
      check(
        'provider confirmation updates provider_verification.email_verified_at',
        Boolean(state.provider_email_verified_at),
        providerState,
      );

      const providerReuse = await request('POST', '/auth/verify-email', { body: { token: providerToken } });
      check('provider confirmation link is single-use', providerReuse.status === 400, providerReuse.text);
    }

    // 4d — agency signup uses the same single-link flow
    const agencyEmail = `mail_agency_dev_${stamp}@example.com`;
    seen = outboxSnapshot();
    const regAgency = await request('POST', '/provider/register.php', {
      body: {
        ...registerBody(agencyEmail, nextPhoneSuffix()),
        displayName: 'Mail Agency',
        businessName: 'Mail Agency',
        providerType: 'agency',
      },
    });
    check('agency registration returns 201', regAgency.status === 201, regAgency.text);
    check('agency registration reports the confirmation email was sent', regAgency.json?.data?.verificationEmailSent === true);
    const agencyMessages = outboxMessages(seen);
    check('agency signup sends exactly one email', agencyMessages.length === 1, `count=${agencyMessages.length}`);
    const agencyToken = agencyMessages[0] ? tokenFrom(agencyMessages[0], '/verify-email') : null;
    if (agencyToken) {
      const agencyVerified = await request('POST', '/auth/verify-email', { body: { token: agencyToken } });
      check(
        'agency link verifies without a session',
        agencyVerified.status === 200 && agencyVerified.json?.data?.verified === true,
        agencyVerified.text,
      );
      const agencyState = await sqlite(
        `$stmt = $pdo->prepare("SELECT u.email_verified_at, v.email_verified_at AS provider_email_verified_at
           FROM users u LEFT JOIN provider_verification v ON v.provider_user_id = u.id WHERE u.email = ?");
         $stmt->execute(['${agencyEmail}']); echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));`,
      );
      let agency = {};
      try {
        agency = JSON.parse(agencyState.trim());
      } catch {
        agency = {};
      }
      check('agency confirmation updates users.email_verified_at', Boolean(agency.email_verified_at), agencyState);
      check(
        'agency confirmation updates provider_verification.email_verified_at',
        Boolean(agency.provider_email_verified_at),
        agencyState,
      );
    }

    // 4e — cached clients can still confirm through the old provider endpoint
    const legacyEmail = `mail_legacy_dev_${stamp}@example.com`;
    seen = outboxSnapshot();
    const regLegacy = await request('POST', '/provider/register.php', {
      body: {
        ...registerBody(legacyEmail, nextPhoneSuffix()),
        displayName: 'Legacy Provider',
        providerType: 'individual',
        gender: 'male',
      },
    });
    const legacyCookie = mergeCookies('', regLegacy.setCookie);
    const legacyMessages = outboxMessages(seen);
    const legacyToken = legacyMessages[0] ? tokenFrom(legacyMessages[0], '/verify-email') : null;
    if (legacyToken) {
      const legacyVerified = await request('POST', '/provider/verify-email.php', {
        cookie: legacyCookie,
        body: { token: legacyToken },
      });
      check(
        'legacy provider verify endpoint still works',
        legacyVerified.status === 200 && legacyVerified.json?.data?.verified === true,
        legacyVerified.text,
      );
    }

    // 4f — provider progress reflects the confirmed email
    const providerLogin = await request('POST', '/auth/login', {
      body: { identifier: providerEmail, password: 'Testpass1' },
    });
    check('provider login works', providerLogin.status === 200, providerLogin.text);

    // 4b — free membership: no payment record, no phone gate, review still gated by identity + email
    await sqlite(`$pdo->prepare("UPDATE provider_profiles
        SET profile_completion = 95, profile_completed_at = '2026-01-01 00:00:00',
            city = COALESCE(NULLIF(city, ''), 'Accra'), country = COALESCE(NULLIF(country, ''), 'Ghana'),
            updated_at = '2026-01-01 00:00:00'
        WHERE user_id = (SELECT id FROM users WHERE email = ?)")
        ->execute(['${providerEmail}']);
      $pdo->prepare("UPDATE provider_verification SET identity_status = 'pending',
        phone_verified_at = NULL WHERE provider_user_id = (SELECT id FROM users WHERE email = ?)")
        ->execute(['${providerEmail}']);
      echo 'ok';`);

    const payGet = await request('GET', '/provider/payment.php', { cookie: providerCookie });
    check(
      'membership is free by default',
      payGet.status === 200 && payGet.json?.data?.free === true && payGet.json?.data?.feeAmount === 0,
      payGet.text,
    );
    const payPost = await request('POST', '/provider/payment.php', { cookie: providerCookie, body: {} });
    check(
      'free membership never records a payment intent',
      payPost.status === 200 && payPost.json?.data?.initiated === false,
      payPost.text,
    );
    const paymentRows = await sqlite(
      `$stmt = $pdo->prepare("SELECT COUNT(*) FROM provider_verification_payments WHERE provider_user_id = (SELECT id FROM users WHERE email = ?)");
       $stmt->execute(['${providerEmail}']); echo (string) $stmt->fetchColumn();`,
    );
    check('no payment row was created for a free membership', paymentRows.trim() === '0', paymentRows);

    seen = outboxSnapshot();
    const review = await request('POST', '/provider/submit-review.php', {
      cookie: providerCookie,
      body: {},
    });
    check('provider can submit for review without a phone verification', review.status === 200, review.text);
    check('submission reports the free membership', review.json?.data?.membershipFree === true, review.text);
    check('submission still goes to admin review', review.json?.data?.verificationStatus === 'pending_review');

    const reviewMessages = outboxMessages(seen);
    const reviewNotice = reviewMessages[0];
    check('admin review notice sent to info@', reviewNotice ? reviewNotice.header('To').includes('info@massagerstudio.com') : false);
    check(
      'admin review notice states the membership is free',
      reviewNotice ? /Free membership/.test(reviewNotice.raw) : false,
    );

    const dash = await request('GET', '/provider/dashboard.php', { cookie: providerCookie });
    check('dashboard reports a free membership', dash.json?.data?.membership?.free === true, dash.text);
    check(
      'dashboard does not require a membership fee',
      dash.json?.data?.progress?.membershipFeeRequired === false,
      dash.text,
    );
    check('dashboard counts the free membership as complete', dash.json?.data?.progress?.verificationFeePaid === true);
    check('dashboard keeps the phone unverified', dash.json?.data?.progress?.phoneVerified === false);
    check('dashboard shows the email as verified', dash.json?.data?.progress?.emailVerified === true);
  } finally {
    await stopServer(php.server);
  }

  // 5 — production with an unreachable SMTP host
  const prodEnv = {
    ...devEnv,
    DS_APP_ENV: 'production',
    DS_MAIL_TRANSPORT: 'smtp',
    DS_SMTP_HOST: '127.0.0.1',
    DS_SMTP_PORT: String(smtpClosedPort),
    DS_SMTP_SECURE: 'ssl',
    DS_SMTP_USER: 'info@massagerstudio.com',
    DS_SMTP_PASS: 'local-test-password',
  };
  php = await bootPhpServer(prodEnv);

  const prodEmail = `mail_prod_${stamp}@example.com`;
  try {
    const regProd = await request('POST', '/auth/register', {
      body: registerBody(prodEmail, nextPhoneSuffix()),
    });
    check('account creation survives delivery failure', regProd.status === 201, regProd.text);
    check('failed confirmation is reported truthfully', regProd.json?.data?.verificationEmailSent === false);

    const prodProviderEmail = `mail_prod_provider_${stamp}@example.com`;
    const regProdProvider = await request('POST', '/provider/register.php', {
      body: {
        ...registerBody(prodProviderEmail, nextPhoneSuffix()),
        displayName: 'Prod Provider',
        providerType: 'individual',
        gender: 'female',
      },
    });
    check('provider account creation survives delivery failure', regProdProvider.status === 201, regProdProvider.text);
    check(
      'provider signup reports failed delivery truthfully',
      regProdProvider.json?.data?.verificationEmailSent === false,
    );
    check('provider failure response leaks no token', !/demoToken|token/i.test(regProdProvider.text), regProdProvider.text);

    await promoteToProvider(prodEmail);
    const login = await request('POST', '/auth/login', { body: { identifier: prodEmail, password: 'Testpass1' } });
    const cookie = mergeCookies('', login.setCookie);
    check('production login works', login.status === 200, login.text);

    const tokensBefore = (await countTokens('email_verification_tokens', prodEmail)).trim();
    const codeFail = await request('POST', '/provider/send-email-code.php', { cookie, body: {} });
    check(
      'unreachable SMTP surfaces EMAIL_DELIVERY_FAILED',
      codeFail.status === 503 && codeFail.json?.error?.code === 'EMAIL_DELIVERY_FAILED',
      codeFail.text,
    );
    check('failure response leaks no token', !/demoToken|token/i.test(codeFail.text), codeFail.text);
    check(
      'failed delivery rolls back the new verification token',
      (await countTokens('email_verification_tokens', prodEmail)).trim() === tokensBefore,
      `before=${tokensBefore} after=${(await countTokens('email_verification_tokens', prodEmail)).trim()}`,
    );

    const prodForgot = await request('POST', '/auth/forgot-password', { body: { email: prodEmail } });
    check('production reset response has no dev token', prodForgot.json?.data?.devResetToken === undefined, prodForgot.text);
    check('production reset response stays generic', /If an account exists/.test(prodForgot.text));
    check(
      'failed reset delivery leaves no usable token behind',
      (await countTokens('password_reset_tokens', prodEmail)).trim() === '0',
    );
  } finally {
    await stopServer(php.server);
  }

  // 6 — the development file transport is refused in production
  php = await bootPhpServer({ ...prodEnv, DS_MAIL_TRANSPORT: 'file' });
  try {
    const login = await request('POST', '/auth/login', { body: { identifier: prodEmail, password: 'Testpass1' } });
    const cookie = mergeCookies('', login.setCookie);
    const refused = await request('POST', '/provider/send-email-code.php', { cookie, body: {} });
    check(
      'file transport is refused in production',
      refused.status === 503 && refused.json?.error?.code === 'EMAIL_NOT_CONFIGURED',
      refused.text,
    );
  } finally {
    await stopServer(php.server);
  }

  // 7 — missing SMTP settings refuse to send instead of pretending
  const unconfigured = await runPhpCheck(
    { ...devEnv, DS_MAIL_TRANSPORT: 'smtp', DS_SMTP_HOST: '', DS_SMTP_USER: '', DS_SMTP_PASS: '' },
    `require 'public/api/config/bootstrap.php';
     $result = ds_send_template('password_reset', 'person@example.com', 'Person', [
       'first_name' => 'Person',
       'link' => ds_app_link('/reset-password', ['token' => str_repeat('a', 64)]),
     ]);
     echo json_encode(['configured' => ds_mail_configured(), 'result' => $result]);`,
  );
  let unconfiguredJson = null;
  try {
    unconfiguredJson = JSON.parse(unconfigured.trim().split('\n').pop() || 'null');
  } catch {
    unconfiguredJson = null;
  }
  check('missing SMTP settings report as unconfigured', unconfiguredJson?.configured === false, unconfigured);
  check(
    'missing SMTP settings refuse to send',
    unconfiguredJson?.result?.sent === false && unconfiguredJson?.result?.code === 'not_configured',
    unconfigured,
  );

  // 8 — templates render a branded plain-text alternative
  const rendered = await runPhpCheck(
    devEnv,
    `require 'public/api/config/bootstrap.php';
     $out = [];
     foreach (['password_reset', 'verify_account'] as $name) {
       $vars = ['first_name' => 'Ada', 'link' => ds_app_link('/reset-password', ['token' => str_repeat('b', 64)]), 'token' => str_repeat('c', 64)];
       $m = ds_mail_template($name, $vars);
       $out[$name] = [
         'subject' => $m['subject'],
         'html_has_link' => str_contains($m['html'], 'https://massagerstudio.com/reset-password?token='),
         'text_has_link' => str_contains($m['text'], 'https://massagerstudio.com/reset-password?token='),
         'text_has_no_tags' => !preg_match('/<[a-z]/i', $m['text']),
         'branded' => str_contains($m['html'], 'MASSAGER STUDIO') && str_contains($m['text'], 'Massager Studio'),
         'contact_in_footer' => str_contains($m['html'], 'contact@massagerstudio.com'),
       ];
     }
     echo json_encode($out);`,
  );
  const templates = JSON.parse(rendered.trim().split('\n').pop() || '{}');
  for (const name of ['password_reset', 'verify_account']) {
    const t = templates[name] || {};
    check(`${name}: html links to the app URL`, t.html_has_link === true);
    check(`${name}: plain-text alternative has the link`, t.text_has_link === true);
    check(`${name}: plain-text alternative has no markup`, t.text_has_no_tags === true);
    check(`${name}: branded in both parts`, t.branded === true);
    check(`${name}: footer points at the public contact inbox`, t.contact_in_footer === true);
  }

  // 9 — diagnostics stay free of tokens and message bodies
  const log = fs.existsSync(mailLog) ? fs.readFileSync(mailLog, 'utf8') : '';
  check('mail log was written', log.trim().length > 0);
  check('mail log records refused and failed attempts', /"event":"refused"/.test(log) && /"event":"failed"/.test(log));
  check('mail log records the not_configured reason', /not_configured/.test(log));
  check(
    'no verification or reset token appears in the mail log',
    collectedTokens.every((token) => !log.includes(token)),
  );
  check('mail log masks recipient local parts', /"to":"[^"]?\*{3}@/.test(log));
  check('mail log contains no message bodies', !/MASSAGER STUDIO|Confirm your email/.test(log));

  console.log(`\n${passes.length} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.error('\nFAILURES:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('MAIL_SMOKE_OK');
  }
}

main().catch((err) => {
  console.error('MAIL_SMOKE_FAILED', err);
  process.exitCode = 1;
});
