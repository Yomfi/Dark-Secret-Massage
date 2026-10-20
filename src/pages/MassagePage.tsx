import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MassageHero } from '../components/massage/MassageHero';
import { MassageServiceGrid } from '../components/massage/MassageServiceGrid';
import { MassageServiceDetails } from '../components/massage/MassageServiceDetails';
import { MassageHowItWorks } from '../components/massage/MassageHowItWorks';
import { MassageTrustStrip } from '../components/massage/MassageTrustStrip';
import { MassageFinalCTA } from '../components/massage/MassageFinalCTA';
import {
  getMassagePresentation,
  getMassagePresentations,
} from '../lib/massageServicePresentation';

export const MassagePage: React.FC = () => {
  const items = useMemo(() => getMassagePresentations(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? getMassagePresentation(selectedId) ?? null : null;

  const scrollToServices = () => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#060608] text-[#e4e4e9]">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#060608]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Dark Secret home">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-sm font-bold tracking-[0.28em] uppercase text-white">
              Dark Secret
            </span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6 text-sm font-semibold">
            <a
              href="#services"
              onClick={(e) => {
                e.preventDefault();
                scrollToServices();
              }}
              className="hidden sm:inline text-zinc-400 hover:text-white transition-colors"
            >
              Services
            </a>
            <Link to="/book-massage" className="text-purple-300 hover:text-purple-200 transition-colors">
              Book
            </Link>
            <Link to="/" className="text-zinc-400 hover:text-white transition-colors">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <MassageHero onViewServices={scrollToServices} />
        <MassageServiceGrid items={items} onViewDetails={setSelectedId} />
        <MassageHowItWorks />
        <MassageTrustStrip />
        <MassageFinalCTA />
      </main>

      <footer className="border-t border-white/[0.06] py-8 px-4 text-center text-sm text-zinc-500 font-medium">
        <Link to="/" className="hover:text-zinc-300 transition-colors">
          Return to Dark Secret home
        </Link>
      </footer>

      <MassageServiceDetails item={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
};
