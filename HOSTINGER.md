# Dark Secret — Hostinger PHP + MySQL (same origin)

Production origin: `https://dartscret.havensnet.com`

**Architecture:** Vite React SPA + PHP API under `/api/*` + Hostinger MySQL.  
**No Node/Express runtime** is required for production.

The `server/` Express/Prisma tree remains in the repo for reference until a later cleanup commit. Production must not depend on it.

## Hostinger deployment (exact settings)

| Field | Value |
|--------|--------|
| Domain | `dartscret.havensnet.com` |
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
| Database | `u190513960_darksecret` |
| User | `u190513960_darksecret` |
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
  'app_url' => 'https://dartscret.havensnet.com',
];
```

Never commit `config.local.php` or the DB password.

## Auth model

- PHP sessions (`ds_session` cookie)
- `httpOnly`, `Secure` in production, `SameSite=Lax`, `path=/`
- Passwords: `password_hash` / `password_verify` (bcrypt — compatible with prior bcryptjs hashes)
- Same-origin frontend calls `/api` with `credentials: 'include'`

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
6. Verify `https://dartscret.havensnet.com/api/health`
7. Verify `https://dartscret.havensnet.com/` loads the React app
8. Verify register / login / me / logout

## Local frontend

```bash
npm install
npm run dev      # Vite; API calls go to /api (needs PHP backend or proxy)
npm run build
npm run lint
npm run php:lint
```
