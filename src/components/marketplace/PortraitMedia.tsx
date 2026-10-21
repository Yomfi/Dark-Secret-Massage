import React from 'react';

type PortraitMediaProps = {
  src: string;
  alt: string;
  /** Outer frame aspect; default 4:5 portrait. */
  aspectClassName?: string;
  className?: string;
  imgClassName?: string;
  /** Slight zoom on hover for cards (foreground only). */
  hoverZoom?: boolean;
};

/**
 * Shows the full photograph without cropping faces/heads.
 * Uses object-fit: contain over a blurred fill of the same image.
 */
export const PortraitMedia: React.FC<PortraitMediaProps> = ({
  src,
  alt,
  aspectClassName = 'aspect-[4/5]',
  className = '',
  imgClassName = '',
  hoverZoom = false,
}) => {
  return (
    <div className={`relative overflow-hidden bg-[#0a0a0f] ${aspectClassName} ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-55 saturate-125"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/35" />
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-contain object-center transition-transform duration-700 ${
          hoverZoom ? 'group-hover:scale-[1.02]' : ''
        } ${imgClassName}`}
      />
    </div>
  );
};
