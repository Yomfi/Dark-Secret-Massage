<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

$admin = ds_require_admin();
ds_require_method('GET');

if (!ds_cms_ready()) {
    ds_cms_migrate();
}

$pdo = ds_pdo();

$count = static function (string $sql, array $params = []) use ($pdo): int {
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return (int) ($stmt->fetch()['c'] ?? 0);
    } catch (Throwable $e) {
        return 0;
    }
};

$customers = $count("SELECT COUNT(*) AS c FROM users WHERE role = 'user'");
$individuals = $count("SELECT COUNT(*) AS c FROM users WHERE role = 'massage_provider'");
$agencies = 0;
if (ds_table_exists('provider_profiles')) {
    $agencies = $count("SELECT COUNT(*) AS c FROM provider_profiles WHERE provider_type = 'agency'");
}

$pendingReviews = 0;
$published = 0;
if (ds_table_exists('provider_verification')) {
    $pendingReviews = $count("SELECT COUNT(*) AS c FROM provider_verification WHERE verification_status IN ('pending_review','changes_requested')");
    $published = $count("SELECT COUNT(*) AS c FROM provider_verification WHERE verification_status = 'verified'");
}
if (ds_table_exists('provider_profiles') && ds_column_exists('provider_profiles', 'is_published')) {
    $published = $count("SELECT COUNT(*) AS c FROM provider_profiles WHERE is_published = 1");
}

$bookingsByStatus = [];
$bookingsTotal = 0;
$revenue = 0.0;
if (ds_table_exists('bookings')) {
    foreach (['pending', 'confirmed', 'reschedule_requested', 'completed', 'cancelled', 'no_show'] as $status) {
        $bookingsByStatus[$status] = $count('SELECT COUNT(*) AS c FROM bookings WHERE status = ?', [$status]);
        $bookingsTotal += $bookingsByStatus[$status];
    }
    try {
        $stmt = $pdo->query("SELECT COALESCE(SUM(price),0) AS s FROM bookings WHERE status = 'completed'");
        $revenue = (float) ($stmt->fetch()['s'] ?? 0);
    } catch (Throwable $e) {
        $revenue = 0.0;
    }
}

$recentBookings = [];
if (ds_table_exists('bookings')) {
    try {
        $recentBookings = $pdo->query(
            'SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5'
        )->fetchAll() ?: [];
    } catch (Throwable $e) {
        $recentBookings = [];
    }
}

$pendingList = [];
if (ds_table_exists('provider_verification') && ds_table_exists('provider_profiles')) {
    try {
        $pendingList = $pdo->query(
            "SELECT v.provider_user_id, v.verification_status, v.submitted_for_review_at,
                    p.display_name, p.provider_type, p.city
             FROM provider_verification v
             LEFT JOIN provider_profiles p ON p.user_id = v.provider_user_id
             WHERE v.verification_status IN ('pending_review','changes_requested')
             ORDER BY COALESCE(v.submitted_for_review_at, v.updated_at) DESC LIMIT 5"
        )->fetchAll() ?: [];
    } catch (Throwable $e) {
        $pendingList = [];
    }
}

$activeServices = ds_table_exists('services')
    ? $count('SELECT COUNT(*) AS c FROM services WHERE provider_profile_id IS NULL AND is_active = 1')
    : 0;

$unverifiedEmails = $count("SELECT COUNT(*) AS c FROM users WHERE email_verified_at IS NULL AND role <> 'admin'");

ds_success([
    'counts' => [
        'customers' => $customers,
        'individualProviders' => max(0, $individuals - $agencies),
        'agencies' => $agencies,
        'pendingReviews' => $pendingReviews,
        'publishedProviders' => $published,
        'activeServices' => $activeServices,
        'bookings' => $bookingsTotal,
        'revenueCompleted' => $revenue,
        'unverifiedEmails' => $unverifiedEmails,
    ],
    'bookingsByStatus' => $bookingsByStatus,
    'tasks' => array_map(static fn (array $row): array => [
        'providerUserId' => (string) $row['provider_user_id'],
        'displayName' => (string) ($row['display_name'] ?? 'Provider'),
        'providerType' => (string) ($row['provider_type'] ?? 'individual'),
        'city' => (string) ($row['city'] ?? ''),
        'status' => (string) $row['verification_status'],
        'submittedAt' => $row['submitted_for_review_at'] ?? null,
    ], $pendingList),
    'recentBookings' => array_map('ds_booking_row_to_api', $recentBookings),
    'mail' => [
        'configured' => ds_mail_configured(),
        'transport' => ds_mail_settings()['transport'],
        'missing' => ds_mail_missing_settings(),
    ],
    'viewer' => ['id' => $admin['id'], 'role' => $admin['role']],
]);
