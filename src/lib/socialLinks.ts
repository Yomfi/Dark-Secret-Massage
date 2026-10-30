/**
 * Official Massager Studio company social accounts.
 *
 * Single source of truth for the footer and any future placement. These are
 * company accounts only — individual providers manage their own links.
 */
export type SocialPlatform = 'x' | 'instagram' | 'facebook' | 'tiktok';

export interface SocialLink {
  platform: SocialPlatform;
  /** Accessible name announced to screen readers. */
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
