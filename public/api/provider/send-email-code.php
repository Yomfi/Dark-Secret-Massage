<?php
declare(strict_types=1);

/**
 * Legacy provider resend endpoint, kept for cached clients.
 * Sends the same confirmation link email as /auth/resend-verification.php.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/config/email_verification.php';

ds_require_method('POST');

$user = ds_require_provider();

ds_success(ds_email_verification_send_link($user, 'provider_send_email', 8));
