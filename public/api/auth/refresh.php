<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

/**
 * Session-based auth: refresh re-validates the PHP session and returns the user.
 * Kept for frontend AuthContext compatibility (same-origin cookies).
 */
ds_require_method('POST');
ds_rate_limit('refresh', 60, 15 * 60);

$user = ds_require_user();
ds_start_session();
session_regenerate_id(true);
ds_success(['user' => ds_user_dto($user)]);
