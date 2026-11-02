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

/**
 * Read a configuration variable from whichever source this host injects
 * environment variables with: Apache SetEnv exposes values in $_SERVER,
 * PHP-FPM may only populate $_ENV, and CLI uses getenv().
 *
 * @return string|false
 */
function ds_env(string $key)
{
    $value = getenv($key);
    if (is_string($value)) {
        return $value;
    }
    if (isset($_ENV[$key]) && is_string($_ENV[$key])) {
        return $_ENV[$key];
    }
    if (isset($_SERVER[$key]) && is_string($_SERVER[$key])) {
        return $_SERVER[$key];
    }
    return false;
}

function ds_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $defaults = [
        'db_driver' => ds_env('DS_DB_DRIVER') ?: 'mysql',
        'sqlite_path' => ds_env('DS_SQLITE_PATH') ?: '',
        'db_host' => ds_env('DS_DB_HOST') ?: 'localhost',
        'db_port' => (int) (ds_env('DS_DB_PORT') ?: 3306),
        // Legacy Hostinger MySQL names — retain for production compatibility.
        'db_name' => ds_env('DS_DB_NAME') ?: 'u190513960_darksecret',
        'db_user' => ds_env('DS_DB_USER') ?: 'u190513960_darksecret',
        'db_pass' => ds_env('DS_DB_PASS') ?: '',
        'session_name' => ds_env('DS_SESSION_NAME') ?: 'ds_session',
        // null = auto-detect HTTPS; set true/false in config.local.php to force
        'cookie_secure' => (static function () {
            $env = ds_env('DS_COOKIE_SECURE');
            if ($env === false || $env === '') {
                return null;
            }
            return filter_var($env, FILTER_VALIDATE_BOOLEAN);
        })(),
        'cookie_samesite' => ds_env('DS_COOKIE_SAMESITE') ?: 'Lax',
        'cookie_path' => '/',
        'session_lifetime' => (int) (ds_env('DS_SESSION_LIFETIME') ?: 60 * 60 * 24 * 30),
        'app_env' => ds_env('DS_APP_ENV') ?: 'production',
        'app_url' => ds_env('DS_APP_URL') ?: 'https://massagerstudio.com',
        // Recipient mailboxes only — keep separate from mail_from / SMTP credentials.
        'info_email' => ds_env('DS_INFO_EMAIL') ?: 'info@massagerstudio.com',
        'admin_email' => ds_env('DS_ADMIN_EMAIL') ?: 'admin@massagerstudio.com',
        'contact_email' => ds_env('DS_CONTACT_EMAIL') ?: 'contact@massagerstudio.com',
        // Transport: smtp (production) | file (local outbox, refused in production).
        'mail_transport' => strtolower(trim((string) (ds_env('DS_MAIL_TRANSPORT') ?: 'smtp'))),
        // Authenticated SMTP transport (server-only; never sent to the browser).
        'smtp_host' => ds_env('DS_SMTP_HOST') ?: '',
        'smtp_port' => (int) (ds_env('DS_SMTP_PORT') ?: 465),
        // ssl | tls | '' — an explicit empty value allows the loopback test sink.
        'smtp_secure' => (static function () {
            $value = ds_env('DS_SMTP_SECURE');
            return $value === false ? 'ssl' : strtolower(trim($value));
        })(),
        'smtp_user' => ds_env('DS_SMTP_USER') ?: '',
        'smtp_pass' => ds_env('DS_SMTP_PASS') ?: '',
        'smtp_timeout' => (int) (ds_env('DS_SMTP_TIMEOUT') ?: 15),
        'mail_from' => ds_env('DS_MAIL_FROM') ?: 'info@massagerstudio.com',
        'mail_from_name' => ds_env('DS_MAIL_FROM_NAME') ?: 'Massager Studio',
        'mail_reply_to' => ds_env('DS_MAIL_REPLY_TO') ?: 'contact@massagerstudio.com',
        'mail_debug' => (int) (ds_env('DS_MAIL_DEBUG') ?: 0),
        // Provider membership. Free by default: the fee can be switched back on
        // (DS_MEMBERSHIP_FEE_ENABLED=true) without a schema or code change.
        'membership_fee_enabled' => filter_var(
            ds_env('DS_MEMBERSHIP_FEE_ENABLED') ?: 'false',
            FILTER_VALIDATE_BOOLEAN
        ),
        'membership_fee_amount' => (float) (ds_env('DS_MEMBERSHIP_FEE_AMOUNT') ?: 100),
        'membership_currency' => ds_env('DS_MEMBERSHIP_CURRENCY') ?: 'GHS',
    ];

    // Configuration sources, in increasing precedence. A Hostinger Git deploy
    // replaces public_html, so files inside it are disposable; the deploy-safe
    // locations live above the document root.
    $loaded = [];
    $keySources = [];
    $fileErrors = [];
    foreach (ds_config_file_candidates() as $label => $path) {
        if (!@is_file($path) || !@is_readable($path)) {
            continue;
        }
        try {
            $data = require $path;
        } catch (Throwable $e) {
            // A malformed config file must never take the whole API down; skip it
            // and surface the failure class (never the contents) in diagnostics.
            $fileErrors[$label] = get_class($e);
            continue;
        }
        if (!is_array($data)) {
            $fileErrors[$label] = 'not_array';
            continue;
        }
        foreach ($data as $key => $value) {
            if (is_string($key)) {
                $keySources[$key] = $label;
            }
        }
        $defaults = array_merge($defaults, $data);
        $loaded[] = $label;
    }

    $GLOBALS['ds_config_loaded_sources'] = $loaded;
    $GLOBALS['ds_config_key_sources'] = $keySources;
    $GLOBALS['ds_config_file_errors'] = $fileErrors;

    $config = $defaults;
    return $config;
}

