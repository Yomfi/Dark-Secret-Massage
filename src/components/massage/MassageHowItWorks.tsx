import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

const STEPS = [
  { n: '01', title: 'Choose your therapy' },
  { n: '02', title: 'Select your location and time' },
  { n: '03', title: 'Confirm your booking' },
] as const;

export const MassageHowItWorks: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.06]">
      <div className="max-w-2xl mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-300 mb-3">
          How booking works
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Three clear steps
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {STEPS.map((step, index) => (
          <motion.div
            key={step.n}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45, delay: reduceMotion ? 0 : index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6"
          >
            <span className="text-sm font-bold font-mono text-purple-300">{step.n}</span>
            <h3 className="mt-3 text-lg sm:text-xl font-semibold text-white tracking-tight">
              {step.title}
            </h3>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
