<?php
declare(strict_types=1);

/**
 * Branded transactional email templates, each with a plain-text alternative.
 * Rendering is pure string work; delivery happens in config/mailer.php.
 */

function ds_mail_e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Shared layout: light, single-column, inline styles for client compatibility.
 */
function ds_mail_layout(string $preheader, string $heading, string $bodyHtml, string $footerHtml = ''): string
{
    $brand = ds_mail_e('MASSAGER STUDIO');
    $footer = $footerHtml !== '' ? $footerHtml : ds_mail_default_footer();

    return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<title>' . ds_mail_e($heading) . '</title></head>'
        . '<body style="margin:0;padding:0;background:#f4f3f7;">'
        . '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' . ds_mail_e($preheader) . '</div>'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        . 'style="background:#f4f3f7;padding:28px 12px;">'
        . '<tr><td align="center">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        . 'style="max-width:560px;background:#ffffff;border:1px solid #e5e3ec;border-radius:14px;'
        . 'font-family:\'Plus Jakarta Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;'
        . 'color:#1c1a22;">'
        . '<tr><td style="padding:24px 28px 8px 28px;">'
        . '<span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.22em;'
        . 'text-transform:uppercase;color:#1c1a22;">' . $brand . '</span>'
        . '</td></tr>'
        . '<tr><td style="padding:8px 28px 0 28px;">'
        . '<h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:700;color:#141218;">'
        . ds_mail_e($heading) . '</h1>'
        . '</td></tr>'
        . '<tr><td style="padding:0 28px 8px 28px;font-size:15px;line-height:1.6;color:#3c3946;">'
        . $bodyHtml
        . '</td></tr>'
        . '<tr><td style="padding:12px 28px 28px 28px;">' . $footer . '</td></tr>'
        . '</table>'
        . '</td></tr></table></body></html>';
}

function ds_mail_button(string $href, string $label): string
{
    $safeHref = ds_mail_e($href);
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 8px 0;">'
        . '<tr><td style="background:#B08B4B;border-radius:999px;">'
        . '<a href="' . $safeHref . '" style="display:inline-block;padding:13px 26px;font-size:14px;'
        . 'font-weight:600;color:#161616;text-decoration:none;border-radius:999px;">'
        . ds_mail_e($label) . '</a>'
        . '</td></tr></table>';
}

function ds_mail_link_fallback(string $href): string
{
    return '<p style="margin:14px 0 0 0;font-size:13px;line-height:1.6;color:#6b6778;">'
        . 'If the button does not work, paste this link into your browser:<br>'
        . '<a href="' . ds_mail_e($href) . '" style="color:#8F6D35;word-break:break-all;">'
        . ds_mail_e($href) . '</a></p>';
}

function ds_mail_default_footer(): string
{
    $site = ds_mail_e(ds_app_url());
    $contact = ds_mail_e((string) (ds_config()['contact_email'] ?? 'contact@massagerstudio.com'));
    return '<hr style="border:0;border-top:1px solid #eceaf2;margin:8px 0 16px 0;">'
        . '<p style="margin:0;font-size:12px;line-height:1.6;color:#6b6778;">'
        . 'Massager Studio · <a href="' . $site . '" style="color:#8F6D35;text-decoration:none;">'
        . $site . '</a><br>'
        . 'Questions? Reply to this email or write to <a href="mailto:' . $contact
        . '" style="color:#8F6D35;text-decoration:none;">' . $contact . '</a>.'
        . '</p>';
}

function ds_mail_greeting(string $firstName): string
{
    $name = trim($firstName);
    return $name !== '' ? 'Hi ' . ds_mail_e($name) . ',' : 'Hello,';
}

/**
 * @param array<string, mixed> $vars
 * @return array{subject: string, html: string, text: string}|null
 */
