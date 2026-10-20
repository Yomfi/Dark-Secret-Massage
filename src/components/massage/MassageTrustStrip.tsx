import React from 'react';
import { UserCheck, Lock, ShieldCheck } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

const ITEMS = [
  { icon: UserCheck, title: 'Reviewed Providers' },
  { icon: Lock, title: 'Private Booking Details' },
  { icon: ShieldCheck, title: 'Secure Payments' },
] as const;

export const MassageTrustStrip: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section className="py-12 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.06]">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ITEMS.map(({ icon: Icon, title }, index) => (
          <motion.div
            key={title}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, delay: reduceMotion ? 0 : index * 0.06 }}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-500/10 text-purple-300">
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <p className="text-sm sm:text-base font-semibold text-white">{title}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
