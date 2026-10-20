import React from 'react';
import { ShieldCheck, HeartHandshake, Lock, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

interface MatchmakingStoryProps {
  onOpenMatchmaking: () => void;
}

const highlights = [
  {
    icon: ShieldCheck,
    title: 'Verified Profiles',
    detail: 'Authentic, reviewed members',
  },
  {
    icon: HeartHandshake,
    title: 'Marriage-Focused Matching',
    detail: 'Shared values & long-term intent',
  },
  {
    icon: Lock,
    title: 'Private Introductions',
    detail: 'Discreet, intentional connections',
  },
] as const;

const easeLuxury = [0.16, 1, 0.3, 1] as const;

const CoupleImage: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`group relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] border border-white/10 bg-[#09090f] shadow-[0_30px_80px_-28px_rgba(0,0,0,0.85)] transition-shadow duration-500 hover:shadow-[0_36px_90px_-24px_rgba(88,28,135,0.35)] ${className}`}
  >
    <div className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[11/10] overflow-hidden">
      <img
        src="/ghanaian_couple_picnic.jpg"
        alt="Stylish Ghanaian couple enjoying a relaxed picnic together outdoors at golden hour"
        className="h-full w-full object-cover object-[48%_42%] sm:object-[50%_40%] lg:object-[52%_38%] scale-[1.02] transition-transform duration-[1100ms] ease-out group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:transform-none"
        loading="lazy"
        decoding="async"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060608]/75 via-[#060608]/15 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#060608]/35 via-transparent to-black/20" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(ellipse_at_60%_40%,rgba(168,85,247,0.14),transparent_55%)] motion-reduce:hidden" />
    </div>
  </div>
);

export const MatchmakingStory: React.FC<MatchmakingStoryProps> = ({ onOpenMatchmaking }) => {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="matchmaking"
      className="relative py-24 sm:py-32 lg:py-36 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[60%] max-w-3xl mx-auto bg-purple-600/[0.04] blur-[120px] rounded-full"
        aria-hidden
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-14 lg:gap-20 xl:gap-24 items-center">
        {/* Left: Editorial narrative */}
        <div className="lg:col-span-5 flex flex-col">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.65, ease: easeLuxury }}
            className="mb-6 sm:mb-7"
          >
            <span className="inline-flex items-center gap-2.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.32em] text-purple-300">
              <span className="h-px w-6 bg-purple-400/70" aria-hidden />
              Matrimonial Matchmaking
            </span>
          </motion.div>

          <motion.h2
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.08, ease: easeLuxury }}
            className="text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem] xl:text-[4rem] font-bold tracking-tight text-white leading-[1.05] font-sans"
          >
            Companionship built for marriage.
          </motion.h2>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.16, ease: easeLuxury }}
            className="mt-6 sm:mt-7 text-lg sm:text-xl text-zinc-200 font-medium leading-relaxed max-w-xl"
          >
            Meet verified people who are intentional about marriage, shared values, and long-term
            commitment.
          </motion.p>

          {/* Mobile / tablet image — kept prominent in the reading flow */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 1.02 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.85, delay: reduceMotion ? 0 : 0.1, ease: easeLuxury }}
            className="mt-9 sm:mt-10 lg:hidden"
          >
            <CoupleImage />
          </motion.div>

          <motion.ul
            initial={reduceMotion ? false : { opacity: 0 }}
            whileInView={reduceMotion ? undefined : { opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.2, ease: easeLuxury }}
            className="mt-9 sm:mt-10 grid grid-cols-1 gap-4 sm:gap-5"
            role="list"
          >
            {highlights.map(({ icon: Icon, title, detail }, index) => (
              <motion.li
                key={title}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{
                  duration: 0.55,
                  delay: reduceMotion ? 0 : 0.24 + index * 0.07,
                  ease: easeLuxury,
                }}
                className="group flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 sm:px-5 sm:py-4 transition-colors duration-300 hover:border-purple-500/30 hover:bg-white/[0.035]"
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-500/10 text-purple-300 transition-colors duration-300 group-hover:border-purple-400/35 group-hover:bg-purple-500/15">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-sm sm:text-[15px] font-semibold text-white tracking-tight">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400 font-medium leading-snug">{detail}</p>
                </div>
              </motion.li>
            ))}
          </motion.ul>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.42, ease: easeLuxury }}
            className="mt-10 sm:mt-12"
          >
            <button
              type="button"
              onClick={onOpenMatchmaking}
              className="group inline-flex items-center gap-2.5 rounded-full bg-purple-600 px-7 py-3.5 sm:px-8 sm:py-4 text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_12px_40px_-12px_rgba(147,51,234,0.65)] transition-all duration-300 hover:bg-purple-500 hover:shadow-[0_16px_48px_-10px_rgba(168,85,247,0.55)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060608] cursor-pointer motion-reduce:transform-none"
            >
              <span>Explore Matrimonial Profiles</span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none"
                aria-hidden
              />
            </button>
          </motion.div>
        </div>

        {/* Desktop image */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 1.03 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.95, delay: reduceMotion ? 0 : 0.1, ease: easeLuxury }}
          className="hidden lg:block lg:col-span-7"
        >
          <CoupleImage />
        </motion.div>
      </div>
    </section>
  );
};
