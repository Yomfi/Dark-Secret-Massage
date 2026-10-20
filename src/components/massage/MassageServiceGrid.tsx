import React from 'react';
import type { MassageServicePresentation } from '../../lib/massageServicePresentation';
import { MassageServiceCard } from './MassageServiceCard';

interface MassageServiceGridProps {
  items: MassageServicePresentation[];
  onViewDetails: (serviceId: string) => void;
}

export const MassageServiceGrid: React.FC<MassageServiceGridProps> = ({
  items,
  onViewDetails,
}) => {
  return (
    <section id="services" className="scroll-mt-24 py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="max-w-2xl mb-10 sm:mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-300 mb-3">
          Featured services
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-[1.1]">
          Choose your therapy
        </h2>
        <p className="mt-3 text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
          Select a service to review details or continue straight into booking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
        {items.map((item, index) => (
          <MassageServiceCard
            key={item.service.id}
            item={item}
            index={index}
            onViewDetails={() => onViewDetails(item.service.id)}
          />
        ))}
      </div>
    </section>
  );
};
