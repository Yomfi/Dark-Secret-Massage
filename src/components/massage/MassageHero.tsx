import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { bookMassageHref } from '../../lib/massageServicePresentation';

interface MassageHeroProps {
  onViewServices: () => void;
}

export const MassageHero: React.FC<MassageHeroProps> = ({ onViewServices }) => {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      <div className="absolute inset-0">
        <img
          src="/massage_therapy_booking_hero.jpg"
          alt="Professional Ghanaian massage therapy wellness session"
          className="h-full w-full object-cover object-[center_30%] opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060608] via-[#060608]/92 to-[#060608]/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-transparent to-[#060608]/45" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-purple-300 mb-3">
            Massage Therapy
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-white tracking-tight leading-[1.06]">
            Professional massage.
            <br />
            <span className="text-zinc-300 font-semibold">Designed around you.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-zinc-300 font-normal leading-relaxed max-w-xl">
            Explore professional massage services for relaxation, recovery and wellbeing.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to={bookMassageHref()}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-7 py-3.5 text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-white hover:bg-purple-500 shadow-[0_12px_40px_-14px_rgba(147,51,234,0.65)] transition-all hover:-translate-y-0.5 motion-reduce:transform-none"
            >
              <Calendar className="h-4 w-4" aria-hidden />
              Book a Massage
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={onViewServices}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-7 py-3.5 text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-zinc-200 hover:border-purple-400/40 hover:text-white transition-all cursor-pointer"
            >
              View Services
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
