import React from 'react';
import { Facebook, Instagram } from 'lucide-react';
import { COMPANY_SOCIAL_LINKS, type SocialPlatform } from '../lib/socialLinks';

/**
 * X and TikTok marks are not in lucide, so they are drawn here with the
 * official glyph outline (Simple Icons, CC0) to match the other icons.
 */
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
  </svg>
);

const TikTokIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const ICONS: Record<SocialPlatform, React.FC<{ className?: string }>> = {
  x: XIcon,
  instagram: Instagram,
  facebook: Facebook,
  tiktok: TikTokIcon,
};

interface SocialLinksProps {
  className?: string;
  urls?: Partial<Record<SocialPlatform, string>>;
}

export const SocialLinks: React.FC<SocialLinksProps> = ({ className = '', urls }) => {
  const links = COMPANY_SOCIAL_LINKS.map((link) => ({
    ...link,
    href: (urls?.[link.platform] ?? '').trim() || link.href,
  }));
  return (
  <nav aria-label="Massager Studio on social media" className={className}>
    <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
      Follow us
    </p>
    <ul className="flex flex-wrap items-center gap-2 sm:gap-2.5">
      {links.map(({ platform, label, href }) => {
        const Icon = ICONS[platform];
        return (
          <li key={platform}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Massager Studio on ${label} (opens in a new tab)`}
              title={`Massager Studio on ${label}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition-colors hover:border-brand-gold/50 hover:bg-brand-gold/10 hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#050507]"
            >
              <Icon className="h-[1.05rem] w-[1.05rem]" />
            </a>
          </li>
        );
      })}
    </ul>
  </nav>
  );
};
