# Production access and migration runbook

Last verified: 11 November 2026.

## Current status

- Production access is **blocked from this workstation**.
- `massagerstudio.com` resolves to `77.37.50.103` and `147.79.116.251`; `www` resolves through Hostinger CDN addresses.
- No `~/.ssh/config` entry exists for this project.
- SSH ports `22` and `65002` time out on both current origin addresses. The old `109.106.242.3` address is no longer the production origin.
- No production schema change, migration or deployment was run while access was blocked.
- Do not paste private keys, database passwords or hPanel passwords into chat. Only verify that the public key is installed.

## 1. Recover SSH details from hPanel

1. Sign in to hPanel and open **Websites → massagerstudio.com → Dashboard**.
2. Open **Advanced → SSH Access**.
3. Confirm SSH is enabled and read the **current** host/IP, port and username from that screen. Do not reuse an old IP or port from notes.
4. Add the existing **public** key from `~/.ssh/ms_hostinger.pub` under **SSH Keys**. Never upload or print the private key.
5. From this workstation, test with the values shown in hPanel:

   ```bash
   ssh -i ~/.ssh/ms_hostinger -p <PORT> <USER>@<HOST> 'hostname; whoami; pwd'
   ```

6. If key authentication is unavailable, use hPanel's browser terminal for the backup steps. Do not disable key authentication or weaken the firewall to make a local connection work.

If SSH remains disabled or unreachable, stop here. Do not run migrations through phpMyAdmin or any other partial access path.

## 2. Record a verified backup before any migration

1. Confirm the application config still lives outside the web root at
   `~/domains/massagerstudio.com/massager-studio.config.local.php`.
   Read database credentials there on the server; never print the file.
2. Take a consistent SQL backup using the server's credentials. Prefer hPanel's
   **Databases → phpMyAdmin → Export** for a simple full backup, or run
   `mysqldump` from the server with a temporary `--defaults-extra-file` that is
   deleted afterwards.
3. Compress the dump and calculate its checksum **on the server**:

   ```bash
   gzip -9 backup.sql
   sha256sum backup.sql.gz | tee backup.sql.gz.sha256
   ls -lh backup.sql.gz
   ```

4. Download both files to a separate machine and verify the checksum there.
5. Prove the backup is usable by restoring it into a disposable local/staging
   database and confirming the critical tables and row counts:
   `users`, `provider_profiles`, `provider_verification`, `bookings`,
   `booking_events`, `provider_assignments`, `assignment_events`, `services`.
6. Record the backup path, timestamp, byte size and SHA-256 in the deployment
   report. A zero-byte file, an unverified checksum or an untested restore is
   **not** a verified backup.

## 3. Migration gate

Only after step 2 passes:

```bash
# Inspect pending migrations first.
php scripts/migrate.php --status

# Apply only the reviewed migrations, with the verified backup path recorded.
php scripts/migrate.php --apply
```

Then re-run the authenticated smoke checks against production:

- login for admin, customer and provider;
- assignment create/reassign and Undo/Redo;
- customer reschedule with an open slot and rejection of a conflicting slot;
- admin internal booking note appears only in the admin timeline;
- provider structured location saves and the public profile shows only town/area, never the private pin;
- nearest-provider search and admin assignment recommendations;
- purple/black brand tokens on public, customer, provider and admin pages.

## 4. Rollback

- Keep the previous release directory and the verified SQL backup until the new
  release passes smoke tests.
- If a migration or release fails, switch traffic back to the previous release
  and restore the verified database backup. Do not attempt a partial manual
  schema edit.
- Record the failed command, the first error and the rollback result.

## 5. Deployment authorization

Deploying this feature branch requires explicit authorization and a successful
step 1–3 sequence. Until then, all work remains local on
`feature/agency-reschedule-notes-locations`.
