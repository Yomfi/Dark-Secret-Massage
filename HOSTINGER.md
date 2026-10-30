# Massager Studio — Hostinger PHP + MySQL (same origin)

Production origin: `https://massagerstudio.com`

**Architecture:** Vite React SPA + PHP API under `/api/*` + Hostinger MySQL.  
**No Node/Express runtime** is required for production.

The `server/` Express/Prisma tree remains in the repo for reference until a later cleanup commit. Production must not depend on it.

## Hostinger deployment (exact settings)

| Field | Value |
|--------|--------|
| Domain | `massagerstudio.com` |
| Repository | `Yomfi/Dark-Secret-Massage` |
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

**No email is sent today.** `api/auth/forgot-password.php`, `api/auth/verify-email.php` and
`api/provider/send-email-code.php` only create verification/reset tokens (returned directly in
demo mode when `app_env` is not `production`), and the legacy Node `notificationService` is a
stub that logs in development. Nothing in the app currently delivers mail.

Recipient mailboxes (configured, used once a transport exists):

| Address | Purpose |
|--------|---------|
| `info@massagerstudio.com` | System notifications and general operational email |
| `admin@massagerstudio.com` | Official business enquiries, partnerships and collaborations |
| `contact@massagerstudio.com` | Contact-form submissions and public enquiry mail (marketplace “Enquire” link) |

Set them with `DS_INFO_EMAIL`, `DS_ADMIN_EMAIL` and `DS_CONTACT_EMAIL` (environment) or the
matching keys in `config.local.php`. Sender/`From` (`DS_MAIL_FROM`) and any SMTP or API key are
configured **separately** and must not reuse the recipient addresses.

Still required before email works:

1. Provision the three mailboxes on `massagerstudio.com` and publish SPF/DKIM records
2. Choose a transport (Hostinger mail or an email API) and set the sender address + credentials
3. Implement the send call in the token endpoints and the Node notification stub
4. Write the message templates (verification, reset, receipt, operational notices)

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
