import React, { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import {
  isDemoProviderImage,
  type MarketplaceProviderKind,
} from '../../data/marketplaceProfiles';
import { PortraitMedia } from './PortraitMedia';

type ProviderImageSize = 'profile' | 'team' | 'thumb' | 'card';

type ProviderImageProps = {
  src?: string | null;
  name: string;
  kind?: MarketplaceProviderKind;
  alt?: string;
  aspectClassName?: string;
  className?: string;
  imgClassName?: string;
  hoverZoom?: boolean;
  size?: ProviderImageSize;
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

const AVATAR_SIZE: Record<ProviderImageSize, string> = {
  profile: 'h-24 w-24 text-3xl sm:h-28 sm:w-28',
  team: 'h-16 w-16 text-xl',
  thumb: 'h-10 w-10 text-sm',
  card: 'h-16 w-16 text-xl',
};

const PROVIDER_LABEL: Record<MarketplaceProviderKind, string> = {
  agency: 'Massage Agency',
  individual: 'Individual Provider',
};

type ProviderImageFallbackProps = Omit<ProviderImageProps, 'src' | 'alt' | 'imgClassName' | 'hoverZoom'>;

export const ProviderImageFallback: React.FC<ProviderImageFallbackProps> = ({
  name,
  kind = 'individual',
  aspectClassName = 'aspect-[4/5]',
  className = '',
  size = 'profile',
}) => (
  <div
    role="img"
    aria-label={`${name} ${kind === 'agency' ? 'agency logo' : 'profile photo'} placeholder`}
    className={`relative overflow-hidden bg-[#0a090e] ${aspectClassName} ${className}`}
  >
    <div
      aria-hidden
      className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(147,51,234,0.3),rgba(6,6,8,0.98)_68%)]"
    />
    <div
      aria-hidden
      className="absolute inset-0 bg-[linear-gradient(135deg,rgba(168,85,247,0.09),transparent_48%,rgba(0,0,0,0.32))]"
    />
    <div
      aria-hidden
      className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-purple/10 blur-3xl"
    />
    <div className="relative flex h-full w-full flex-col items-center justify-center px-4 text-center">
      <span
        className={`relative flex shrink-0 items-center justify-center rounded-full border border-brand-purple/30 bg-gradient-to-br from-brand-purple/25 via-[#170d22] to-black font-semibold tracking-[0.06em] text-brand-lavender shadow-[0_18px_50px_-20px_rgba(147,51,234,0.75)] ${AVATAR_SIZE[size]}`}
      >
        <span aria-hidden className="absolute inset-1 rounded-full border border-white/[0.07]" />
        <span className="relative">{initials(name)}</span>
        {kind === 'agency' ? (
          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-brand-purple/35 bg-[#0b0910] text-brand-purple-light">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </span>
      {size === 'profile' ? (
        <span className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-purple-light/85">
          {PROVIDER_LABEL[kind]}
        </span>
      ) : null}
    </div>
  </div>
);

/** Shows a genuine provider image, never demo artwork, with an in-place fallback on error. */
export const ProviderImage: React.FC<ProviderImageProps> = ({
  src,
  name,
  kind = 'individual',
  alt,
  aspectClassName = 'aspect-[4/5]',
  className = '',
  imgClassName = '',
  hoverZoom = false,
  size = 'profile',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const usable = typeof src === 'string' && src.trim() !== '' && !isDemoProviderImage(src) && !failed;

  if (!usable) {
    return (
      <ProviderImageFallback
        name={name}
        kind={kind}
        aspectClassName={aspectClassName}
        className={className}
        size={size}
      />
    );
  }

  return (
    <PortraitMedia
      src={src}
      alt={alt || name}
      aspectClassName={aspectClassName}
      className={className}
      imgClassName={imgClassName}
      hoverZoom={hoverZoom}
      onError={() => setFailed(true)}
    />
  );
};
