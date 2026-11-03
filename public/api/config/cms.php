<?php
declare(strict_types=1);

/**
 * CMS, bookings and audit helpers.
 *
 * The migration is idempotent and portable (MySQL in production, SQLite in the
 * local smoke tests): ids are application-generated strings, types avoid ENUM,
 * and indexes are created defensively because MySQL has no CREATE INDEX IF NOT
 * EXISTS.
 */

function ds_cms_tables(): array
{
    return [
        'cms_pages',
        'cms_page_revisions',
        'cms_settings',
        'cms_faqs',
        'services',
        'bookings',
        'booking_events',
        'admin_audit_log',
        'media_assets',
        'qa_accounts',
    ];
}

function ds_cms_ready(): bool
{
    foreach (['cms_pages', 'cms_settings', 'services', 'bookings', 'admin_audit_log'] as $table) {
        if (!ds_table_exists($table)) {
            return false;
        }
    }
    return true;
}

/** Create CMS tables/columns when missing. Safe to call on every request. */
function ds_cms_migrate(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;

    $pdo = ds_pdo();

    $statements = [
        'CREATE TABLE IF NOT EXISTS cms_pages (
            id VARCHAR(191) NOT NULL,
            slug VARCHAR(191) NOT NULL,
            title VARCHAR(255) NOT NULL,
            body_html TEXT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'draft\',
            seo_title VARCHAR(255) NULL,
            seo_description VARCHAR(320) NULL,
            og_image VARCHAR(512) NULL,
            updated_by VARCHAR(191) NULL,
            published_at DATETIME(3) NULL,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        )',
        'CREATE TABLE IF NOT EXISTS cms_page_revisions (
            id VARCHAR(191) NOT NULL,
            page_id VARCHAR(191) NOT NULL,
            title VARCHAR(255) NOT NULL,
            body_html TEXT NULL,
            seo_title VARCHAR(255) NULL,
            seo_description VARCHAR(320) NULL,
            status VARCHAR(20) NOT NULL,
            created_by VARCHAR(191) NULL,
            created_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        )',
        'CREATE TABLE IF NOT EXISTS cms_settings (
            skey VARCHAR(191) NOT NULL,
            svalue TEXT NULL,
            updated_by VARCHAR(191) NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (skey)
        )',
        'CREATE TABLE IF NOT EXISTS cms_faqs (
            id VARCHAR(191) NOT NULL,
            question VARCHAR(500) NOT NULL,
            answer TEXT NOT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            is_active INT NOT NULL DEFAULT 1,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        )',
        'CREATE TABLE IF NOT EXISTS services (
            id VARCHAR(191) NOT NULL,
            provider_profile_id VARCHAR(191) NULL,
            name VARCHAR(160) NOT NULL,
            description TEXT NULL,
            duration_minutes INT NOT NULL DEFAULT 60,
            price DECIMAL(10,2) NOT NULL DEFAULT 0,
            currency VARCHAR(8) NOT NULL DEFAULT \'GHS\',
            image_path VARCHAR(512) NULL,
            category VARCHAR(64) NULL,
            is_active INT NOT NULL DEFAULT 0,
            sort_order INT NOT NULL DEFAULT 0,
            created_by VARCHAR(191) NULL,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        )',
        'CREATE TABLE IF NOT EXISTS bookings (
            id VARCHAR(191) NOT NULL,
            reference VARCHAR(32) NULL,
            customer_user_id VARCHAR(191) NOT NULL,
            provider_profile_id VARCHAR(191) NULL,
            team_member_id VARCHAR(191) NULL,
            service_id VARCHAR(191) NULL,
            service_name VARCHAR(160) NOT NULL,
            duration_minutes INT NOT NULL DEFAULT 60,
            price DECIMAL(10,2) NOT NULL DEFAULT 0,
            currency VARCHAR(8) NOT NULL DEFAULT \'GHS\',
            status VARCHAR(24) NOT NULL DEFAULT \'pending\',
            scheduled_at DATETIME(3) NULL,
            time_slot VARCHAR(64) NULL,
            location_type VARCHAR(24) NULL,
            address VARCHAR(512) NULL,
            customer_name VARCHAR(160) NULL,
            customer_phone VARCHAR(32) NULL,
            customer_email VARCHAR(255) NULL,
            notes TEXT NULL,
            cancellation_reason VARCHAR(500) NULL,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        )',
        'CREATE TABLE IF NOT EXISTS booking_events (
            id VARCHAR(191) NOT NULL,
            booking_id VARCHAR(191) NOT NULL,
            actor_user_id VARCHAR(191) NULL,
            event VARCHAR(40) NOT NULL,
            from_status VARCHAR(24) NULL,
            to_status VARCHAR(24) NULL,
            note VARCHAR(500) NULL,
            created_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        )',
        'CREATE TABLE IF NOT EXISTS admin_audit_log (
            id VARCHAR(191) NOT NULL,
            actor_user_id VARCHAR(191) NULL,
            action VARCHAR(80) NOT NULL,
            entity_type VARCHAR(40) NULL,
            entity_id VARCHAR(191) NULL,
            meta_json TEXT NULL,
            ip VARCHAR(64) NULL,
            created_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        )',
        'CREATE TABLE IF NOT EXISTS media_assets (
            id VARCHAR(191) NOT NULL,
            path VARCHAR(512) NOT NULL,
            filename VARCHAR(255) NOT NULL,
            mime VARCHAR(100) NULL,
            size_bytes INT NOT NULL DEFAULT 0,
            alt_text VARCHAR(255) NULL,
            uploaded_by VARCHAR(191) NULL,
            created_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        )',
        // Explicit register of test/QA identities. Test accounts are never
        // inferred from an email domain; an account is QA only when it is listed
        // here or carries the deliberate `+qa-` address marker.
        'CREATE TABLE IF NOT EXISTS qa_accounts (
            email VARCHAR(255) NOT NULL,
            note VARCHAR(255) NULL,
            created_at DATETIME(3) NOT NULL,
            PRIMARY KEY (email)
        )',
        'CREATE TABLE IF NOT EXISTS staff_profiles (
            user_id VARCHAR(191) NOT NULL,
            staff_role VARCHAR(40) NOT NULL DEFAULT \'support\',
            is_active INT NOT NULL DEFAULT 1,
            invited_by VARCHAR(191) NULL,
            invited_at DATETIME(3) NULL,
            activated_at DATETIME(3) NULL,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (user_id)
        )',
        'CREATE TABLE IF NOT EXISTS staff_invitations (
            id VARCHAR(191) NOT NULL,
            email VARCHAR(255) NOT NULL,
            staff_role VARCHAR(40) NOT NULL,
            token_hash VARCHAR(64) NOT NULL,
            invited_by VARCHAR(191) NULL,
            expires_at DATETIME(3) NOT NULL,
            accepted_at DATETIME(3) NULL,
            created_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        )',
        'CREATE TABLE IF NOT EXISTS customer_notes (
            id VARCHAR(191) NOT NULL,
            customer_user_id VARCHAR(191) NOT NULL,
            author_user_id VARCHAR(191) NULL,
            body TEXT NOT NULL,
            created_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        )',
        'CREATE TABLE IF NOT EXISTS privacy_requests (
            id VARCHAR(191) NOT NULL,
            customer_user_id VARCHAR(191) NOT NULL,
            request_type VARCHAR(20) NOT NULL,
            status VARCHAR(24) NOT NULL DEFAULT \'open\',
            notes TEXT NULL,
            created_by VARCHAR(191) NULL,
            resolved_by VARCHAR(191) NULL,
            resolved_at DATETIME(3) NULL,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        )',
        'CREATE TABLE IF NOT EXISTS cms_announcements (
            id VARCHAR(191) NOT NULL,
            title VARCHAR(255) NOT NULL,
            body_html TEXT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'draft\',
            published_at DATETIME(3) NULL,
            created_by VARCHAR(191) NULL,
            updated_by VARCHAR(191) NULL,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        )',
    ];

    foreach ($statements as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            // A concurrent request may have created the table first.
        }
    }

    // Seed the test-account register with the identities created during email and
    // booking smoke tests. These are explicit rows, never an email-domain rule.
    if (ds_table_exists('qa_accounts')) {
        $qaSeed = [
            'info+qa-c-1793619433@massagerstudio.com' => 'SMTP verification probe (customer)',
            'info+qa-i-1793619433@massagerstudio.com' => 'SMTP verification probe (individual provider)',
            'info+qa-a-1793619433@massagerstudio.com' => 'SMTP verification probe (agency)',
            'qa-cust-mvz6xhxr@fldubai.com' => 'Customer booking smoke test',
            'qa-ind-mvz6xr7r@fldubai.com' => 'Individual provider smoke test',
            'qa-agy-mvz6xz85@fldubai.com' => 'Agency smoke test',
            'qa-rot-mvz6z43d@fldubai.com' => 'Role rotation smoke test',
        ];
        foreach ($qaSeed as $qaEmail => $qaNote) {
            try {
                $pdo->prepare('INSERT INTO qa_accounts (email, note, created_at) VALUES (?, ?, ?)')
                    ->execute([$qaEmail, $qaNote, ds_now_sql()]);
            } catch (Throwable $e) {
                // Already registered.
            }
        }
    }

    if (ds_table_exists('media_assets') && !ds_column_exists('media_assets', 'alt_text')) {
        try {
            $pdo->exec('ALTER TABLE media_assets ADD COLUMN alt_text VARCHAR(255) NULL');
        } catch (Throwable $e) {
            // Concurrent alter.
        }
        ds_flush_table_columns('media_assets');
    }

    // Booking overlap protection: one active booking per provider/team/customer
    // slot. Computed keys make the rule enforceable by a UNIQUE index, so two
    // concurrent requests cannot both win the same slot.
    if (ds_table_exists('bookings')) {
        foreach ([
            'slot_id' => 'VARCHAR(64) NULL',
            'provider_slot_key' => 'VARCHAR(191) NULL',
            'team_slot_key' => 'VARCHAR(191) NULL',
            'customer_slot_key' => 'VARCHAR(191) NULL',
        ] as $column => $definition) {
            if (!ds_column_exists('bookings', $column)) {
                try {
                    $pdo->exec('ALTER TABLE bookings ADD COLUMN ' . $column . ' ' . $definition);
                } catch (Throwable $e) {
                    // Column appeared concurrently.
                }
            }
        }
        ds_flush_table_columns('bookings');
    }

    $indexes = [
        'CREATE INDEX cms_pages_slug_idx ON cms_pages (slug)',
        'CREATE INDEX cms_pages_status_idx ON cms_pages (status)',
        'CREATE INDEX services_provider_idx ON services (provider_profile_id)',
        'CREATE INDEX services_active_idx ON services (is_active)',
        'CREATE INDEX bookings_customer_idx ON bookings (customer_user_id)',
        'CREATE INDEX bookings_provider_idx ON bookings (provider_profile_id)',
        'CREATE INDEX bookings_status_idx ON bookings (status)',
        'CREATE INDEX booking_events_booking_idx ON booking_events (booking_id)',
        'CREATE INDEX admin_audit_created_idx ON admin_audit_log (created_at)',
        'CREATE UNIQUE INDEX bookings_provider_slot_uniq ON bookings (provider_slot_key)',
        'CREATE UNIQUE INDEX bookings_team_slot_uniq ON bookings (team_slot_key)',
        'CREATE UNIQUE INDEX bookings_customer_slot_uniq ON bookings (customer_slot_key)',
    ];
    foreach ($indexes as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            // Index already exists (or the driver rejects the syntax) — harmless.
        }
    }

    if (ds_table_exists('provider_profiles')) {
        foreach ([
            'is_published' => 'INT NOT NULL DEFAULT 0',
            'published_at' => 'DATETIME(3) NULL',
        ] as $column => $definition) {
            if (!ds_column_exists('provider_profiles', $column)) {
                try {
                    $pdo->exec('ALTER TABLE provider_profiles ADD COLUMN ' . $column . ' ' . $definition);
                } catch (Throwable $e) {
                    // Column appeared concurrently.
                }
            }
        }
        // Column metadata is cached per request: without this the endpoints that
        // call ds_column_exists() immediately afterwards still see the old shape.
        if (function_exists('ds_flush_table_columns')) {
            ds_flush_table_columns('provider_profiles');
        }
    }
}

