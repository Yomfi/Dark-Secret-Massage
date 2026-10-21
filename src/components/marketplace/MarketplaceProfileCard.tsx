import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, BadgeCheck } from 'lucide-react';
import { motion } from 'motion/react';
import type { MarketplaceProfile } from '../../data/marketplaceProfiles';
import { availabilityLabel, formatPrice, serviceSettingLabel } from '../../lib/marketplace';

type Props = {
  profile: MarketplaceProfile;
  index?: number;
};

export const MarketplaceProfileCard: React.FC<Props> = ({ profile, index = 0 }) => {
  const price = formatPrice(profile.startingPrice, profile.currency);
  const thumbs = profile.gallery.slice(1, 4);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.35), duration: 0.35 }}
      className="group flex flex-col md:flex-row gap-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] hover:border-purple-400/35 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(88,28,135,0.18)] transition-all duration-300"
    >
      <div className="relative md:w-[42%] aspect-[4/3] md:aspect-auto md:min-h-[240px] overflow-hidden bg-zinc-900">
        <img
          src={profile.primaryImage}
          alt={profile.displayName}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/20" />
        {thumbs.length > 0 && (
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {thumbs.map((src) => (
              <div key={src} className="w-10 h-10 rounded-lg overflow-hidden border border-white/25 shadow-lg">
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
        {profile.isDemo && (
          <span className="absolute top-3 left-3 text-[9px] uppercase tracking-[0.18em] px-2 py-1 rounded-full bg-black/60 border border-white/15 text-zinc-300">
            Demo
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col p-5 sm:p-6 gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-semibold text-white tracking-tight">{profile.displayName}</h3>
              {profile.verified && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-emerald-300">
                  <BadgeCheck className="w-3.5 h-3.5" /> Verified
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
              <MapPin className="w-3.5 h-3.5 text-purple-300" />
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

        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{profile.shortBio}</p>

        <div className="mt-auto pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-zinc-500 uppercase tracking-wider">
          <span>{availabilityLabel(profile.availability)}</span>
          <span className="text-zinc-700">·</span>
          <span>{serviceSettingLabel(profile.serviceSetting)}</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to={`/profile/${profile.slug}`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold uppercase tracking-widest transition-colors"
          >
            View Profile
          </Link>
          {profile.publicContactEnabled && (
            <Link
              to={`/profile/${profile.slug}#contact`}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-white/15 text-zinc-200 hover:border-purple-400/40 hover:text-white text-xs font-semibold uppercase tracking-widest transition-colors"
            >
              Contact
            </Link>
          )}
        </div>
      </div>
    </motion.article>
  );
};
