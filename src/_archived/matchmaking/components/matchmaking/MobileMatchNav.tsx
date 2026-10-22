import React from 'react';
import { Compass, Heart, MessageCircle, UserRound } from 'lucide-react';
import type { DiscoveryView } from '../../lib/matchDiscovery';

interface MobileMatchNavProps {
  active: DiscoveryView;
  onChange: (view: DiscoveryView) => void;
  interestCount?: number;
}

const ITEMS: { id: DiscoveryView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'interests', label: 'Interests', icon: Heart },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

export const MobileMatchNav: React.FC<MobileMatchNavProps> = ({
  active,
  onChange,
  interestCount = 0,
}) => {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.08] bg-[#060608]/95 backdrop-blur-xl px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id || (id === 'interests' && active === 'connections');
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`relative flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-semibold uppercase tracking-wider cursor-pointer ${
                isActive ? 'text-purple-300' : 'text-zinc-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {id === 'interests' && interestCount > 0 && (
                <span className="absolute top-2 right-[28%] h-4 min-w-4 px-1 rounded-full bg-purple-600 text-[10px] text-white font-bold flex items-center justify-center">
                  {interestCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
