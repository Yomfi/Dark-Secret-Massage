<?php
/**
 * Template only — never commit real credentials.
 *
 * On Hostinger, a Git deployment replaces public_html, so a config file inside
 * the deployed tree is disposable. Store the real file one level ABOVE
 * public_html as massager-studio.config.local.php (or set DS_CONFIG_PATH, or
 * use DS_* environment variables). See HOSTINGER.md → "PHP API config".
 */
return [
    // MySQL — password only on Hostinger, never in Git
    'db_driver' => 'mysql',
    'db_host' => 'localhost',
    'db_port' => 3306,
    // Legacy Hostinger MySQL names — retain for production compatibility.
    'db_name' => 'u190513960_darksecret',
    'db_user' => 'u190513960_darksecret',
    'db_pass' => 'REPLACE_WITH_HOSTINGER_DB_PASSWORD',

    // Session cookie (HttpOnly always; Secure should be true on HTTPS)
    'session_name' => 'ds_session',
    'cookie_secure' => true,
    'cookie_samesite' => 'Lax',
    'cookie_path' => '/',
    'session_lifetime' => 60 * 60 * 24 * 30, // 30 days

    // App
    'app_env' => 'production',    // production | development
    'app_url' => 'https://massagerstudio.com',

    // Recipient mailboxes only (never SMTP credentials). Keep separate from mail_from.
    // info@   — system notifications and general operational email notifications
    // admin@  — official business enquiries, partnerships and collaborations
    // contact@ — contact-form submissions and public contact / marketplace enquiry mail
    'info_email' => 'info@massagerstudio.com',
    'admin_email' => 'admin@massagerstudio.com',
    'contact_email' => 'contact@massagerstudio.com',

    // Transport: 'smtp' in production. 'file' writes messages to
    // api/storage/private/outbox for local development only and is refused
    // whenever app_env is production.
    'mail_transport' => 'smtp',

    // Authenticated SMTP transport. Server-only: never expose these to the browser.
    // Values come from Hostinger hPanel → Emails → info@massagerstudio.com.
    'smtp_host' => 'smtp.hostinger.com',            // confirm in hPanel
    'smtp_port' => 465,                              // 465 = implicit TLS · 587 = STARTTLS
    'smtp_secure' => 'ssl',                          // ssl | tls
    'smtp_user' => 'info@massagerstudio.com',        // full mailbox address
    'smtp_pass' => 'REPLACE_WITH_MAILBOX_PASSWORD',  // mailbox password, never commit
    'smtp_timeout' => 15,

    // Sender/From is separate from the recipient mailboxes above. It must match a
    // mailbox you can authenticate as, or SPF/DMARC alignment fails.
    'mail_from' => 'info@massagerstudio.com',
    'mail_from_name' => 'Massager Studio',
    'mail_reply_to' => 'contact@massagerstudio.com', // users reply to the public inbox
    'mail_debug' => 0,                                // 1+ logs the SMTP transcript privately

    // Provider membership. Membership is free while this is false (the default):
    // identity checks and admin approval still apply, and no payment gate is shown.
    // Set to true and adjust the amount to reintroduce the one-off fee later.
    'membership_fee_enabled' => false,
    'membership_fee_amount' => 100.00,
    'membership_currency' => 'GHS',
];

