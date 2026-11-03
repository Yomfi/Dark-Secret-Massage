<?php
declare(strict_types=1);

/**
 * Offline RBAC matrix check (no database required for role → permission map).
 * Run: php scripts/qa/permissions-check.php
 */

require_once dirname(__DIR__, 2) . '/public/api/config/permissions.php';

$failures = 0;
$assert = static function (bool $ok, string $msg) use (&$failures): void {
    if ($ok) {
        echo "OK  $msg\n";
        return;
    }
    echo "FAIL $msg\n";
    $failures++;
};

$assert(in_array('staff.write', ds_staff_role_permissions('full_admin'), true), 'full_admin has staff.write');
$assert(!in_array('staff.write', ds_staff_role_permissions('content_editor'), true), 'content_editor lacks staff.write');
$assert(in_array('bookings.write', ds_staff_role_permissions('booking_ops'), true), 'booking_ops has bookings.write');
$assert(!in_array('reviews.write', ds_staff_role_permissions('booking_ops'), true), 'booking_ops lacks reviews.write');
$assert(in_array('reviews.write', ds_staff_role_permissions('provider_reviewer'), true), 'provider_reviewer has reviews.write');
$assert(in_array('documents.read', ds_staff_role_permissions('provider_reviewer'), true), 'provider_reviewer has documents.read');
$assert(in_array('privacy.write', ds_staff_role_permissions('support'), true), 'support has privacy.write');
$assert(!in_array('system.write', ds_staff_role_permissions('support'), true), 'support lacks system.write');
$assert(ds_legacy_role_to_staff('admin') === 'full_admin', 'legacy admin → full_admin');
$assert(ds_legacy_role_to_staff('moderator') === 'provider_reviewer', 'legacy moderator → provider_reviewer');
$assert(ds_legacy_role_to_staff('support_admin') === 'support', 'legacy support_admin → support');
$assert(ds_legacy_role_to_staff('user') === null, 'customer role is not staff');

exit($failures === 0 ? 0 : 1);
