# Massager Studio — Hostinger PHP + MySQL (same origin)

Production origin: `https://massagerstudio.com`

**Architecture:** Vite React SPA + PHP API under `/api/*` + Hostinger MySQL.  
**No Node/Express runtime** is required for production.

The `server/` Express/Prisma tree remains in the repo for reference until a later cleanup commit. Production must not depend on it.

## Hostinger deployment (exact settings)

| Field | Value |
|--------|--------|
| Domain | `massagerstudio.com` |
| Repository | `Yomfi/Dark-Secret-Massage` (GitHub path retained; product brand is Massager Studio) |
| Branch | `main` |
| Hosting type | **PHP / Apache** (standard web hosting — not Node.js) |
| Publish directory | `dist/` (or deploy `dist` contents to `public_html`) |
| Build | `npm install && npm run build` |

After build, `dist/` must contain:

- `index.html`
- `assets/`
- `api/` (PHP endpoints copied from `public/api`)
- `.htaccess`

**Uploading `dist/` must not replace two things on the host:**

- `api/config/config.local.php` — the live DB/SMTP secrets. It is gitignored and is not in
  `dist/`; skip it during upload (or re-add it after).
- `api/storage/` — live sessions, rate-limit counters, provider identity files and
  `private/logs` + `private/outbox`. `npm run build` prunes `dist/api/storage` so local
  smoke-test databases, sessions and outbox messages are never shipped; PHP recreates the
  directories with mode `0700` on first use. Leave the host's existing `api/storage` alone.

## Database

| Field | Value |
|--------|--------|
| Database | `u190513960_darksecret` (legacy Hostinger name, retained) |
| User | `u190513960_darksecret` (legacy Hostinger name, retained) |
| Host | `localhost` |
| Port | `3306` |

**Reuse existing Prisma tables** if already migrated (`users`, token tables).  
If tables are missing, run once (safe, no drops):

`public/api/sql/schema_if_missing.sql`

in phpMyAdmin. Do **not** drop production tables.

## PHP API config

On the server, create:

`dist/api/config/config.local.php`

(from `public/api/config/config.example.php`)

Set at least:

```php
<?php
return [
  'db_host' => 'localhost',
  'db_name' => 'u190513960_darksecret',
  'db_user' => 'u190513960_darksecret',
  'db_pass' => 'YOUR_PASSWORD',
  'cookie_secure' => true,
  'cookie_samesite' => 'Lax',
  'app_env' => 'production',
  'app_url' => 'https://massagerstudio.com',
];
```

Never commit `config.local.php` or the DB password.

## Auth model

- PHP sessions (`ds_session` cookie)
- `httpOnly`, `Secure` in production, `SameSite=Lax`, `path=/`
- Passwords: `password_hash` / `password_verify` (bcrypt — compatible with prior bcryptjs hashes)
- Same-origin frontend calls `/api` with `credentials: 'include'`
- **Email confirmation is the verification gate** for both customers and providers. Phone
  numbers are stored as contact details only and are never shown as verified.
- Confirmation links expire after 24 hours, are single-use, and resend is capped at 5 per
  account per hour (per-IP limits apply as well).

## Email

Transactional mail is delivered by `api/config/mailer.php` over **authenticated SMTP** using
PHPMailer 7.1.1, vendored in `api/vendor/phpmailer` (no Composer on the host — see its
`VENDORED.md`). TLS certificate verification is always enabled. Nothing is sent until
`smtp_host`, `smtp_user`, `smtp_pass` and `mail_from` are set.

| Flow | Trigger | Sent to |
|------|---------|---------|
| Password reset | `POST /api/auth/forgot-password` | the requesting account's own address |
| Account email confirmation | `POST /api/auth/register` | the new account's own address |
| Confirmation resend | `POST /api/auth/resend-verification` | the signed-in account's own address |
| Provider email verification | `POST /api/provider/send-email-code` | the provider account's own address |
| Provider submitted for review | `POST /api/provider/submit-review` | `info@massagerstudio.com` |

Company mailboxes (recipients — keep separate from SMTP/`mail_from`):

| Address | Purpose |
|--------|---------|
| `info@massagerstudio.com` | Receives system notifications and general operational email notifications. Also used as the authenticated SMTP sender identity when configured. |
| `admin@massagerstudio.com` | Receives official business enquiries, partnerships and collaborations (footer Partnerships mailto). |
| `contact@massagerstudio.com` | Receives contact-form / public contact and marketplace “Enquire” mail. Also used as `Reply-To` on transactional system mail. |

Email links are built from `app_url` only (never the request Host): `/reset-password?token=…`
and `/verify-email?token=…` are real SPA routes, so the links open the app.

### Required configuration

