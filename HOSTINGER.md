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

## Email

Transactional mail is delivered by `api/config/mailer.php` over **authenticated SMTP** using
PHPMailer 7.1.1, vendored in `api/vendor/phpmailer` (no Composer on the host — see its
`VENDORED.md`). TLS certificate verification is always enabled. Nothing is sent until
`smtp_host`, `smtp_user`, `smtp_pass` and `mail_from` are set.

| Flow | Trigger | Sent to |
|------|---------|---------|
| Password reset | `POST /api/auth/forgot-password` | the requesting account's own address |
| Account email confirmation | `POST /api/auth/register` | the new account's own address |
| Provider verification code | `POST /api/provider/send-email-code` | the provider account's own address |
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
should use `info@massagerstudio.com` as `smtp_user` / `mail_from`. Recipient routing still
uses the three addresses for their assigned purposes.

1. Confirm the SMTP host/port for `info@massagerstudio.com` in hPanel → Emails (typically
   `smtp.hostinger.com`, port `465` / `ssl`, or `587` / `tls`).
2. Copy `api/config/config.example.php` to `api/config/config.local.php` on the server and
   enter `smtp_pass` (and any differing host/port values) **privately** — never commit it
   and never paste the password into chat.
3. Publish SPF and DKIM records for `massagerstudio.com` so mail is not filtered.
4. On the host (native PHP), run `php api/tools/send-smtp-test.php` (or `npm run test:smtp`
   where native PHP is available). SMTP acceptance ≠ confirmed inbox receipt — also check
   the `info@` inbox and junk folder.
5. `GET /api/config-status` reports `mail_configured`, `mail_transport` and the *names* of any
   missing mail keys (never values), so you can confirm the config without guessing.

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
delivering — confirm acceptance on the host (step 3 above).

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
| POST | `/api/auth/verify-phone` | `api/auth/verify-phone.php` |

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
