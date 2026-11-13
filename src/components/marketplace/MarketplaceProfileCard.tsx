import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, MessageCircle, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { isDemoProviderImage, type MarketplaceProfile } from '../../data/marketplaceProfiles';
import {
  availabilityLabel,
  formatPrice,
  genderLabel,
  providerKindLabel,
  serviceSettingLabel,
  whatsappEnquiryUrl,
} from '../../lib/marketplace';
import { PortraitMedia } from './PortraitMedia';
import { VerifiedBadge, VerifiedNameCheck } from './VerifiedBadge';
import { buttonClass } from '../ui/Button';

export type MarketplaceCardVariant = 'grid' | 'list';

type Props = {
  profile: MarketplaceProfile;
  index?: number;
  /** Grid = compact card in the responsive provider grid. List = full-width discovery row. */
  variant?: MarketplaceCardVariant;
};

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

function profileImage(profile: MarketplaceProfile): string | undefined {
  return [profile.primaryImage, ...profile.gallery].find(
    (src): src is string => Boolean(src) && !isDemoProviderImage(src),
  );
}

function locationText(profile: MarketplaceProfile): string {
  return [profile.area, profile.city, profile.region].filter(Boolean).join(', ') || profile.country;
}

function profileHref(profile: MarketplaceProfile): string {
  return `/profile/${profile.slug}?from=${profile.citySlug}`;
}

function ImageFallback({ profile }: { profile: MarketplaceProfile }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgba(147,51,234,0.22),rgba(10,9,14,0.96)_68%)]">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-purple/25 bg-black/30 text-base font-semibold tracking-wide text-brand-lavender">
        {profile.providerKind === 'agency' ? (
          <Building2 className="h-6 w-6 text-brand-purple-light" aria-hidden />
        ) : (
          initials(profile.displayName)
        )}
      </span>
    </div>
  );
}

