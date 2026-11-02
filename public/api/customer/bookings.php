<?php
declare(strict_types=1);

/** Customer self-service: own bookings only, enforced by customer_user_id. */

require_once dirname(__DIR__) . '/config/bootstrap.php';

$user = ds_require_user();
if (!ds_cms_ready()) {
    ds_cms_migrate();
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$pdo = ds_pdo();

if ($method === 'GET') {
    $rows = [];
    try {
        $stmt = $pdo->prepare(
            'SELECT b.*, p.display_name AS provider_name, p.slug AS provider_slug
             FROM bookings b LEFT JOIN provider_profiles p ON p.id = b.provider_profile_id
             WHERE b.customer_user_id = ? ORDER BY COALESCE(b.scheduled_at, b.created_at) DESC LIMIT 100'
        );
        $stmt->execute([$user['id']]);
        $rows = $stmt->fetchAll() ?: [];
    } catch (Throwable $e) {
        $rows = [];
    }

    $bookings = array_map(static function (array $row): array {
        $dto = ds_booking_row_to_api($row);
        $dto['providerName'] = $row['provider_name'] ?? null;
        $dto['canCancel'] = in_array((string) $row['status'], ['pending', 'confirmed'], true);
        $dto['canReschedule'] = (string) $row['status'] === 'confirmed';
        return $dto;
    }, $rows);

    ds_success([
        'bookings' => $bookings,
        'upcoming' => array_values(array_filter($bookings, static fn (array $b): bool => in_array($b['status'], ['pending', 'confirmed', 'reschedule_requested'], true))),
        'receipts' => array_values(array_map(static fn (array $b): array => [
            'id' => $b['id'],
            'reference' => $b['reference'],
            'serviceName' => $b['serviceName'],
            'amount' => $b['price'],
            'currency' => $b['currency'],
            'status' => $b['status'],
            'date' => $b['scheduledAt'] ?? $b['createdAt'],
        ], array_filter($bookings, static fn (array $b): bool => $b['status'] === 'completed'))),
    ]);
}

ds_require_method('POST');
ds_require_same_origin();
ds_rate_limit('customer_bookings', 30, 15 * 60);

// Booking requires a confirmed email address (the account gate).
ds_require_verified_email($user);

$body = ds_json_body();
$action = strtolower(trim((string) ($body['action'] ?? 'create')));
$now = ds_now_sql();

if ($action === 'create') {
    $serviceId = trim((string) ($body['serviceId'] ?? ''));
    $providerProfileId = trim((string) ($body['providerProfileId'] ?? ''));
    $scheduledAt = trim((string) ($body['scheduledAt'] ?? ''));
    $timeSlot = trim((string) ($body['timeSlot'] ?? ''));
    $locationType = strtolower(trim((string) ($body['locationType'] ?? 'studio')));
    $address = trim((string) ($body['address'] ?? ''));
    $notes = trim((string) ($body['notes'] ?? ''));
    $customerName = trim((string) ($body['customerName'] ?? ''));
    $customerPhone = trim((string) ($body['customerPhone'] ?? ''));

    if (!in_array($locationType, ['studio', 'home'], true)) {
        $locationType = 'studio';
    }

    $service = null;
    if ($serviceId !== '') {
        $stmt = $pdo->prepare('SELECT * FROM services WHERE id = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$serviceId]);
        $service = $stmt->fetch() ?: null;
        if (!$service) {
            ds_error(409, 'SERVICE_UNAVAILABLE', 'That service is not available right now.');
        }
    } elseif (trim((string) ($body['serviceName'] ?? '')) === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Choose a service to book.');
    }

    if ($providerProfileId !== '') {
        $stmt = $pdo->prepare(
            "SELECT p.id, p.user_id FROM provider_profiles p
             INNER JOIN users u ON u.id = p.user_id
             INNER JOIN provider_verification v ON v.provider_user_id = p.user_id
             WHERE p.id = ? AND v.verification_status = 'verified' AND p.is_published = 1
               AND u.account_status = 'active' LIMIT 1"
        );
        $stmt->execute([$providerProfileId]);
        $provider = $stmt->fetch();
        if (!$provider) {
            ds_error(409, 'PROVIDER_UNAVAILABLE', 'That provider is not accepting bookings.');
        }
    }

    $serviceName = $service ? (string) $service['name'] : trim((string) $body['serviceName']);
    $duration = $service ? (int) $service['duration_minutes'] : max(15, (int) ($body['durationMinutes'] ?? 60));
    $price = $service ? (float) $service['price'] : max(0.0, (float) ($body['price'] ?? 0));
    $currency = $service ? (string) $service['currency'] : 'GHS';

    // Server-side availability and ownership rules: never trust the wizard.
    if ($scheduledAt !== '') {
        $ts = strtotime($scheduledAt);
        if ($ts === false || $ts < strtotime('today')) {
            ds_error(400, 'VALIDATION_ERROR', 'Choose today or a future date.');
        }

        if ($providerProfileId !== '') {
            $conflict = $pdo->prepare(
                "SELECT id FROM bookings WHERE provider_profile_id = ?
                 AND date(scheduled_at) = date(?) AND COALESCE(time_slot, '') = ?
                 AND status IN ('pending','confirmed','reschedule_requested') LIMIT 1"
            );
            $conflict->execute([$providerProfileId, $scheduledAt, $timeSlot]);
            if ($conflict->fetch()) {
                ds_error(409, 'SLOT_UNAVAILABLE', 'That time is already booked. Please choose another slot.');
            }
        }

        $own = $pdo->prepare(
            "SELECT id FROM bookings WHERE customer_user_id = ?
             AND date(scheduled_at) = date(?) AND COALESCE(time_slot, '') = ?
             AND status IN ('pending','confirmed','reschedule_requested') LIMIT 1"
        );
        $own->execute([$user['id'], $scheduledAt, $timeSlot]);
        if ($own->fetch()) {
            ds_error(409, 'DUPLICATE_BOOKING', 'You already have a booking at that time.');
        }
    }

    // A provider-owned service can only be booked with that provider.
    if ($service && $providerProfileId !== '' && !empty($service['provider_profile_id'])
        && (string) $service['provider_profile_id'] !== $providerProfileId) {
        ds_error(409, 'SERVICE_PROVIDER_MISMATCH', 'That service belongs to a different provider.');
    }

    $id = ds_new_id();
    $reference = 'MS-' . strtoupper(substr(bin2hex(random_bytes(5)), 0, 8));

    $pdo->prepare(
        'INSERT INTO bookings
         (id, reference, customer_user_id, provider_profile_id, team_member_id, service_id, service_name,
          duration_minutes, price, currency, status, scheduled_at, time_slot, location_type, address,
          customer_name, customer_phone, customer_email, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, \'pending\', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $reference,
        $user['id'],
        $providerProfileId !== '' ? $providerProfileId : null,
        $service['id'] ?? null,
        $serviceName,
        $duration,
        $price,
        $currency,
        $scheduledAt !== '' ? $scheduledAt : null,
        $timeSlot !== '' ? $timeSlot : null,
        $locationType,
        $address !== '' ? $address : null,
        $customerName !== '' ? $customerName : trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')),
        $customerPhone !== '' ? $customerPhone : (string) ($user['phone'] ?? ''),
        (string) ($user['email'] ?? ''),
        $notes !== '' ? $notes : null,
        $now,
        $now,
    ]);

    ds_booking_log($id, $user['id'], 'created', null, 'pending', null);
    ds_success(['bookingId' => $id, 'reference' => $reference, 'status' => 'pending'], 201);
}

$bookingId = trim((string) ($body['bookingId'] ?? ''));
$stmt = $pdo->prepare('SELECT * FROM bookings WHERE id = ? AND customer_user_id = ? LIMIT 1');
$stmt->execute([$bookingId, $user['id']]);
$booking = $stmt->fetch();
if (!$booking) {
    ds_error(404, 'NOT_FOUND', 'Booking not found.');
}

if ($action === 'cancel') {
    if (!in_array((string) $booking['status'], ['pending', 'confirmed'], true)) {
        ds_error(409, 'INVALID_TRANSITION', 'This booking can no longer be cancelled.');
    }
    $reason = trim((string) ($body['reason'] ?? ''));
    $pdo->prepare('UPDATE bookings SET status = \'cancelled\', cancellation_reason = ?, updated_at = ? WHERE id = ?')
        ->execute([$reason !== '' ? $reason : 'Cancelled by customer', $now, $bookingId]);
    ds_booking_log($bookingId, $user['id'], 'customer_cancelled', (string) $booking['status'], 'cancelled', $reason);
    ds_success(['bookingId' => $bookingId, 'status' => 'cancelled']);
}

if ($action === 'reschedule') {
    if ((string) $booking['status'] !== 'confirmed') {
        ds_error(409, 'INVALID_TRANSITION', 'Only confirmed bookings can request a reschedule.');
    }
    $note = trim((string) ($body['note'] ?? ''));
    $pdo->prepare('UPDATE bookings SET status = \'reschedule_requested\', notes = ?, updated_at = ? WHERE id = ?')
        ->execute([$note !== '' ? $note : $booking['notes'], $now, $bookingId]);
    ds_booking_log($bookingId, $user['id'], 'reschedule_requested', 'confirmed', 'reschedule_requested', $note);
    ds_success(['bookingId' => $bookingId, 'status' => 'reschedule_requested']);
}

ds_error(400, 'VALIDATION_ERROR', 'Unknown booking action.');
