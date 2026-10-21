# Hostinger deployment

See the root guide: [../HOSTINGER.md](../HOSTINGER.md)

| | |
|--|--|
| Framework | Express |
| Domain | `https://dartscret.havensnet.com` |
| Root directory | `./` (not `server`) |
| Entry file | `server/dist/server.js` |
| Package manager | npm |
| Build command | **none** — root `postinstall` builds frontend + backend, then migrates |
| Migrate | automatic via `postinstall` → `npm run migrate:deploy` |

Do **not** deploy a separate API app on `api.dartscret.havensnet.com`.
