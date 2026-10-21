<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
$user = ds_require_user();
$choice = ds_validate_onboarding(ds_json_body());

$now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
ds_pdo()->prepare('UPDATE users SET onboarding_choice = ?, updated_at = ? WHERE id = ?')
    ->execute([$choice, $now, $user['id']]);

$fresh = ds_find_user_by_id($user['id']) ?: $user;
$fresh['onboarding_choice'] = $choice;
ds_success(['user' => ds_user_dto($fresh)]);
