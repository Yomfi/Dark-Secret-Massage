# Dark Secret — single full-stack Hostinger app

One Node.js application serves the React SPA **and** the Express API on the same origin.

**Production origin:** `https://dartscret.havensnet.com`  
**Do not** create a second app on `api.dartscret.havensnet.com`.

## Hostinger Node application (exact fields)

| Field | Value |
|--------|--------|
| Domain | `dartscret.havensnet.com` (HTTPS) |
| Repository | `Yomfi/Dark-Secret-Massage` |
| Branch | `main` |
| Root directory | `./` (repository root — **not** `server`) |
| Runtime | Node.js **22.x** |
| App type | Node.js web application (**not** static hosting) |
| Install | `npm install` |
| Build | `npm run build:production` |
| Start | `npm start` |

`npm install` also installs `server/` dependencies via `postinstall`.  
`npm run build:production` builds the Vite frontend into `dist/`, then generates Prisma client and compiles the Express server into `server/dist/`.  
`npm start` runs `node server/dist/server.js`, which serves `/api/*` and the SPA from `dist/`.

## Routing behavior

| URL | Handler |
|-----|---------|
| `/`, `/massage`, `/book-massage`, `/find-a-life-partner`, … | React SPA (`dist/index.html`) |
| `/api/health`, `/api/auth/*`, … | Express API (JSON) |
| Unknown `/api/*` | JSON 404 (never HTML) |

## MySQL

| Field | Value |
|--------|--------|
| Database name | `u190513960_darksecret` |
| Username | `u190513960_darksecret` |
| Host | `localhost` |
| Port | `3306` |

```text
DATABASE_URL=mysql://u190513960_darksecret:<PASSWORD>@localhost:3306/u190513960_darksecret
```

Password is configured only in Hostinger. Never commit it.

## Environment variables (hPanel)

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | Hostinger-provided (leave to platform if auto-injected) |
| `DATABASE_URL` | see format above |
| `JWT_ACCESS_SECRET` | long random secret (from local `server/.secrets.local`) |
| `JWT_REFRESH_SECRET` | different long random secret |
| `ACCESS_TOKEN_TTL` | `15m` |
| `REFRESH_TOKEN_TTL` | `30d` |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAME_SITE` | `lax` |
| `COOKIE_DOMAIN` | leave **unset** (same-origin host-only cookies) |
| `VITE_API_URL` | `/api` (baked into frontend at build time; code also defaults to `/api`) |
| `CORS_ORIGINS` | `https://dartscret.havensnet.com` (optional; same-origin default exists) |

Template: `server/.env.production.example`  
Never commit `.env`, `.secrets.local`, or real JWT/DB values.

## After first deploy — migrate once

From the app root (or Hostinger terminal):

```bash
npm run migrate:deploy
```

Equivalent: `npm --prefix server exec prisma migrate deploy`  
Never run `prisma migrate dev` in production.

## Cookies / CORS (same origin)

- Cookies `ds_access` / `ds_refresh`: `httpOnly`, `secure` in production, `sameSite=lax`, `path=/`, host-only
- Frontend calls relative `/api` with `credentials: 'include'`
- No cross-subdomain cookie sharing required
- CORS is restricted (no wildcards); production same-origin traffic does not depend on CORS

## Health check

```http
GET https://dartscret.havensnet.com/api/health
```

Expected JSON (not the React homepage):

```json
{ "success": true, "data": { "status": "ok", "service": "dark-secret-api" } }
```

## Manual hPanel checklist

1. Point **one** Node.js app at `dartscret.havensnet.com` (repo `main`, root `./`, Node 22)
2. Remove / stop any separate `api.dartscret` web app if it still exists
3. Set env vars above
4. Deploy with Install `npm install`, Build `npm run build:production`, Start `npm start`
5. Run `npm run migrate:deploy` once
6. Verify `/api/health` returns JSON and `/` returns the React app

## Local production simulation

```bash
npm install
npm run build:production
SKIP_DB_CONNECT=true PORT=4000 NODE_ENV=production \
  JWT_ACCESS_SECRET=dev_access_secret_change_me_32chars_min \
  JWT_REFRESH_SECRET=dev_refresh_secret_change_me_32chars_xx \
  DATABASE_URL=mysql://build:build@127.0.0.1:3306/build \
  npm start
```

Then:

```bash
curl -sS http://127.0.0.1:4000/api/health
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' http://127.0.0.1:4000/
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' http://127.0.0.1:4000/massage
curl -sS http://127.0.0.1:4000/api/nonexistent
```

## Local development (two processes)

```bash
# Terminal 1 — API
npm run server:dev

# Terminal 2 — Vite (proxies /api → localhost:4000)
npm run dev
```

Leave `VITE_API_URL` unset locally to use the Vite `/api` proxy, or set  
`VITE_API_URL=http://localhost:4000/api`.
