import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Container } from './ui/Layout';
import { Button, buttonClass } from './ui/Button';

interface NavbarProps {
  onOpenBooking: () => void;
  onOpenDashboard: () => void;
  isAuthenticated?: boolean;
}

const navLinkClass =
  'inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-2.5 text-[13.5px] font-medium text-zinc-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80';

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBooking,
  onOpenDashboard,
  isAuthenticated = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goExplore = () => {
    setMobileMenuOpen(false);
    navigate('/explore/accra');
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300',
        isScrolled
          ? 'border-white/10 bg-brand-surface/95 backdrop-blur-xl'
          : 'border-transparent bg-gradient-to-b from-brand-surface/90 to-brand-surface/40 backdrop-blur-md',
      ].join(' ')}
    >
      <Container className="flex h-16 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <Link
            to="/"
            className="mr-2 inline-flex min-h-11 shrink-0 items-center rounded-lg"
            aria-label="Massager Studio home"
          >
            <BrandLogo variant="plate" withWordmark markHeight={26} />
          </Link>

          <nav className="hidden items-center lg:flex" aria-label="Primary">
            <button type="button" onClick={goExplore} className={navLinkClass}>
              Explore
            </button>
            <Link to="/provider/register" className={navLinkClass}>
              For providers
            </Link>
          </nav>
        </div>

        {/* shrink-0 keeps the primary CTA at its full width: the label used to
            truncate around 1280px when the flex row compressed. */}
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <Button variant="ghost" size="sm" onClick={onOpenDashboard} className="shrink-0">
            {isAuthenticated ? 'My account' : 'Sign in'}
          </Button>
          <Button size="sm" onClick={onOpenBooking} className="shrink-0 px-4 whitespace-nowrap">
            Book A Massage
          </Button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:hidden">
          <Button size="sm" onClick={onOpenBooking} className="shrink-0 px-3 whitespace-nowrap text-[12.5px]">
            Book A Massage
          </Button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/12 text-zinc-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      {mobileMenuOpen ? (
        <div className="border-t border-white/10 bg-brand-surface/98 backdrop-blur-xl sm:hidden">
          <Container className="py-3">
            <nav className="flex flex-col" aria-label="Mobile">
              <button
                type="button"
                onClick={goExplore}
                className="flex min-h-12 items-center rounded-xl px-3 text-left text-[14px] font-medium text-zinc-200 hover:bg-white/[0.05]"
              >
                Explore
              </button>
              <Link
                to="/provider/register"
                onClick={closeMenu}
                className="flex min-h-12 items-center rounded-xl px-3 text-[14px] font-medium text-zinc-200 hover:bg-white/[0.05]"
              >
                For providers
              </Link>
              <div className="mt-2 border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onOpenDashboard();
                  }}
                  className={buttonClass({ variant: 'secondary', fullWidth: true, size: 'sm' })}
                >
                  {isAuthenticated ? 'My account' : 'Sign in'}
                </button>
              </div>
            </nav>
          </Container>
        </div>
      ) : null}
    </header>
  );
};
