# Dark Secret

Private platform for intentional matrimonial matchmaking and professional massage wellness.

## One-app production (Hostinger Express)

Express serves `/api/*` and the Vite SPA from the same origin.

Hostinger runs `npm install` only (no build-command field). Root `postinstall`
installs server deps and runs `build:production`, producing `server/dist/server.js`.

```bash
npm install   # also builds frontend + backend via postinstall
npm start     # node server/dist/server.js
```

Entry file in hPanel: `server/dist/server.js`  
Full settings: see [HOSTINGER.md](./HOSTINGER.md).

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
