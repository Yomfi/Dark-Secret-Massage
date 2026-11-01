import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';

export const BookingHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#060608]/90 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[4.25rem] flex items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center min-w-0"
          aria-label="Massager Studio home"
        >
          <BrandLogo variant="plate" withWordmark markHeight={28} />
        </Link>

        <Link
          to="/massage"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Back to Massage Services</span>
          <span className="sm:hidden">Massage</span>
        </Link>
      </div>
    </header>
  );
};