Set these in `api/config/config.local.php` or as `DS_*` environment variables. Never commit
the password, and never expose these keys to the frontend.

| Key | Env | Value |
|-----|-----|-------|
| `smtp_host` | `DS_SMTP_HOST` | Hostinger SMTP host (confirm in hPanel → Emails) |
| `smtp_port` | `DS_SMTP_PORT` | `465` (implicit TLS) or `587` (STARTTLS) |
| `smtp_secure` | `DS_SMTP_SECURE` | `ssl` or `tls` |
| `smtp_user` | `DS_SMTP_USER` | full mailbox address, e.g. `info@massagerstudio.com` |
| `smtp_pass` | `DS_SMTP_PASS` | mailbox password from hPanel |
| `mail_from` | `DS_MAIL_FROM` | `info@massagerstudio.com` (must match the authenticated mailbox) |
| `mail_from_name` | `DS_MAIL_FROM_NAME` | `Massager Studio` |
| `mail_reply_to` | `DS_MAIL_REPLY_TO` | `contact@massagerstudio.com` |
| `smtp_timeout` | `DS_SMTP_TIMEOUT` | seconds, default `15` |
| `mail_debug` | `DS_MAIL_DEBUG` | `0` normally; `1`+ writes the SMTP transcript to the private log |
| `mail_transport` | `DS_MAIL_TRANSPORT` | leave unset (`smtp`) in production; `file` is a local-only outbox |

### Delivery behaviour and diagnostics

Every send attempt appends a JSON line to `api/storage/private/logs/mail.log` (recipient
masked, no tokens or message bodies). `storage/` is blocked from HTTP access by `.htaccess`.

- Password reset stays deliberately generic (no account enumeration). If delivery fails the
  reset token is deleted so no dead link survives, and the failure is logged.
- Registration still succeeds when mail fails; the response reports
  `verificationEmailSent: false`.
- Provider code requests return HTTP `503` (`EMAIL_DELIVERY_FAILED` or
  `EMAIL_NOT_CONFIGURED`) in production instead of pretending the mail was sent. Development
  returns the token so the flow stays testable.
- The review notification never blocks a submission; `adminNotified` reports the outcome.

### Still required on the host

The three mailboxes (`info@`, `admin@`, `contact@`) already exist. SMTP authentication
uses `info@massagerstudio.com` as `smtp_user` / `mail_from`, with
`contact@massagerstudio.com` as `Reply-To` and the sender name `Massager Studio`. Recipient
routing still uses the three addresses for their assigned purposes.

**Code status:** the API already reads host/port/encryption/credentials from server-only
configuration. Defaults are port `465`, encryption `ssl`, sender `info@massagerstudio.com`,
sender name `Massager Studio` and `Reply-To contact@massagerstudio.com`; `smtp_host` has **no**
default, so nothing is sent until host, user and password are set. Credentials are *not* in
this repository, so SMTP is **not connected** until the steps below are done on the host.

1. In hPanel → Emails → `info@massagerstudio.com`, confirm the outgoing server values:
   host `smtp.hostinger.com`, port `465`, encryption `ssl`. (Port `587` + `tls` is the
   STARTTLS alternative; use one, not both.)
2. On the server, edit `dist/api/config/config.local.php` **in place** and add the mail keys
   below. Do not overwrite `db_*` values and do not touch `api/storage` or uploads. If the
   host uses environment variables instead, add the matching `DS_*` variables in hPanel.
   Enter `smtp_pass` privately in hPanel/the file — never in chat, Git, the frontend or logs.
   ```php
   'smtp_host' => 'smtp.hostinger.com',
   'smtp_port' => 465,
   'smtp_secure' => 'ssl',
   'smtp_user' => 'info@massagerstudio.com',
   'smtp_pass' => '…entered privately…',
   'mail_from' => 'info@massagerstudio.com',
   'mail_from_name' => 'Massager Studio',
   'mail_reply_to' => 'contact@massagerstudio.com',
   'mail_transport' => 'smtp',
   ```
3. DNS is already correct — verified against the authoritative nameservers on 2026-11-01;
   change nothing:
   - SPF (`massagerstudio.com` TXT): `v=spf1 include:_spf.mail.hostinger.com ~all`
   - DMARC (`_dmarc.massagerstudio.com` TXT): `v=DMARC1; p=none`
   - DKIM (selector `hostingermail-a`): `hostingermail-a._domainkey` is a CNAME to
     `hostingermail-a.dkim.mail.hostinger.com`, which resolves to a 2048-bit
     `v=DKIM1;k=rsa;p=MIIBIjANBg…` TXT record. Hostinger signs outgoing mail with this key.
     The `hostingermail-b` / `hostingermail-c` selectors also exist and are intentionally
     empty (`v=DKIM1;p=`) — leave them, and do not add a second DKIM key.
   - MX is `mx1.hostinger.com` (5) and `mx2.hostinger.com` (10).

   If hPanel ever shows a *different* DKIM selector as active, copy its exact TXT value from
   hPanel instead of inventing one; never replace the existing records with guesses.
