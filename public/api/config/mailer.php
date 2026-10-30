<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

/**
 * SMTP delivery for transactional mail.
 *
 * PHPMailer is vendored under public/api/vendor/phpmailer (LGPL-2.1) because the
 * Hostinger deploy has no Composer step. Everything credentials-related is read
 * from server-only configuration (DS_* env vars or config.local.php); nothing
 * here is exposed to the browser.
 */

require_once __DIR__ . '/../vendor/phpmailer/src/Exception.php';
require_once __DIR__ . '/../vendor/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/../vendor/phpmailer/src/SMTP.php';

/** Absolute app URL from trusted configuration, without a trailing slash. */
function ds_app_url(): string
{
    $url = trim((string) (ds_config()['app_url'] ?? ''));
    if ($url === '' || !preg_match('#^https?://[^\s]+$#i', $url)) {
        return 'https://massagerstudio.com';
    }
    return rtrim($url, '/');
}

/**
 * Build an application link. Paths are always relative so the host can only
 * come from configuration — never from request input.
 *
 * @param array<string, string> $query
 */
function ds_app_link(string $path, array $query = []): string
{
    $path = '/' . ltrim($path, '/');
    $url = ds_app_url() . $path;
    if ($query) {
        $url .= '?' . http_build_query($query);
    }
    return $url;
}

/** @return array<string, mixed> */
function ds_mail_settings(): array
{
    $cfg = ds_config();
    return [
        'transport' => strtolower(trim((string) ($cfg['mail_transport'] ?? 'smtp'))),
        'host' => trim((string) ($cfg['smtp_host'] ?? '')),
        'port' => (int) ($cfg['smtp_port'] ?? 465),
        'secure' => strtolower(trim((string) ($cfg['smtp_secure'] ?? 'ssl'))),
        'user' => trim((string) ($cfg['smtp_user'] ?? '')),
        'pass' => (string) ($cfg['smtp_pass'] ?? ''),
        'timeout' => max(5, (int) ($cfg['smtp_timeout'] ?? 15)),
        'from' => trim((string) ($cfg['mail_from'] ?? '')),
        'from_name' => trim((string) ($cfg['mail_from_name'] ?? 'Massager Studio')),
        'reply_to' => trim((string) ($cfg['mail_reply_to'] ?? '')),
        'debug' => (int) ($cfg['mail_debug'] ?? 0),
    ];
}

/**
 * Configuration keys that still need values. Names only — never values.
 *
 * @return list<string>
 */
function ds_mail_missing_settings(): array
{
    $s = ds_mail_settings();
    $missing = [];
    if ($s['host'] === '') {
        $missing[] = 'smtp_host';
    }
    if ($s['port'] <= 0) {
        $missing[] = 'smtp_port';
    }
    if ($s['user'] === '') {
        $missing[] = 'smtp_user';
    }
    if ($s['pass'] === '') {
        $missing[] = 'smtp_pass';
    }
    if (!filter_var($s['from'], FILTER_VALIDATE_EMAIL)) {
        $missing[] = 'mail_from';
    }
    return $missing;
}

function ds_mail_configured(): bool
{
    if (ds_mail_settings()['transport'] === 'file') {
        // Local outbox is a development aid only; production must use SMTP.
        return !ds_is_prod();
    }
    return ds_mail_missing_settings() === [];
}

function ds_mail_outbox_dir(): string
{
    $dir = dirname(__DIR__) . '/storage/private/outbox';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

/**
 * Development-only transport: write the rendered message to the private outbox
 * instead of talking to a mail server. Refused when app_env is production.
 *
 * @param array{subject: string, html: string, text: string} $message
 * @param array<string, mixed> $logBase
 * @return array{sent: bool, code: string, error: string}
 */
function ds_mail_write_outbox(string $toEmail, string $toName, array $message, array $logBase): array
{
    $dir = ds_mail_outbox_dir();
    if (!is_dir($dir) || !is_writable($dir)) {
        ds_mail_log('failed', $logBase + ['reason' => 'outbox_unwritable']);
        return ['sent' => false, 'code' => 'smtp_error', 'error' => 'The local outbox is not writable.'];
    }

    $settings = ds_mail_settings();
    $headers = [
        'Date: ' . date(DATE_RFC2822),
        'From: ' . $settings['from_name'] . ' <' . $settings['from'] . '>',
        'To: ' . ($toName !== '' ? $toName . ' <' . $toEmail . '>' : $toEmail),
        'Reply-To: ' . $settings['reply_to'],
        'Subject: ' . $message['subject'],
        'Message-ID: <' . bin2hex(random_bytes(8)) . '@massagerstudio.com>',
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'X-Massager-Studio-Transport: local-outbox',
    ];

    $file = $dir . '/' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.eml';
    $written = @file_put_contents(
        $file,
        implode("\r\n", $headers) . "\r\n\r\n" . $message['html'],
        LOCK_EX
    );

    if ($written === false) {
        ds_mail_log('failed', $logBase + ['reason' => 'outbox_write_failed']);
        return ['sent' => false, 'code' => 'smtp_error', 'error' => 'The local outbox could not be written.'];
    }

    @chmod($file, 0600);
    ds_mail_log('sent', $logBase + ['transport' => 'file', 'subject' => $message['subject']]);
    return ['sent' => true, 'code' => 'sent', 'error' => ''];
}

/** Mask an address for diagnostics: keep the domain, hide the local part. */
function ds_mask_email(string $email): string
{
    $at = strrpos($email, '@');
    if ($at === false || $at === 0) {
        return '***';
    }
    return substr($email, 0, 1) . '***' . substr($email, $at);
}

/**
 * Append a JSON line to storage/private/logs/mail.log.
 * Callers must never pass message bodies, tokens or passwords.
 *
 * @param array<string, mixed> $context
 */
function ds_mail_log(string $event, array $context = []): void
{
    $entry = ['ts' => gmdate('c'), 'event' => $event] + $context;

    $dir = dirname(__DIR__) . '/storage/private/logs';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return;
    }

    $line = json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($line === false) {
        return;
    }

    $file = $dir . '/mail.log';
    $created = !is_file($file);
    @file_put_contents($file, $line . "\n", FILE_APPEND | LOCK_EX);
    if ($created) {
        @chmod($file, 0600);
    }
}

