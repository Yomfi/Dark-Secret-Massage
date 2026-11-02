<?php
declare(strict_types=1);

/**
 * Public CMS content: published pages, active FAQs, contact/social/SEO settings
 * and the active platform service catalogue. No credentials, no drafts.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('GET');

if (!ds_cms_ready()) {
    ds_cms_migrate();
}

ds_success([
    'settings' => ds_cms_public_settings(),
    'pages' => ds_cms_published_pages(),
    'faqs' => ds_cms_active_faqs(),
    'services' => ds_public_services(true),
]);
