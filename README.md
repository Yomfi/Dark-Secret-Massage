# Dark Secret

Private platform for intentional matrimonial matchmaking and professional massage wellness.

## One-app production (Hostinger)

Express serves `/api/*` and the Vite SPA from the same origin.

```bash
npm install
npm run build:production
npm start
```

Full Hostinger settings: see [HOSTINGER.md](./HOSTINGER.md).

## Frontend (local)

```bash
npm install
npm run dev
npm run build
npm run lint
```

API client defaults to `/api`. Leave `VITE_API_URL` unset in local Vite to use the `/api` proxy, or set `VITE_API_URL=http://localhost:4000/api`.

## Backend (local)

```bash
cd server
cp .env.example .env   # fill MySQL + JWT secrets
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

Or from root: `npm run server:dev`

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
