<?php
declare(strict_types=1);

function ds_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $cfg = ds_config();
    $lifetime = (int) ($cfg['session_lifetime'] ?? 2592000);
    $path = (string) ($cfg['cookie_path'] ?? '/');
    $sameSite = (string) ($cfg['cookie_samesite'] ?? 'Lax');

    // Prefer explicit config; otherwise detect HTTPS (including Hostinger proxies).
    if (array_key_exists('cookie_secure', $cfg) && $cfg['cookie_secure'] !== null && $cfg['cookie_secure'] !== '') {
        $secure = filter_var($cfg['cookie_secure'], FILTER_VALIDATE_BOOLEAN);
    } else {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['SERVER_PORT']) && (string) $_SERVER['SERVER_PORT'] === '443')
            || (strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https');
        $secure = $https || ds_is_prod();
    }

    $sessionDir = dirname(__DIR__) . '/storage/sessions';
    if (!is_dir($sessionDir)) {
        @mkdir($sessionDir, 0700, true);
    }
    if (is_dir($sessionDir) && is_writable($sessionDir)) {
        session_save_path($sessionDir);
    }

    session_name((string) ($cfg['session_name'] ?? 'ds_session'));
    session_set_cookie_params([
        'lifetime' => $lifetime,
        'path' => $path,
        'secure' => $secure,
        'httponly' => true,
        'samesite' => $sameSite,
    ]);

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_secure', $secure ? '1' : '0');
    ini_set('session.gc_maxlifetime', (string) $lifetime);

    session_start();
}

function ds_login_user(array $user): void
{
    ds_start_session();
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['authenticated_at'] = time();
}

function ds_logout_user(): void
{
    ds_start_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'] ?? '/',
            'domain' => $params['domain'] ?? '',
            'secure' => (bool) ($params['secure'] ?? false),
            'httponly' => true,
            'samesite' => $params['samesite'] ?? 'Lax',
        ]);
    }
    session_destroy();
}

function ds_current_user_id(): ?string
{
    ds_start_session();
    $id = $_SESSION['user_id'] ?? null;
    return is_string($id) && $id !== '' ? $id : null;
}

function ds_require_user(): array
{
    $userId = ds_current_user_id();
    if (!$userId) {
        ds_error(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }

    $user = ds_find_user_by_id($userId);
    if (!$user) {
        ds_logout_user();
        ds_error(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }

    ds_assert_account_can_auth($user);
    return $user;
}

function ds_find_user_by_id(string $id): ?array
{
    $stmt = ds_pdo()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_find_user_by_email(string $email): ?array
{
    $email = strtolower(trim($email));
    $stmt = ds_pdo()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_find_user_by_identifier(string $identifier): ?array
{
    $email = strtolower(trim($identifier));
    $byEmail = ds_find_user_by_email($email);
    if ($byEmail) {
        return $byEmail;
    }

    $cols = ds_users_columns();
    if (!isset($cols['phone'])) {
        return null;
    }

    $phone = preg_replace('/\s+/', '', trim($identifier)) ?? trim($identifier);
    $stmt = ds_pdo()->prepare('SELECT * FROM users WHERE phone = ? LIMIT 1');
    $stmt->execute([$phone]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_assert_account_can_auth(array $user): void
{
    $status = (string) ($user['account_status'] ?? '');
    if ($status === 'suspended') {
        ds_error(403, 'ACCOUNT_SUSPENDED', 'This account has been suspended.');
    }
    if ($status === 'banned') {
        ds_error(403, 'ACCOUNT_BANNED', 'This account has been banned.');
    }
    if ($status === 'deleted') {
        ds_error(403, 'ACCOUNT_DELETED', 'This account is no longer available.');
    }
}

function ds_password_hash_column(array $user): ?string
{
    if (isset($user['password_hash']) && is_string($user['password_hash'])) {
        return $user['password_hash'];
    }
    if (isset($user['password']) && is_string($user['password'])) {
        return $user['password'];
    }
    return null;
}

function ds_user_dto(array $user): array
{
    $iso = static function ($value): ?string {
        if ($value === null || $value === '') {
            return null;
        }
        if ($value instanceof DateTimeInterface) {
            return $value->format(DATE_ATOM);
        }
        $ts = strtotime((string) $value);
        return $ts ? date(DATE_ATOM, $ts) : (string) $value;
    };

    // Never expose password hashes.
    return [
        'id' => $user['id'],
        'email' => $user['email'],
        'phone' => $user['phone'] ?? '',
        'firstName' => $user['first_name'] ?? ($user['firstName'] ?? ''),
        'lastName' => $user['last_name'] ?? ($user['lastName'] ?? ''),
        'role' => $user['role'] ?? 'user',
        'accountStatus' => $user['account_status'] ?? ($user['accountStatus'] ?? 'active'),
        'emailVerifiedAt' => $iso($user['email_verified_at'] ?? null),
        'phoneVerifiedAt' => $iso($user['phone_verified_at'] ?? null),
        'onboardingChoice' => $user['onboarding_choice'] ?? null,
    ];
}
