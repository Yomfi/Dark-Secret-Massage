<?php
declare(strict_types=1);

/**
 * Agency team members CRUD.
 * Staff do not require separate logins yet — architecture leaves room for future user_id links.
 */
require_once dirname(__DIR__) . '/config/bootstrap.php';

$user = ds_require_provider();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if (!ds_table_exists('agency_team_members')) {
    ds_error(503, 'NOT_CONFIGURED', 'Agency team table is not installed. Run the SQL migration.');
}

$profile = ds_provider_profile_by_user($user['id']);
if (!$profile) {
    ds_error(400, 'VALIDATION_ERROR', 'Complete your agency profile before adding team members.');
}

$providerType = (string) ($profile['provider_type'] ?? 'individual');
if ($providerType !== 'agency' && ds_column_exists('provider_profiles', 'provider_type')) {
    ds_error(400, 'VALIDATION_ERROR', 'Only agency accounts can manage team members.');
}

$agencyId = (string) $profile['id'];

if ($method === 'GET') {
    ds_require_method('GET');
    ds_success([
        'teamMembers' => ds_agency_team_members($agencyId, false),
    ]);
}

if ($method === 'DELETE') {
    ds_require_method('DELETE');
    $body = ds_json_body();
    $memberId = trim((string) ($body['id'] ?? ''));
    if ($memberId === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Team member id is required.');
    }
    $stmt = ds_pdo()->prepare(
        'DELETE FROM agency_team_members WHERE id = ? AND agency_profile_id = ?'
    );
    $stmt->execute([$memberId, $agencyId]);
    ds_success(['deleted' => true, 'teamMembers' => ds_agency_team_members($agencyId, false)]);
}

ds_require_method('POST');
ds_rate_limit('provider_team', 40, 15 * 60);

$body = ds_json_body();
$memberId = trim((string) ($body['id'] ?? ''));
$displayName = trim((string) ($body['displayName'] ?? ''));
$gender = strtolower(trim((string) ($body['gender'] ?? '')));
$bio = trim((string) ($body['bio'] ?? ''));
$profileImage = trim((string) ($body['profileImage'] ?? ''));
$gallery = $body['gallery'] ?? [];
$services = $body['services'] ?? [];
$yearsExperience = $body['yearsExperience'] ?? null;
$availability = trim((string) ($body['availability'] ?? 'flexible'));
$pricing = $body['pricing'] ?? [];
$inherit = !isset($body['inheritAgencyRate']) || !empty($body['inheritAgencyRate']);
$status = strtolower(trim((string) ($body['status'] ?? 'active')));

if ($displayName === '') {
    ds_error(400, 'VALIDATION_ERROR', 'Team member display name is required.');
}
if (!in_array($gender, ['female', 'male'], true)) {
    ds_error(400, 'VALIDATION_ERROR', 'Team member gender must be female or male.');
}
if (!in_array($status, ['active', 'inactive'], true)) {
    $status = 'active';
}
if (!is_array($gallery)) {
    $gallery = [];
}
if (!is_array($services)) {
    $services = [];
}
if (!is_array($pricing)) {
    $pricing = [];
}

$years = null;
if ($yearsExperience !== null && $yearsExperience !== '') {
    $years = max(0, (int) $yearsExperience);
}

$now = ds_now_sql();
$pdo = ds_pdo();

if ($memberId !== '') {
    $check = $pdo->prepare(
        'SELECT id FROM agency_team_members WHERE id = ? AND agency_profile_id = ? LIMIT 1'
    );
    $check->execute([$memberId, $agencyId]);
    if (!$check->fetch()) {
        ds_error(404, 'NOT_FOUND', 'Team member not found.');
    }
    $pdo->prepare(
        'UPDATE agency_team_members SET
            display_name = ?, gender = ?, bio = ?, profile_image = ?, gallery_json = ?,
            services_json = ?, years_experience = ?, availability = ?, pricing_json = ?,
            inherit_agency_rate = ?, status = ?, updated_at = ?
         WHERE id = ? AND agency_profile_id = ?'
    )->execute([
        $displayName,
        $gender,
        $bio !== '' ? $bio : null,
        $profileImage !== '' ? $profileImage : null,
        json_encode(array_values($gallery)),
        json_encode(array_values($services)),
        $years,
        $availability,
        json_encode(array_values($pricing)),
        $inherit ? 1 : 0,
        $status,
        $now,
        $memberId,
        $agencyId,
    ]);
} else {
    $memberId = ds_new_id();
    $pdo->prepare(
        'INSERT INTO agency_team_members
         (id, agency_profile_id, display_name, gender, bio, profile_image, gallery_json,
          services_json, years_experience, availability, pricing_json, inherit_agency_rate,
          status, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)'
    )->execute([
        $memberId,
        $agencyId,
        $displayName,
        $gender,
        $bio !== '' ? $bio : null,
        $profileImage !== '' ? $profileImage : null,
        json_encode(array_values($gallery)),
        json_encode(array_values($services)),
        $years,
        $availability,
        json_encode(array_values($pricing)),
        $inherit ? 1 : 0,
        $status,
        $now,
        $now,
    ]);
}

ds_success([
    'saved' => true,
    'id' => $memberId,
    'teamMembers' => ds_agency_team_members($agencyId, false),
]);
