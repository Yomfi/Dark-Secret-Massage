<?php
declare(strict_types=1);

/**
 * Customer → provider assignments.
 *
 * An assignment is an operational intent, not a paid booking. It never writes
 * to bookings, price or payment state. Appointment creation stays in the
 * existing booking flow with its availability and payment rules.
 */

function ds_assignment_statuses(): array
{
    return [
        'proposed' => 'Proposed',
        'pending_provider_response' => 'Pending provider response',
        'accepted' => 'Accepted',
        'declined' => 'Declined',
        'cancelled' => 'Cancelled',
        'completed' => 'Completed',
    ];
}

function ds_assignment_transitions(): array
{
    return [
        'proposed' => ['pending_provider_response', 'accepted', 'declined', 'cancelled'],
        'pending_provider_response' => ['accepted', 'declined', 'cancelled'],
        'accepted' => ['completed', 'cancelled'],
        'declined' => [],
        'cancelled' => [],
        'completed' => [],
    ];
}

/** Idempotent additive schema creation for deployments that have not run the CLI migration yet. */
function ds_ensure_assignments_schema(bool $force = false, bool $optional = false): void
{
    static $done = false;
    if ($done && !$force) {
        return;
    }

    // Ordinary requests must never create schema in production. The CLI
    // migration passes $force=true after a verified backup; until it runs, a
    // missing table is reported instead of being created silently.
    if (!$force && ds_is_prod()) {
        foreach (['provider_assignments', 'provider_assignment_events', 'admin_reversible_actions'] as $table) {
            if (!ds_table_exists($table)) {
                if ($optional) {
                    return;
                }
                ds_error(
                    503,
                    'SCHEMA_NOT_MIGRATED',
                    'Assignments need the database migration. Run the CLI migration before using this area.'
                );
            }
        }
        $done = true;
        return;
    }

    $pdo = ds_pdo();
    $statements = [
        'CREATE TABLE IF NOT EXISTS provider_assignments (
            id VARCHAR(191) NOT NULL,
            customer_user_id VARCHAR(191) NOT NULL,
            provider_profile_id VARCHAR(191) NOT NULL,
            team_member_id VARCHAR(191) NULL,
            service_id VARCHAR(191) NULL,
            service_name VARCHAR(160) NULL,
            preferred_at DATETIME(3) NULL,
            reason VARCHAR(500) NOT NULL,
            notes TEXT NULL,
            status VARCHAR(32) NOT NULL DEFAULT \'proposed\',
            status_note VARCHAR(500) NULL,
            assigned_by VARCHAR(191) NULL,
            cancelled_at DATETIME(3) NULL,
            cancelled_by VARCHAR(191) NULL,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id),
            KEY provider_assignments_customer_idx (customer_user_id),
            KEY provider_assignments_provider_idx (provider_profile_id),
            KEY provider_assignments_status_idx (status),
            KEY provider_assignments_preferred_idx (preferred_at)
        )',
        'CREATE TABLE IF NOT EXISTS provider_assignment_events (
            id VARCHAR(191) NOT NULL,
            assignment_id VARCHAR(191) NOT NULL,
            actor_user_id VARCHAR(191) NULL,
            event VARCHAR(40) NOT NULL,
            from_status VARCHAR(32) NULL,
            to_status VARCHAR(32) NULL,
            note VARCHAR(500) NULL,
            created_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id),
            KEY provider_assignment_events_assignment_idx (assignment_id),
            KEY provider_assignment_events_created_idx (created_at)
        )',
        'CREATE TABLE IF NOT EXISTS admin_reversible_actions (
            id VARCHAR(191) NOT NULL,
            actor_user_id VARCHAR(191) NULL,
            action VARCHAR(80) NOT NULL,
            label VARCHAR(255) NOT NULL,
            entity_table VARCHAR(64) NOT NULL,
            entity_id VARCHAR(191) NOT NULL,
            before_json TEXT NULL,
            after_json TEXT NULL,
            meta_json TEXT NULL,
            undone_at DATETIME(3) NULL,
            undone_by VARCHAR(191) NULL,
            created_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id),
            KEY admin_reversible_actor_idx (actor_user_id),
            KEY admin_reversible_entity_idx (entity_table, entity_id),
            KEY admin_reversible_created_idx (created_at)
        )',
    ];

    $driver = (string) $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    $sqliteIndexes = [];
    if ($driver === 'sqlite') {
        // SQLite rejects MySQL's inline KEY clauses; move them to separate
        // CREATE INDEX statements so local/CLI validation exercises the same
        // additive migration as production.
        foreach ($statements as $i => $sql) {
            $sql = preg_replace('/^[ \t]*KEY [^\n]*\n/m', '', $sql) ?? $sql;
            $statements[$i] = preg_replace('/,\s*\n(\s*\))/', "\n$1", $sql) ?? $sql;
        }
        $sqliteIndexes = [
            'CREATE INDEX IF NOT EXISTS provider_assignments_customer_idx ON provider_assignments (customer_user_id)',
            'CREATE INDEX IF NOT EXISTS provider_assignments_provider_idx ON provider_assignments (provider_profile_id)',
            'CREATE INDEX IF NOT EXISTS provider_assignments_status_idx ON provider_assignments (status)',
            'CREATE INDEX IF NOT EXISTS provider_assignments_preferred_idx ON provider_assignments (preferred_at)',
            'CREATE INDEX IF NOT EXISTS provider_assignment_events_assignment_idx ON provider_assignment_events (assignment_id)',
            'CREATE INDEX IF NOT EXISTS provider_assignment_events_created_idx ON provider_assignment_events (created_at)',
            'CREATE INDEX IF NOT EXISTS admin_reversible_actor_idx ON admin_reversible_actions (actor_user_id)',
            'CREATE INDEX IF NOT EXISTS admin_reversible_entity_idx ON admin_reversible_actions (entity_table, entity_id)',
            'CREATE INDEX IF NOT EXISTS admin_reversible_created_idx ON admin_reversible_actions (created_at)',
        ];
    }

    foreach (array_merge($statements, $sqliteIndexes) as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            // A concurrent request may have created it first, but the migration
            // itself must fail loudly rather than report a false success.
            if ($force) {
                throw $e;
            }
        }
    }
    $done = true;
}

