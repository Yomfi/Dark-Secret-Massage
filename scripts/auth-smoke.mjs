/**
 * Local auth smoke test for PHP API (register → me → logout → login → me).
 * Uses php-cli (WASM) + SQLite so it does not need Hostinger MySQL.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const phpBin = path.join(root, 'node_modules', 'php-cli', 'php-cli.js');
const apiRoot = path.join(root, 'public', 'api');
const sqlitePath = path.join(root, 'public', 'api', 'storage', 'smoke.sqlite');
const port = 8765;
const base = `http://127.0.0.1:${port}`;

function runPhp(args, env = {}) {
  return spawn(process.execPath, [phpBin, ...args], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
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
  const setCookie = res.headers.getSetCookie?.() || [];
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, setCookie, text };
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
    const v = rest.join('=');
    if (!v || v === 'deleted' || header.toLowerCase().includes('max-age=0')) {
      map.delete(k.trim());
    } else {
      map.set(k.trim(), v);
    }
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
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

  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  if (fs.existsSync(sqlitePath)) fs.unlinkSync(sqlitePath);

  // Create SQLite users table matching Prisma MySQL shape (TEXT instead of ENUM).
  const setup = runPhp(
    [
      '-r',
      `
      $pdo = new PDO('sqlite:${sqlitePath.replace(/\\/g, '/')}');
      $pdo->exec('CREATE TABLE users (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT "user",
        account_status TEXT NOT NULL DEFAULT "active",
        email_verified_at TEXT NULL,
        phone_verified_at TEXT NULL,
        last_login_at TEXT NULL,
        terms_accepted_at TEXT NOT NULL,
        onboarding_choice TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )');
      $pdo->exec('CREATE TABLE email_verification_tokens (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL, used_at TEXT NULL, created_at TEXT NOT NULL
      )');
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
      echo "ok";
      `,
    ],
    {}
  );
  await new Promise((resolve, reject) => {
    let out = '';
    setup.stdout.on('data', (d) => (out += d));
    setup.stderr.on('data', (d) => (out += d));
    setup.on('exit', (code) => (code === 0 ? resolve(out) : reject(new Error(out))));
  });

  const rateLimitDir = path.join(apiRoot, 'storage', 'auth-smoke-rate');
  fs.rmSync(rateLimitDir, { recursive: true, force: true });
  fs.mkdirSync(rateLimitDir, { recursive: true });

  const env = {
    DS_DB_DRIVER: 'sqlite',
    DS_SQLITE_PATH: sqlitePath,
    DS_APP_ENV: 'development',
    DS_COOKIE_SECURE: 'false',
    DS_RATE_LIMIT_DIR: rateLimitDir,
  };

  const server = runPhp(['-S', `127.0.0.1:${port}`, '-t', apiRoot, path.join(apiRoot, 'router.php')], env);
  let bootLog = '';
  server.stdout.on('data', (d) => (bootLog += d));
  server.stderr.on('data', (d) => (bootLog += d));
  await sleep(1500);

  let cookie = '';
  const email = `smoke_${Date.now()}@example.com`;
  const password = 'Testpass1';

  try {
    const reg = await request('POST', '/auth/register', {
      body: {
        firstName: 'Smoke',
        lastName: 'Test',
        email,
        phone: `+23320${String(Date.now()).slice(-8)}`,
        password,
        confirmPassword: password,
        termsAccepted: true,
      },
    });
    console.log('REGISTER', reg.status, JSON.stringify(reg.json));
    if (reg.status !== 201 || !reg.json?.success || !reg.json?.data?.user?.id) {
      throw new Error('register failed');
    }
    if (reg.json.data.user.password_hash || reg.json.data.user.passwordHash) {
      throw new Error('password hash leaked');
    }
    cookie = mergeCookies(cookie, reg.setCookie);

    const me1 = await request('GET', '/auth/me', { cookie });
    console.log('ME_AFTER_REGISTER', me1.status, JSON.stringify(me1.json));
    if (me1.status !== 200 || me1.json?.data?.user?.email !== email) {
      throw new Error('me after register failed');
    }

    const logout = await request('POST', '/auth/logout', { cookie, body: {} });
    console.log('LOGOUT', logout.status, JSON.stringify(logout.json));
    cookie = mergeCookies(cookie, logout.setCookie);

    const meUnauth = await request('GET', '/auth/me', { cookie });
    console.log('ME_AFTER_LOGOUT', meUnauth.status, JSON.stringify(meUnauth.json));
    if (meUnauth.status !== 401) {
      throw new Error('expected 401 after logout');
    }

    const login = await request('POST', '/auth/login', {
      body: { identifier: email, password },
    });
    console.log('LOGIN', login.status, JSON.stringify(login.json));
    if (login.status !== 200 || !login.json?.data?.user?.email) {
      throw new Error('login failed');
    }
    cookie = mergeCookies(cookie, login.setCookie);

    const me2 = await request('GET', '/auth/me', { cookie });
    console.log('ME_AFTER_LOGIN', me2.status, JSON.stringify(me2.json));
    if (me2.status !== 200 || me2.json?.data?.user?.email !== email) {
      throw new Error('me after login failed');
    }

    // The backend (not just the UI) blocks customer progression until confirmed.
    const onboardUnverified = await request('POST', '/auth/onboarding', {
      cookie,
      body: { choice: 'book_massage' },
    });
    if (
      onboardUnverified.status !== 403 ||
      onboardUnverified.json?.error?.code !== 'EMAIL_NOT_VERIFIED'
    ) {
      throw new Error('onboarding should be blocked until the email is confirmed');
    }
    console.log('ONBOARDING_UNVERIFIED', onboardUnverified.status, onboardUnverified.json?.error?.code);

    // Email confirmation resend: single-use token, newest link wins.
    const resend = await request('POST', '/auth/resend-verification', { cookie, body: {} });
    if (resend.status !== 200 || typeof resend.json?.data?.demoToken !== 'string') {
      throw new Error('resend confirmation did not return a development token');
    }
    console.log('RESEND', resend.status, resend.json?.data?.message);
    const resentToken = resend.json.data.demoToken;
    const confirmed = await request('POST', '/auth/verify-email', { body: { token: resentToken } });
    if (confirmed.status !== 200 || confirmed.json?.data?.verified !== true) {
      throw new Error('resent confirmation token did not verify');
    }
    const confirmReuse = await request('POST', '/auth/verify-email', { body: { token: resentToken } });
    if (confirmReuse.status !== 400) throw new Error('confirmation token was reusable');
    const resendAfter = await request('POST', '/auth/resend-verification', { cookie, body: {} });
    if (resendAfter.status !== 200 || resendAfter.json?.data?.alreadyVerified !== true) {
      throw new Error('resend after confirmation should report alreadyVerified');
    }
    console.log('RESEND_AFTER_VERIFY', resendAfter.json?.data?.message);

    const onboardVerified = await request('POST', '/auth/onboarding', {
      cookie,
      body: { choice: 'book_massage' },
    });
    if (
      onboardVerified.status !== 200 ||
      onboardVerified.json?.data?.user?.onboardingChoice !== 'book_massage'
    ) {
      throw new Error('onboarding should succeed after the email is confirmed');
    }
    console.log('ONBOARDING_VERIFIED', onboardVerified.status, onboardVerified.json?.data?.user?.onboardingChoice);

    // Provider registration is email-first and currently free for both types.
    const providerPhoneBase = `+23322${String(Date.now()).slice(-7)}`;
    const individual = await request('POST', '/provider/register.php', {
      body: {
        firstName: 'Prov',
        lastName: 'Individual',
        displayName: 'Prov Individual',
        providerType: 'individual',
        gender: 'female',
        email: `provider_individual_${Date.now()}@example.com`,
        phone: `${providerPhoneBase}1`,
        password,
        confirmPassword: password,
        termsAccepted: true,
      },
    });
    console.log('PROVIDER_INDIVIDUAL', individual.status, JSON.stringify(individual.json));
    if (individual.status !== 201) throw new Error('individual provider registration failed');
    if (individual.json?.data?.nextStep !== 'email_verification') {
      throw new Error('individual provider should continue to email verification');
    }
    if (individual.json?.data?.membership?.free !== true) {
      throw new Error('individual membership should be free');
    }
    if (individual.json?.data?.user?.phoneVerifiedAt) {
      throw new Error('phone should not be marked verified at registration');
    }

    const agency = await request('POST', '/provider/register.php', {
      body: {
        firstName: 'Prov',
        lastName: 'Agency',
        displayName: 'Smoke Agency',
        providerType: 'agency',
        businessName: 'Smoke Agency',
        email: `provider_agency_${Date.now()}@example.com`,
        phone: `${providerPhoneBase}2`,
        password,
        confirmPassword: password,
        termsAccepted: true,
      },
    });
    console.log('PROVIDER_AGENCY', agency.status, JSON.stringify(agency.json));
    if (agency.status !== 201) throw new Error('agency provider registration failed');
    if (agency.json?.data?.nextStep !== 'email_verification') {
      throw new Error('agency provider should continue to email verification');
    }
    if (agency.json?.data?.membership?.free !== true) {
      throw new Error('agency membership should be free');
    }

    console.log('AUTH_SMOKE_OK');
  } catch (err) {
    console.error('AUTH_SMOKE_FAILED', err.message);
    console.error(bootLog.slice(-2000));
    process.exitCode = 1;
  } finally {
    server.kill('SIGTERM');
  }
}

main();
