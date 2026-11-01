<?php
declare(strict_types=1);

/**
 * CLI-only SMTP acceptance check for Massager Studio.
 *
 * Sends one clearly labelled test message to info@massagerstudio.com using the
 * same PHPMailer path as production. Never prints credentials, tokens or the
 * mailbox password. Distinguishes SMTP acceptance from inbox receipt.
 *
 * Usage (on a host with native PHP + stream_select, typically the Hostinger
 * server — not the local WASM php-cli):
 *
 *   php public/api/tools/send-smtp-test.php
 *
 * Or via: npm run test:smtp
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "Forbidden\n";
    exit(1);
}

require_once dirname(__DIR__) . '/config/bootstrap.php';

$info = (string) (ds_config()['info_email'] ?? 'info@massagerstudio.com');
$missing = ds_mail_missing_settings();
$settings = ds_mail_settings();

fwrite(STDOUT, "Massager Studio SMTP acceptance check\n");
fwrite(STDOUT, 'Transport: ' . $settings['transport'] . "\n");
fwrite(STDOUT, 'Configured: ' . (ds_mail_configured() ? 'yes' : 'no') . "\n");

if ($settings['transport'] !== 'smtp') {
    fwrite(STDERR, "Refusing: mail_transport must be smtp for this check.\n");
    exit(2);
}

if ($missing !== []) {
    fwrite(STDERR, "SMTP is not configured. Enter these keys privately in\n");
    fwrite(STDERR, "public/api/config/config.local.php (or DS_* env vars):\n");
    foreach ($missing as $key) {
        fwrite(STDERR, '  - ' . $key . "\n");
    }
    fwrite(STDERR, "Also set mail_from_name=Massager Studio and mail_reply_to=contact@massagerstudio.com.\n");
    fwrite(STDERR, "Do not paste the mailbox password into chat.\n");
    exit(3);
}

$stamp = gmdate('c');
$subject = '[Massager Studio TEST] SMTP acceptance ' . $stamp;
$html = '<p>This is a labelled SMTP acceptance test from the Massager Studio PHP API.</p>'
    . '<p>Timestamp (UTC): <code>' . htmlspecialchars($stamp, ENT_QUOTES, 'UTF-8') . '</code></p>'
    . '<p>SMTP acceptance of this message is not the same as confirmed inbox delivery — '
    . 'check the info@ inbox (and junk) separately.</p>';
$text = "This is a labelled SMTP acceptance test from the Massager Studio PHP API.\n\n"
    . "Timestamp (UTC): {$stamp}\n\n"
    . "SMTP acceptance of this message is not the same as confirmed inbox delivery — "
    . "check the info@ inbox (and junk) separately.\n";

$result = ds_send_mail(
    $info,
    'Massager Studio Operations',
    ['subject' => $subject, 'html' => $html, 'text' => $text],
    ['template' => 'smtp_acceptance_test']
);

if ($result['sent']) {
    fwrite(STDOUT, "SMTP accepted the message for " . ds_mask_email($info) . ".\n");
    fwrite(STDOUT, "This confirms SMTP acceptance only — not confirmed inbox receipt.\n");
    fwrite(STDOUT, "Check the info@ mailbox (and junk folder) to confirm delivery.\n");
    exit(0);
}

fwrite(STDERR, 'SMTP did not accept the message (' . $result['code'] . ").\n");
fwrite(STDERR, "See api/storage/private/logs/mail.log for a masked diagnostic entry.\n");
exit(4);
