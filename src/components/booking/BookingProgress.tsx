import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

const STEPS = [
  { n: 1, label: 'Therapy' },
  { n: 2, label: 'Setting' },
  { n: 3, label: 'Schedule' },
  { n: 4, label: 'Details' },
  { n: 5, label: 'Review' },
] as const;

interface BookingProgressProps {
  currentStep: number;
}

export const BookingProgress: React.FC<BookingProgressProps> = ({ currentStep }) => {
  const reduceMotion = useReducedMotion();
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-zinc-300">
          Step {currentStep} of {STEPS.length}
        </p>
        <p className="text-sm font-medium text-purple-300 hidden sm:block">
          {STEPS[currentStep - 1]?.label}
        </p>
      </div>

      <div className="relative h-1.5 rounded-full bg-white/[0.08] overflow-hidden mb-5">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-600 to-purple-400"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <ol className="flex items-center justify-between gap-1" aria-label="Booking progress">
        {STEPS.map((step) => {
          const done = step.n < currentStep;
          const active = step.n === currentStep;
          return (
            <li key={step.n} className="flex flex-1 flex-col items-center gap-1.5 min-w-0">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_-4px_rgba(168,85,247,0.7)]'
                    : done
                      ? 'bg-purple-950/60 border-purple-500/50 text-purple-200'
                      : 'bg-white/[0.03] border-white/10 text-zinc-500'
                }`}
              >
                {step.n}
              </span>
              <span
                className={`text-[11px] sm:text-xs font-medium tracking-wide truncate max-w-full ${
                  active ? 'text-white' : done ? 'text-zinc-300' : 'text-zinc-500'
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
