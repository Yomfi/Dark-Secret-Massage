import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { bookMassageHref } from '../../lib/massageServicePresentation';

export const MassageFinalCTA: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.06]">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[2rem] border border-white/[0.1] bg-gradient-to-b from-white/[0.04] to-transparent px-6 py-12 sm:px-12 sm:py-16 text-center"
      >
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[220px] bg-purple-600/15 blur-[100px] rounded-full" />
        <div className="relative z-10 max-w-xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.08]">
            Ready to book your session?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
            Choose your therapy, location and time in a few calm steps.
          </p>
          <Link
            to={bookMassageHref()}
            className="group mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-8 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-white hover:bg-purple-500 shadow-[0_16px_48px_-14px_rgba(147,51,234,0.6)] transition-all hover:-translate-y-0.5 motion-reduce:transform-none"
          >
            <Calendar className="h-4 w-4" aria-hidden />
            Book a Massage
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </motion.div>
    </section>
  );
};
