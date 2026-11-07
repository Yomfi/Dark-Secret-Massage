<?php
declare(strict_types=1);

/**
 * Customer self-service bookings.
 *
 * Ownership is always `customer_user_id = session user`; the body can never
 * choose another customer. Service, provider, duration and price come from the
 * published catalogue, and availability is re-validated at write time so two
 * concurrent requests cannot take the same slot.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/config/discovery.php';

$user = ds_require_user();
if (!ds_cms_ready()) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'This area needs the database migration. Run: php scripts/migrate.php --apply');
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$pdo = ds_pdo();

if ($method === 'GET') {
    $rows = [];
    try {
        $stmt = $pdo->prepare(
            'SELECT b.*, p.display_name AS provider_name, p.slug AS provider_slug
             FROM bookings b LEFT JOIN provider_profiles p ON CAST(p.id AS BINARY) = CAST(b.provider_profile_id AS BINARY)
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
        $dto['canReschedule'] = in_array((string) $row['status'], ['pending', 'confirmed'], true);
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
    $slotId = trim((string) ($body['timeSlotId'] ?? ''));
    $locationType = strtolower(trim((string) ($body['locationType'] ?? 'studio')));
    $address = trim((string) ($body['address'] ?? ''));
    $notes = trim((string) ($body['notes'] ?? ''));
    $customerName = trim((string) ($body['customerName'] ?? ''));
    $customerPhone = trim((string) ($body['customerPhone'] ?? ''));

    if (!in_array($locationType, ['studio', 'home'], true)) {
        $locationType = 'studio';
    }
    if ($locationType === 'home' && mb_strlen($address) < 5) {
        ds_error(400, 'VALIDATION_ERROR', 'A full address is required for in-home sessions.');
    }

    if ($serviceId === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Choose a published service to book.');
    }

    $stmt = $pdo->prepare('SELECT * FROM services WHERE id = ? AND is_active = 1 LIMIT 1');
    $stmt->execute([$serviceId]);
    $service = $stmt->fetch() ?: null;
    if (!$service) {
        ds_error(409, 'SERVICE_UNAVAILABLE', 'That service is not available right now.');
    }

    // A provider-owned service can only be booked with that provider.
    if ($providerProfileId !== '' && !empty($service['provider_profile_id'])
        && (string) $service['provider_profile_id'] !== $providerProfileId) {
        ds_error(409, 'SERVICE_PROVIDER_MISMATCH', 'That service belongs to a different provider.');
    }
    if (!empty($service['provider_profile_id'])) {
        $providerProfileId = (string) $service['provider_profile_id'];
    }

    $providerProfileRow = null;
    if ($providerProfileId !== '') {
        $publishedClause = ds_column_exists('provider_profiles', 'is_published') ? ' AND p.is_published = 1' : '';
        $removedClause = ds_column_exists('provider_profiles', 'removed_at') ? ' AND p.removed_at IS NULL' : '';
        $stmt = $pdo->prepare(
            "SELECT p.* FROM provider_profiles p
             INNER JOIN users u ON u.id = p.user_id
             INNER JOIN provider_verification v ON v.provider_user_id = p.user_id
             WHERE p.id = ? AND v.verification_status = 'verified' AND u.account_status = 'active'"
            . $publishedClause . $removedClause . ' LIMIT 1'
        );
        $stmt->execute([$providerProfileId]);
        $providerProfileRow = $stmt->fetch() ?: null;
        if (!$providerProfileRow) {
            ds_error(409, 'PROVIDER_UNAVAILABLE', 'That provider is not accepting bookings.');
        }

        // Location and service-mode checks happen before any booking row is written.
        if ($locationType === 'home' && !ds_provider_offers_home_visit($providerProfileRow)) {
            $settings = ds_json_decode_field($providerProfileRow['service_setting_json'] ?? null);
            if (is_array($settings) && $settings !== []) {
                ds_error(409, 'HOME_VISIT_UNSUPPORTED', 'This provider does not offer home visits. Choose an in-studio session or another provider.');
            }
        }
        if ($locationType === 'studio' && !ds_provider_offers_studio($providerProfileRow)) {
            ds_error(409, 'STUDIO_UNSUPPORTED', 'This provider does not offer in-studio sessions.');
        }
        if ($locationType === 'home') {
            $target = null;
            if (isset($body['customerLocation']) && is_array($body['customerLocation'])) {
                $target = ds_location_search_target($body['customerLocation']);
            }
            if ($target === null) {
                ds_location_ensure_schema(false, true);
                $target = ds_discovery_target_from_customer_row(ds_customer_location((string) $user['id']));
            }
            if ($target !== null) {
                $coverage = ds_provider_location_match($providerProfileRow, $target);
                if (empty($coverage['eligible'])) {
                    ds_error(
                        409,
                        'OUTSIDE_SERVICE_AREA',
                        'This provider does not cover the selected home-visit location. Choose another provider or an in-studio session.'
                    );
                }
                $address = $address !== '' ? $address : trim((string) ($target['area'] ?? '') . ', ' . (string) ($target['city'] ?? ''));
            }
        }
    }

    $serviceName = (string) $service['name'];
    $duration = max(15, (int) $service['duration_minutes']);
    $price = round((float) $service['price'], 2);
    $currency = (string) $service['currency'];

    if ($scheduledAt === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Choose a date and time for your session.');
    }
    $date = substr($scheduledAt, 0, 10);
    if ($slotId === '') {
        $slotId = (string) (ds_booking_slot_id(['slot_id' => '', 'time_slot' => $timeSlot]) ?? '');
    }
    $slot = ds_booking_slot_definition($slotId);
    if ($slot === null) {
        ds_error(409, 'SLOT_UNAVAILABLE', 'That time is not part of the published calendar.');
    }
    if ($timeSlot === '') {
        $timeSlot = $slot['label'] . ' (' . $slot['start'] . '–' . $slot['end'] . ')';
    }

    $scheduledValue = $date . 'T00:00:00';
    $booking = null;
    try {
        $booking = ds_run_booking_write([
            ds_booking_lock_key($providerProfileId !== '' ? $providerProfileId : null, $date),
            'customer-day:' . $user['id'] . ':' . $date,
        ], function () use (
            $pdo, $date, $slotId, $duration, $providerProfileId, $user, $timeSlot, $service, $serviceName,
            $price, $currency, $scheduledValue, $locationType, $address, $customerName, $customerPhone,
            $notes, $now
        ): array {
            ds_lock_booking_resources(
                $providerProfileId !== '' ? $providerProfileId : null,
                (string) $user['id']
            );
            // Re-check under the lock: an earlier read cannot see a request that
            // is committing at the same moment.
            $check = ds_validate_booking_slot(
                $date,
                $slotId,
                $duration,
                $providerProfileId !== '' ? $providerProfileId : null,
                (string) $user['id']
            );
            if (!$check['ok']) {
                return ['conflict' => $check];
            }

            $id = ds_new_id();
            $reference = 'MS-' . strtoupper(substr(bin2hex(random_bytes(5)), 0, 8));
            $pdo->prepare(
                'INSERT INTO bookings
                 (id, reference, customer_user_id, provider_profile_id, team_member_id, service_id, service_name,
                  duration_minutes, price, currency, status, scheduled_at, time_slot, slot_id, provider_slot_key,
                  team_slot_key, customer_slot_key, location_type, address, customer_name, customer_phone,
                  customer_email, notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, \'pending\', ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                $id,
                $reference,
                $user['id'],
                $providerProfileId !== '' ? $providerProfileId : null,
                (string) $service['id'],
                $serviceName,
                $duration,
                $price,
                $currency,
                $scheduledValue,
                $timeSlot,
                $slotId,
                ds_booking_slot_key('provider', ds_provider_slot_scope($providerProfileId !== '' ? $providerProfileId : null), $date, $slotId),
                ds_booking_slot_key('customer', (string) $user['id'], $date, $slotId),
                $locationType,
                $address !== '' ? $address : null,
                $customerName !== '' ? $customerName : trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')),
                $customerPhone !== '' ? $customerPhone : (string) ($user['phone'] ?? ''),
                (string) ($user['email'] ?? ''),
                $notes !== '' ? $notes : null,
                $now,
                $now,
            ]);

            return ['id' => $id, 'reference' => $reference];
        });
    } catch (PDOException $e) {
        if (ds_is_slot_conflict($e)) {
            if (stripos($e->getMessage(), 'bookings_customer_slot_uniq') !== false) {
                ds_error(409, 'DUPLICATE_BOOKING', 'You already have a booking at that time.');
            }
            ds_error(409, 'SLOT_UNAVAILABLE', 'That time was just booked. Please choose another slot.');
        }
        ds_error(500, 'BOOKING_FAILED', 'We could not save that booking. Please try again.');
    }

    if (isset($booking['conflict'])) {
        $conflict = $booking['conflict'];
        ds_error($conflict['code'] === 'VALIDATION_ERROR' ? 400 : 409, $conflict['code'], $conflict['message']);
    }
    $id = (string) $booking['id'];
    $reference = (string) $booking['reference'];
    ds_booking_log($id, $user['id'], 'created', null, 'pending', null);
    ds_success([
        'bookingId' => $id,
        'reference' => $reference,
        'status' => 'pending',
        'serviceName' => $serviceName,
        'durationMinutes' => $duration,
        'price' => $price,
        'currency' => $currency,
        'scheduledAt' => $scheduledValue,
        'timeSlot' => $timeSlot,
    ], 201);
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
    ds_cancel_booking(
        $bookingId,
        $booking,
        $user['id'],
        'customer_cancelled',
        $reason !== '' ? $reason : null,
        ['status' => 'cancelled', 'cancellation_reason' => $reason !== '' ? $reason : 'Cancelled by customer']
    );
    ds_success(['bookingId' => $bookingId, 'status' => 'cancelled']);
}

if ($action === 'reschedule') {
    $status = (string) $booking['status'];
    if (!in_array($status, ['pending', 'confirmed', 'reschedule_requested'], true)) {
        ds_error(409, 'INVALID_TRANSITION', 'This booking can no longer be rescheduled.');
    }

    $newDate = substr(trim((string) ($body['scheduledAt'] ?? '')), 0, 10);
    $newSlotId = trim((string) ($body['timeSlotId'] ?? ''));
    $newTimeSlot = trim((string) ($body['timeSlot'] ?? ''));
    $note = trim((string) ($body['note'] ?? ''));

    // Note-only request (no new slot): keep the provider-confirms flow.
    if ($newDate === '' || $newSlotId === '') {
        if ($status !== 'confirmed') {
            ds_error(409, 'INVALID_TRANSITION', 'Only confirmed bookings can request a reschedule.');
        }
        $pdo->prepare('UPDATE bookings SET status = \'reschedule_requested\', notes = ?, updated_at = ? WHERE id = ?')
            ->execute([$note !== '' ? $note : $booking['notes'], $now, $bookingId]);
        ds_booking_log($bookingId, $user['id'], 'reschedule_requested', 'confirmed', 'reschedule_requested', $note);
        ds_success(['bookingId' => $bookingId, 'status' => 'reschedule_requested']);
    }

    $result = ds_reschedule_booking(
        $bookingId,
        $booking,
        $newDate,
        $newSlotId,
        $user['id'],
        'customer_rescheduled',
        $newTimeSlot !== '' ? $newTimeSlot : null,
        $note !== '' ? $note : null
    );
    if (empty($result['ok'])) {
        $code = (string) ($result['code'] ?? 'SLOT_UNAVAILABLE');
        ds_error($code === 'VALIDATION_ERROR' ? 400 : 409, $code, (string) ($result['message'] ?? 'That slot is unavailable.'));
    }
    ds_success([
        'bookingId' => $bookingId,
        'status' => (string) ($result['status'] ?? $status),
        'scheduledAt' => $newDate . 'T00:00:00',
        'timeSlot' => (string) ($result['timeSlot'] ?? $newTimeSlot),
    ]);
    ds_success([
        'bookingId' => $bookingId,
        'status' => $nextStatus,
        'scheduledAt' => $newDate . 'T00:00:00',
        'timeSlot' => $newTimeSlot,
    ]);
}

ds_error(400, 'VALIDATION_ERROR', 'Unknown booking action.');