/** Read one CMS setting. Values are stored as plain strings. */
function ds_cms_setting(string $key, string $default = ''): string
{
    if (!ds_table_exists('cms_settings')) {
        return $default;
    }
    static $cache = [];
    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }
    $stmt = ds_pdo()->prepare('SELECT svalue FROM cms_settings WHERE skey = ? LIMIT 1');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    $value = $row && $row['svalue'] !== null ? (string) $row['svalue'] : $default;
    $cache[$key] = $value;
    return $value;
}

function ds_cms_set_setting(string $key, string $value, ?string $actorId = null): void
{
    $now = ds_now_sql();
    $pdo = ds_pdo();
    $stmt = $pdo->prepare('SELECT skey FROM cms_settings WHERE skey = ? LIMIT 1');
    $stmt->execute([$key]);
    if ($stmt->fetch()) {
        $pdo->prepare('UPDATE cms_settings SET svalue = ?, updated_by = ?, updated_at = ? WHERE skey = ?')
            ->execute([$value, $actorId, $now, $key]);
        return;
    }
    $pdo->prepare('INSERT INTO cms_settings (skey, svalue, updated_by, updated_at) VALUES (?, ?, ?, ?)')
        ->execute([$key, $value, $actorId, $now]);
}

/** Settings exposed to the public site (never credentials). */
function ds_cms_public_settings(): array
{
    $keys = [
        'site_tagline', 'contact_email', 'contact_phone', 'contact_whatsapp',
        'contact_address', 'social_facebook', 'social_instagram', 'social_x',
        'social_tiktok', 'social_linkedin', 'seo_title', 'seo_description',
        'og_image', 'booking_notice', 'booking_days', 'booking_hours',
        'booking_slot_minutes', 'booking_timezone',
    ];
    $out = [];
    foreach ($keys as $key) {
        $out[$key] = ds_cms_setting($key, '');
    }
    return $out;
}

