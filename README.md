# Massager Studio

Private platform for trusted professional massage and wellness services.

## Production (Hostinger PHP + MySQL)

Same origin: `https://massagerstudio.com`

- Frontend: Vite React → `dist/`
- Backend: PHP under `public/api/` (copied into `dist/api/` on build)
- Database: Hostinger MySQL (legacy database/user names retained — see [HOSTINGER.md](./HOSTINGER.md))

```bash
npm install
npm run build
```

Deploy `dist/` to Hostinger PHP hosting. See [HOSTINGER.md](./HOSTINGER.md).

Email: transactional mail (password reset, email confirmation, provider verification code) is
delivered over authenticated SMTP configured on the server; see
[HOSTINGER.md](./HOSTINGER.md#email) for the required settings and diagnostics.

## Local frontend

```bash
npm install
npm run dev
npm run build
npm run lint
```

API client defaults to `/api` (same-origin).

## Routes

- `/` homepage
- `/explore/:city` massage marketplace
- `/massage` explore services
- `/book-massage` booking flow
- `/provider/register` individual and agency provider registration
- `/login` `/register` `/onboarding`

Archived matchmaking UI remains under `src/_archived/matchmaking/` and is not part of the live public product.

## Legacy Node backend

The `server/` Express + Prisma tree is retained temporarily for reference.  
Production no longer depends on Node/Express/Prisma runtime.
