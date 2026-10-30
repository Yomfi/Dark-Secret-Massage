# Vendored: PHPMailer

- Upstream: https://github.com/PHPMailer/PHPMailer
- Version: **7.1.1** (see `VERSION`)
- License: LGPL-2.1 (see `LICENSE`)
- Files: `src/PHPMailer.php`, `src/SMTP.php`, `src/Exception.php` only

## Why this is vendored

The production target is Hostinger PHP hosting, deployed by copying `dist/` (including
`dist/api`, copied from `public/api`). There is no Composer step and no autoloader on the
host, so the three classes used by `api/config/mailer.php` are committed here and loaded
with explicit `require_once` calls.

Do not edit these files. Keep them identical to the upstream release.

## Updating

1. Download the release archive for the new tag from the upstream releases page.
2. Replace the three files under `src/`, update `VERSION` and `LICENSE`.
3. Run `npm run php:lint` and `npm run test:mail` before committing.
