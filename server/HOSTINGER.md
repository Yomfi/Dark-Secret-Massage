# Dark Secret API — Hostinger Node deployment

## Deployment status

This document prepares production deployment. The API is **not live** until
Hostinger DNS + Node app + MySQL + env vars are configured and
`https://api.dartscret.havensnet.com/api/health` returns success.

## Hostinger application settings

| Field | Value |
|--------|--------|
| Repository | `Yomfi/Dark-Secret-Massage` |
| Branch | `main` |
| Root directory | `server` |
| Runtime | Node.js **22.x** |
| Application type | Node.js web application (not static) |
| Install command | `npm install` |
| Build command | `npm run build` |
| Start command | `npm start` |
| API domain | `https://api.dartscret.havensnet.com` |
| Frontend origin | `https://dartscret.havensnet.com` |

`npm run build` runs:

```bash
prisma generate && tsc -p tsconfig.json
```

## After first deploy — database migration

With `DATABASE_URL` configured in Hostinger env, run once (SSH / one-off job):

```bash
npx prisma migrate deploy
```

Do **not** run `prisma migrate dev` in production.
Do **not** reset or seed production data from this milestone.

Existing migration:

`prisma/migrations/20251020160000_init_auth`

## Required environment variables

Use Hostinger Node App → Environment variables (or paste from `.env.production.example`).

| Variable | Production value |
|----------|------------------|
| `NODE_ENV` | `production` |
| `PORT` | Provided by Hostinger (or explicit port if required) |
| `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:3306/DB_NAME` from hPanel MySQL |
| `CORS_ORIGINS` | `https://dartscret.havensnet.com` |
| `JWT_ACCESS_SECRET` | Long random secret (unique) |
| `JWT_REFRESH_SECRET` | Different long random secret |
| `ACCESS_TOKEN_TTL` | `15m` (optional; default) |
| `REFRESH_TOKEN_TTL` | `30d` (optional; default) |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAME_SITE` | `lax` |
| `COOKIE_DOMAIN` | **leave unset** (host-only cookies on `api.…`) |
| `HOST` | optional; defaults to `0.0.0.0` |

Optional later: Paystack / email / SMS provider keys (not required for auth).

## CORS

- Exact origin allowlist via `CORS_ORIGINS`
- `credentials: true`
- No wildcard `*` in production

## Cookies

Auth cookies `ds_access` and `ds_refresh`:

- `httpOnly: true`
- `secure: true` in production
- `sameSite: lax`
- host-only on `api.dartscret.havensnet.com` (no parent-domain cookie by default)

Frontend must call the API with `credentials: 'include'`.

Modern browsers treat `dartscret.havensnet.com` and `api.dartscret.havensnet.com`
as same-site under `havensnet.com`, so `SameSite=Lax` + host-only API cookies
works for credentialed XHR/fetch to the API host.

## Health check

```
GET https://api.dartscret.havensnet.com/api/health
```

Expected:

```json
{ "success": true, "data": { "status": "ok", "service": "dark-secret-api" } }
```

## Frontend (connect only after API is live)

Build the SPA with:

```
VITE_API_URL=https://api.dartscret.havensnet.com
```

Do not hard-code the API URL in source.

## Manual Hostinger checklist

1. Create subdomain `api.dartscret.havensnet.com` → Node app
2. Create MySQL database + user; copy host/name/user/password
3. Set all env vars above (including strong JWT secrets)
4. Deploy from GitHub `main`, root `server/`
5. Run `npx prisma migrate deploy`
6. Confirm health URL responds
7. Rebuild frontend with `VITE_API_URL` and redeploy SPA

## Local validation

```bash
cd server
npm install
npx prisma generate
npm run build
npx tsc --noEmit
npm run test:auth
```
