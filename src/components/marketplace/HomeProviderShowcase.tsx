import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  MapPin,
  MessageCircle,
  RefreshCw,
  Sparkles,
  UserRound,
} from 'lucide-react';
import {
  fetchMarketplaceProfiles,
  type MarketplaceProfile,
} from '../../data/marketplaceProfiles';
import { whatsappEnquiryUrl } from '../../lib/marketplace';
import { Container } from '../ui/Layout';
import { buttonClass } from '../ui/Button';
import { VerifiedBadge } from './VerifiedBadge';

const HOMEPAGE_LIMIT = 12;

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'MS'
  );
}

function providerPriority(profile: MarketplaceProfile): number {
  if (profile.verified && profile.bookable) return 0;
  if (profile.verified) return 1;
  return 2;
}

/** Verified/bookable first, then other Verified, then Unverified. API order is kept inside each group. */
function sortHomepageProviders(profiles: MarketplaceProfile[]): MarketplaceProfile[] {
  return profiles
    .map((profile, index) => ({ profile, index }))
    .sort(
      (a, b) =>
        providerPriority(a.profile) - providerPriority(b.profile) || a.index - b.index,
    )
    .map((entry) => entry.profile)
    .slice(0, HOMEPAGE_LIMIT);
}

function ProviderCard({
  profile,
  priority,
}: {
  profile: MarketplaceProfile;
  priority: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const isAgency = profile.providerKind === 'agency';
  const image = profile.primaryImage || profile.gallery[0];
  const showImage = Boolean(image) && !imageFailed;
  const location = [profile.city, profile.region].filter(Boolean).join(', ') || profile.country;
  const canWhatsApp = profile.publicContactEnabled && Boolean(profile.whatsapp);
  const profileHref = `/profile/${profile.slug}?from=${profile.citySlug}`;

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.055] to-white/[0.025] transition duration-300 hover:-translate-y-0.5 hover:border-brand-purple/40 hover:shadow-[0_18px_50px_-24px_rgba(147,51,234,0.55)]">
      <Link
        to={profileHref}
        aria-label={`View ${profile.displayName}`}
        className="relative block aspect-[4/3] overflow-hidden bg-[#0a090e]"
      >
        {showImage ? (
          <img
            src={image}
            alt={`${profile.displayName}${isAgency ? ' logo' : ' profile photo'}`}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setImageFailed(true)}
            className={`h-full w-full transition-transform duration-700 group-hover:scale-[1.03] ${
              isAgency ? 'object-contain p-7' : 'object-cover object-center'
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgba(147,51,234,0.26),rgba(10,9,14,0.96)_68%)]">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-purple/30 bg-black/30 text-xl font-semibold tracking-wide text-brand-lavender">
              {initials(profile.displayName)}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

        <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">
          {isAgency ? (
            <Building2 className="h-3 w-3 text-brand-purple-light" aria-hidden />
          ) : (
            <UserRound className="h-3 w-3 text-brand-purple-light" aria-hidden />
          )}
          {isAgency ? 'Agency' : 'Individual'}
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 break-words text-[17px] font-semibold leading-snug tracking-[-0.01em] text-white">
              {profile.displayName}
            </h3>
            <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-relaxed text-zinc-400">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-purple-light" aria-hidden />
              <span className="min-w-0 break-words">{location}</span>
            </p>
          </div>
          <VerifiedBadge verified={profile.verified} className="shrink-0 pt-1" />
        </div>

        {profile.services.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {profile.services.slice(0, 3).map((service, index) => (
              <span
                key={`${service}-${index}`}
                className="max-w-full truncate rounded-full border border-brand-purple/20 bg-brand-purple/[0.08] px-2.5 py-1 text-[11px] text-brand-lavender/90"
              >
                {service}
              </span>
            ))}
          </div>
        ) : null}

        <div
          className={`mt-auto grid gap-2 pt-5 ${
            canWhatsApp ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          <Link
            to={profileHref}
            className={buttonClass({
              variant: 'secondary',
              size: 'sm',
              className: 'w-full',
            })}
          >
            View Profile
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          {canWhatsApp ? (
            <a
              href={whatsappEnquiryUrl(profile.whatsapp!)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Chat on WhatsApp with ${profile.displayName}`}
              title="Chat on WhatsApp"
              className={buttonClass({
                variant: 'ghost',
                size: 'sm',
                className:
                  'w-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/45 hover:bg-emerald-500/15 hover:text-emerald-100',
              })}
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export const HomeProviderShowcase: React.FC = () => {
  const [profiles, setProfiles] = useState<MarketplaceProfile[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setProfiles(null);
    setFailed(false);

    fetchMarketplaceProfiles()
      .then((providers) => {
        if (cancelled) return;
        setProfiles(sortHomepageProviders(providers.filter((profile) => profile.slug)));
      })
      .catch(() => {
        if (cancelled) return;
        setProfiles([]);
        setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const loading = profiles === null;
  const hasProviders = !failed && (profiles?.length ?? 0) > 0;

  return (
    <section
      id="massage-professionals"
      aria-labelledby="home-providers-heading"
      className="relative overflow-hidden border-t border-white/[0.06] py-14 sm:py-16 lg:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-brand-purple/10 blur-[110px]"
      />
      <Container className="relative">
        <div className="max-w-2xl">
          <h2
            id="home-providers-heading"
            className="text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-white text-balance sm:text-3xl lg:text-[2.75rem]"
          >
            Explore Massage Professionals
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-400 sm:text-base">
            Discover massage professionals and agencies across Ghana.
          </p>
        </div>

        <div className="mt-8 sm:mt-10">
          {loading ? (
            <div
              className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3"
              role="status"
              aria-live="polite"
            >
              <span className="sr-only">Loading massage professionals</span>
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  aria-hidden
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                >
                  <div className="aspect-[4/3] animate-pulse bg-white/[0.04]" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-white/[0.05]" />
                    <div className="h-10 w-full animate-pulse rounded-xl bg-white/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          ) : failed ? (
            <div
              role="status"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center"
            >
              <RefreshCw className="mx-auto h-6 w-6 text-brand-purple-light" aria-hidden />
              <p className="mt-3 text-[15px] font-semibold text-white">
                Provider listings are temporarily unavailable.
              </p>
              <p className="mt-1.5 text-[13.5px] text-zinc-400">
                Please try again in a moment.
              </p>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className={buttonClass({ variant: 'secondary', size: 'sm', className: 'mt-5' })}
              >
                Try again
              </button>
            </div>
          ) : profiles.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-brand-purple-light" aria-hidden />
              <p className="mt-3 text-[15px] font-semibold text-white">
                No published massage professionals yet.
              </p>
              <p className="mx-auto mt-1.5 max-w-md text-[13.5px] leading-relaxed text-zinc-400">
                New Individual and Agency profiles will appear here once they are published.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                {profiles.map((profile, index) => (
                  <ProviderCard key={profile.id || profile.slug} profile={profile} priority={index < 3} />
                ))}
              </div>

              {hasProviders ? (
                <div className="mt-9 flex justify-center">
                  <Link
                    to="/explore/all"
                    className={buttonClass({
                      variant: 'secondary',
                      size: 'md',
                      className: 'group/view-all',
                    })}
                  >
                    View All Massage Professionals
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover/view-all:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>
      </Container>
    </section>
  );
};