/** @return list<array<string, mixed>> */
function ds_cms_published_pages(): array
{
    if (!ds_table_exists('cms_pages')) {
        return [];
    }
    $rows = ds_pdo()->query(
        "SELECT slug, title, body_html, seo_title, seo_description, og_image, published_at
         FROM cms_pages WHERE status = 'published' ORDER BY slug ASC"
    )->fetchAll();
    return array_map(static function (array $row): array {
        return [
            'slug' => (string) $row['slug'],
            'title' => (string) $row['title'],
            'bodyHtml' => (string) ($row['body_html'] ?? ''),
            'seoTitle' => $row['seo_title'] !== null ? (string) $row['seo_title'] : null,
            'seoDescription' => $row['seo_description'] !== null ? (string) $row['seo_description'] : null,
            'ogImage' => $row['og_image'] !== null ? (string) $row['og_image'] : null,
            'publishedAt' => $row['published_at'] ?? null,
        ];
    }, $rows ?: []);
}

/** @return list<array<string, mixed>> */
function ds_cms_active_faqs(): array
{
    if (!ds_table_exists('cms_faqs')) {
        return [];
    }
    $rows = ds_pdo()->query(
        'SELECT id, question, answer FROM cms_faqs WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC'
    )->fetchAll();
    return array_map(static function (array $row): array {
        return [
            'id' => (string) $row['id'],
            'question' => (string) $row['question'],
            'answer' => (string) $row['answer'],
        ];
    }, $rows ?: []);
}

