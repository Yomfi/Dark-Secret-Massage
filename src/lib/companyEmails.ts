/**
 * Company recipient mailboxes (Massager Studio).
 * Keep these separate from SMTP/sender configuration on the server.
 *
 * - info@   — system / operational notifications
 * - admin@  — official business enquiries, partnerships, collaborations
 * - contact@ — public contact / marketplace enquiry mail
 */
export const COMPANY_EMAILS = {
  info: 'info@massagerstudio.com',
  admin: 'admin@massagerstudio.com',
  contact: 'contact@massagerstudio.com',
} as const;

export function marketplaceEnquireMailto(displayName: string, city: string): string {
  const subject = encodeURIComponent(`Enquiry: ${displayName} on Massager Studio`);
  const body = encodeURIComponent(
    `Hello, I found your profile on Massager Studio and would like to enquire.\n\nProfile: ${displayName}\nCity: ${city}`,
  );
  return `mailto:${COMPANY_EMAILS.contact}?subject=${subject}&body=${body}`;
}

export function partnershipMailto(): string {
  const subject = encodeURIComponent('Partnership / collaboration enquiry — Massager Studio');
  const body = encodeURIComponent(
    'Hello Massager Studio,\n\nI would like to discuss a partnership or collaboration.\n\n',
  );
  return `mailto:${COMPANY_EMAILS.admin}?subject=${subject}&body=${body}`;
}

export function publicContactMailto(): string {
  const subject = encodeURIComponent('Contact Massager Studio');
  return `mailto:${COMPANY_EMAILS.contact}?subject=${subject}`;
}
