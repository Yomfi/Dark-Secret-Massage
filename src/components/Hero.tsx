import React from 'react';
import { VisualMedia } from './VisualMedia';
import { ShieldCheck, HeartHandshake, Sparkles, Lock } from 'lucide-react';
import { motion } from 'motion/react';

interface HeroProps {
  onOpenMatchmaking: () => void;
  onOpenBooking: () => void;
  verifiedCount?: string;
}

export const Hero: React.FC<HeroProps> = ({
  onOpenMatchmaking,
  onOpenBooking,
  verifiedCount = '1,200+',
}) => {
  return (
    <section className="relative min-h-screen flex flex-col justify-between pt-28 sm:pt-32 pb-10 sm:pb-14 px-4 sm:px-6 lg:px-8 overflow-hidden select-none isolate">
      {/* 1. Large Edge-to-Edge Cinematic Photographic Background */}
      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 z-0 w-full h-full pointer-events-none"
      >
        <VisualMedia
          type="hero-cinematic"
          className="w-full h-full"
          alt="Cinematic portrait of an elegant Ghanaian couple in warm low-key lounge ambiance"
        />
      </motion.div>

      {/* 2. Centred Hero Content with deliberate negative space */}
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto my-auto z-10 py-6 sm:py-10">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-5 sm:mb-6 inline-flex items-center gap-2"
        >
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.38em] text-purple-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] font-sans">
            PRIVATE. VERIFIED. INTENTIONAL.
          </span>
        </motion.div>

        {/* Headline: Very large, dominant, broken intentionally across ~2 lines */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-7xl font-bold tracking-tight text-white leading-[1.07] mb-6 font-sans drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]"
        >
          Find connection.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-300">
            Find your moment.
          </span>
        </motion.h1>

        {/* Supporting Copy */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="text-base sm:text-lg md:text-xl text-zinc-300/90 max-w-2xl mx-auto leading-relaxed font-normal mb-8 sm:mb-10 text-balance drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
        >
          One private platform for meaningful relationships and trusted professional massage services.
        </motion.p>

        {/* Primary Action: Large Horizontal Outlined Pill */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md sm:max-w-lg mx-auto mb-7 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row items-center p-1.5 rounded-2xl sm:rounded-full border border-white/25 bg-black/60 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(168,85,247,0.15)] gap-2">
            {/* Left: Find a Life Partner (restrained/dark) */}
            <button
              onClick={onOpenMatchmaking}
              className="w-full sm:w-1/2 py-3.5 px-5 text-xs sm:text-[13px] font-semibold tracking-wider uppercase text-zinc-100 hover:text-white bg-white/[0.06] hover:bg-white/[0.14] rounded-xl sm:rounded-full border border-white/10 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 group whitespace-nowrap"
            >
              <HeartHandshake className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
              <span>FIND A LIFE PARTNER</span>
            </button>

            {/* Right: Book a Massage (purple accent) */}
            <button
              onClick={onOpenBooking}
              className="w-full sm:w-1/2 py-3.5 px-5 text-xs sm:text-[13px] font-semibold tracking-wider uppercase text-white bg-purple-600 hover:bg-purple-500 rounded-xl sm:rounded-full shadow-lg shadow-purple-950/60 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 group whitespace-nowrap"
            >
              <span>BOOK A MASSAGE</span>
              <span className="text-base transition-transform group-hover:translate-x-1" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        </motion.div>

        {/* Trust Indicators: Verified Profiles, Trusted Providers, Private & Secure */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-7 text-[11px] sm:text-xs uppercase tracking-[0.22em] text-zinc-300 font-medium drop-shadow-md"
        >
          <div className="inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>VERIFIED PROFILES</span>
          </div>
          <span className="text-zinc-600 hidden sm:inline" aria-hidden="true">
            ·
          </span>
          <div className="inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>TRUSTED PROVIDERS</span>
          </div>
          <span className="text-zinc-600 hidden sm:inline" aria-hidden="true">
            ·
          </span>
          <div className="inline-flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <span>PRIVATE & SECURE</span>
          </div>
        </motion.div>
      </div>

      {/* 3. Social Proof Section at Lower Hero (Afterdark Style) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.95 }}
        className="w-full max-w-2xl mx-auto z-10 pt-2 flex flex-col items-center justify-center text-center"
      >
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
          {/* Subtle decorative left laurel wreath branch */}
          <svg
            className="w-5 h-6 text-purple-400/70 shrink-0 hidden sm:block"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 21c-.8-1.5-1.5-3.5-1.5-6 0-5 3.5-9 8.5-11" />
            <path d="M6 14c1.5-1 3-1.5 5-.5" />
            <path d="M7 10c1.8-.7 3.5-1 5 0" />
            <path d="M9 6c1.5-.5 3-.5 4.5.5" />
          </svg>

          {/* Overlapping circular portraits of fictional Ghanaian adults */}
          <div className="flex -space-x-2.5 overflow-hidden p-0.5">
            <VisualMedia type="avatar-ama" className="w-8 h-8 ring-2 ring-[#070709]" alt="Ama" />
            <VisualMedia type="avatar-kwame" className="w-8 h-8 ring-2 ring-[#070709]" alt="Kwame" />
            <VisualMedia type="avatar-abena" className="w-8 h-8 ring-2 ring-[#070709]" alt="Abena" />
            <VisualMedia type="avatar-elikem" className="w-8 h-8 ring-2 ring-[#070709]" alt="Elikem" />
            <VisualMedia type="avatar-yaa" className="w-8 h-8 ring-2 ring-[#070709]" alt="Yaa" />
          </div>

          <div className="text-left">
            <div className="text-xs sm:text-sm font-semibold text-white tracking-wide">
              {verifiedCount} verified Ghanaians
            </div>
          </div>

          {/* Subtle decorative right laurel wreath branch */}
          <svg
            className="w-5 h-6 text-purple-400/70 shrink-0 scale-x-[-1] hidden sm:block"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 21c-.8-1.5-1.5-3.5-1.5-6 0-5 3.5-9 8.5-11" />
            <path d="M6 14c1.5-1 3-1.5 5-.5" />
            <path d="M7 10c1.8-.7 3.5-1 5 0" />
            <path d="M9 6c1.5-.5 3-.5 4.5.5" />
          </svg>
        </div>

        <p className="text-[11px] sm:text-xs text-zinc-400 max-w-lg leading-relaxed font-light">
          Building meaningful connections and accessing trusted wellness services across Accra, Kumasi & diaspora.
        </p>
      </motion.div>
    </section>
  );
};