/** @return list<array<string, mixed>> */
function ds_cms_published_announcements(): array
{
    if (!ds_table_exists('cms_announcements')) {
        return [];
    }
    $rows = ds_pdo()->query(
        "SELECT id, title, body_html, published_at FROM cms_announcements
         WHERE status = 'published' ORDER BY published_at DESC LIMIT 20"
    )->fetchAll();
    return array_map(static function (array $row): array {
        return [
            'id' => (string) $row['id'],
            'title' => (string) $row['title'],
            'bodyHtml' => (string) ($row['body_html'] ?? ''),
            'publishedAt' => $row['published_at'] ?? null,
        ];
    }, $rows ?: []);
}

/** Platform service catalogue (provider_profile_id IS NULL). */
function ds_public_services(bool $activeOnly = true): array
{
    if (!ds_table_exists('services')) {
        return [];
    }
    $sql = 'SELECT * FROM services WHERE provider_profile_id IS NULL';
    if ($activeOnly) {
        $sql .= ' AND is_active = 1';
    }
    $sql .= ' ORDER BY sort_order ASC, name ASC';
    $rows = ds_pdo()->query($sql)->fetchAll();
    return array_map('ds_service_row_to_public', $rows ?: []);
}

/** @return array<string, mixed> */
function ds_service_row_to_public(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'name' => (string) $row['name'],
        'description' => (string) ($row['description'] ?? ''),
        'durationMinutes' => (int) $row['duration_minutes'],
        'price' => (float) $row['price'],
        'currency' => (string) $row['currency'],
        'image' => $row['image_path'] !== null ? (string) $row['image_path'] : null,
        'category' => $row['category'] !== null ? (string) $row['category'] : null,
        'active' => (int) $row['is_active'] === 1,
        'sortOrder' => (int) $row['sort_order'],
    ];
}

