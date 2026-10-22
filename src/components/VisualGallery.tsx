import React from 'react';
import { VisualMedia } from './VisualMedia';

export const VisualGallery: React.FC = () => {
  const cards = [
    {
      id: 1,
      type: 'gallery-dinner' as const,
      category: 'IN-STUDIO CARE',
      title: 'Professional Treatment Rooms',
    },
    {
      id: 2,
      type: 'gallery-spa' as const,
      category: 'PROFESSIONAL WELLNESS',
      title: 'Calm Treatment Spaces',
    },
    {
      id: 3,
      type: 'gallery-retreat' as const,
      category: 'MOBILE SERVICE',
      title: 'Wellness Where You Are',
    },
  ];

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
      <div className="max-w-3xl mb-12 sm:mb-16">
        <span className="text-xs uppercase tracking-[0.3em] text-purple-400 font-semibold block mb-3">
          ATMOSPHERE & SPACES
        </span>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white font-sans leading-[1.08]">
          Curated spaces. Undisturbed peace.
        </h2>
        <p className="mt-4 text-lg sm:text-xl text-zinc-300 font-normal leading-relaxed">
          Calm, discreet environments selected for restorative massage and wellness.
        </p>
      </div>

      {/* 3 Visually Strong Photography Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {cards.map((card) => (
          <div
            key={card.id}
            className="group relative rounded-3xl overflow-hidden border border-white/[0.08] bg-[#09090f] flex flex-col hover:border-purple-500/40 transition-all duration-300"
          >
            {/* Large Photograph */}
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <VisualMedia
                type={card.type}
                className="w-full h-full"
                alt={`${card.category} — ${card.title}`}
              />
            </div>

            {/* Content Below Photo: Short Category Label + Short Title (No paragraphs) */}
            <div className="p-6 bg-gradient-to-b from-[#09090f] to-[#060608]">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-400 block mb-1.5">
                {card.category}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-purple-200 transition-colors">
                {card.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