const GridCard: React.FC<Props> = ({ profile, index = 0 }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const price = formatPrice(profile.startingPrice, profile.currency);
  const image = profileImage(profile);
  const isAgency = profile.providerKind === 'agency';
  const showImage = Boolean(image) && !imageFailed;
  const canWhatsApp = profile.publicContactEnabled && Boolean(profile.whatsapp);
  const href = profileHref(profile);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3 }}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors duration-300 hover:border-white/20"
    >
      <div className="relative shrink-0 bg-brand-ink">
        <Link to={href} aria-label={`View ${profile.displayName}`} className="block">
          {showImage ? (
            <PortraitMedia
              src={image as string}
              alt={profile.displayName}
              aspectClassName="aspect-[4/3]"
              hoverZoom
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="aspect-[4/3] w-full">
              <ImageFallback profile={profile} />
            </div>
          )}
        </Link>
        <span className="pointer-events-none absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-full border border-white/15 bg-black/70 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur-sm sm:left-3 sm:top-3 sm:gap-1.5 sm:px-2.5 sm:text-[10px]">
          {isAgency ? (
            <Building2 className="h-3 w-3 shrink-0 text-brand-purple-light" aria-hidden />
          ) : (
            <UserRound className="h-3 w-3 shrink-0 text-brand-purple-light" aria-hidden />
          )}
          <span className="truncate">{isAgency ? 'Agency' : 'Individual'}</span>
        </span>
        {profile.isDemo ? (
          <span className="absolute right-2 top-2 rounded-full border border-white/15 bg-black/70 px-2 py-0.5 text-[10px] font-medium text-zinc-300 sm:right-3 sm:top-3">
            Demo
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2.5 sm:p-4">
        <div className="flex items-start justify-between gap-1.5">
          <h3 className="line-clamp-2 min-w-0 break-words text-[13px] font-semibold leading-snug tracking-[-0.01em] text-white sm:text-[16px]">
            {profile.displayName}
          </h3>
          <VerifiedNameCheck verified={profile.verified} className="mt-0.5 shrink-0" />
        </div>

        <p className="flex min-w-0 items-center gap-1 text-[11px] leading-snug text-zinc-400 sm:text-[13px]">
          <MapPin className="h-3 w-3 shrink-0 text-brand-purple-light sm:h-3.5 sm:w-3.5" aria-hidden />
          <span className="truncate">{locationText(profile)}</span>
        </p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <VerifiedBadge verified={profile.verified} />
          {price ? (
            <span className="ml-auto whitespace-nowrap text-[10.5px] font-semibold tabular-nums text-zinc-200 sm:text-[12px]">
              From {price}
            </span>
          ) : null}
        </div>

        {profile.services.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {profile.services.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="max-w-full truncate rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9.5px] text-zinc-300 sm:px-2 sm:py-1 sm:text-[11px]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {profile.distanceKm != null ? (
          <p className="text-[10px] leading-snug text-brand-purple-light/90 sm:text-[11.5px]">
            ~{profile.distanceKm} km away
          </p>
        ) : null}

        <div className="mt-auto flex items-center gap-1.5 pt-2">
          <Link
            to={href}
            className={buttonClass({
              variant: 'secondary',
              size: 'sm',
              className: 'min-w-0 flex-1 px-2 text-[11.5px] sm:px-4 sm:text-[13px]',
            })}
          >
            View Profile
          </Link>
          {canWhatsApp ? (
            <a
              href={whatsappEnquiryUrl(profile.whatsapp!)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Chat on WhatsApp with ${profile.displayName}`}
              title="Chat on WhatsApp"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 transition-colors hover:border-emerald-400/45 hover:bg-emerald-500/15 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
};

const ListCard: React.FC<Props> = ({ profile, index = 0 }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const price = formatPrice(profile.startingPrice, profile.currency);
  const image = profileImage(profile);
  const showImage = Boolean(image) && !imageFailed;
  const canWhatsApp = profile.publicContactEnabled && Boolean(profile.whatsapp);
  const href = profileHref(profile);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3 }}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors duration-300 hover:border-white/20"
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full shrink-0 bg-brand-ink sm:w-[220px] lg:w-[240px]">
          {showImage ? (
            <PortraitMedia
              src={image as string}
              alt={profile.displayName}
              aspectClassName="aspect-[4/3] sm:aspect-auto sm:h-full sm:min-h-[228px]"
              hoverZoom
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="aspect-[4/3] w-full sm:aspect-auto sm:h-full sm:min-h-[228px]">
              <ImageFallback profile={profile} />
            </div>
          )}
          {profile.isDemo ? (
            <span className="absolute left-3 top-3 z-10 rounded-full border border-white/15 bg-black/70 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
              Demo
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                {profile.providerKind === 'agency' ? 'Agency' : 'Individual'}
                {profile.providerKind !== 'agency' && genderLabel(profile.gender)
                  ? ` · ${genderLabel(profile.gender)}`
                  : ''}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.01em] text-white">
                  {profile.displayName}
                </h3>
                <VerifiedNameCheck verified={profile.verified} />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-zinc-400">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-purple-light" aria-hidden />
                <span className="min-w-0 truncate">{locationText(profile)}</span>
              </p>
              {profile.distanceKm != null ? (
                <p className="mt-1 text-[11.5px] text-brand-purple-light/90">
                  ~{profile.distanceKm} km straight-line · approximate, not travel distance
                </p>
              ) : profile.distancePrecision && profile.distancePrecision !== 'none' ? (
                <p className="mt-1 text-[11.5px] text-zinc-500">
                  {profile.distancePrecision === 'service_area' || profile.distancePrecision === 'city'
                    ? `Serves ${profile.matchedArea || profile.city}`
                    : `Serves ${profile.region}`}
                </p>
              ) : null}
              <div className="mt-2">
                <VerifiedBadge verified={profile.verified} />
              </div>
            </div>

            {price ? (
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-medium text-zinc-500">From</p>
                <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-white">{price}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.services.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11.5px] text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="mt-3 line-clamp-2 text-[13.5px] leading-relaxed text-zinc-400">
            {profile.shortBio}
          </p>

          <div className="mt-auto flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-zinc-500">
              <span>
                {providerKindLabel(profile.providerKind)} · {serviceSettingLabel(profile.serviceSetting)}
              </span>
              <span aria-hidden>·</span>
              <span>{availabilityLabel(profile.availability)}</span>
              {profile.publicContactEnabled ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="text-emerald-300/90">Public contact</span>
                </>
              ) : null}
            </p>

            <div className="flex flex-wrap gap-2">
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
                      'flex-1 border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/45 hover:bg-emerald-500/15 hover:text-emerald-100 sm:flex-none',
                  })}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  WhatsApp
                </a>
              ) : null}
              <Link
                to={`${href}#contact`}
                className={buttonClass({ variant: 'secondary', size: 'sm', className: 'flex-1 sm:flex-none' })}
              >
                Contact
              </Link>
              <Link
                to={href}
                className={buttonClass({ size: 'sm', className: 'flex-1 sm:flex-none' })}
              >
                View Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export const MarketplaceProfileCard: React.FC<Props> = ({ profile, index = 0, variant = 'grid' }) =>
  variant === 'list' ? (
    <ListCard profile={profile} index={index} />
  ) : (
    <GridCard profile={profile} index={index} />
  );
