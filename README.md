# Dark Secret

Private platform for intentional matrimonial matchmaking and professional massage wellness.

## Frontend

```bash
npm install
npm run dev
npm run build
npm run lint
```

Set `VITE_API_URL` (see `.env.example`). Leave empty in local Vite to use the `/api` proxy to the backend.

## Backend (Milestone 1 — Auth)

```bash
cd server
cp .env.example .env   # fill MySQL + JWT secrets
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

See `server/HOSTINGER.md` for Hostinger deployment preparation.

Auth smoke checks (no DB required):

```bash
cd server && npm run test:auth
```

## Routes

- `/` homepage
- `/massage` explore services
- `/book-massage` booking flow
- `/find-a-life-partner` discovery (requires authentication)
- `/login` `/register` `/onboarding`
