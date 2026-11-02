import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { buttonClass } from '../ui/Button';
import { Section } from '../ui/Layout';
import { bookMassageHref } from '../../lib/massageServicePresentation';

export const MassageFinalCTA: React.FC = () => (
  <Section divider>
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] px-6 py-10 sm:px-10 sm:py-12">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[420px] -translate-x-1/2 rounded-full bg-brand-gold/10 blur-3xl" />
      <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-lg">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white sm:text-[28px]">
            Ready to book your session?
          </h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-zinc-400">
            Pick a therapy, choose where and when, and send your request in a few steps.
          </p>
        </div>
        <Link to={bookMassageHref()} className={buttonClass({ size: 'lg', className: 'w-full sm:w-auto' })}>
          <Calendar className="h-4 w-4" aria-hidden />
          Book A Massage
        </Link>
      </div>
    </div>
  </Section>
);
