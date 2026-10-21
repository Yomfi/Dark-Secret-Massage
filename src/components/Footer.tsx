import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

interface FooterProps {
  onOpenMatchmaking?: () => void;
  onOpenBooking?: () => void;
  onOpenDashboard?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenMatchmaking,
  onOpenBooking,
  onOpenDashboard,
}) => {
  const goMatchmaking = onOpenMatchmaking || (() => {});
  const goBooking = onOpenBooking || (() => {});
  const goDashboard = onOpenDashboard || (() => {});
  return (
    <footer className="border-t border-white/[0.08] bg-[#050507] text-zinc-400 py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
        {/* Brand Column */}
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-sm font-bold tracking-[0.3em] uppercase text-white font-sans">
              DARK SECRET
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-light max-w-sm">
            One private, verified platform for intentional matrimonial relationships and trusted
            professional massage wellness for African executives and diaspora leaders.
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-400 pt-2">
            <MapPin className="w-3.5 h-3.5 text-purple-400" />
            <span>Accra (Airport Residential, Cantonments) & London</span>
          </div>
        </div>

        {/* Column 2: Intentional Matchmaking */}
        <div className="md:col-span-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-white">
            Matrimonial Guild
          </div>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                onClick={goMatchmaking}
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                Find a Life Partner
              </button>
            </li>
            <li>
              <button
                onClick={goMatchmaking}
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                Vetted Member Directory
              </button>
            </li>
            <li>
              <a href="#safety" className="hover:text-white transition-colors">
                Values & Faith Alignment
              </a>
            </li>
            <li>
              <a href="#safety" className="hover:text-white transition-colors">
                Candidate Vetting Process
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: Professional Massage */}
        <div className="md:col-span-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-white">
            Massage Wellness
          </div>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/massage" className="hover:text-white transition-colors">
                Explore Massage Services
              </Link>
            </li>
            <li>
              <button
                onClick={goBooking}
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                Book a Session
              </button>
            </li>
            <li>
              <Link to="/massage" className="hover:text-white transition-colors">
                In-Studio & Home Visits
              </Link>
            </li>
            <li>
              <a href="#safety" className="hover:text-white transition-colors">
                Hygiene & Clinical Ethics
              </a>
            </li>
          </ul>
        </div>

        {/* Column 4: Private Access & Trust */}
        <div className="md:col-span-2 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-white">
            Client Access
          </div>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                onClick={goDashboard}
                className="hover:text-purple-300 transition-colors cursor-pointer text-left"
              >
                Member Portal
              </button>
            </li>
            <li>
              <a href="#safety" className="hover:text-white transition-colors">
                Privacy Charter
              </a>
            </li>
            <li>
              <a href="#safety" className="hover:text-white transition-colors">
                Code of Conduct
              </a>
            </li>
            <li>
              <span className="text-zinc-400">Strict Non-Disclosure</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
        <div>
          © {new Date().getFullYear()} Dark Secret. All rights reserved. Confidentially operated.
        </div>
        <div className="flex items-center gap-6">
          <span>Encrypted 256-Bit SSL</span>
          <span>Zero Public Indexing</span>
          <span>Ghana Allied Health Registered</span>
        </div>
      </div>
    </footer>
  );
};
