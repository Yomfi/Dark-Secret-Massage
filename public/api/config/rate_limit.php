<?php
declare(strict_types=1);

/**
 * Simple file-based rate limiter (per IP + bucket).
 * Practical on shared Hostinger hosting without Redis.
 */
function ds_rate_limit(string $bucket, int $max, int $windowSeconds): void
{
    $ip = preg_replace('/[^a-zA-Z0-9_.:-]/', '_', ds_client_ip()) ?: 'unknown';
    // Internal temp bucket path only — not user-facing branding. The legacy
    // directory name is kept so a deploy does not reset existing counters.
    // DS_RATE_LIMIT_DIR lets local smoke tests isolate counters between runs.
    $configured = getenv('DS_RATE_LIMIT_DIR');
    $dir = is_string($configured) && trim($configured) !== ''
        ? trim($configured)
        : sys_get_temp_dir() . '/darksecret_rate';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }

    $file = $dir . '/' . $bucket . '_' . $ip . '.json';
    $now = time();
    $data = ['start' => $now, 'count' => 0];

    if (is_file($file)) {
        $raw = @file_get_contents($file);
        $parsed = $raw ? json_decode($raw, true) : null;
        if (is_array($parsed) && isset($parsed['start'], $parsed['count'])) {
            $data = $parsed;
        }
    }

    if (($now - (int) $data['start']) > $windowSeconds) {
        $data = ['start' => $now, 'count' => 0];
    }

    $data['count'] = (int) $data['count'] + 1;
    @file_put_contents($file, json_encode($data), LOCK_EX);

    if ($data['count'] > $max) {
        ds_error(429, 'RATE_LIMITED', 'Too many attempts. Please try again shortly.');
    }
}