/**
 * Record an admin action. Never store secrets; meta is a small JSON payload.
 */
function ds_audit(string $action, string $entityType, ?string $entityId = null, array $meta = [], ?string $actorId = null): void
{
    if (!ds_table_exists('admin_audit_log')) {
        return;
    }
    try {
        ds_pdo()->prepare(
            'INSERT INTO admin_audit_log (id, actor_user_id, action, entity_type, entity_id, meta_json, ip, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            ds_new_id(),
            $actorId,
            $action,
            $entityType,
            $entityId,
            $meta === [] ? null : json_encode($meta, JSON_UNESCAPED_SLASHES),
            substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64),
            ds_now_sql(),
        ]);
    } catch (Throwable $e) {
        // Auditing must never break the primary action.
    }
}

/** Require one of the given roles. */
function ds_require_role(array $roles): array
{
    $user = ds_require_user();
    if (!in_array((string) ($user['role'] ?? ''), $roles, true)) {
        ds_error(403, 'FORBIDDEN', 'You do not have access to this area.');
    }
    return $user;
}

function ds_is_admin_role(?string $role): bool
{
    return in_array((string) $role, ['admin', 'moderator', 'support_admin'], true);
}

/**
 * CSRF defence for state-changing requests: the session cookie is SameSite=Lax,
 * and any cross-site Origin/Sec-Fetch-Site signal is rejected outright.
 */
function ds_require_same_origin(): void
{
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin !== '') {
        $parts = parse_url($origin);
        $originHost = is_array($parts) ? (string) ($parts['host'] ?? '') : '';
        $host = preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')) ?? '';
        if ($originHost === '' || strcasecmp($originHost, $host) !== 0) {
            ds_error(403, 'FORBIDDEN', 'Cross-site request blocked.');
        }
        return;
    }

    $site = strtolower((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
    if ($site !== '' && !in_array($site, ['same-origin', 'same-site'], true)) {
        ds_error(403, 'FORBIDDEN', 'Cross-site request blocked.');
    }
}

/** A listing is public only when the provider is admin-approved and published. */
function ds_provider_publicly_eligible(string $providerUserId): bool
{
    $profile = ds_provider_profile_by_user($providerUserId);
    if (!$profile) {
        return false;
    }
    if ((int) ($profile['is_published'] ?? 0) !== 1) {
        return false;
    }
    if (!ds_table_exists('provider_verification')) {
        return false;
    }
    $stmt = ds_pdo()->prepare(
        'SELECT verification_status FROM provider_verification WHERE provider_user_id = ? LIMIT 1'
    );
    $stmt->execute([$providerUserId]);
    $row = $stmt->fetch();
    return $row && (string) $row['verification_status'] === 'verified';
}

/** Allowed booking transitions. Customer-initiated rules are narrower. */
function ds_booking_transitions(): array
{
    return [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['completed', 'cancelled', 'no_show', 'reschedule_requested'],
        'reschedule_requested' => ['confirmed', 'cancelled'],
        'completed' => [],
        'cancelled' => [],
        'no_show' => [],
    ];
}

function ds_booking_transition_allowed(string $from, string $to): bool
{
    $map = ds_booking_transitions();
    return in_array($to, $map[$from] ?? [], true);
}

/** @return array<string, mixed> */
function ds_booking_row_to_api(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'reference' => $row['reference'] !== null ? (string) $row['reference'] : null,
        'status' => (string) $row['status'],
        'serviceName' => (string) $row['service_name'],
        'serviceId' => $row['service_id'] !== null ? (string) $row['service_id'] : null,
        'durationMinutes' => (int) $row['duration_minutes'],
        'price' => (float) $row['price'],
        'currency' => (string) $row['currency'],
        'scheduledAt' => $row['scheduled_at'] ?? null,
        'timeSlot' => $row['time_slot'] !== null ? (string) $row['time_slot'] : null,
        'locationType' => $row['location_type'] !== null ? (string) $row['location_type'] : null,
        'address' => $row['address'] !== null ? (string) $row['address'] : null,
        'customerName' => $row['customer_name'] !== null ? (string) $row['customer_name'] : null,
        'customerPhone' => $row['customer_phone'] !== null ? (string) $row['customer_phone'] : null,
        'customerEmail' => $row['customer_email'] !== null ? (string) $row['customer_email'] : null,
        'customerUserId' => (string) $row['customer_user_id'],
        'providerProfileId' => $row['provider_profile_id'] !== null ? (string) $row['provider_profile_id'] : null,
        'teamMemberId' => $row['team_member_id'] !== null ? (string) $row['team_member_id'] : null,
        'notes' => $row['notes'] !== null ? (string) $row['notes'] : null,
        'cancellationReason' => $row['cancellation_reason'] !== null ? (string) $row['cancellation_reason'] : null,
        'createdAt' => $row['created_at'] ?? null,
        'updatedAt' => $row['updated_at'] ?? null,
    ];
}

