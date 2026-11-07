<?php
declare(strict_types=1);

/**
 * Legacy provider confirmation endpoint, kept for cached clients.
 * It now accepts the same one confirmation link as every other account type.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/config/email_verification.php';

ds_require_method('POST');
ds_rate_limit('provider_verify_email', 20, 15 * 60);

$user = ds_require_provider();
$body = ds_json_body();
$token = trim((string) ($body['token'] ?? ''));

$result = ds_email_verification_confirm($token, (string) $user['id']);
ds_success($result + ['nextStep' => 'provider_profile']);
