import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  onOpenBooking: () => void;
  onOpenDashboard: () => void;
  isAuthenticated?: boolean;
}

const linkClass =
  'text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-300/90 hover:text-brand-gold-light transition-colors duration-200 whitespace-nowrap cursor-pointer';

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBooking,
  onOpenDashboard,
  isAuthenticated = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goExplore = () => {
    setMobileMenuOpen(false);
    navigate('/explore/accra');
  };

  const goBecomeProvider = () => {
    setMobileMenuOpen(false);
    navigate('/provider/register');
  };

  const shellClass = [
    'relative w-[90%] max-w-5xl mx-auto rounded-full border backdrop-blur-xl transition-all duration-300',
    isScrolled
      ? 'bg-[#08080c]/92 border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.45)]'
      : 'bg-[#08080c]/55 border-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.25)]',
  ].join(' ');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-3 sm:pt-4 pointer-events-none">
      <div className={`${shellClass} pointer-events-auto`}>
        <div className="hidden xl:grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-2.5 min-h-[52px]">
          <nav className="flex items-center justify-start gap-3.5 min-w-0">
            <Link to="/" className={linkClass}>
              Home
            </Link>
            <button type="button" onClick={goExplore} className={linkClass}>
              Explore
            </button>
            <Link to="/massage" className={linkClass}>
              Massage
            </Link>
            <a href="/#safety" className={linkClass}>
              Safety
            </a>
          </nav>

          <Link
            to="/"
            className="group flex items-center justify-center shrink-0 px-1"
            aria-label="Massager Studio home"
          >
            <BrandLogo variant="plate" markHeight={26} />
          </Link>

          <div className="flex items-center justify-end gap-2 min-w-0">
            <Link
              to="/provider/register"
              className="inline-flex items-center px-3 py-1.5 text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-300 hover:text-brand-gold-light transition-colors duration-200 whitespace-nowrap"
            >
              Become a Provider
            </Link>
            <button
              type="button"
              onClick={onOpenDashboard}
              className="inline-flex items-center px-3.5 py-1.5 text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-300 hover:text-white border border-white/15 hover:border-brand-gold/35 rounded-full bg-transparent transition-colors duration-200 cursor-pointer whitespace-nowrap"
            >
              {isAuthenticated ? 'Client Portal' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={onOpenBooking}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-medium tracking-[0.14em] uppercase text-brand-ink bg-brand-gold hover:bg-brand-gold-light rounded-full transition-colors duration-200 cursor-pointer whitespace-nowrap shadow-md shadow-brand-ink/40"
            >
              Book Massage
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <div className="xl:hidden relative flex items-center justify-between gap-2 px-3 sm:px-4 py-2 min-h-[48px]">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="relative z-10 p-2 -ml-1 text-zinc-300 hover:text-white rounded-lg transition-colors"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link
            to="/"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            aria-label="Massager Studio home"
            onClick={() => setMobileMenuOpen(false)}
          >
            <BrandLogo variant="plate" markHeight={24} />
          </Link>

          <button
            type="button"
            onClick={onOpenBooking}
            className="relative z-10 shrink-0 inline-flex items-center px-3 py-1.5 text-[10px] sm:text-[11px] font-medium tracking-[0.12em] uppercase text-brand-ink bg-brand-gold hover:bg-brand-gold-light rounded-full transition-colors"
          >
            Book
            <span className="hidden sm:inline ml-1">Massage</span>
            <span className="ml-1" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="xl:hidden pointer-events-auto mt-2 w-[90%] max-w-5xl mx-auto bg-[#0a0a0f]/96 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 shadow-2xl">
          <div className="mb-4 flex items-center gap-3">
            <BrandLogo variant="plate" markHeight={28} withWordmark />
          </div>
          <nav className="flex flex-col gap-1 text-sm uppercase tracking-[0.18em] text-zinc-300">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 rounded-xl hover:bg-white/[0.04] hover:text-brand-gold-light transition-colors"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={goExplore}
              className="py-3 px-2 rounded-xl text-left hover:bg-white/[0.04] hover:text-brand-gold-light transition-colors"
            >
              Explore
            </button>
            <Link
              to="/massage"
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 rounded-xl hover:bg-white/[0.04] hover:text-brand-gold-light transition-colors"
            >
              Massage
            </Link>
            <a
              href="/#safety"
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 rounded-xl hover:bg-white/[0.04] hover:text-brand-gold-light transition-colors"
            >
              Safety
            </a>
            <button
              type="button"
              onClick={goBecomeProvider}
              className="py-3 px-2 rounded-xl text-left hover:bg-white/[0.04] hover:text-brand-gold-light transition-colors"
            >
              Become a Provider
            </button>
          </nav>
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDashboard();
              }}
              className="w-full min-h-[44px] py-2.5 text-xs uppercase tracking-widest font-medium text-zinc-200 border border-white/15 rounded-full hover:border-brand-gold/35 hover:text-white transition-colors"
            >
              {isAuthenticated ? 'Client Portal' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full min-h-[44px] py-2.5 text-xs uppercase tracking-widest font-medium text-brand-ink bg-brand-gold hover:bg-brand-gold-light rounded-full transition-colors"
            >
              Book Massage →
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