4. Confirm `GET /api/config-status` reports `mail_configured: true` and
   `mail_transport: smtp` (names only, never values).
5. On the host with native PHP, run `php api/tools/send-smtp-test.php` to send a labelled
   message. A successful SMTP hand-off is **acceptance, not delivery** — confirm the
   message actually arrives in the `info@` inbox (and check junk) before calling email live.
   The bundled local `php-cli` (WASM) cannot complete an SMTP session, so this test must run
   on the host.

### Local verification

`npm run test:mail` boots the PHP API against SQLite in two modes:

- **development + file transport** (`DS_MAIL_TRANSPORT=file`): rendered messages land in
  `api/storage/private/outbox/*.eml`, so the whole pipeline is testable — headers, From/
  Reply-To, branded HTML, plain-text alternative, reset/confirm/provider-code links, token
  single-use, and the provider verification handshake.
- **production + SMTP**: missing settings and an unreachable host must return `503`
  (`EMAIL_NOT_CONFIGURED` / `EMAIL_DELIVERY_FAILED`), roll back the just-created token, and
  never leak a token in the response.

The file transport is refused whenever `app_env` is `production`, so it cannot silently
replace SMTP on the host.

**Not covered locally:** the actual SMTP conversation. The bundled `php-cli` (WASM) runtime has
no working `stream_select`, which PHPMailer's SMTP client relies on, so it cannot complete a
session even against a local sink. Do not treat a green local run as proof that mail is
delivering — confirm acceptance on the host (step 4 above).

## Membership and provider verification

Provider membership is **free by default**. There is no membership payment gate in the
registration flow, and a provider can submit for admin review without paying anything.

| Key | Env | Default | Meaning |
|-----|-----|---------|---------|
| `membership_fee_enabled` | `DS_MEMBERSHIP_FEE_ENABLED` | `false` | Set `true` to reintroduce the one-off fee |
| `membership_fee_amount` | `DS_MEMBERSHIP_FEE_AMOUNT` | `100` | Fee amount used when enabled |
| `membership_currency` | `DS_MEMBERSHIP_CURRENCY` | `GHS` | Currency label |

- Free membership **never** grants the verified badge. Approval is still an explicit admin
  action after identity documents are reviewed.
- Past payment rows in `provider_verification_payments` and the historical
  `provider_verification.verification_fee_amount` values are preserved and untouched.
- While the fee is disabled `POST /api/provider/payment.php` records nothing and returns
  `free: true`; it never fabricates a payment.
- Turning the fee back on requires only the config change — no schema migration. New rows
  are created with the configured amount; existing rows keep their recorded amount.
- No database migration is required for this release.

## Endpoints

| Method | Path | File |
|--------|------|------|
| GET | `/api/health` | `api/health.php` |
| POST | `/api/auth/register` | `api/auth/register.php` |
| POST | `/api/auth/login` | `api/auth/login.php` |
| POST | `/api/auth/logout` | `api/auth/logout.php` |
| GET | `/api/auth/me` | `api/auth/me.php` |
| POST | `/api/auth/refresh` | `api/auth/refresh.php` |
| POST | `/api/auth/forgot-password` | `api/auth/forgot-password.php` |
| POST | `/api/auth/reset-password` | `api/auth/reset-password.php` |
| POST | `/api/auth/onboarding` | `api/auth/onboarding.php` |
| POST | `/api/auth/verify-email` | `api/auth/verify-email.php` |
| POST | `/api/auth/resend-verification` | `api/auth/resend-verification.php` |
| POST | `/api/auth/verify-phone` | `api/auth/verify-phone.php` (legacy, unused by the app) |

`.htaccess` maps clean `/api/...` URLs to `.php` and **never** rewrites `/api` to React `index.html`.

## Checklist

1. Stop / remove the Node.js web app for this domain (if still present)
2. Deploy static/`dist` to the domain’s web root (PHP enabled)
3. Ensure `.htaccess` is uploaded
4. Add `api/config/config.local.php` with DB password
5. Confirm tables exist (or run `schema_if_missing.sql`)
6. Verify `https://massagerstudio.com/api/health`
7. Verify `https://massagerstudio.com/` loads the React app
8. Verify register / login / me / logout

## Local frontend

```bash
npm install
npm run dev      # Vite; API calls go to /api (needs PHP backend or proxy)
npm run build
npm run lint
npm run php:lint
```
