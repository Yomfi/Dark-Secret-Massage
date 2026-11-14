import React from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonClass } from '../ui/Button';
import {
  bookMassageHref,
  formatDurationSummary,
  type MassageServicePresentation,
} from '../../lib/massageServicePresentation';
import { isAdultService, isAdultServiceCategory } from '../../data/serviceCategories';

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
  const { service, image, imageAlt } = item;

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors duration-300 hover:border-white/20"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-ink">
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="flex flex-wrap items-center gap-2 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-white">
          {service.name}
          {isAdultService(service.name) || isAdultServiceCategory(service.category) ? (
            <span
              className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200"
              title="Adults-only (18+) service"
            >
              18+
            </span>
          ) : null}
        </h3>
        <p className="mt-1.5 line-clamp-2 min-h-[2.6em] text-[13.5px] leading-relaxed text-zinc-400">
          {service.tagline}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-white/[0.08] pt-4">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
              Duration
            </dt>
            <dd className="mt-1 text-[13.5px] font-medium text-zinc-200">
              {formatDurationSummary(service.durationMinutes)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
              From
            </dt>
            <dd className="mt-1 text-[15px] font-semibold tabular-nums text-white">
              GHS {service.basePriceGHS}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex shrink-0 flex-col gap-2.5 pt-5 sm:flex-row">
          <Button
            variant="secondary"
            onClick={onViewDetails}
            className="w-full shrink-0 sm:flex-1"
          >
            View details
          </Button>
          <Link
            to={bookMassageHref(service.id)}
            className={buttonClass({ className: 'w-full shrink-0 sm:flex-1' })}
          >
            Book A Massage
          </Link>
        </div>
      </div>
    </article>
  );
};
