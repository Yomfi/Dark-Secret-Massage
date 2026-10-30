<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('provider_submit_review', 10, 15 * 60);

$user = ds_require_provider();

if (!ds_table_exists('provider_verification')) {
    ds_error(503, 'NOT_CONFIGURED', 'Verification table is not installed.');
}

$verification = ds_ensure_provider_verification($user['id']);
$profile = ds_provider_profile_by_user($user['id']);

$phoneOk = !empty($user['phone_verified_at']) || !empty($verification['phone_verified_at']);
$emailOk = !empty($user['email_verified_at']) || !empty($verification['email_verified_at']);
$profileOk = $profile && !empty($profile['profile_completed_at']);
$identityOk = in_array($verification['identity_status'] ?? '', ['pending', 'approved'], true);

if (!$phoneOk || !$emailOk || !$profileOk || !$identityOk) {
    ds_error(400, 'INCOMPLETE', 'Complete phone, email, profile and identity steps before admin review.');
}

$now = ds_now_sql();
ds_pdo()->prepare(
    'UPDATE provider_verification
     SET verification_status = \'pending_review\', submitted_for_review_at = ?, updated_at = ?
     WHERE provider_user_id = ?'
)->execute([$now, $now, $user['id']]);

// Operational notification to info@. The submission itself must not fail if mail fails.
$notice = ds_send_template(
    'provider_review_notice',
    (string) (ds_config()['info_email'] ?? 'info@massagerstudio.com'),
    'Massager Studio Operations',
    [
        'provider_name' => (string) ($profile['display_name'] ?? trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''))),
        'provider_type' => (string) ($profile['provider_type'] ?? 'individual'),
        'city' => (string) ($profile['city'] ?? ''),
        'provider_email' => (string) ($user['email'] ?? ''),
        'provider_id' => (string) $user['id'],
        'submitted_at' => $now,
        'review_link' => ds_app_link('/admin/provider-reviews'),
    ],
    ['user' => (string) $user['id']]
);

ds_success([
    'submitted' => true,
    'verificationStatus' => 'pending_review',
    'adminNotified' => $notice['sent'],
    'message' => 'Your verification is awaiting admin review. Payment gateway integration is coming soon.',
]);
