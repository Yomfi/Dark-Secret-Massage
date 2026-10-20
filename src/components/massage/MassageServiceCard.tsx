import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  bookMassageHref,
  formatDurationOptions,
  type MassageServicePresentation,
} from '../../lib/massageServicePresentation';

interface MassageServiceCardProps {
  item: MassageServicePresentation;
  index: number;
  onViewDetails: () => void;
}

export const MassageServiceCard: React.FC<MassageServiceCardProps> = ({
  item,
  index,
  onViewDetails,
}) => {
  const reduceMotion = useReducedMotion();
  const { service, image, imageAlt } = item;

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: reduceMotion ? 0 : index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-white/[0.02] hover:border-purple-500/30 transition-colors duration-300"
    >
      <div className="relative aspect-[16/11] overflow-hidden">
        <img
          src={image}
          alt={imageAlt}
          className="h-full w-full object-cover object-center scale-[1.01] transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060608]/70 via-transparent to-transparent" />
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          {service.name}
        </h3>
        <p className="mt-2 text-sm sm:text-base text-zinc-300 font-normal leading-relaxed line-clamp-2">
          {service.tagline}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-purple-300" aria-hidden />
            {formatDurationOptions(service.durationMinutes)}
          </span>
          <span className="text-zinc-600">·</span>
          <span>
            From <span className="text-white font-semibold font-mono">GHS {service.basePriceGHS}</span>
          </span>
        </div>

        <div className="mt-auto pt-5 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onViewDetails}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-200 hover:border-purple-400/40 hover:text-white transition-all cursor-pointer"
          >
            View Details
          </button>
          <Link
            to={bookMassageHref(service.id)}
            className="group/btn inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-purple-600 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-purple-500 transition-all"
          >
            Book This Service
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </div>
    </motion.article>
  );
};
