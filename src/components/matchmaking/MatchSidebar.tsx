import React from 'react';
import {
  Compass,
  Heart,
  Users,
  Bookmark,
  MessageCircle,
  UserRound,
  SlidersHorizontal,
} from 'lucide-react';
import type { DiscoveryView } from '../../lib/matchDiscovery';

interface MatchSidebarProps {
  active: DiscoveryView;
  onChange: (view: DiscoveryView) => void;
  counts?: Partial<Record<DiscoveryView, number>>;
}

const ITEMS: { id: DiscoveryView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'interests', label: 'Interests', icon: Heart },
  { id: 'connections', label: 'Connections', icon: Users },
  { id: 'saved', label: 'Saved Profiles', icon: Bookmark },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'profile', label: 'My Profile', icon: UserRound },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
];

export const MatchSidebar: React.FC<MatchSidebarProps> = ({ active, onChange, counts }) => {
  return (
    <aside className="hidden lg:flex w-[220px] xl:w-[240px] shrink-0 flex-col border-r border-white/[0.06] bg-[#08080c] py-6 px-3">
      <nav className="space-y-1">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          const count = counts?.[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                isActive
                  ? 'bg-purple-600/20 text-white border border-purple-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-purple-300' : ''}`} />
              <span className="flex-1 text-left">{label}</span>
              {typeof count === 'number' && count > 0 && (
                <span className="text-[11px] font-bold text-purple-300 bg-purple-950/60 border border-purple-500/20 rounded-full px-1.5 py-0.5">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
