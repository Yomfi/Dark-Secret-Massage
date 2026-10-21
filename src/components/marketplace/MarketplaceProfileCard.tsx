import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone } from 'lucide-react';
import { motion } from 'motion/react';
import { PROFILE_TYPE_LABELS, type MarketplaceProfile } from '../../data/marketplaceProfiles';
import { availabilityLabel, formatPrice, serviceSettingLabel } from '../../lib/marketplace';
import { PortraitMedia } from './PortraitMedia';
import { VerifiedBadge, VerifiedNameCheck } from './VerifiedBadge';

type Props = {
  profile: MarketplaceProfile;
  index?: number;
};

export const MarketplaceProfileCard: React.FC<Props> = ({ profile, index = 0 }) => {
  const price = formatPrice(profile.startingPrice, profile.currency);
  const thumbs = profile.gallery.filter((src) => src !== profile.primaryImage).slice(0, 3);
  const typeLabel = PROFILE_TYPE_LABELS[profile.profileType];

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.35), duration: 0.35 }}
      className="group flex flex-col md:flex-row gap-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] hover:border-purple-400/35 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(88,28,135,0.18)] transition-all duration-300"
    >
      <div className="relative md:w-[38%] lg:w-[36%] shrink-0 bg-[#0a0a0f]">
        <PortraitMedia
          src={profile.primaryImage}
          alt={profile.displayName}
          aspectClassName="aspect-[4/5] md:aspect-auto md:h-full md:min-h-[300px]"
          hoverZoom
        />
        {thumbs.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 flex gap-1.5">
            {thumbs.map((src) => (
              <div
                key={src}
                className="relative w-12 h-14 rounded-lg overflow-hidden border border-white/25 shadow-lg bg-black/50"
              >
                <img
                  src={src}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover scale-125 blur-md opacity-60"
                />
                <img src={src} alt="" className="absolute inset-0 w-full h-full object-contain object-center" />
              </div>
            ))}
          </div>
        )}
        {profile.isDemo && (
          <span className="absolute top-3 left-3 text-[9px] uppercase tracking-[0.18em] px-2 py-1 rounded-full bg-black/70 border border-white/15 text-zinc-300 z-10">
            Demo
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col p-5 sm:p-6 gap-3 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-purple-300/80 mb-1">{typeLabel}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-semibold text-white tracking-tight uppercase">
                {profile.displayName}
              </h3>
              <VerifiedNameCheck verified={profile.verified} />
            </div>
            <div className="mt-1.5">
              <VerifiedBadge verified={profile.verified} />
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
              <MapPin className="w-3.5 h-3.5 text-purple-300 shrink-0" />
              {profile.city}, {profile.country}
            </p>
          </div>
          {price && (
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">From</p>
              <p className="text-sm font-semibold text-purple-200">{price}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {profile.services.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-purple-400/25 bg-purple-500/10 text-purple-100"
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">“{profile.shortBio}”</p>

        <div className="mt-auto pt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-zinc-500 uppercase tracking-wider">
          <span>{availabilityLabel(profile.availability)}</span>
          <span className="text-zinc-700">·</span>
          <span>{serviceSettingLabel(profile.serviceSetting)}</span>
          {profile.publicContactEnabled && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="inline-flex items-center gap-1 text-emerald-400/90">
                <Phone className="w-3 h-3" /> Public contact
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to={`/profile/${profile.slug}?from=${profile.citySlug}`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold uppercase tracking-widest transition-colors"
          >
            View Profile
          </Link>
          <Link
            to={`/profile/${profile.slug}?from=${profile.citySlug}#contact`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-white/15 text-zinc-200 hover:border-purple-400/40 hover:text-white text-xs font-semibold uppercase tracking-widest transition-colors"
          >
            Contact
          </Link>
        </div>
      </div>
    </motion.article>
  );
};