/** @return array<string, mixed>|null */
function ds_assignment_provider_profile(string $profileId): ?array
{
    $stmt = ds_pdo()->prepare('SELECT * FROM provider_profiles WHERE id = ? LIMIT 1');
    $stmt->execute([$profileId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_assignment_provider_eligible(string $profileId): array
{
    $profile = ds_assignment_provider_profile($profileId);
    if (!$profile) {
        return ['ok' => false, 'message' => 'Provider profile not found.'];
    }
    $user = ds_find_user_by_id((string) $profile['user_id']);
    if (!$user || (string) ($user['role'] ?? '') !== 'massage_provider') {
        return ['ok' => false, 'message' => 'Provider account not found.'];
    }
    if ((string) ($user['account_status'] ?? '') !== 'active') {
        return ['ok' => false, 'message' => 'Only active provider accounts can receive assignments.'];
    }
    if (!empty($profile['removed_at'])) {
        return ['ok' => false, 'message' => 'A removed provider cannot receive assignments.'];
    }
    $verification = ds_ensure_provider_verification((string) $profile['user_id']);
    if ((string) ($verification['verification_status'] ?? '') !== 'verified') {
        return ['ok' => false, 'message' => 'Only verified providers can receive assignments.'];
    }
    return ['ok' => true, 'profile' => $profile, 'user' => $user];
}

function ds_assignment_team_member(string $teamId, string $profileId): array
{
    if (!ds_table_exists('agency_team_members')) {
        return ['ok' => false, 'message' => 'Agency team members are not configured.'];
    }
    $stmt = ds_pdo()->prepare('SELECT * FROM agency_team_members WHERE id = ? LIMIT 1');
    $stmt->execute([$teamId]);
    $member = $stmt->fetch();
    if (!$member) {
        return ['ok' => false, 'message' => 'Team member not found.'];
    }
    if ((string) $member['agency_profile_id'] !== $profileId) {
        return ['ok' => false, 'message' => 'That team member does not belong to the selected agency.'];
    }
    if ((string) $member['status'] !== 'active') {
        return ['ok' => false, 'message' => 'Only active team members can be assigned.'];
    }
    return ['ok' => true, 'member' => $member];
}

/** Notify the customer/provider through the existing mail transport when configured. */
function ds_assignment_notify(array $assignment, string $event): bool
{
    if (!function_exists('ds_send_mail') || !ds_mail_configured()) {
        return false;
    }
    try {
        $customer = ds_find_user_by_id((string) $assignment['customer_user_id']);
        if (!$customer || empty($customer['email'])) {
            return false;
        }
        $subject = 'Massager Studio assignment ' . str_replace('_', ' ', $event);
        $body = 'Your Massager Studio assignment is now: '
            . (ds_assignment_statuses()[(string) $assignment['status']] ?? (string) $assignment['status'])
            . '. This is an operational assignment, not a confirmed paid booking.';
        return ds_send_mail((string) $customer['email'], $subject, $body);
    } catch (Throwable $e) {
        return false;
    }
}
