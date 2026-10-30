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
const phpBin = path.join(root, 'node_modules', 'php-cli', 'php-cli.js');
const apiRoot = path.join(root, 'public', 'api');
const sqlitePath = path.join(apiRoot, 'storage', 'mail-smoke.sqlite');
const mailLog = path.join(apiRoot, 'storage', 'private', 'logs', 'mail.log');
const outboxDir = path.join(apiRoot, 'storage', 'private', 'outbox');
const phpPort = 8766;
const base = `http://127.0.0.1:${phpPort}`;
const smtpClosedPort = 2599;

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
  return spawn(process.execPath, [phpBin, ...args], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runPhpCheck(env, code) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [phpBin, '-r', code], {
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
  server.stderr.on('data', (d) => (log += d));

  for (let i = 0; i < 40; i += 1) {
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
  await new Promise((resolve) => {
    server.once('exit', resolve);
    server.kill('SIGTERM');
    setTimeout(resolve, 1500);
  });
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
  if (!fs.existsSync(phpBin)) {
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

  const devEnv = {
    DS_DB_DRIVER: 'sqlite',
    DS_SQLITE_PATH: sqlitePath,
    DS_APP_ENV: 'development',
    DS_COOKIE_SECURE: 'false',
    DS_APP_URL: 'https://massagerstudio.com',
    DS_MAIL_TRANSPORT: 'file',
    DS_MAIL_FROM: 'info@massagerstudio.com',
    DS_MAIL_FROM_NAME: 'Massager Studio',
    DS_MAIL_REPLY_TO: 'contact@massagerstudio.com',
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
      if (verifyToken) {
        collectedTokens.push(verifyToken);
        const verified = await request('POST', '/auth/verify-email', { body: { token: verifyToken } });
        check('emailed confirmation token verifies the account', verified.json?.data?.verified === true, verified.text);

        const reuse = await request('POST', '/auth/verify-email', { body: { token: verifyToken } });
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

    // 4 — provider verification code flow
    const providerEmail = `mail_provider_dev_${stamp}@example.com`;
    const regProvider = await request('POST', '/auth/register', {
      body: registerBody(providerEmail, nextPhoneSuffix()),
    });
    check('provider registration returns 201', regProvider.status === 201, regProvider.text);
    await promoteToProvider(providerEmail);

    const providerLogin = await request('POST', '/auth/login', {
      body: { identifier: providerEmail, password: 'Testpass1' },
    });
    const providerCookie = mergeCookies('', providerLogin.setCookie);
    check('provider login works', providerLogin.status === 200, providerLogin.text);

    seen = outboxSnapshot();
    const codeRes = await request('POST', '/provider/send-email-code.php', { cookie: providerCookie, body: {} });
    check('provider code request succeeds', codeRes.status === 200 && codeRes.json?.data?.sent === true, codeRes.text);
    check('provider code response is honest about configuration', codeRes.json?.data?.emailConfigured === true);

    const codeMessages = outboxMessages(seen);
    check('one provider code message was delivered', codeMessages.length === 1, `count=${codeMessages.length}`);
    const codeMessage = codeMessages[0];
    if (codeMessage) {
      check('provider code message goes to the provider address', codeMessage.header('To').includes(providerEmail));
      check(
        'provider code subject is branded',
        codeMessage.header('Subject') === 'Your Massager Studio verification code',
        codeMessage.header('Subject'),
      );
      const codeMatch = codeMessage.body.match(/[a-f0-9]{64}/);
      check('verification code present in the message body', Boolean(codeMatch));
      if (codeMatch) {
        collectedTokens.push(codeMatch[0]);
        const verified = await request('POST', '/provider/verify-email.php', {
          cookie: providerCookie,
          body: { token: codeMatch[0] },
        });
        check('emailed provider code verifies the account', verified.json?.data?.verified === true, verified.text);
        const reuse = await request('POST', '/provider/verify-email.php', {
          cookie: providerCookie,
          body: { token: codeMatch[0] },
        });
        check('provider code is single-use', reuse.status === 400, reuse.text);
      }
    }
  } finally {
    await stopServer(php.server);
  }

  // 5 — production with an unreachable SMTP host
  const prodEnv = {
    DS_DB_DRIVER: 'sqlite',
    DS_SQLITE_PATH: sqlitePath,
    DS_APP_ENV: 'production',
    DS_COOKIE_SECURE: 'false',
    DS_APP_URL: 'https://massagerstudio.com',
    DS_MAIL_TRANSPORT: 'smtp',
    DS_SMTP_HOST: '127.0.0.1',
    DS_SMTP_PORT: String(smtpClosedPort),
    DS_SMTP_SECURE: 'ssl',
    DS_SMTP_USER: 'info@massagerstudio.com',
    DS_SMTP_PASS: 'local-test-password',
    DS_MAIL_FROM: 'info@massagerstudio.com',
    DS_MAIL_REPLY_TO: 'contact@massagerstudio.com',
  };
  php = await bootPhpServer(prodEnv);

  const prodEmail = `mail_prod_${stamp}@example.com`;
  try {
    const regProd = await request('POST', '/auth/register', {
      body: registerBody(prodEmail, nextPhoneSuffix()),
    });
    check('account creation survives delivery failure', regProd.status === 201, regProd.text);
    check('failed confirmation is reported truthfully', regProd.json?.data?.verificationEmailSent === false);

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
     foreach (['password_reset', 'verify_account', 'provider_verify'] as $name) {
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
  for (const name of ['password_reset', 'verify_account', 'provider_verify']) {
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
