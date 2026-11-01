import React from 'react';
import { Link } from 'react-router-dom';
import { VisualMedia } from './VisualMedia';
import { Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { CitySearch } from './marketplace/CitySearch';
import { buttonClass } from './ui/Button';
import { Container } from './ui/Layout';

interface HeroProps {
  verifiedCount?: string;
}

export const Hero: React.FC<HeroProps> = ({ verifiedCount = '1,200+' }) => {
  return (
    <section className="relative isolate flex min-h-[92svh] flex-col justify-center overflow-hidden pb-14 pt-28 sm:pb-16 sm:pt-32">
      <div className="absolute inset-0 -z-10">
        <VisualMedia
          type="hero-cinematic"
          className="h-full w-full"
          alt="Warm ambient lounge atmosphere for discovering massage professionals near you"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-surface/80 via-brand-surface/72 to-brand-surface" />
      </div>

      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-gold-light">
            Discover near you
          </p>

          <h1 className="text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.03em] text-white text-balance sm:text-5xl lg:text-[3.6rem]">
            Find a massage professional in your city.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-300 sm:text-base">
            Search by location and discover massage professionals available near you.
          </p>

          <div className="relative z-30 mx-auto mt-7 w-full max-w-xl">
            <CitySearch variant="hero" />
          </div>

          <div className="mt-5 flex flex-col items-center gap-3">
            <Link
              to="/provider/register"
              className={buttonClass({ variant: 'secondary', size: 'sm' })}
            >
              Are you a provider? Create your profile
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12.5px] text-zinc-400">
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-brand-gold-light" aria-hidden />
              Verified profiles
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-brand-gold-light" aria-hidden />
              Reviewed providers
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-brand-gold-light" aria-hidden />
              Private booking details
            </li>
          </ul>
        </div>

        <div className="mx-auto mt-10 flex max-w-xl items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
          <div className="flex -space-x-2 overflow-hidden">
            <VisualMedia type="avatar-ama" className="h-8 w-8 ring-2 ring-brand-surface" alt="Ama" />
            <VisualMedia type="avatar-kwame" className="h-8 w-8 ring-2 ring-brand-surface" alt="Kwame" />
            <VisualMedia type="avatar-abena" className="h-8 w-8 ring-2 ring-brand-surface" alt="Abena" />
            <VisualMedia type="avatar-elikem" className="h-8 w-8 ring-2 ring-brand-surface" alt="Elikem" />
            <VisualMedia type="avatar-yaa" className="h-8 w-8 ring-2 ring-brand-surface" alt="Yaa" />
          </div>
          <p className="text-[13px] text-zinc-300">
            <span className="font-semibold text-white">{verifiedCount}</span> verified Ghanaians
          </p>
        </div>
      </Container>
    </section>
  );
};
