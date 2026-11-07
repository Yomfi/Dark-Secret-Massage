<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_require_same_origin();
ds_rate_limit('provider_submit_review', 10, 15 * 60);

$user = ds_require_provider();

if (!ds_table_exists('provider_verification')) {
    ds_error(503, 'NOT_CONFIGURED', 'Verification table is not installed.');
}

$verification = ds_ensure_provider_verification($user['id']);
$profile = ds_provider_profile_by_user($user['id']);

$currentStatus = (string) ($verification['verification_status'] ?? 'unverified');
if (in_array($currentStatus, ['pending_review', 'verified'], true)) {
    ds_error(409, 'ALREADY_SUBMITTED', 'Your application is already with the review team.');
}

$choice = (string) ($verification['verification_choice'] ?? 'verify_identity');
if ($choice === 'verify_later') {
    ds_error(409, 'IDENTITY_REQUIRED', 'Upload a government ID before submitting for identity review.');
}

$docs = ds_provider_identity_summary($user['id']);
if (!$docs['hasIdDocument'] || !$docs['hasSelfie']) {
    ds_error(400, 'INCOMPLETE', 'Upload your government ID and selfie before admin review.');
}

// Email verification is required; a phone number is contact information, not a gate.
$emailOk = !empty($user['email_verified_at']) || !empty($verification['email_verified_at']);
$profileOk = $profile && !empty($profile['profile_completed_at']);
$identityOk = in_array($verification['identity_status'] ?? '', ['pending', 'approved'], true);
$feeEnabled = ds_membership_fee_enabled();
$feeOk = !$feeEnabled || ($verification['payment_status'] ?? '') === 'paid';

if (!$emailOk || !$profileOk || !$identityOk) {
    ds_error(400, 'INCOMPLETE', 'Confirm your email, complete your profile and submit identity documents before admin review.');
}

if (!$feeOk) {
    ds_error(402, 'PAYMENT_REQUIRED', 'Complete the membership fee before submitting for review.');
}

$now = ds_now_sql();
$isAgency = (string) ($profile['provider_type'] ?? 'individual') === 'agency';
ds_pdo()->prepare(
    'UPDATE provider_verification
     SET verification_status = \'pending_review\',
         verification_choice = \'verify_identity\',
         submitted_for_review_at = ?, updated_at = ?
     WHERE provider_user_id = ?'
)->execute([$now, $now, $user['id']]);
if ($isAgency) {
    ds_pdo()->prepare(
        "UPDATE provider_verification SET business_status = 'pending', updated_at = ?
         WHERE provider_user_id = ? AND (business_status IS NULL OR business_status IN ('not_submitted','changes_requested','rejected'))"
    )->execute([$now, $user['id']]);
}

ds_audit('provider.review_submitted', 'provider', $user['id'], [
    'choice' => 'verify_identity',
    'hasId' => true,
    'hasSelfie' => true,
], $user['id']);

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
        'membership' => $feeEnabled ? 'Fee required' : 'Free membership',
        'submitted_at' => $now,
        'review_link' => ds_app_link('/admin/provider-reviews'),
    ],
    ['user' => (string) $user['id']]
);

ds_success([
    'submitted' => true,
    'verificationStatus' => 'pending_review',
    'adminNotified' => $notice['sent'],
    'membershipFree' => !$feeEnabled,
    'message' => 'Your profile is awaiting admin review. Membership is currently free; the verified badge is granted only after identity checks and admin approval.',
]);