/**
 * Candidate config files, lowest precedence first.
 *
 * `DS_CONFIG_PATH` is an explicit, server-set override. The remaining paths sit
 * above the deployed document root so a deployment replacement cannot delete
 * them, and they are never web-accessible.
 *
 * @return array<string, string> label => absolute path
 */
function ds_config_file_candidates(): array
{
    $candidates = ['in_tree' => __DIR__ . '/config.local.php'];

    $docRoot = trim((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''));
    if ($docRoot !== '') {
        $parent = dirname($docRoot);
        $candidates['parent_of_document_root'] = $parent . '/massager-studio.config.local.php';
        $candidates['parent_of_document_root_dir'] = $parent . '/massager-studio/config.local.php';
    }

    // public_html/api/config → three levels up is the site directory above public_html.
    $candidates['three_levels_up'] = dirname(__DIR__, 3) . '/massager-studio.config.local.php';

    $home = rtrim((string) ($_SERVER['HOME'] ?? ''), '/');
    if ($home !== '') {
        $candidates['home_directory'] = $home . '/massager-studio.config.local.php';
    }

    $explicit = ds_env('DS_CONFIG_PATH');
    if (is_string($explicit) && trim($explicit) !== '') {
        $candidates['DS_CONFIG_PATH'] = trim($explicit);
    }

    return $candidates;
}

/** Which candidate labels were actually read (labels only, never paths). @return list<string> */
function ds_config_loaded_sources(): array
{
    return is_array($GLOBALS['ds_config_loaded_sources'] ?? null)
        ? $GLOBALS['ds_config_loaded_sources']
        : [];
}

/** Which source supplied a key, by label only. */
function ds_config_key_source(string $key): ?string
{
    $map = $GLOBALS['ds_config_key_sources'] ?? null;
    return is_array($map) && isset($map[$key]) ? (string) $map[$key] : null;
}

/** Per-file load failures, by label and error class only. @return array<string, string> */
function ds_config_file_errors(): array
{
    return is_array($GLOBALS['ds_config_file_errors'] ?? null)
        ? $GLOBALS['ds_config_file_errors']
        : [];
}

/** Diagnostics: candidate labels with existence flags. No paths or values. @return array<string, array{exists: bool, readable: bool}> */
function ds_config_candidates_status(): array
{
    $out = [];
    foreach (ds_config_file_candidates() as $label => $path) {
        $exists = @is_file($path);
        $out[$label] = ['exists' => $exists, 'readable' => $exists && @is_readable($path)];
    }
    return $out;
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
