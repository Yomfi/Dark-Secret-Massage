import React from 'react';
import { VisualMedia } from './VisualMedia';
import { ShieldCheck, Sparkles, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { CitySearch } from './marketplace/CitySearch';

interface HeroProps {
  verifiedCount?: string;
}

export const Hero: React.FC<HeroProps> = ({
  verifiedCount = '1,200+',
}) => {
  return (
    <section className="relative min-h-[100svh] flex-1 flex flex-col justify-between pt-28 sm:pt-32 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 overflow-x-hidden select-none">
      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 z-0 w-full h-full pointer-events-none overflow-hidden"
      >
        <VisualMedia
          type="hero-cinematic"
          className="w-full h-full"
          alt="Cinematic portrait of an elegant Ghanaian couple in warm low-key lounge ambiance"
        />
      </motion.div>

      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto my-auto z-10 py-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-5 sm:mb-6 inline-flex items-center gap-2"
        >
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.38em] text-purple-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] font-sans">
            DISCOVER NEAR YOU
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-7xl font-bold tracking-tight text-white leading-[1.07] mb-6 font-sans drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]"
        >
          Find professional massage
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-300">
            and wellness
          </span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-300">
            in your city.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="text-base sm:text-lg md:text-xl text-zinc-300/90 max-w-2xl mx-auto leading-relaxed font-normal mb-8 sm:mb-10 text-balance drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
        >
          Search by city for professional massage and wellness services — browse freely, create a profile when you are ready.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-30 w-full max-w-xl mx-auto mb-7 sm:mb-8"
        >
          <CitySearch variant="hero" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="relative z-10 flex flex-wrap items-center justify-center gap-4 sm:gap-7 text-[11px] sm:text-xs uppercase tracking-[0.22em] text-zinc-300 font-medium drop-shadow-md"
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

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.95 }}
        className="w-full max-w-2xl mx-auto z-10 pt-2 flex flex-col items-center justify-center text-center"
      >
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
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
          Discover trusted massage and wellness professionals across Accra, Tema, Kumasi and beyond.
        </p>
      </motion.div>
    </section>
  );
};
