# Massager Studio

Private platform for intentional matrimonial matchmaking and professional massage wellness.

## Production (Hostinger PHP + MySQL)

Same origin: `https://massagerstudio.com`

- Frontend: Vite React → `dist/`
- Backend: PHP under `public/api/` (copied into `dist/api/` on build)
- Database: Hostinger MySQL (`users` table shared with prior Prisma schema)

```bash
npm install
npm run build
```

Deploy `dist/` to Hostinger PHP hosting. See [HOSTINGER.md](./HOSTINGER.md).

Email: no delivery is wired yet. Recipient mailboxes (`info@`, `admin@`, `contact@massagerstudio.com`)
and the remaining setup steps are in [HOSTINGER.md](./HOSTINGER.md#email).

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
- `/massage` explore services
- `/book-massage` booking flow
- `/find-a-life-partner` discovery (requires authentication)
- `/login` `/register` `/onboarding`

## Legacy Node backend

The `server/` Express + Prisma tree is retained temporarily for reference.  
Production no longer depends on Node/Express/Prisma runtime.
