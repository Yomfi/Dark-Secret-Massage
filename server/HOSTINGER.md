# Hostinger deployment

Deployment is now a **single full-stack app from the repository root**.

See the root guide: [../HOSTINGER.md](../HOSTINGER.md)

| | |
|--|--|
| Domain | `https://dartscret.havensnet.com` |
| Root directory | `./` (not `server`) |
| Build | `npm run build:production` |
| Start | `npm start` |
| Migrate | `npm run migrate:deploy` |

Do **not** deploy a separate API app on `api.dartscret.havensnet.com`.
