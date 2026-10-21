<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('GET');
$user = ds_require_provider();

$profile = ds_provider_profile_by_user($user['id']);
$verification = ds_table_exists('provider_verification')
    ? ds_ensure_provider_verification($user['id'])
    : [
        'identity_status' => 'not_submitted',
        'payment_status' => 'unpaid',
        'verification_status' => 'unverified',
        'verification_fee_amount' => 100,
        'currency' => 'GHS',
    ];

ds_success(ds_provider_dashboard_dto($user, $profile, $verification));
