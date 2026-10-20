import React, { useState } from 'react';

interface VisualMediaProps {
  type:
    | 'hero-cinematic'
    | 'matchmaking-editorial'
    | 'massage-sanctuary'
    | 'massage-therapy'
    | 'gallery-dinner'
    | 'gallery-spa'
    | 'gallery-retreat'
    | 'avatar-ama'
    | 'avatar-kwame'
    | 'avatar-yaa'
    | 'avatar-kofi'
    | 'avatar-abena'
    | 'avatar-elikem'
    | 'therapist-akua'
    | 'therapist-nana'
    | 'therapist-efua';
  className?: string;
  alt?: string;
}

export const VisualMedia: React.FC<VisualMediaProps> = ({ type, className = '', alt = 'Visual' }) => {
  const [imageError, setImageError] = useState(false);

  // 1. HERO PHOTOGRAPHY: Exact user-supplied Warm Amber Whisper photograph
  if (type === 'hero-cinematic') {
    return (
      <div className={`relative overflow-hidden w-full h-full select-none ${className}`}>
        {!imageError ? (
          <img
            src="/Warm Amber Whisper.png"
            alt={alt || 'Editorial photograph of an authentic Ghanaian couple in warm low-key ambient romance'}
            className="w-full h-full object-cover object-[32%_22%] sm:object-[center_18%] brightness-[0.94] contrast-[1.06] transition-transform duration-1000"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-[#08080c] flex flex-col items-center justify-center p-8 text-center relative">
            <span className="text-xs uppercase tracking-widest text-zinc-500">Photographic Hero</span>
          </div>
        )}

        {/* Layered cinematic dark overlays */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(5,5,8,0.50)_0%,rgba(5,5,8,0.35)_50%,rgba(6,6,8,0.15)_80%,transparent_100%)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#050508]/90 via-[#050508]/40 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[500px] h-[260px] bg-purple-600/18 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-[#060608] via-[#060608]/90 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-radial from-transparent via-transparent to-[#040406]/70 pointer-events-none" />
      </div>
    );
  }

  // 2. MATRIMONIAL / MATCHMAKING: Editorial picnic lifestyle photograph
  if (type === 'matchmaking-editorial') {
    return (
      <div className={`relative overflow-hidden rounded-3xl bg-[#09090f] border border-white/10 group ${className}`}>
        <img
          src="/ghanaian_couple_picnic.jpg"
          alt={alt || 'Stylish Ghanaian couple enjoying a relaxed picnic together outdoors'}
          className="w-full h-full object-cover object-[48%_42%] sm:object-[50%_40%] brightness-[0.92] contrast-[1.05] group-hover:scale-105 transition-transform duration-700"
          onError={() => setImageError(true)}
        />
        {/* Subtle cinematic gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-[#060608]/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060608]/35 via-transparent to-black/25" />
      </div>
    );
  }

  // 3. MASSAGE & WELLNESS: Real luxury spa treatment room photograph
  if (type === 'massage-sanctuary' || type === 'massage-therapy') {
    return (
      <div className={`relative overflow-hidden rounded-3xl bg-[#09090f] border border-white/10 group ${className}`}>
        <img
          src="/spa_treatment_room.jpg"
          alt={alt || 'Luxury spa treatment room and professional therapy bed'}
          className="w-full h-full object-cover object-center brightness-[0.85] contrast-[1.06] group-hover:scale-102 transition-transform duration-700"
          onError={() => setImageError(true)}
        />
        {/* Subtle cinematic gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-[#060608]/25 to-transparent" />
        <div className="absolute inset-0 bg-black/20" />
      </div>
    );
  }

  // 4. ATMOSPHERE CARD 1: Candlelit Intimate Dining
  if (type === 'gallery-dinner') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-[#09090f] border border-white/10 group ${className}`}>
        <img
          src="/candlelit_dinner.jpg"
          alt={alt || 'Private candlelit dinner and intimate meeting table'}
          className="w-full h-full object-cover object-center brightness-[0.85] contrast-[1.08] group-hover:scale-105 transition-transform duration-700"
          onError={() => setImageError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-[#060608]/30 to-transparent" />
      </div>
    );
  }

  // 5. ATMOSPHERE CARD 2: Calm Spa Treatment Space
  if (type === 'gallery-spa') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-[#09090f] border border-white/10 group ${className}`}>
        <img
          src="/spa_treatment_room.jpg"
          alt={alt || 'Calm luxury treatment space and massage room'}
          className="w-full h-full object-cover object-center brightness-[0.85] contrast-[1.08] group-hover:scale-105 transition-transform duration-700"
          onError={() => setImageError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-[#060608]/30 to-transparent" />
      </div>
    );
  }

  // 6. ATMOSPHERE CARD 3: Sophisticated Private Lounge
  if (type === 'gallery-retreat') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-[#09090f] border border-white/10 group ${className}`}>
        <img
          src="/private_lounge.jpg"
          alt={alt || 'Sophisticated private lounge with tranquil ambiance'}
          className="w-full h-full object-cover object-center brightness-[0.85] contrast-[1.08] group-hover:scale-105 transition-transform duration-700"
          onError={() => setImageError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-[#060608]/30 to-transparent" />
      </div>
    );
  }

  // 7. MONOGRAM SEALS FOR AVATARS (Clean typographic seals, no cartoon faces)
  if (type.startsWith('avatar-') || type.startsWith('therapist-')) {
    const seed = type.replace('avatar-', '').replace('therapist-', '');
    const hues: Record<string, { bg1: string; bg2: string; accent: string; letter: string }> = {
      ama: { bg1: '#3b1d54', bg2: '#1e1133', accent: '#c084fc', letter: 'A' },
      kwame: { bg1: '#1b2a47', bg2: '#0d1526', accent: '#60a5fa', letter: 'K' },
      yaa: { bg1: '#2e1c38', bg2: '#160d1c', accent: '#f472b6', letter: 'Y' },
      kofi: { bg1: '#1c3327', bg2: '#0b1c13', accent: '#34d399', letter: 'K' },
      abena: { bg1: '#432338', bg2: '#210e19', accent: '#fb7185', letter: 'A' },
      elikem: { bg1: '#262247', bg2: '#110f24', accent: '#818cf8', letter: 'E' },
      akua: { bg1: '#362142', bg2: '#1b0e24', accent: '#e879f9', letter: 'A' },
      nana: { bg1: '#172554', bg2: '#0f172a', accent: '#38bdf8', letter: 'N' },
      efua: { bg1: '#2a2238', bg2: '#140f1d', accent: '#a78bfa', letter: 'E' },
    };
    const c = hues[seed] || { bg1: '#27272a', bg2: '#09090b', accent: '#a1a1aa', letter: 'M' };

    return (
      <div
        className={`relative inline-flex items-center justify-center overflow-hidden rounded-full font-semibold select-none ${className}`}
        style={{
          background: `radial-gradient(circle at 35% 35%, ${c.bg1}, ${c.bg2})`,
          border: `1.5px solid ${c.accent}40`,
        }}
        aria-label={alt}
      >
        <span style={{ color: c.accent }} className="text-xs sm:text-sm select-none tracking-tight font-sans">
          {c.letter}
        </span>
        <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
      </div>
    );
  }

  // Fallback
  return (
    <div className={`relative overflow-hidden bg-[#09090f] border border-white/5 flex items-center justify-center ${className}`}>
      <div className="text-zinc-500 text-xs tracking-wider uppercase">{alt}</div>
    </div>
  );
};
