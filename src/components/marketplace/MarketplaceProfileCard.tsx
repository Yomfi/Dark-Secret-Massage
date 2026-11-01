import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import type { MarketplaceProfile } from '../../data/marketplaceProfiles';
import {
  availabilityLabel,
  formatPrice,
  genderLabel,
  providerKindLabel,
  serviceSettingLabel,
} from '../../lib/marketplace';
import { PortraitMedia } from './PortraitMedia';
import { VerifiedBadge, VerifiedNameCheck } from './VerifiedBadge';
import { buttonClass } from '../ui/Button';

type Props = {
  profile: MarketplaceProfile;
  index?: number;
};

export const MarketplaceProfileCard: React.FC<Props> = ({ profile, index = 0 }) => {
  const price = formatPrice(profile.startingPrice, profile.currency);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3 }}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors duration-300 hover:border-white/20"
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full shrink-0 bg-brand-ink sm:w-[220px] lg:w-[240px]">
          <PortraitMedia
            src={profile.primaryImage}
            alt={profile.displayName}
            aspectClassName="aspect-[4/3] sm:aspect-auto sm:h-full sm:min-h-[228px]"
            hoverZoom
          />
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
                <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-gold-light" aria-hidden />
                {profile.city}, {profile.country}
              </p>
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

            <div className="flex gap-2">
              <Link
                to={`/profile/${profile.slug}?from=${profile.citySlug}#contact`}
                className={buttonClass({ variant: 'secondary', size: 'sm', className: 'flex-1 sm:flex-none' })}
              >
                Contact
              </Link>
              <Link
                to={`/profile/${profile.slug}?from=${profile.citySlug}`}
                className={buttonClass({ size: 'sm', className: 'flex-1 sm:flex-none' })}
              >
                View profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
};
