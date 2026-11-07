import { BrandLogo } from './BrandLogo';
import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { SocialLinks } from './SocialLinks';
import { partnershipMailto, publicContactMailto } from '../lib/companyEmails';
import { Container } from './ui/Layout';
import { useSite } from './PublicSite';

interface FooterProps {
  onOpenBooking?: () => void;
  onOpenDashboard?: () => void;
}

const linkClass =
  'inline-flex min-h-11 items-center text-[13.5px] text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80 rounded';

const columnTitle = 'mb-3 text-[12px] font-semibold text-zinc-300';

export const Footer: React.FC<FooterProps> = ({ onOpenBooking, onOpenDashboard }) => {
  const goBooking = onOpenBooking || (() => {});
  const goDashboard = onOpenDashboard || (() => {});
  const { settings, pages } = useSite();

  const contactEmail = (settings.contact_email || '').trim();
  const contactPhone = (settings.contact_phone || '').trim();
  const contactAddress = (settings.contact_address || '').trim();

  return (
    <footer className="border-t border-white/[0.08] bg-brand-surface text-zinc-400">
      <Container className="py-12 sm:py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <BrandLogo variant="plate" withWordmark markHeight={30} />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-zinc-400">
              {settings.site_tagline ||
                'A private platform for trusted professional massage and wellness services across Ghana.'}
            </p>
            <div className="mt-4 space-y-2 text-[13px] text-zinc-500">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple-light" aria-hidden />
                <span>{contactAddress || 'Accra · Tema · Kumasi & across Ghana'}</span>
              </p>
              {contactPhone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-brand-purple-light" aria-hidden />
                  <a href={`tel:${contactPhone.replace(/\s+/g, '')}`} className="hover:text-white">
                    {contactPhone}
                  </a>
                </p>
              )}
              {contactEmail && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-brand-purple-light" aria-hidden />
                  <a href={`mailto:${contactEmail}`} className="hover:text-white">
                    {contactEmail}
                  </a>
                </p>
              )}
            </div>
            <SocialLinks
              className="mt-6"
              urls={{
                facebook: settings.social_facebook,
                instagram: settings.social_instagram,
                x: settings.social_x,
                tiktok: settings.social_tiktok,
              }}
            />
          </div>

          <nav className="md:col-span-3" aria-label="Discover">
            <p className={columnTitle}>Discover</p>
            <ul className="space-y-2.5">
              <li>
                <Link to="/explore/accra" className={linkClass}>
                  Explore by city
                </Link>
              </li>
              <li>
                <Link to="/massage" className={linkClass}>
                  Massage services
                </Link>
              </li>
              <li>
                <button type="button" onClick={goBooking} className={`${linkClass} text-left`}>
                  Book A Massage
                </button>
              </li>
              <li>
                <Link to="/provider/register" className={linkClass}>
                  Become a provider
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="md:col-span-3" aria-label="Massage wellness">
            <p className={columnTitle}>Massage wellness</p>
            <ul className="space-y-2.5">
              <li>
                <Link to="/massage" className={linkClass}>
                  All massage services
                </Link>
              </li>
              <li>
                <Link to="/massage" className={linkClass}>
                  Studio &amp; home visits
                </Link>
              </li>
              <li>
                <Link to="/massage" className={linkClass}>
                  Hygiene &amp; clinical ethics
                </Link>
              </li>
              <li>
                <Link to="/provider/dashboard" className={linkClass}>
                  Provider profile
                </Link>
              </li>
              {pages.slice(0, 3).map((page) => (
                <li key={page.slug}>
                  <Link to={`/p/${page.slug}`} className={linkClass}>
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="md:col-span-2" aria-label="Account">
            <p className={columnTitle}>Account</p>
            <ul className="space-y-2.5">
              <li>
                <button type="button" onClick={goDashboard} className={`${linkClass} text-left`}>
                  Member portal
                </button>
              </li>
              <li>
                <Link to="/login" className={linkClass}>
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/register" className={linkClass}>
                  Register
                </Link>
              </li>
              <li>
                <a href={contactEmail ? `mailto:${contactEmail}` : publicContactMailto()} className={linkClass}>
                  Contact
                </a>
              </li>
              <li>
                <a href={partnershipMailto()} className={linkClass}>
                  Partnerships
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-[12.5px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Massager Studio. All rights reserved.</p>
          <p className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span>Encrypted connection</span>
            <span>Verified profiles</span>
            <span>Ghana</span>
          </p>
        </div>
      </Container>
    </footer>
  );
};
