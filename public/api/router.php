<?php
declare(strict_types=1);

/**
 * Router for PHP built-in server / Hostinger fallback.
 * Maps /api/auth/login → auth/login.php etc.
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$uri = '/' . ltrim($uri, '/');

// Strip leading /api if docroot is public/ or public/api
if (str_starts_with($uri, '/api/')) {
    $uri = substr($uri, 4); // keep leading slash on remainder → /auth/login
}
if ($uri === '/api') {
    $uri = '/';
}

$fileMap = [
    '/health' => __DIR__ . '/health.php',
    '/health.php' => __DIR__ . '/health.php',
    '/config-status' => __DIR__ . '/config-status.php',
    '/config-status.php' => __DIR__ . '/config-status.php',
    '/auth/register' => __DIR__ . '/auth/register.php',
    '/auth/login' => __DIR__ . '/auth/login.php',
    '/auth/logout' => __DIR__ . '/auth/logout.php',
    '/auth/me' => __DIR__ . '/auth/me.php',
    '/auth/refresh' => __DIR__ . '/auth/refresh.php',
    '/auth/forgot-password' => __DIR__ . '/auth/forgot-password.php',
    '/auth/reset-password' => __DIR__ . '/auth/reset-password.php',
    '/auth/verify-email' => __DIR__ . '/auth/verify-email.php',
    '/auth/resend-verification' => __DIR__ . '/auth/resend-verification.php',
    '/auth/verify-phone' => __DIR__ . '/auth/verify-phone.php',
    '/auth/onboarding' => __DIR__ . '/auth/onboarding.php',
];

$normalized = rtrim($uri, '/') ?: '/';
if (isset($fileMap[$normalized])) {
    require $fileMap[$normalized];
    return true;
}

if (isset($fileMap[$normalized . '.php'])) {
    require $fileMap[$normalized . '.php'];
    return true;
}

// Direct script requests (the frontend calls /provider/send-email-code.php etc.).
// Only real PHP files below public endpoint directories are executable; config,
// vendor, sql and storage stay unreachable.
$segment = explode('/', ltrim($normalized, '/'))[0] ?? '';
// `tools` is intentionally omitted — CLI scripts must stay unreachable over HTTP.
$endpointDirs = ['auth', 'admin', 'provider', 'customer', 'public'];
if (in_array($segment, $endpointDirs, true) && str_ends_with($normalized, '.php')) {
    $candidate = __DIR__ . $normalized;
    if (is_file($candidate) && !str_contains($normalized, '..')) {
        require $candidate;
        return true;
    }
}

http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => false,
    'error' => ['code' => 'NOT_FOUND', 'message' => 'The requested resource was not found.'],
]);
return true;
