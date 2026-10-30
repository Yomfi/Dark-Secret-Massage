<?php
declare(strict_types=1);

/**
 * Shared bootstrap for all API endpoints.
 */

require_once __DIR__ . '/response.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/validation.php';
require_once __DIR__ . '/rate_limit.php';
require_once __DIR__ . '/provider.php';
require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/mail_templates.php';

function ds_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $defaults = [
        'db_driver' => getenv('DS_DB_DRIVER') ?: 'mysql',
        'sqlite_path' => getenv('DS_SQLITE_PATH') ?: '',
        'db_host' => getenv('DS_DB_HOST') ?: 'localhost',
        'db_port' => (int) (getenv('DS_DB_PORT') ?: 3306),
        'db_name' => getenv('DS_DB_NAME') ?: 'u190513960_darksecret',
        'db_user' => getenv('DS_DB_USER') ?: 'u190513960_darksecret',
        'db_pass' => getenv('DS_DB_PASS') ?: '',
        'session_name' => getenv('DS_SESSION_NAME') ?: 'ds_session',
        // null = auto-detect HTTPS; set true/false in config.local.php to force
        'cookie_secure' => (static function () {
            $env = getenv('DS_COOKIE_SECURE');
            if ($env === false || $env === '') {
                return null;
            }
            return filter_var($env, FILTER_VALIDATE_BOOLEAN);
        })(),
        'cookie_samesite' => getenv('DS_COOKIE_SAMESITE') ?: 'Lax',
        'cookie_path' => '/',
        'session_lifetime' => (int) (getenv('DS_SESSION_LIFETIME') ?: 60 * 60 * 24 * 30),
        'app_env' => getenv('DS_APP_ENV') ?: 'production',
        'app_url' => getenv('DS_APP_URL') ?: 'https://massagerstudio.com',
        // Recipient mailboxes. Operational addresses only — not sender/SMTP settings.
        'info_email' => getenv('DS_INFO_EMAIL') ?: 'info@massagerstudio.com',
        'admin_email' => getenv('DS_ADMIN_EMAIL') ?: 'admin@massagerstudio.com',
        'contact_email' => getenv('DS_CONTACT_EMAIL') ?: 'contact@massagerstudio.com',
        // Transport: smtp (production) | file (local outbox, refused in production).
        'mail_transport' => strtolower(trim((string) (getenv('DS_MAIL_TRANSPORT') ?: 'smtp'))),
        // Authenticated SMTP transport (server-only; never sent to the browser).
        'smtp_host' => getenv('DS_SMTP_HOST') ?: '',
        'smtp_port' => (int) (getenv('DS_SMTP_PORT') ?: 465),
        // ssl | tls | '' — an explicit empty value allows the loopback test sink.
        'smtp_secure' => (static function () {
            $value = getenv('DS_SMTP_SECURE');
            return $value === false ? 'ssl' : strtolower(trim($value));
        })(),
        'smtp_user' => getenv('DS_SMTP_USER') ?: '',
        'smtp_pass' => getenv('DS_SMTP_PASS') ?: '',
        'smtp_timeout' => (int) (getenv('DS_SMTP_TIMEOUT') ?: 15),
        'mail_from' => getenv('DS_MAIL_FROM') ?: 'info@massagerstudio.com',
        'mail_from_name' => getenv('DS_MAIL_FROM_NAME') ?: 'Massager Studio',
        'mail_reply_to' => getenv('DS_MAIL_REPLY_TO') ?: 'contact@massagerstudio.com',
        'mail_debug' => (int) (getenv('DS_MAIL_DEBUG') ?: 0),
    ];

    $localFile = __DIR__ . '/config.local.php';
    if (is_file($localFile)) {
        $local = require $localFile;
        if (is_array($local)) {
            $defaults = array_merge($defaults, $local);
        }
    }

    $config = $defaults;
    return $config;
}

function ds_is_prod(): bool
{
    return (ds_config()['app_env'] ?? 'production') === 'production';
}

function ds_send_security_headers(): void
{
    if (headers_sent()) {
        return;
    }
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header('Cache-Control: no-store');
}

function ds_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        ds_error(400, 'VALIDATION_ERROR', 'Invalid JSON body.');
    }
    return $decoded;
}

function ds_require_method(string ...$methods): void
{
    ds_send_security_headers();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
    $allowed = array_map('strtoupper', $methods);
    if (!in_array(strtoupper($method), $allowed, true)) {
        ds_error(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
    }
}

function ds_new_id(): string
{
    return bin2hex(random_bytes(16));
}

function ds_client_ip(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return substr($ip, 0, 64);
}

function ds_now_sql(): string
{
    return (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
}
