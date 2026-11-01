import React from 'react';
import type { MassageServicePresentation } from '../../lib/massageServicePresentation';
import { MassageServiceCard } from './MassageServiceCard';
import { Section, SectionHeading } from '../ui/Layout';

interface MassageServiceGridProps {
  items: MassageServicePresentation[];
  onViewDetails: (serviceId: string) => void;
}

export const MassageServiceGrid: React.FC<MassageServiceGridProps> = ({
  items,
  onViewDetails,
}) => {
  return (
    <Section id="services" divider>
      <SectionHeading
        eyebrow="Services"
        title="Choose your therapy"
        description="Every session is led by a reviewed provider. Pick a therapy to see what it involves, or go straight to booking."
      />

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
