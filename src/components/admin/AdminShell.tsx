import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  ScrollText,
  Settings2,
  Sparkles,
  Users,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { useAuth } from '../../auth/AuthContext';
import { SearchInput } from './SearchInput';
import { AdminPageHeader } from './AdminPageHeader';

export type AdminNavItem = {
  id: string;
  label: string;
  badge?: number;
  icon?: LucideIcon;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

const ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  bookings: CalendarDays,
  services: Sparkles,
  customers: Users,
  providers: UserRound,
  staff: ClipboardList,
  content: FileText,
  media: ImageIcon,
  updates: Megaphone,
  system: Settings2,
  audit: ScrollText,
};

type Props = {
  title: string;
  subtitle?: string;
  breadcrumbs: string[];
  navGroups: AdminNavGroup[];
  active: string;
  onNavigate: (id: string) => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  globalSearch?: string;
  onGlobalSearchChange?: (value: string) => void;
};

export const AdminShell: React.FC<Props> = ({
  title,
  subtitle,
  breadcrumbs,
  navGroups,
  active,
  onNavigate,
  headerActions,
  children,
  globalSearch = '',
  onGlobalSearchChange,
}) => {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = useMemo(() => {
    const first = user?.firstName?.[0] ?? 'A';
    const last = user?.lastName?.[0] ?? '';
    return `${first}${last}`.toUpperCase();
  }, [user?.firstName, user?.lastName]);

  const renderNav = (onItemClick?: () => void) => (
    <nav className="min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto px-3 pb-4" aria-label="Admin sections">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8174]">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon ?? ICONS[item.id] ?? LayoutDashboard;
              const isActive = item.id === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    onNavigate(item.id);
                    onItemClick?.();
                  }}
                  className={`group flex min-h-11 w-full items-center gap-3 rounded-[14px] px-3 text-left text-[13.5px] font-medium transition ${
                    isActive
                      ? 'bg-[linear-gradient(135deg,rgba(176,139,75,0.28),rgba(176,139,75,0.12))] text-[#F7F4EF] shadow-[inset_0_0_0_1px_rgba(201,165,106,0.35)]'
                      : 'text-[#cfc6b8] hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#C9A56A]' : 'text-[#9a9184] group-hover:text-[#C9A56A]'}`} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 ? (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                        isActive ? 'bg-[#161616]/55 text-[#E8D5A8]' : 'bg-[#B08B4B]/20 text-[#E8D5A8]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const sidebar = (
    <div className="relative flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,#171717_0%,#121212_55%,#101010_100%)] text-[#F7F4EF]">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(ellipse_at_bottom,rgba(176,139,75,0.14),transparent_70%)]" />
      <div className="relative shrink-0 border-b border-white/[0.06] px-5 pb-5 pt-6">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="inline-flex min-h-11 min-w-0 items-center" aria-label="Massager Studio home">
            <BrandLogo variant="plate" withWordmark markHeight={26} />
          </Link>
          <button
            type="button"
            className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#a89e8a] hover:text-white lg:hidden"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-4 font-display text-[20px] font-semibold tracking-wide text-[#C9A56A]">
          Admin Workspace
        </p>
      </div>

      {renderNav(() => setDrawerOpen(false))}

      <div className="relative mt-auto shrink-0 border-t border-white/[0.06] p-3">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-[13px] font-medium text-[#a89e8a] transition hover:bg-white/[0.05] hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          Back to website
        </Link>
      </div>
    </div>
  );

  return (
    <div className="ms-admin grid min-h-screen w-full max-w-full overflow-x-hidden bg-[#FAF7F2] text-[#161616] lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden h-screen min-w-0 overflow-x-hidden overflow-y-auto lg:sticky lg:top-0 lg:block" aria-label="Sidebar">
        {sidebar}
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="relative h-full w-[min(280px,86vw)] max-w-full overflow-x-hidden shadow-2xl">{sidebar}</div>
        </div>
      ) : null}

      <div className="min-w-0 max-w-full overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-[#e8e0d2] bg-[#FAF7F2]/90 backdrop-blur-md">
          <div className="flex min-h-[72px] min-w-0 items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-[#e0d7c8] bg-white text-[#161616] lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <SearchInput
              className="hidden min-w-0 max-w-md flex-1 md:block"
              value={globalSearch}
              onChange={(v) => onGlobalSearchChange?.(v)}
              placeholder="Search anything…"
              shortcut="⌘ K"
            />

            <div className="ml-auto flex min-w-0 shrink items-center gap-1.5 sm:gap-2">
              <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-[#e0d7c8] bg-white text-[#6f675c] hover:text-[#161616]" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </button>
              <button type="button" className="hidden h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-[#e0d7c8] bg-white text-[#6f675c] hover:text-[#161616] sm:grid" aria-label="Help">
                <CircleHelp className="h-4 w-4" />
              </button>

              <div className="relative min-w-0">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex min-h-11 max-w-full items-center gap-2 rounded-[14px] border border-[#e0d7c8] bg-white py-1.5 pl-1.5 pr-2 sm:gap-2.5 sm:pr-3"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#161616] text-[11px] font-semibold text-[#F7F4EF]">
                    {initials}
                  </span>
                  <span className="hidden min-w-0 text-left md:block">
                    <span className="block text-[12.5px] font-semibold leading-tight">Admin</span>
                    <span className="block max-w-[140px] truncate text-[11px] text-[#6f675c] lg:max-w-[180px]" title={user?.email}>
                      {user?.email}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#8a7a52]" aria-hidden />
                </button>
                {menuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-52 overflow-hidden rounded-[14px] border border-[#e8e0d2] bg-white py-1 shadow-lg"
                  >
                    <p className="truncate border-b border-[#efe8dc] px-3 py-2 text-[11px] text-[#6f675c] md:hidden" title={user?.email}>
                      {user?.email}
                    </p>
                    <Link
                      role="menuitem"
                      to="/"
                      className="block px-3 py-2.5 text-[13px] hover:bg-[#faf7f2]"
                      onClick={() => setMenuOpen(false)}
                    >
                      View website
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2.5 text-left text-[13px] hover:bg-[#faf7f2]"
                      onClick={() => {
                        setMenuOpen(false);
                        void logout();
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 max-w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <AdminPageHeader
            breadcrumbs={breadcrumbs}
            title={title}
            subtitle={subtitle}
            actions={headerActions}
          />
          <div className="min-w-0 max-w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
