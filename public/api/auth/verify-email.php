<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/config/email_verification.php';

ds_require_method('POST');
ds_rate_limit('verify_email', 30, 15 * 60);

$body = ds_json_body();
$token = (string) ($body['token'] ?? '');

ds_success(ds_email_verification_confirm($token));
