<?php
declare(strict_types=1);

/**
 * Resend the account-confirmation email for the signed-in user.
 * One shared flow for customers, individual providers and agencies.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/config/email_verification.php';

ds_require_method('POST');

$user = ds_require_user();

ds_success(ds_email_verification_send_link($user, 'auth_resend_verification', 6));
