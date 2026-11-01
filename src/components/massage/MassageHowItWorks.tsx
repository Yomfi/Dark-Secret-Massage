import React from 'react';
import { Container } from '../ui/Layout';

const STEPS = [
  { title: 'Choose your therapy', detail: 'Compare durations and prices.' },
  { title: 'Set place and time', detail: 'Studio or in-home, at your preferred hour.' },
  { title: 'Confirm your booking', detail: 'Send the request and get your reference.' },
] as const;

export const MassageHowItWorks: React.FC = () => (
  <section className="border-t border-white/[0.07]">
    <Container className="py-12 sm:py-14">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
        <div className="lg:w-56 lg:shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-gold-light">
            How booking works
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.01em] text-white">
            Three calm steps
          </h2>
        </div>

        <ol className="grid flex-1 grid-cols-1 gap-y-5 sm:grid-cols-3 sm:gap-x-6">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-gold/35 bg-brand-gold/10 text-[12px] font-semibold text-brand-gold-light">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-zinc-100">{step.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-500">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Container>
  </section>
);
