import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, UserCheck } from 'lucide-react';

interface NavbarProps {
  onOpenMatchmaking: () => void;
  onOpenBooking: () => void;
  onOpenDashboard: () => void;
  isAuthenticated?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMatchmaking,
  onOpenBooking,
  onOpenDashboard,
  isAuthenticated = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goExplore = () => {
    setMobileMenuOpen(false);
    navigate('/explore/accra');
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'py-3 sm:py-4 px-4 sm:px-6'
          : 'py-5 sm:py-7 px-4 sm:px-8 bg-transparent'
      }`}
    >
      <div
        className={`max-w-7xl mx-auto transition-all duration-300 ${
          isScrolled
            ? 'max-w-5xl bg-[#08080c]/80 backdrop-blur-xl border border-white/10 rounded-full px-5 sm:px-8 py-2.5 shadow-2xl shadow-purple-950/20'
            : 'bg-transparent'
        } flex items-center justify-between`}
      >
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs font-medium uppercase tracking-[0.2em] text-zinc-300/90">
          <Link to="/" className="hover:text-white transition-colors whitespace-nowrap drop-shadow-sm">
            Home
          </Link>
          <button
            type="button"
            onClick={goExplore}
            className="hover:text-purple-300 transition-colors cursor-pointer text-left uppercase tracking-[0.2em] whitespace-nowrap drop-shadow-sm"
          >
            Explore
          </button>
          <Link
            to="/massage"
            className="hover:text-purple-300 transition-colors whitespace-nowrap drop-shadow-sm"
          >
            Massage
          </Link>
          <button
            type="button"
            onClick={onOpenMatchmaking}
            className="hover:text-purple-300 transition-colors cursor-pointer text-left uppercase tracking-[0.2em] whitespace-nowrap drop-shadow-sm"
          >
            Matchmaking
          </button>
          <a
            href="/#safety"
            className="hover:text-white transition-colors whitespace-nowrap drop-shadow-sm"
          >
            Safety
          </a>
        </nav>

        <div className="flex-1 lg:flex-none flex items-center justify-start lg:justify-center">
          <Link
            to="/"
            className="group flex items-center gap-2.5 text-center transition-transform hover:opacity-95"
            aria-label="Dark Secret home"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <span className="text-sm sm:text-base font-semibold tracking-[0.35em] uppercase text-white font-sans drop-shadow-md">
              DARK SECRET
            </span>
          </Link>
        </div>

        <div className="hidden lg:flex items-center gap-4 xl:gap-5">
          <button
            type="button"
            onClick={onOpenDashboard}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium tracking-wider uppercase text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 rounded-full transition-all cursor-pointer whitespace-nowrap"
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>{isAuthenticated ? 'Client Portal' : 'Sign In'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenBooking}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium tracking-wider uppercase text-white bg-purple-600/90 hover:bg-purple-500 rounded-full shadow-lg shadow-purple-950/40 transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Book Massage</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="flex lg:hidden items-center gap-2">
          <button
            type="button"
            onClick={onOpenDashboard}
            className="px-3 py-1.5 text-[11px] font-medium tracking-wider uppercase text-zinc-200 bg-white/[0.06] border border-white/15 rounded-full"
          >
            Portal
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-300 hover:text-white rounded-lg focus:outline-none cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden mt-3 max-w-lg mx-auto bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
          <div className="flex flex-col gap-3 text-sm uppercase tracking-widest text-zinc-300">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="py-1.5 hover:text-white">
              Home
            </Link>
            <button type="button" onClick={goExplore} className="py-1.5 text-left hover:text-purple-300">
              Explore
            </button>
            <Link
              to="/massage"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-purple-300"
            >
              Massage
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenMatchmaking();
              }}
              className="py-1.5 text-left hover:text-purple-300"
            >
              Matchmaking
            </button>
            <a
              href="/#safety"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              Safety
            </a>
          </div>
          <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDashboard();
              }}
              className="w-full py-2.5 text-xs uppercase tracking-widest font-medium text-white bg-white/[0.06] border border-white/10 rounded-full text-center"
            >
              {isAuthenticated ? 'Client Portal' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full py-2.5 text-xs uppercase tracking-widest font-medium text-white bg-purple-600 rounded-full text-center"
            >
              Book a Massage →
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
