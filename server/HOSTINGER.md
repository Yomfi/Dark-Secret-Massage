# Dark Secret API — Hostinger preparation

## Stack

- Node.js **20+**
- Express + TypeScript
- MySQL via Prisma

## Build / start

```bash
cd server
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
# or: npm run start:prod
```

## Required environment variables

See `server/.env.example`.

Critical:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGINS` (include production frontend origin, e.g. `https://dartscret.havensnet.com`)
- `COOKIE_SECURE=true` in production
- Prefer `COOKIE_SAME_SITE=none` only if frontend and API are on different sites and HTTPS is used; otherwise `lax`/`strict` with shared parent domain + `COOKIE_DOMAIN=.havensnet.com`

## Cross-domain cookies

If the SPA is on `dartscret.havensnet.com` and the API is on `api.dartscret.havensnet.com`:

1. Serve both over HTTPS
2. Set `COOKIE_DOMAIN=.havensnet.com`
3. Set `COOKIE_SECURE=true`
4. Use `COOKIE_SAME_SITE=lax` (or `none` if truly cross-site)

Frontend must call the API with `credentials: 'include'`.

## Frontend

Set:

```
VITE_API_URL=https://YOUR_API_HOST
```

## Not deployed by this milestone

This document prepares Hostinger setup. Database credentials and Node app deployment are still required from Hostinger before the API is live.