function ds_mail_template(string $template, array $vars): ?array
{
    $firstName = (string) ($vars['first_name'] ?? '');

    if ($template === 'password_reset') {
        $link = (string) ($vars['link'] ?? '');
        $minutes = (int) ($vars['expires_minutes'] ?? 60);
        $hours = max(1, (int) round($minutes / 60));

        $html = '<p style="margin:0 0 12px 0;">' . ds_mail_greeting($firstName) . '</p>'
            . '<p style="margin:0 0 8px 0;">We received a request to reset the password for your '
            . 'Massager Studio account.</p>'
            . ds_mail_button($link, 'Choose a new password')
            . ds_mail_link_fallback($link)
            . '<p style="margin:18px 0 0 0;font-size:13px;color:#6b6778;">This link expires in '
            . $hours . ' hour' . ($hours === 1 ? '' : 's') . '. If you did not request a password reset, '
            . 'you can ignore this email — your password stays unchanged.</p>';

        $text = "Hi " . ($firstName !== '' ? $firstName : 'there') . ",\n\n"
            . "We received a request to reset the password for your Massager Studio account.\n\n"
            . "Choose a new password: " . $link . "\n\n"
            . "This link expires in " . $hours . " hour" . ($hours === 1 ? '' : 's') . ".\n"
            . "If you did not request a password reset, you can ignore this email.\n\n"
            . "Massager Studio\n" . ds_app_url() . "\n";

        return [
            'subject' => 'Reset your Massager Studio password',
            'html' => ds_mail_layout(
                'Reset your Massager Studio password — link expires in ' . $hours . ' hour' . ($hours === 1 ? '' : 's') . '.',
                'Reset your password',
                $html
            ),
            'text' => $text,
        ];
    }

    if ($template === 'verify_account') {
        $link = (string) ($vars['link'] ?? '');
        $hours = (int) ($vars['expires_hours'] ?? 24);

        $html = '<p style="margin:0 0 12px 0;">' . ds_mail_greeting($firstName) . '</p>'
            . '<p style="margin:0 0 8px 0;">Please confirm this email address so we can finish setting up '
            . 'your Massager Studio account.</p>'
            . ds_mail_button($link, 'Confirm email address')
            . ds_mail_link_fallback($link)
            . '<p style="margin:18px 0 0 0;font-size:13px;color:#6b6778;">This link expires in '
            . $hours . ' hours. If you did not create a Massager Studio account, you can ignore this email.</p>';

        $text = "Hi " . ($firstName !== '' ? $firstName : 'there') . ",\n\n"
            . "Please confirm this email address so we can finish setting up your Massager Studio account.\n\n"
            . "Confirm email address: " . $link . "\n\n"
            . "This link expires in " . $hours . " hours.\n"
            . "If you did not create an account, you can ignore this email.\n\n"
            . "Massager Studio\n" . ds_app_url() . "\n";

        return [
            'subject' => 'Confirm your Massager Studio email address',
            'html' => ds_mail_layout(
                'Confirm your email to finish setting up your Massager Studio account.',
                'Confirm your email address',
                $html
            ),
            'text' => $text,
        ];
    }

    if ($template === 'provider_review_notice') {
        $providerName = (string) ($vars['provider_name'] ?? 'Provider');
        $providerType = (string) ($vars['provider_type'] ?? 'individual');
        $city = (string) ($vars['city'] ?? '');
        $providerEmail = (string) ($vars['provider_email'] ?? '');
        $providerId = (string) ($vars['provider_id'] ?? '');
        $submittedAt = (string) ($vars['submitted_at'] ?? '');
        $reviewLink = (string) ($vars['review_link'] ?? '');
        $membership = (string) ($vars['membership'] ?? '');

        $rows = [
            'Provider' => $providerName,
            'Type' => $providerType === 'agency' ? 'Agency' : 'Individual',
            'City' => $city !== '' ? $city : '—',
            'Account email' => $providerEmail,
            'Account id' => $providerId,
            'Membership' => $membership !== '' ? $membership : '—',
            'Submitted' => $submittedAt !== '' ? $submittedAt : '—',
        ];

        $table = '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
            . 'style="width:100%;font-size:14px;color:#3c3946;margin:6px 0 0 0;">';
        foreach ($rows as $label => $value) {
            $table .= '<tr>'
                . '<td style="padding:6px 12px 6px 0;color:#6b6778;white-space:nowrap;">' . ds_mail_e($label) . '</td>'
                . '<td style="padding:6px 0;color:#141218;">' . ds_mail_e($value) . '</td>'
                . '</tr>';
        }
        $table .= '</table>';

        $html = '<p style="margin:0 0 12px 0;">A provider submitted their verification for admin review.</p>'
            . $table
            . ds_mail_button($reviewLink, 'Open admin review')
            . '<p style="margin:14px 0 0 0;font-size:13px;color:#6b6778;">This is an automated operations '
            . 'notification from the Massager Studio API.</p>';

        $text = "A provider submitted their verification for admin review.\n\n";
        foreach ($rows as $label => $value) {
            $text .= $label . ': ' . $value . "\n";
        }
        $text .= "\nOpen admin review: " . $reviewLink . "\n\n"
            . "Automated operations notification from the Massager Studio API.\n";

        return [
            'subject' => '[Massager Studio] Provider submitted for review',
            'html' => ds_mail_layout(
                'A provider submitted verification details for admin review.',
                'Provider submitted for review',
                $html
            ),
            'text' => $text,
        ];
    }

    if ($template === 'staff_invite') {
        $link = (string) ($vars['link'] ?? '');
        $roleLabel = (string) ($vars['role_label'] ?? 'staff');
        $hours = (int) ($vars['expires_hours'] ?? 72);

        $html = '<p style="margin:0 0 12px 0;">' . ds_mail_greeting($firstName) . '</p>'
            . '<p style="margin:0 0 8px 0;">You have been invited to join the Massager Studio operations team'
            . ' as <strong>' . ds_mail_e($roleLabel) . '</strong>.</p>'
            . '<p style="margin:0 0 8px 0;">Use the button below to set your password and open the staff workspace.</p>'
            . ds_mail_button($link, 'Accept invitation')
            . ds_mail_link_fallback($link)
            . '<p style="margin:18px 0 0 0;font-size:13px;color:#6b6778;">This invitation expires in '
            . $hours . ' hours. If you were not expecting this email, you can ignore it.</p>';

        $text = "Hi " . ($firstName !== '' ? $firstName : 'there') . ",\n\n"
            . "You have been invited to join the Massager Studio operations team as " . $roleLabel . ".\n\n"
            . "Accept invitation: " . $link . "\n\n"
            . "This invitation expires in " . $hours . " hours.\n\n"
            . "Massager Studio\n" . ds_app_url() . "\n";

        return [
            'subject' => 'You are invited to Massager Studio staff',
            'html' => ds_mail_layout(
                'Set your password and join the Massager Studio operations team.',
                'Staff invitation',
                $html
            ),
            'text' => $text,
        ];
    }

    return null;
}