/**
 * Send one message over authenticated SMTP.
 *
 * @param array{subject: string, html: string, text: string} $message
 * @return array{sent: bool, code: string, error: string}
 */
function ds_send_mail(string $toEmail, string $toName, array $message, array $context = []): array
{
    $toEmail = trim($toEmail);
    $logBase = $context + [
        'to' => ds_mask_email($toEmail),
        'template' => (string) ($context['template'] ?? ''),
    ];

    if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
        ds_mail_log('skipped', $logBase + ['reason' => 'invalid_recipient']);
        return ['sent' => false, 'code' => 'invalid_recipient', 'error' => 'Invalid recipient address.'];
    }

    $settings = ds_mail_settings();

    if ($settings['transport'] === 'file') {
        if (ds_is_prod()) {
            ds_mail_log('refused', $logBase + ['reason' => 'file_transport_in_production']);
            return [
                'sent' => false,
                'code' => 'not_configured',
                'error' => 'Email delivery is not configured.',
            ];
        }
        return ds_mail_write_outbox($toEmail, $toName, $message, $logBase);
    }

    $missing = ds_mail_missing_settings();
    if ($missing !== []) {
        ds_mail_log('skipped', $logBase + ['reason' => 'not_configured', 'missing' => $missing]);
        return [
            'sent' => false,
            'code' => 'not_configured',
            'error' => 'Email delivery is not configured.',
        ];
    }

    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $settings['host'];
        $mail->Port = $settings['port'];
        $mail->SMTPAuth = true;
        $mail->Username = $settings['user'];
        $mail->Password = $settings['pass'];
        $mail->Timeout = $settings['timeout'];

        if ($settings['secure'] === 'ssl') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } elseif ($settings['secure'] === 'tls') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        } else {
            // Plaintext is only for local testing against a loopback sink.
            $mail->SMTPSecure = '';
            $mail->SMTPAutoTLS = false;
        }

        // Certificate verification stays on; never allow a self-signed host.
        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
                'allow_self_signed' => false,
            ],
        ];

        $mail->CharSet = 'UTF-8';
        $mail->setFrom($settings['from'], $settings['from_name']);
        if (filter_var($settings['reply_to'], FILTER_VALIDATE_EMAIL)) {
            $mail->addReplyTo($settings['reply_to'], $settings['from_name']);
        }
        $mail->addAddress($toEmail, $toName);

        $mail->isHTML(true);
        $mail->Subject = $message['subject'];
        $mail->Body = $message['html'];
        $mail->AltBody = $message['text'];

        if ($settings['debug'] > 0) {
            // SMTP transcripts go to the private log, never to the HTTP response.
            $mail->SMTPDebug = $settings['debug'];
            $mail->Debugoutput = static function (string $line, int $level) use ($logBase): void {
                ds_mail_log('smtp_debug', $logBase + ['level' => $level, 'line' => trim($line)]);
            };
        }

        $mail->send();

        ds_mail_log('sent', $logBase + ['subject' => $message['subject']]);
        return ['sent' => true, 'code' => 'sent', 'error' => ''];
    } catch (MailException $e) {
        $detail = trim((string) ($mail->ErrorInfo ?? $e->getMessage()));
        ds_mail_log('failed', $logBase + [
            'reason' => 'smtp_error',
            'error' => $detail !== '' ? $detail : 'SMTP error',
        ]);
        return ['sent' => false, 'code' => 'smtp_error', 'error' => 'The mail server did not accept the message.'];
    } catch (Throwable $e) {
        ds_mail_log('failed', $logBase + [
            'reason' => 'exception',
            'error' => get_class($e) . ': ' . $e->getMessage(),
        ]);
        return ['sent' => false, 'code' => 'smtp_error', 'error' => 'The message could not be sent.'];
    }
}

/**
 * Render a named template and deliver it.
 *
 * @param array<string, mixed> $vars
 * @return array{sent: bool, code: string, error: string}
 */
function ds_send_template(string $template, string $toEmail, string $toName, array $vars, array $context = []): array
{
    $built = ds_mail_template($template, $vars);
    if ($built === null) {
        ds_mail_log('skipped', [
            'to' => ds_mask_email($toEmail),
            'template' => $template,
            'reason' => 'unknown_template',
        ]);
        return ['sent' => false, 'code' => 'unknown_template', 'error' => 'Unknown mail template.'];
    }

    return ds_send_mail($toEmail, $toName, $built, ['template' => $template] + $context);
}
