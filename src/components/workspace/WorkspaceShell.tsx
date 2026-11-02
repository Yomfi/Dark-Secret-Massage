import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';

export type WorkspaceNavItem = {
  id: string;
  label: string;
  badge?: number;
};

type Props = {
  roleLabel: string;
  title: string;
  subtitle?: string;
  nav: WorkspaceNavItem[];
  active: string;
  onNavigate: (id: string) => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

/**
 * Application chrome shared by the admin, provider and customer workspaces.
 * Deliberately distinct from the marketing site: dark sidebar, warm canvas.
 */
export const WorkspaceShell: React.FC<Props> = ({
  roleLabel,
  title,
  subtitle,
  nav,
  active,
  onNavigate,
  children,
  actions,
}) => {
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col gap-6 bg-[#16130f] px-4 py-5 text-[#e9e2d3]">
      <Link to="/" className="inline-flex min-h-11 items-center rounded-lg px-2" aria-label="Massager Studio home">
        <BrandLogo variant="plate" withWordmark markHeight={26} />
      </Link>

      <p className="px-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#c9a227]">{roleLabel}</p>

      <nav className="flex-1 space-y-1" aria-label={`${roleLabel} sections`}>
        {nav.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id);
                setOpen(false);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a227] ${
                isActive
                  ? 'bg-[#c9a227] text-[#16130f]'
                  : 'text-[#cfc6b4] hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <span>{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isActive ? 'bg-[#16130f] text-[#e5c17a]' : 'bg-[#c9a227]/20 text-[#e5c17a]'
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <Link
        to="/"
        className="flex min-h-11 items-center rounded-xl px-3 text-[12.5px] font-medium text-[#a89e8a] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a227]"
      >
        Back to website
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f3ea] text-[#221f19] lg:flex">
      <aside className="hidden w-64 shrink-0 lg:block" aria-label="Sidebar">
        <div className="fixed inset-y-0 left-0 w-64">{sidebar}</div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-72 max-w-[85vw]">{sidebar}</div>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-[#e6dfd2] bg-[#f7f3ea]/95 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-grid h-12 w-12 place-items-center rounded-xl border border-[#d9cfba] text-[#221f19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8862f] lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a7a52]">{roleLabel}</p>
                <h1 className="truncate text-[19px] font-semibold tracking-tight">{title}</h1>
                {subtitle ? <p className="truncate text-[12.5px] text-[#6b6252]">{subtitle}</p> : null}
              </div>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
};

export default WorkspaceShell;
