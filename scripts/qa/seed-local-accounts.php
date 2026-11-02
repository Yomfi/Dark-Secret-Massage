<?php
declare(strict_types=1);

/**
 * Local-only test accounts for the four authenticated workflows.
 *
 * CLI only. Targets whatever DS_DB_* points at; never run against production
 * without meaning to. Prints the generated password once and the ids the flow
 * script needs.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("CLI only.\n");
}

require_once dirname(__DIR__, 2) . '/public/api/config/bootstrap.php';

$args = [];
foreach (array_slice($argv ?? [], 1) as $arg) {
    if (preg_match('/^--([a-z-]+)(?:=(.*))?$/', $arg, $m)) {
        $args[$m[1]] = $m[2] ?? true;
    }
}
if (($args['local-only'] ?? false) === false && (string) ds_config()['app_env'] !== 'development') {
    fwrite(STDERR, "Refusing to seed unless DS_APP_ENV=development (or pass --local-only).\n");
    exit(1);
}

$password = trim((string) ($args['password'] ?? ''));
if ($password === '') {
    $alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $password = '';
    for ($i = 0; $i < 20; $i++) {
        $password .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
}

$pdo = ds_pdo();
$now = ds_now_sql();
$hash = password_hash($password, PASSWORD_DEFAULT);

$accounts = [
    'admin' => ['qa-admin@local.test', 'QA', 'Admin', 'admin'],
    'customer' => ['qa-customer@local.test', 'Ama', 'Customer', 'user'],
    'customer2' => ['qa-customer2@local.test', 'Kofi', 'Customer', 'user'],
    'individual' => ['qa-individual@local.test', 'Esi', 'Provider', 'massage_provider'],
    'agency' => ['qa-agency@local.test', 'Agency', 'Owner', 'massage_provider'],
];

$ids = [];
foreach ($accounts as $key => [$email, $first, $last, $role]) {
    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $existing = $stmt->fetch() ?: null;

    if ($existing) {
        $pdo->prepare('UPDATE users SET password_hash = ?, role = ?, account_status = ?, email_verified_at = ?, updated_at = ? WHERE id = ?')
            ->execute([$hash, $role, 'active', $now, $now, $existing['id']]);
        $ids[$key] = (string) $existing['id'];
        continue;
    }

    $uid = ds_new_id();
    $pdo->prepare(
        'INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, account_status,
            email_verified_at, terms_accepted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$uid, $first, $last, $email, '+233' . random_int(200000000, 599999999), $hash, $role,
        'active', $now, $now, $now, $now]);
    $ids[$key] = $uid;
}

// Individual + agency profiles with a real working pattern.
$profiles = [
    'individual' => ['Esi Mensah', 'individual', 'esi-mensah'],
    'agency' => ['Serenity Agency', 'agency', 'serenity-agency'],
];
foreach ($profiles as $key => [$name, $type, $slug]) {
    $stmt = $pdo->prepare('SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1');
    $stmt->execute([$ids[$key]]);
    $profile = $stmt->fetch() ?: null;
    if ($profile) {
        $pid = (string) $profile['id'];
        $pdo->prepare('UPDATE provider_profiles SET display_name = ?, provider_type = ?, working_days = ?, working_hours = ?, city = ?, country = ?, is_published = 1, published_at = ?, updated_at = ? WHERE id = ?')
            ->execute([$name, $type, 'Mon-Sat', '09:00-17:00', 'Accra', 'Ghana', $now, $now, $pid]);
    } else {
        $pid = ds_new_id();
        $pdo->prepare(
            'INSERT INTO provider_profiles (id, user_id, slug, display_name, provider_type, city, country,
                working_days, working_hours, profile_completion, is_published, published_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 100, 1, ?, ?)'
        )->execute([$pid, $ids[$key], $slug, $name, $type, 'Accra', 'Ghana', 'Mon-Sat', '09:00-17:00', $now, $now]);
    }
    $ids[$key . 'Profile'] = $pid;

    if (ds_table_exists('provider_verification')) {
        $v = ds_ensure_provider_verification($ids[$key]);
        $pdo->prepare('UPDATE provider_verification SET verification_status = ?, identity_status = ? WHERE provider_user_id = ?')
            ->execute(['verified', 'approved', $ids[$key]]);
        unset($v);
    }
}

// Agency team member available Mon–Sat 09:00–17:00.
$stmt = $pdo->prepare("SELECT id FROM agency_team_members WHERE agency_profile_id = ? AND display_name = 'Yaa Team' LIMIT 1");
$stmt->execute([$ids['agencyProfile']]);
$team = $stmt->fetch() ?: null;
if ($team) {
    $teamId = (string) $team['id'];
    $pdo->prepare('UPDATE agency_team_members SET status = ?, availability = ?, updated_at = ? WHERE id = ?')
        ->execute(['active', 'Mon-Sat 09:00-17:00', $now, $teamId]);
} else {
    $teamId = ds_new_id();
    $pdo->prepare(
        'INSERT INTO agency_team_members (id, agency_profile_id, display_name, gender, availability, status, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)'
    )->execute([$teamId, $ids['agencyProfile'], 'Yaa Team', 'female', 'Mon-Sat 09:00-17:00', 'active', $now, $now]);
}
$ids['teamMember'] = $teamId;

// Studio services: 60-minute and a 120-minute session for overlap testing.
$services = [
    'studio60' => ['qa-studio-60', 'Studio Relaxation Massage', 60, 250.00],
    'studio120' => ['qa-studio-120', 'Studio Deep Tissue', 120, 420.00],
];
foreach ($services as $key => [$sid, $name, $duration, $price]) {
    $pdo->prepare(
        'INSERT INTO services (id, provider_profile_id, name, description, duration_minutes, price, currency,
            is_active, sort_order, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, \'GHS\', 1, 0, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), duration_minutes = VALUES(duration_minutes),
            price = VALUES(price), is_active = 1, updated_at = VALUES(updated_at)'
    )->execute([$sid, $name, 'QA local service', $duration, $price, $now, $now]);
    $ids[$key] = $sid;
}

// Agency-owned service so the agency can receive bookings.
$agencyServiceId = 'qa-agency-60';
$pdo->prepare(
    'INSERT INTO services (id, provider_profile_id, name, description, duration_minutes, price, currency,
        is_active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, 60, 300.00, \'GHS\', 1, 0, ?, ?)
     ON DUPLICATE KEY UPDATE is_active = 1, updated_at = VALUES(updated_at)'
)->execute([$agencyServiceId, $ids['agencyProfile'], 'Agency Signature Massage', 'QA agency service', $now, $now]);
$ids['agencyService'] = $agencyServiceId;

$ids['password'] = $password;
echo json_encode($ids, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;
