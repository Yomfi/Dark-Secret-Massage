# Dark Secret API — Hostinger Node deployment

## Status

**Repository is deployment-ready.**  
**API is not live yet** until Hostinger Node app + env vars (including DB password) are set and:

`https://api.dartscret.havensnet.com/api/health` → HTTP 200

There is **no authenticated Hostinger CLI/API** in this development environment, so
Node app creation / DNS / env injection in hPanel must be done in the Hostinger UI.

## Hostinger Node application (exact fields)

| Field | Value |
|--------|--------|
| Repository | `Yomfi/Dark-Secret-Massage` |
| Branch | `main` |
| Root directory | `server` |
| Runtime | Node.js **22.x** |
| App type | Node.js web application (**not** static) |
| Install | `npm install` |
| Build | `npx prisma generate && npm run build` |
| Start | `npm start` |
| Domain | `api.dartscret.havensnet.com` (HTTPS) |
| Frontend | `https://dartscret.havensnet.com` |

Notes:

- `npm run build` already runs `prisma generate && tsc`; the Hostinger Build field may still use the explicit command above.
- Server listens on `process.env.PORT` and binds `0.0.0.0` (override with `HOST` if needed).

## MySQL (this Hostinger account)

| Field | Value |
|--------|--------|
| Database name | `u190513960_darksecret` |
| Username | `u190513960_darksecret` |
| Host | `localhost` |
| Port | `3306` |

`DATABASE_URL` format (password not stored in Git):

```text
mysql://u190513960_darksecret:<PASSWORD>@localhost:3306/u190513960_darksecret
```

**Do not** use the database/user identifier as the hostname.

If the Node runtime cannot reach MySQL via `localhost`, check hPanel → MySQL for a
remote hostname and update **only** that host segment — do not invent hosts.

## Environment variables (hPanel)

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | Hostinger-provided (leave to platform if auto-injected) |
| `DATABASE_URL` | see format above (**needs DB password**) |
| `CORS_ORIGINS` | `https://dartscret.havensnet.com` |
| `JWT_ACCESS_SECRET` | from local `server/.secrets.local` (untracked) |
| `JWT_REFRESH_SECRET` | from local `server/.secrets.local` (different value) |
| `ACCESS_TOKEN_TTL` | `15m` |
| `REFRESH_TOKEN_TTL` | `30d` |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAME_SITE` | `lax` (**this exact name** — not `COOKIE_SAMESITE`) |
| `COOKIE_DOMAIN` | leave **unset** (host-only API cookies) |

Safe placeholders: `.env.production.example`  
Generated JWT secrets: local ignored file `server/.secrets.local` (never commit)

## After env is set — migrate once

```bash
cd server   # or Hostinger app root
npx prisma migrate deploy
```

Migration: `prisma/migrations/20251020160000_init_auth`  
Never run `prisma migrate dev` in production.

## CORS / cookies

- CORS allowlist: only `https://dartscret.havensnet.com`
- `credentials: true` — no `*`
- Cookies `ds_access` / `ds_refresh`: `httpOnly`, `secure` in production, `sameSite=lax`, host-only on `api.dartscret.havensnet.com`
- Frontend must use `credentials: 'include'` and `VITE_API_URL=https://api.dartscret.havensnet.com`

## Health check

```http
GET https://api.dartscret.havensnet.com/api/health
```

Expected:

```json
{ "success": true, "data": { "status": "ok", "service": "dark-secret-api" } }
```

## Blocked solely by (when Node app exists)

1. **Database password** → complete `DATABASE_URL` in Hostinger env  
2. Then: `npx prisma migrate deploy`  
3. Confirm health URL  
4. Rebuild SPA with `VITE_API_URL=https://api.dartscret.havensnet.com`

## Manual hPanel checklist (minimum)

1. Create Node.js app for `api.dartscret.havensnet.com` (GitHub `main`, root `server`, Node 22)  
2. Set env vars above (JWT secrets from `.secrets.local`; `DATABASE_URL` once password known)  
3. Deploy / rebuild  
4. SSH or terminal: `npx prisma migrate deploy`  
5. Verify `/api/health`  
6. Set frontend `VITE_API_URL` and redeploy SPA  

## Local validation

```bash
cd server
npm install
npx prisma generate
npx prisma validate
npm run build
npx tsc --noEmit
npm run test:auth
```
