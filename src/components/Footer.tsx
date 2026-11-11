import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import { SocialLinks } from './SocialLinks';
import { publicContactMailto } from '../lib/companyEmails';
import { Container } from './ui/Layout';
import { useSite } from './PublicSite';

const linkClass =
  'inline-flex min-h-8 items-center text-[14px] leading-5 text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface rounded';

const columnTitle = 'mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500';

export const Footer: React.FC = () => {
  const { settings, pages } = useSite();
  const contactEmail = (settings.contact_email || '').trim();
  const helpPage = pages.find((page) =>
    ['help-safety', 'help-and-safety', 'safety'].includes(page.slug),
  );

  return (
    <footer className="border-t border-white/[0.08] bg-brand-surface text-zinc-400">
      <Container className="py-10 sm:py-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-12 md:gap-6">
          <div className="col-span-2 md:col-span-4">
            <Link
              to="/"
              className="inline-flex min-h-11 items-center rounded-lg"
              aria-label="Massager Studio home"
            >
              <BrandLogo variant="plate" withWordmark markHeight={28} />
            </Link>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-zinc-400">
              {settings.site_tagline ||
                'A private platform for trusted professional massage and wellness services across Ghana.'}
            </p>
            <SocialLinks
              className="mt-4"
              urls={{
                facebook: settings.social_facebook,
                instagram: settings.social_instagram,
                x: settings.social_x,
                tiktok: settings.social_tiktok,
              }}
            />
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4 md:col-span-8">
            <nav aria-label="Discover">
              <p className={columnTitle}>Discover</p>
              <ul className="space-y-1">
                <li><Link to="/explore/accra" className={linkClass}>Explore providers</Link></li>
                <li><Link to="/massage" className={linkClass}>Massage services</Link></li>
                <li><Link to="/explore/accra" className={linkClass}>Find near you</Link></li>
              </ul>
            </nav>

            <nav aria-label="For providers">
              <p className={columnTitle}>For Providers</p>
              <ul className="space-y-1">
                <li><Link to="/provider/register" className={linkClass}>Become a provider</Link></li>
                <li><Link to="/explore/accra?type=individuals" className={linkClass}>Individual providers</Link></li>
                <li><Link to="/explore/accra?type=agencies" className={linkClass}>Agencies</Link></li>
              </ul>
            </nav>

            <nav aria-label="Support">
              <p className={columnTitle}>Support</p>
              <ul className="space-y-1">
                <li>
                  <a
                    href={contactEmail ? `mailto:${contactEmail}` : publicContactMailto()}
                    className={linkClass}
                  >
                    Contact us
                  </a>
                </li>
                <li><Link to="/login" className={linkClass}>Sign in</Link></li>
                {helpPage ? (
                  <li><Link to={`/p/${helpPage.slug}`} className={linkClass}>Help &amp; Safety</Link></li>
                ) : null}
              </ul>
            </nav>

            <nav aria-label="Legal">
              <p className={columnTitle}>Legal</p>
              <ul className="space-y-1">
                <li><Link to="/terms-and-conditions" className={linkClass}>Terms &amp; Conditions</Link></li>
                <li><Link to="/privacy-policy" className={linkClass}>Privacy Policy</Link></li>
                <li><Link to="/data-policy" className={linkClass}>Data Policy</Link></li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/[0.07] pt-5 text-[12px] leading-relaxed text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Massager Studio. All rights reserved.</p>
          <p>Professional massage &amp; wellness marketplace · Ghana</p>
        </div>
      </Container>
    </footer>
  );
};
