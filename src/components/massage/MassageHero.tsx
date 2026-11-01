import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { buttonClass } from '../ui/Button';
import { Container } from '../ui/Layout';
import { bookMassageHref } from '../../lib/massageServicePresentation';

interface MassageHeroProps {
  onViewServices: () => void;
}

export const MassageHero: React.FC<MassageHeroProps> = ({ onViewServices }) => {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden border-b border-white/[0.07]">
      <div className="absolute inset-0">
        <img
          src="/massage_therapy_booking_hero.jpg"
          alt=""
          aria-hidden
          className="h-full w-full object-cover object-[center_35%] opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-surface via-brand-surface/92 to-brand-surface/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-transparent to-brand-surface/30" />
      </div>

      <Container className="relative py-12 sm:py-16 lg:py-20">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl"
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-gold-light">
            Massage therapy
          </p>
          <h1 className="text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-white text-balance sm:text-[2.75rem] lg:text-[3.1rem]">
            Professional massage,
            <br className="hidden sm:block" /> designed around you.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-zinc-300 sm:text-base">
            Choose a therapy, set your time and location, and book with reviewed providers.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to={bookMassageHref()} className={buttonClass({ size: 'lg', className: 'sm:w-auto' })}>
              <Calendar className="h-4 w-4" aria-hidden />
              Book now
            </Link>
            <button
              type="button"
              onClick={onViewServices}
              className={buttonClass({ variant: 'secondary', size: 'lg', className: 'sm:w-auto' })}
            >
              View services
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </motion.div>
      </Container>
    </section>
  );
};
