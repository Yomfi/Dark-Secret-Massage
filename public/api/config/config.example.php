<?php
/**
 * Copy to config.local.php on the server (never commit config.local.php).
 * Or set the same keys as environment variables in Hostinger.
 */
return [
    // MySQL — password only on Hostinger, never in Git
    'db_driver' => 'mysql',
    'db_host' => 'localhost',
    'db_port' => 3306,
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

    // Recipient mailboxes — operational addresses only, never SMTP credentials.
    // info: system/operational notices · admin: business enquiries & partnerships
    // contact: public contact-form and marketplace enquiry mail
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
];

