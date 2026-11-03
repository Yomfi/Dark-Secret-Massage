<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

$admin = ds_require_permission('content.read');
if (!ds_cms_ready()) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'This area needs the database migration. Run: php scripts/migrate.php --apply');
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$pdo = ds_pdo();

$settingsWhitelist = [
    'site_tagline', 'contact_email', 'contact_phone', 'contact_whatsapp', 'contact_address',
    'social_facebook', 'social_instagram', 'social_x', 'social_tiktok', 'social_linkedin',
    'seo_title', 'seo_description', 'og_image', 'booking_notice',
    'booking_days', 'booking_hours', 'booking_slot_minutes', 'booking_timezone',
];

$payload = static function () use ($pdo, $settingsWhitelist): array {
    $pages = $pdo->query(
        'SELECT id, slug, title, body_html, status, seo_title, seo_description, og_image,
                updated_by, published_at, updated_at
         FROM cms_pages ORDER BY updated_at DESC'
    )->fetchAll() ?: [];
    $faqs = $pdo->query(
        'SELECT id, question, answer, sort_order, is_active, updated_at FROM cms_faqs
         ORDER BY sort_order ASC, created_at ASC'
    )->fetchAll() ?: [];

    $settings = [];
    foreach ($pdo->query('SELECT skey, svalue, updated_at FROM cms_settings')->fetchAll() ?: [] as $row) {
        $settings[(string) $row['skey']] = (string) ($row['svalue'] ?? '');
    }

    return [
        'pages' => array_map(static fn (array $r): array => [
            'id' => (string) $r['id'],
            'slug' => (string) $r['slug'],
            'title' => (string) $r['title'],
            'bodyHtml' => (string) ($r['body_html'] ?? ''),
            'status' => (string) $r['status'],
            'seoTitle' => $r['seo_title'] !== null ? (string) $r['seo_title'] : '',
            'seoDescription' => $r['seo_description'] !== null ? (string) $r['seo_description'] : '',
            'ogImage' => $r['og_image'] !== null ? (string) $r['og_image'] : '',
            'publishedAt' => $r['published_at'] ?? null,
            'updatedAt' => $r['updated_at'] ?? null,
        ], $pages),
        'faqs' => array_map(static fn (array $r): array => [
            'id' => (string) $r['id'],
            'question' => (string) $r['question'],
            'answer' => (string) $r['answer'],
            'sortOrder' => (int) $r['sort_order'],
            'active' => (int) $r['is_active'] === 1,
        ], $faqs),
        'settings' => $settings,
        'settingsWhitelist' => $settingsWhitelist,
    ];
};

if ($method === 'GET') {
    if (!empty($_GET['preview'])) {
        $stmt = $pdo->prepare('SELECT * FROM cms_pages WHERE id = ? LIMIT 1');
        $stmt->execute([(string) $_GET['preview']]);
        $page = $stmt->fetch();
        if (!$page) {
            ds_error(404, 'NOT_FOUND', 'Page not found.');
        }
        ds_success(['preview' => [
            'id' => (string) $page['id'],
            'slug' => (string) $page['slug'],
            'title' => (string) $page['title'],
            'bodyHtml' => (string) ($page['body_html'] ?? ''),
            'status' => (string) $page['status'],
        ]]);
    }
    ds_success($payload());
}

ds_require_method('POST');
ds_require_same_origin();
ds_require_permission('content.write');
ds_rate_limit('admin_content', 60, 15 * 60);

$body = ds_json_body();
$action = strtolower(trim((string) ($body['action'] ?? '')));
$now = ds_now_sql();

if ($action === 'save_page') {
    $id = trim((string) ($body['id'] ?? ''));
    $slug = ds_slugify((string) ($body['slug'] ?? ''));
    $title = trim((string) ($body['title'] ?? ''));
    $html = (string) ($body['bodyHtml'] ?? '');
    $seoTitle = trim((string) ($body['seoTitle'] ?? ''));
    $seoDescription = trim((string) ($body['seoDescription'] ?? ''));
    $ogImage = trim((string) ($body['ogImage'] ?? ''));
    $status = strtolower(trim((string) ($body['status'] ?? 'draft')));

    if ($slug === '' || $title === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Slug and title are required.');
    }
    if (!in_array($status, ['draft', 'published'], true)) {
        $status = 'draft';
    }
    // Only a deliberate publish action may publish.
    $status = $action === 'save_page' ? 'draft' : $status;

    if ($id === '') {
        // Saving a page whose slug already exists updates that page instead of
        // inserting a second row, so a slug can never resolve to two pages.
        $stmt = $pdo->prepare('SELECT id FROM cms_pages WHERE slug = ? ORDER BY updated_at DESC LIMIT 1');
        $stmt->execute([$slug]);
        $id = (string) ($stmt->fetch()['id'] ?? '');
    }

    if ($id !== '') {
        $stmt = $pdo->prepare('SELECT id FROM cms_pages WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            ds_error(404, 'NOT_FOUND', 'Page not found.');
        }
        $pdo->prepare(
            'UPDATE cms_pages SET slug = ?, title = ?, body_html = ?, seo_title = ?, seo_description = ?,
                og_image = ?, updated_by = ?, updated_at = ? WHERE id = ?'
        )->execute([$slug, $title, $html, $seoTitle !== '' ? $seoTitle : null,
            $seoDescription !== '' ? $seoDescription : null, $ogImage !== '' ? $ogImage : null,
            $admin['id'], $now, $id]);
        ds_audit('content.page_draft_saved', 'cms_page', $id, ['slug' => $slug], $admin['id']);
        ds_success(['saved' => true, 'id' => $id] + $payload());
    }

    $id = ds_new_id();
    $pdo->prepare(
        'INSERT INTO cms_pages (id, slug, title, body_html, status, seo_title, seo_description, og_image,
            updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$id, $slug, $title, $html, 'draft', $seoTitle !== '' ? $seoTitle : null,
        $seoDescription !== '' ? $seoDescription : null, $ogImage !== '' ? $ogImage : null,
        $admin['id'], $now, $now]);
    ds_audit('content.page_created', 'cms_page', $id, ['slug' => $slug], $admin['id']);
    ds_success(['saved' => true, 'id' => $id] + $payload());
}