function ds_booking_log(string $bookingId, ?string $actorId, string $event, ?string $from, ?string $to, ?string $note = null): void
{
    if (!ds_table_exists('booking_events')) {
        return;
    }
    try {
        ds_pdo()->prepare(
            'INSERT INTO booking_events (id, booking_id, actor_user_id, event, from_status, to_status, note, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([ds_new_id(), $bookingId, $actorId, $event, $from, $to, $note, ds_now_sql()]);
    } catch (Throwable $e) {
        // Non-fatal.
    }
}

/** Directory for CMS media (public), created on demand. */
function ds_cms_media_dir(): string
{
    $dir = dirname(__DIR__, 2) . '/images/uploads/cms';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return $dir;
}

function ds_cms_media_url(string $filename): string
{
    return '/images/uploads/cms/' . rawurlencode($filename);
}

/**
 * Test-account register. `+qa-` in the address is a deliberate marker used when
 * creating verification probes; everything else must be listed explicitly, so a
 * customer on a shared email domain is never treated as test data.
 */
function ds_is_qa_email(?string $email): bool
{
    $email = strtolower(trim((string) $email));
    if ($email === '') {
        return false;
    }
    if (str_contains($email, '+qa-')) {
        return true;
    }
    static $registered = null;
    if ($registered === null) {
        $registered = [];
        if (ds_table_exists('qa_accounts')) {
            try {
                foreach (ds_pdo()->query('SELECT email FROM qa_accounts')->fetchAll() ?: [] as $row) {
                    $registered[strtolower((string) $row['email'])] = true;
                }
            } catch (Throwable $e) {
                $registered = [];
            }
        }
    }
    return isset($registered[$email]);
}

function ds_register_qa_email(string $email, string $note = 'Registered test account'): void
{
    if (!ds_table_exists('qa_accounts')) {
        return;
    }
    $email = strtolower(trim($email));
    if ($email === '') {
        return;
    }
    try {
        ds_pdo()->prepare('INSERT INTO qa_accounts (email, note, created_at) VALUES (?, ?, ?)')
            ->execute([$email, $note, ds_now_sql()]);
    } catch (Throwable $e) {
        // Already registered.
    }
}

/** SQL predicate excluding QA identities; requires the users table aliased as u. */
function ds_qa_sql_exclusion(string $emailColumn = 'u.email'): string
{
    // CAST BINARY avoids "illegal mix of collations" when qa_accounts was created
    // under a different default collation than users (MySQL 8+).
    return "($emailColumn NOT LIKE '%+qa-%' AND NOT EXISTS (SELECT 1 FROM qa_accounts qa WHERE CAST(qa.email AS BINARY) = CAST($emailColumn AS BINARY)))";
}

// Schedules, slot generation, validation, transactions and locking live in a
// dedicated module so there is one authority for calendar rules.
require_once __DIR__ . '/booking_schedule.php';
