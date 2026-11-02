import React from 'react';
import type { MassageServicePresentation } from '../../lib/massageServicePresentation';
import { MassageServiceCard } from './MassageServiceCard';
import { Section, SectionHeading } from '../ui/Layout';

interface MassageServiceGridProps {
  items: MassageServicePresentation[];
  loading?: boolean;
  onViewDetails: (serviceId: string) => void;
}

export const MassageServiceGrid: React.FC<MassageServiceGridProps> = ({
  items,
  loading = false,
  onViewDetails,
}) => {
  return (
    <Section id="services" divider>
      <SectionHeading
        eyebrow="Services"
        title="Choose your therapy"
        description="Every session is led by a reviewed provider. Pick a therapy to see what it involves, or go straight to booking."
      />

      {loading && items.length === 0 && (
        <p className="text-center text-base text-zinc-400">Loading the treatment menu…</p>
      )}

      {!loading && items.length === 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-10 text-center">
          <p className="text-lg font-semibold text-white">The treatment menu is being published</p>
          <p className="mx-auto mt-2 max-w-lg text-base text-zinc-400">
            Services appear here as soon as they are approved in the studio CMS. Nothing is shown
            until real treatments and prices are published.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {items.map((item, index) => (
          <MassageServiceCard
            key={item.service.id}
            item={item}
            index={index}
            onViewDetails={() => onViewDetails(item.service.id)}
          />
        ))}
      </div>
    </Section>
  );
};
