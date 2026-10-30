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

    // Sender / SMTP is separate from the recipients above. No mail is sent yet;
    // set the From address and transport when delivery is implemented.
    // 'mail_from' => '',
];

