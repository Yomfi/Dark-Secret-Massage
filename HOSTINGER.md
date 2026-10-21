# Dark Secret — single full-stack Hostinger app

One Express application serves the React SPA **and** the API on the same origin.

**Production origin:** `https://dartscret.havensnet.com`  
**Do not** create a second app on `api.dartscret.havensnet.com`.

## Hostinger Express preset (exact fields)

There is **no separate Build Command** in the Express deployment UI.

| Field | Value |
|--------|--------|
| Framework | **Express** |
| Domain | `dartscret.havensnet.com` (HTTPS) |
| Repository | `Yomfi/Dark-Secret-Massage` |
| Branch | `main` |
| Root directory | `./` |
| Package manager | `npm` |
| Node | **22.x** |
| Entry file | `server/dist/server.js` |

Hostinger runs:

```text
npm install
→ starts server/dist/server.js
```

Root `postinstall` automatically:

1. Installs `server/` dependencies (including build-time types)
2. Builds the Vite frontend → `dist/`
3. Runs `prisma generate` + compiles Express → `server/dist/server.js`

Do **not** set a fake root `server.js`. Use the real compiled entry above.

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
| `PORT` | Optional. Defaults to `3000` if unset. Use Hostinger's value when provided (`PORT=3000` is fine to set explicitly). |
| `DATABASE_URL` | see format above |
| `JWT_ACCESS_SECRET` | long random secret (from local `server/.secrets.local`) |
| `JWT_REFRESH_SECRET` | different long random secret |
| `ACCESS_TOKEN_TTL` | `15m` |
| `REFRESH_TOKEN_TTL` | `30d` |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAME_SITE` | `lax` |
| `COOKIE_DOMAIN` | leave **unset** (same-origin host-only cookies) |
| `VITE_API_URL` | `/api` (optional; baked by build script and code default) |
| `CORS_ORIGINS` | `https://dartscret.havensnet.com` (optional; same-origin default exists) |

Template: `server/.env.production.example`  
Never commit `.env`, `.secrets.local`, or real JWT/DB values.

## After first deploy — migrate once

```bash
npm run migrate:deploy
```

Never run `prisma migrate deploy` inside `postinstall`.  
Never run `prisma migrate dev` in production.

## Cookies / CORS (same origin)

- Cookies `ds_access` / `ds_refresh`: `httpOnly`, `secure` in production, `sameSite=lax`, `path=/`, host-only
- Frontend calls relative `/api` with `credentials: 'include'`
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

1. Express app on `dartscret.havensnet.com` — root `./`, entry `server/dist/server.js`, Node 22
2. Remove any separate `api.dartscret` app
3. Set env vars above
4. Deploy (Hostinger runs `npm install` only — build happens in `postinstall`)
5. Run `npm run migrate:deploy` once
6. Verify `/api/health` (JSON) and `/` (React)

## Local Hostinger simulation

```bash
rm -rf node_modules server/node_modules dist server/dist
npm install
# after install, dist/index.html and server/dist/server.js must exist
SKIP_DB_CONNECT=true PORT=4000 NODE_ENV=production \
  JWT_ACCESS_SECRET=dev_access_secret_change_me_32chars_min \
  JWT_REFRESH_SECRET=dev_refresh_secret_change_me_32chars_xx \
  DATABASE_URL=mysql://build:build@127.0.0.1:3306/build \
  npm start
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
