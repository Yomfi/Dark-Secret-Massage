/**
 * Official Massager Studio company social accounts.
 *
 * Single source of truth for the footer and any future React placement.
 * Keep index.html Organization `sameAs` in sync with these hrefs.
 * Company accounts only — individual providers manage their own links.
 */
export type SocialPlatform = 'x' | 'instagram' | 'facebook' | 'tiktok';

export interface SocialLink {
  platform: SocialPlatform;
  /** Short platform name used in accessible labels and tooltips. */
  label: string;
  href: string;
}

export const COMPANY_SOCIAL_LINKS: readonly SocialLink[] = [
  {
    platform: 'x',
    label: 'X',
    href: 'https://x.com/massagerstudio',
  },
  {
    platform: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/massagerstudio/',
  },
  {
    platform: 'facebook',
    label: 'Facebook',
    // Facebook share link supplied by the company; kept exactly as provided.
    href: 'https://www.facebook.com/share/19TUD3nKKB/?mibextid=wwXIfr',
  },
  {
    platform: 'tiktok',
    label: 'TikTok',
    href: 'https://www.tiktok.com/@massager_studio',
  },
];

/** URLs only — for schema.org `sameAs` and other non-React consumers. */
export const COMPANY_SOCIAL_URLS: readonly string[] = COMPANY_SOCIAL_LINKS.map(
  (link) => link.href,
);