if ($action === 'publish_page' || $action === 'unpublish_page') {
    $id = trim((string) ($body['id'] ?? ''));
    $stmt = $pdo->prepare('SELECT * FROM cms_pages WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $page = $stmt->fetch();
    if (!$page) {
        ds_error(404, 'NOT_FOUND', 'Page not found.');
    }

    if ($action === 'publish_page') {
        if (trim((string) ($page['title'] ?? '')) === '') {
            ds_error(400, 'VALIDATION_ERROR', 'Add a title before publishing.');
        }
        $pdo->prepare(
            "UPDATE cms_pages SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?"
        )->execute([$now, $now, $id]);
        $pdo->prepare(
            'INSERT INTO cms_page_revisions (id, page_id, title, body_html, seo_title, seo_description, status, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([ds_new_id(), $id, (string) $page['title'], (string) ($page['body_html'] ?? ''),
            $page['seo_title'], $page['seo_description'], 'published', $admin['id'], $now]);
        ds_audit('content.page_published', 'cms_page', $id, ['slug' => (string) $page['slug']], $admin['id']);
        ds_success(['published' => true] + $payload());
    }

    $pdo->prepare("UPDATE cms_pages SET status = 'draft', updated_at = ? WHERE id = ?")->execute([$now, $id]);
    ds_audit('content.page_unpublished', 'cms_page', $id, [], $admin['id']);
    ds_success(['published' => false] + $payload());
}

if ($action === 'delete_page') {
    $id = trim((string) ($body['id'] ?? ''));
    $pdo->prepare('DELETE FROM cms_pages WHERE id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM cms_page_revisions WHERE page_id = ?')->execute([$id]);
    ds_audit('content.page_deleted', 'cms_page', $id, [], $admin['id']);
    ds_success(['deleted' => true] + $payload());
}

if ($action === 'save_faq') {
    $id = trim((string) ($body['id'] ?? ''));
    $question = trim((string) ($body['question'] ?? ''));
    $answer = trim((string) ($body['answer'] ?? ''));
    $sortOrder = (int) ($body['sortOrder'] ?? 0);
    $active = !empty($body['active']);

    if ($question === '' || $answer === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Question and answer are required.');
    }
    if ($id !== '') {
        $pdo->prepare('UPDATE cms_faqs SET question = ?, answer = ?, sort_order = ?, is_active = ?, updated_at = ? WHERE id = ?')
            ->execute([$question, $answer, $sortOrder, $active ? 1 : 0, $now, $id]);
        ds_audit('content.faq_updated', 'cms_faq', $id, [], $admin['id']);
        ds_success(['saved' => true, 'id' => $id] + $payload());
    }
    $id = ds_new_id();
    $pdo->prepare('INSERT INTO cms_faqs (id, question, answer, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        ->execute([$id, $question, $answer, $sortOrder, $active ? 1 : 0, $now, $now]);
    ds_audit('content.faq_created', 'cms_faq', $id, [], $admin['id']);
    ds_success(['saved' => true, 'id' => $id] + $payload());
}

if ($action === 'delete_faq') {
    $id = trim((string) ($body['id'] ?? ''));
    $pdo->prepare('DELETE FROM cms_faqs WHERE id = ?')->execute([$id]);
    ds_audit('content.faq_deleted', 'cms_faq', $id, [], $admin['id']);
    ds_success(['deleted' => true] + $payload());
}

if ($action === 'save_settings') {
    $incoming = $body['settings'] ?? [];
    if (!is_array($incoming)) {
        ds_error(400, 'VALIDATION_ERROR', 'Settings payload must be an object.');
    }
    $saved = [];
    foreach ($settingsWhitelist as $key) {
        if (!array_key_exists($key, $incoming)) {
            continue;
        }
        $value = trim((string) $incoming[$key]);
        if ($key === 'contact_email' && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            ds_error(400, 'VALIDATION_ERROR', 'Enter a valid contact email.');
        }
        ds_cms_set_setting($key, $value, $admin['id']);
        $saved[] = $key;
    }
    ds_audit('content.settings_saved', 'cms_settings', null, ['keys' => $saved], $admin['id']);
    ds_success(['saved' => true, 'keys' => $saved] + $payload());
}

ds_error(400, 'VALIDATION_ERROR', 'Unknown content action.');
