<?php
declare(strict_types=1);

/**
 * Local repository entry point.
 *
 * Production deploys only dist/, so the working command on the host is
 * `php api/tools/admin-provision.php ...` (same implementation, deployed path).
 * This wrapper keeps the repository command for local use.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script only runs from the command line.\n");
}

require __DIR__ . '/../public/api/tools/admin-provision.php';
