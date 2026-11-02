<?php
declare(strict_types=1);

/**
 * CLI-only admin provisioning and password rotation.
 *
 * There is no HTTP route for creating admins and no default credential: the
 * operator runs this on the server, and the generated password is printed once.
 *
 *   php scripts/admin-provision.php --email=you@example.com --first=Ada --last=Obi
 *   php scripts/admin-provision.php --email=you@example.com --rotate
 *
 * Production (Hostinger SSH):
 *   ssh <user>@<host> 'cd ~/domains/massagerstudio.com/public_html && \
 *     php scripts/admin-provision.php --email=you@example.com --rotate'
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script only runs from the command line.\n");
}

require_once dirname(__DIR__) . '/public/api/config/bootstrap.php';

$args = [];
foreach (array_slice($argv ?? [], 1) as $arg) {
    if (preg_match('/^--([a-z-]+)(?:=(.*))?$/', $arg, $m)) {
        $args[$m[1]] = $m[2] ?? true;
    }
}

$email = strtolower(trim((string) ($args['email'] ?? '')));
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Usage: php scripts/admin-provision.php --email=you@example.com [--first=Ada --last=Obi] [--role=admin] [--rotate]\n");
    exit(1);
}

$role = strtolower(trim((string) ($args['role'] ?? 'admin')));
if (!in_array($role, ['admin', 'support_admin', 'moderator'], true)) {
    fwrite(STDERR, "Role must be admin, support_admin or moderator.\n");
    exit(1);
}

$rotate = !empty($args['rotate']);
$existing = ds_find_user_by_email($email);

if ($existing && !$rotate) {
    fwrite(STDERR, "An account already exists for {$email}. Re-run with --rotate to reset its password.\n");
    exit(2);
}

$alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*';
$password = '';
for ($i = 0; $i < 24; $i++) {
    $password .= $alphabet[random_int(0, strlen($alphabet) - 1)];
}
$hash = password_hash($password, PASSWORD_DEFAULT);
$now = ds_now_sql();
$pdo = ds_pdo();

if ($existing) {
    if (in_array((string) ($existing['role'] ?? ''), ['admin'], true) && $rotate && !empty($args['role'])) {
        $pdo->prepare('UPDATE users SET role = ?, password_hash = ?, account_status = ?, updated_at = ? WHERE id = ?')
            ->execute([$role, $hash, 'active', $now, $existing['id']]);
    } else {
        $pdo->prepare('UPDATE users SET password_hash = ?, account_status = ?, updated_at = ? WHERE id = ?')
            ->execute([$hash, 'active', $now, $existing['id']]);
    }
    $userId = (string) $existing['id'];
    echo "rotated password for {$email}\n";
} else {
    $columns = ds_users_columns();
    $firstName = trim((string) ($args['first'] ?? 'Studio'));
    $lastName = trim((string) ($args['last'] ?? 'Admin'));
    $values = [
        'id' => ds_new_id(),
        'email' => $email,
        'phone' => (string) ($args['phone'] ?? ''),
        'first_name' => $firstName,
        'last_name' => $lastName,
        'role' => $role,
        'account_status' => 'active',
        'password_hash' => $hash,
        'email_verified_at' => $now,
        'terms_accepted_at' => $now,
        'created_at' => $now,
        'updated_at' => $now,
    ];
    $insertColumns = [];
    $insertValues = [];
    foreach ($values as $column => $value) {
        if (isset($columns[$column])) {
            $insertColumns[] = $column;
            $insertValues[] = $value;
        }
    }
    $sql = 'INSERT INTO users (' . implode(', ', $insertColumns) . ') VALUES ('
        . implode(', ', array_fill(0, count($insertColumns), '?')) . ')';
    $pdo->prepare($sql)->execute($insertValues);
    $userId = (string) $values['id'];
    echo "created {$role} account {$email}\n";
}

echo "user_id: {$userId}\n";
echo "password (shown once, store it in a password manager):\n{$password}\n";
ds_audit('admin.provisioned', 'user', $userId, ['email' => $email, 'role' => $role, 'rotate' => $rotate], $userId);
exit(0);
