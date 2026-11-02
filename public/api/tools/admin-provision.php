<?php
declare(strict_types=1);

/**
 * CLI-only admin provisioning and password rotation.
 *
 * This file ships inside the deployed API tree (dist/api/tools → public_html/api/tools),
 * which the repository's scripts/ directory does not. The `tools` directory is denied
 * over HTTP by api/.htaccess, and this script refuses to run outside the CLI anyway.
 *
 * There is no HTTP route for creating admins and no default credential.
 *
 *   cd ~/domains/massagerstudio.com/public_html
 *   php api/tools/admin-provision.php --email=you@example.com --first=Ada --last=Obi --set-password
 *
 * If DS_DB_PASS is absent from the shell environment (Hostinger supplies it to PHP-FPM,
 * not necessarily to SSH), the script asks for the database password with hidden input.
 * It is used for that run only and is never written to disk or printed.
 *
 * Existing accounts are never promoted silently: a non-admin account is refused unless
 * `--promote` is passed alongside `--rotate`.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "This script only runs from the command line.\n";
    exit(1);
}

require_once dirname(__DIR__) . '/config/bootstrap.php';

$args = [];
foreach (array_slice($argv ?? [], 1) as $arg) {
    if (preg_match('/^--([a-z-]+)(?:=(.*))?$/', (string) $arg, $m)) {
        $args[$m[1]] = $m[2] ?? true;
    }
}

$email = strtolower(trim((string) ($args['email'] ?? '')));
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Usage: php api/tools/admin-provision.php --email=you@example.com [--first=Ada --last=Obi] [--role=admin] [--rotate [--promote]] [--set-password]\n");
    exit(1);
}

$role = strtolower(trim((string) ($args['role'] ?? 'admin')));
$adminRoles = ['admin', 'support_admin', 'moderator'];
if (!in_array($role, $adminRoles, true)) {
    fwrite(STDERR, "Role must be admin, support_admin or moderator.\n");
    exit(1);
}

$rotate = !empty($args['rotate']);
$promote = !empty($args['promote']);
$interactive = !empty($args['set-password']);

function ds_prompt_hidden(string $label): string
{
    if (function_exists('shell_exec')) {
        @shell_exec('stty -echo');
    }
    echo $label;
    $value = trim((string) fgets(STDIN));
    if (function_exists('shell_exec')) {
        @shell_exec('stty echo');
    }
    echo PHP_EOL;
    return $value;
}

// The shell on a shared host often lacks the PHP-FPM environment, so the DB
// password may be unavailable here even though the website has it.
$config = ds_config();
if (trim((string) ($config['db_pass'] ?? '')) === '') {
    if (!stream_isatty(STDIN)) {
        fwrite(STDERR, "Database password is not available to this shell.\n");
        fwrite(STDERR, "Set DS_DB_PASS privately for this command, or add db_pass to the out-of-tree config.\n");
        exit(4);
    }
    $dbPass = ds_prompt_hidden('Database password (hidden, used for this run only): ');
    if ($dbPass === '') {
        fwrite(STDERR, "A database password is required.\n");
        exit(4);
    }
    putenv('DS_DB_PASS=' . $dbPass);
    unset($_ENV['DS_DB_PASS'], $_SERVER['DS_DB_PASS']);
    $config = ds_config(true);
}

try {
    ds_pdo()->query('SELECT 1');
} catch (Throwable $e) {
    fwrite(STDERR, "Could not connect to the database. Check the password and try again.\n");
    exit(4);
}

$existing = ds_find_user_by_email($email);
$existingRole = $existing ? strtolower((string) ($existing['role'] ?? '')) : '';

if ($existing && !$rotate) {
    $hint = in_array($existingRole, $adminRoles, true) ? '--rotate' : '--rotate --promote';
    fwrite(STDERR, "An account already exists for {$email} with role '{$existingRole}'.\n");
    fwrite(STDERR, "Re-run with {$hint} to reset its password.\n");
    exit(2);
}

if ($existing && !in_array($existingRole, $adminRoles, true) && !$promote) {
    fwrite(STDERR, "Refusing to promote {$email}: it is a '{$existingRole}' account, not an admin.\n");
    fwrite(STDERR, "This is deliberate. If you really mean to make this account an admin, re-run with\n");
    fwrite(STDERR, "  --rotate --promote\n");
    fwrite(STDERR, "That changes the role AND sets a new password, and is written to the audit log.\n");
    exit(3);
}

if ($interactive) {
    if (!stream_isatty(STDIN)) {
        fwrite(STDERR, "--set-password needs an interactive terminal (or omit it and use the generated password).\n");
        exit(5);
    }
    $password = ds_prompt_hidden('New admin password (input hidden): ');
    $confirm = ds_prompt_hidden('Confirm password: ');
    if ($password !== $confirm) {
        fwrite(STDERR, "Passwords do not match.\n");
        exit(6);
    }
    if (strlen($password) < 12) {
        fwrite(STDERR, "Password must be at least 12 characters.\n");
        exit(7);
    }
    $generated = false;
} else {
    $alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*';
    $password = '';
    for ($i = 0; $i < 24; $i++) {
        $password .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    $generated = true;
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$now = ds_now_sql();
$pdo = ds_pdo();
$roleChanged = false;

if ($existing) {
    $newRole = $existingRole;
    if ($promote) {
        $newRole = $role;
        $roleChanged = $newRole !== $existingRole;
    }
    $pdo->prepare('UPDATE users SET role = ?, password_hash = ?, account_status = ?, updated_at = ? WHERE id = ?')
        ->execute([$newRole, $hash, 'active', $now, $existing['id']]);
    $userId = (string) $existing['id'];
    echo "rotated password for {$email}\n";
    if ($roleChanged) {
        echo "role changed: {$existingRole} -> {$newRole}\n";
    } else {
        echo "role unchanged: {$newRole}\n";
    }
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
if ($generated) {
    echo "password (shown once, store it in a password manager):\n{$password}\n";
} else {
    echo "password updated (not printed).\n";
}
ds_audit(
    $existing ? ($roleChanged ? 'admin.promoted' : 'admin.password_rotated') : 'admin.provisioned',
    'user',
    $userId,
    ['email' => $email, 'role' => $existing ? ($roleChanged ? $role : $existingRole) : $role, 'rotate' => $rotate, 'promote' => $promote],
    $userId
);
exit(0);
