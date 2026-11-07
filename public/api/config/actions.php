<?php
declare(strict_types=1);

require_once __DIR__ . '/assignments.php';

/**
 * Safe, explicit undo/redo for allow-listed reversible columns.
 *
 * Only these tables/columns can be reversed. Payments, deletions, delivered
 * notifications and audit rows are deliberately absent. Each reversal checks
 * that the row still matches the recorded state; a stale or conflicting change
 * is refused instead of overwritten.
 */

function ds_reversible_columns(): array
{
    return [
        'users' => ['account_status', 'suspend_reason', 'suspended_until', 'suspend_notes', 'block_reason'],
        'provider_profiles' => [
            'display_name', 'city', 'about', 'service_area', 'working_days', 'working_hours',
            'is_published', 'removed_at', 'removed_by', 'remove_reason',
        ],
        'provider_assignments' => ['status', 'provider_profile_id', 'team_member_id', 'status_note', 'cancelled_at'],
    ];
}

function ds_reversible_record(
    string $action,
    string $label,
    string $table,
    string $rowId,
    array $before,
    array $after,
    array $meta = [],
    ?string $actorId = null
): ?string {
    $columns = ds_reversible_columns();
    if (!isset($columns[$table])) {
        return null;
    }
    ds_ensure_assignments_schema();

    $safeBefore = [];
    $safeAfter = [];
    foreach ($columns[$table] as $column) {
        if (array_key_exists($column, $before) || array_key_exists($column, $after)) {
            $safeBefore[$column] = $before[$column] ?? null;
            $safeAfter[$column] = $after[$column] ?? null;
        }
    }
    if ($safeBefore === [] && $safeAfter === []) {
        return null;
    }

    $id = ds_new_id();
    try {
        ds_pdo()->prepare(
            'INSERT INTO admin_reversible_actions
             (id, actor_user_id, action, label, entity_table, entity_id, before_json, after_json, meta_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $id,
            $actorId,
            $action,
            mb_substr($label, 0, 255),
            $table,
            $rowId,
            json_encode($safeBefore, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            json_encode($safeAfter, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            $meta === [] ? null : json_encode($meta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ds_now_sql(),
        ]);
    } catch (Throwable $e) {
        // Auditing already happened; undo is a convenience, never a write blocker.
        return null;
    }
    return $id;
}

function ds_reversible_load(string $id): array
{
    ds_ensure_assignments_schema();
    $stmt = ds_pdo()->prepare('SELECT * FROM admin_reversible_actions WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        ds_error(404, 'NOT_FOUND', 'That action no longer exists.');
    }
    return $row;
}

/** @return array{actionId:string,label:string,undone:bool} */
function ds_reversible_apply(string $id, string $mode, array $admin): array
{
    $row = ds_reversible_load($id);
    $table = (string) $row['entity_table'];
    $columns = ds_reversible_columns();
    if (!isset($columns[$table])) {
        ds_error(409, 'NOT_REVERSIBLE', 'This kind of change cannot be undone.');
    }
    if ($mode !== 'undo' && $mode !== 'redo') {
        ds_error(400, 'VALIDATION_ERROR', 'mode must be undo or redo.');
    }

    $before = json_decode((string) ($row['before_json'] ?? '{}'), true);
    $after = json_decode((string) ($row['after_json'] ?? '{}'), true);
    $before = is_array($before) ? $before : [];
    $after = is_array($after) ? $after : [];

    if ($mode === 'undo' && !empty($row['undone_at'])) {
        ds_error(409, 'ALREADY_UNDONE', 'This change has already been undone.');
    }
    if ($mode === 'redo' && empty($row['undone_at'])) {
        ds_error(409, 'NOT_UNDONE', 'Undo this change before redoing it.');
    }

    $target = $mode === 'undo' ? $before : $after;
    $expected = $mode === 'undo' ? $after : $before;
    $columnsToRestore = array_keys($target);
    if ($columnsToRestore === []) {
        ds_error(409, 'NOT_REVERSIBLE', 'This change has no stored state to restore.');
    }

    // Verify the row still equals the state we recorded, otherwise a later edit
    // would be silently overwritten.
    $select = ds_pdo()->prepare(
        'SELECT `' . implode('`, `', array_map(static fn (string $c): string => str_replace('`', '', $c), array_keys($expected))) . '`
         FROM `' . str_replace('`', '', $table) . '` WHERE id = ? LIMIT 1'
    );
    $select->execute([(string) $row['entity_id']]);
    $current = $select->fetch();
    if (!$current) {
        ds_error(409, 'MISSING_RECORD', 'The original record no longer exists.');
    }
    foreach ($expected as $column => $value) {
        if (!in_array($column, $columns[$table], true)) {
            continue;
        }
        $currentValue = $current[$column] ?? null;
        $currentNorm = $currentValue === null ? null : (string) $currentValue;
        $expectedNorm = $value === null ? null : (string) $value;
        if ($currentNorm !== $expectedNorm) {
            ds_error(409, 'CONFLICT', 'This record changed after the action, so it cannot be reversed safely.');
        }
    }

    $sets = [];
    $params = [];
    foreach ($target as $column => $value) {
        if (!in_array($column, $columns[$table], true)) {
            continue;
        }
        $sets[] = '`' . str_replace('`', '', $column) . '` = ?';
        $params[] = $value;
    }
    if ($table === 'provider_profiles' || $table === 'users' || $table === 'provider_assignments') {
        // Keep updated_at meaningful without making it part of the snapshot.
        if ($table !== 'users' || ds_column_exists('users', 'updated_at')) {
            $sets[] = 'updated_at = ?';
            $params[] = ds_now_sql();
        }
    }
    $params[] = (string) $row['entity_id'];

    $pdo = ds_pdo();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE `' . str_replace('`', '', $table) . '` SET ' . implode(', ', $sets) . ' WHERE id = ?')
            ->execute($params);
        if ($mode === 'undo') {
            $pdo->prepare('UPDATE admin_reversible_actions SET undone_at = ?, undone_by = ? WHERE id = ?')
                ->execute([ds_now_sql(), $admin['id'], $id]);
        } else {
            $pdo->prepare('UPDATE admin_reversible_actions SET undone_at = NULL, undone_by = NULL WHERE id = ?')
                ->execute([$id]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    ds_audit('admin.' . $mode, $table, (string) $row['entity_id'], [
        'actionId' => $id,
        'originalAction' => (string) $row['action'],
        'label' => (string) $row['label'],
    ], $admin['id']);
    if ($table === 'provider_assignments') {
        $assignment = ds_pdo()->prepare('SELECT * FROM provider_assignments WHERE id = ? LIMIT 1');
        $assignment->execute([(string) $row['entity_id']]);
        $a = $assignment->fetch();
        if ($a && ds_table_exists('provider_assignment_events')) {
            ds_pdo()->prepare(
                'INSERT INTO provider_assignment_events (id, assignment_id, actor_user_id, event, from_status, to_status, note, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                ds_new_id(), (string) $a['id'], $admin['id'], $mode === 'undo' ? 'undone' : 'redone',
                $mode === 'undo' ? (string) $row['after_json'] : (string) $row['before_json'],
                (string) $a['status'], 'Admin ' . $mode, ds_now_sql(),
            ]);
        }
    }

    return ['actionId' => $id, 'label' => (string) $row['label'], 'undone' => $mode === 'undo'];
}
