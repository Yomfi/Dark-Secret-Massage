import React from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowRight, Clock, MapPin } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  bookMassageHref,
  formatDurationOptions,
  type MassageServicePresentation,
} from '../../lib/massageServicePresentation';

interface MassageServiceDetailsProps {
  item: MassageServicePresentation | null;
  onClose: () => void;
}

export const MassageServiceDetails: React.FC<MassageServiceDetailsProps> = ({
  item,
  onClose,
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {item && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="massage-service-title"
            initial={reduceMotion ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduceMotion ? undefined : { x: '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg h-full bg-[#0a0a10] border-l border-white/10 shadow-2xl overflow-y-auto"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#0a0a10]/95 backdrop-blur-xl border-b border-white/[0.06]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">
                Service details
              </p>
              <button
                type="button"
                onClick={onClose}
                className="h-10 w-10 rounded-full border border-white/10 inline-flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={item.image}
                alt={item.imageAlt}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a10] via-transparent to-transparent" />
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              <div>
                <h2
                  id="massage-service-title"
                  className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
                >
                  {item.service.name}
                </h2>
                <p className="mt-2 text-base text-zinc-300 font-normal leading-relaxed">
                  {item.service.description}
                </p>
              </div>

              <DetailBlock title="Who it may suit">
                <p className="text-base text-zinc-300 font-normal leading-relaxed">
                  {item.whoItMaySuit}
                </p>
              </DetailBlock>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-300 mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Duration
                  </p>
                  <p className="text-base font-semibold text-white">
                    {formatDurationOptions(item.service.durationMinutes)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-300 mb-1.5">
                    Starting price
                  </p>
                  <p className="text-base font-semibold text-white font-mono">
                    From GHS {item.service.basePriceGHS}
                  </p>
                </div>
              </div>

              <DetailBlock title="What to expect">
                <ul className="space-y-2">
                  {item.whatToExpect.map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-base text-zinc-300 font-normal">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
              </DetailBlock>

              <DetailBlock title="Location availability">
                <p className="text-base text-zinc-300 font-normal inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-purple-300 shrink-0" aria-hidden />
                  {item.locationAvailability}
                </p>
              </DetailBlock>

              <Link
                to={bookMassageHref(item.service.id)}
                className="group sticky bottom-0 inline-flex w-full items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-4 text-sm font-semibold uppercase tracking-wider text-white hover:bg-purple-500 shadow-lg shadow-purple-950/40 transition-all"
              >
                Book This Service
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300 mb-2.5">
        {title}
      </h3>
      {children}
    </section>
  );
}
