<?php
declare(strict_types=1);

/**
 * Public slot availability.
 *
 * Availability is derived from the published schedule (studio settings or the
 * provider's working days/hours), stored bookings, the service duration and the
 * server clock. When no schedule is published the response says so instead of
 * inventing slots. The booking endpoint re-checks all of this at write time.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('GET');

if (!ds_cms_ready()) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'Booking is not available until the database migration has been run.');
}

$date = trim((string) ($_GET['date'] ?? ''));
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    ds_error(400, 'VALIDATION_ERROR', 'Choose a valid date.');
}

$serviceId = trim((string) ($_GET['serviceId'] ?? ''));
$providerProfileId = trim((string) ($_GET['providerProfileId'] ?? ''));

$duration = 60;
if ($serviceId !== '' && ds_table_exists('services')) {
    $stmt = ds_pdo()->prepare('SELECT duration_minutes FROM services WHERE id = ? AND is_active = 1 LIMIT 1');
    $stmt->execute([$serviceId]);
    $row = $stmt->fetch();
    if (!$row) {
        ds_error(409, 'SERVICE_UNAVAILABLE', 'That service is not available right now.');
    }
    $duration = max(15, (int) $row['duration_minutes']);
} elseif (isset($_GET['duration'])) {
    // Existing bookings can outlive an edited service; reschedule previews use
    // the booking's stored duration rather than an arbitrary default.
    $duration = max(15, min(480, (int) $_GET['duration']));
}

$providerName = null;
if ($providerProfileId !== '') {
    if (!ds_table_exists('provider_profiles')) {
        ds_error(404, 'NOT_FOUND', 'Provider not found.');
    }
    $publishedClause = ds_column_exists('provider_profiles', 'is_published') ? ' AND p.is_published = 1' : '';
    $publishedClause .= ds_column_exists('provider_profiles', 'removed_at') ? ' AND p.removed_at IS NULL' : '';
    $stmt = ds_pdo()->prepare(
        "SELECT p.id, p.display_name, COALESCE(v.verification_status, 'unverified') AS verification_status
         FROM provider_profiles p
         INNER JOIN users u ON u.id = p.user_id
         LEFT JOIN provider_verification v ON v.provider_user_id = p.user_id
         WHERE p.id = ? AND u.account_status = 'active'" . $publishedClause . ' LIMIT 1'
    );
    $stmt->execute([$providerProfileId]);
    $provider = $stmt->fetch();
    if (!$provider) {
        ds_error(404, 'NOT_FOUND', 'That provider is not accepting bookings.');
    }
    if ((string) ($provider['verification_status'] ?? 'unverified') !== 'verified') {
        ds_error(
            409,
            'PROVIDER_NOT_VERIFIED',
            'This provider has not completed identity verification and is not currently accepting bookings.'
        );
    }
    $providerName = (string) $provider['display_name'];
}

$schedule = ds_booking_schedule($providerProfileId !== '' ? $providerProfileId : null);
$busy = $providerProfileId !== ''
    ? ds_provider_day_bookings($providerProfileId, $date)
    : ds_studio_day_bookings($date);

$availability = ds_available_slots($date, $busy, $duration, $schedule);

ds_success([
    'date' => $date,
    'durationMinutes' => $duration,
    'providerProfileId' => $providerProfileId !== '' ? $providerProfileId : null,
    'providerName' => $providerName,
] + $availability);
