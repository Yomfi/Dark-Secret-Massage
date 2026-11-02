<?php
declare(strict_types=1);

/**
 * Public slot availability.
 *
 * Availability is derived from stored bookings, the published service duration
 * and the server clock. The browser never decides what is free: it renders this
 * response, and the booking endpoint re-checks it at write time.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('GET');

if (!ds_cms_ready()) {
    ds_cms_migrate();
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
}

$providerName = null;
$busy = [];
if ($providerProfileId !== '') {
    if (!ds_table_exists('provider_profiles')) {
        ds_error(404, 'NOT_FOUND', 'Provider not found.');
    }
    $publishedClause = ds_column_exists('provider_profiles', 'is_published') ? ' AND p.is_published = 1' : '';
    $stmt = ds_pdo()->prepare(
        "SELECT p.id, p.display_name FROM provider_profiles p
         INNER JOIN users u ON u.id = p.user_id
         WHERE p.id = ? AND u.account_status = 'active'" . $publishedClause . ' LIMIT 1'
    );
    $stmt->execute([$providerProfileId]);
    $provider = $stmt->fetch();
    if (!$provider) {
        ds_error(404, 'NOT_FOUND', 'That provider is not accepting bookings.');
    }
    $providerName = (string) $provider['display_name'];
    $busy = ds_provider_day_bookings($providerProfileId, $date);
}

ds_success([
    'date' => $date,
    'durationMinutes' => $duration,
    'timezone' => date_default_timezone_get(),
    'providerProfileId' => $providerProfileId !== '' ? $providerProfileId : null,
    'providerName' => $providerName,
    'slots' => ds_available_slots($date, $busy, $duration),
]);
