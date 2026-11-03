import React, { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { adminBtnCompactClass, adminBtnGhostCompactClass } from './FormField';

export type RowMenuItem = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
};

export const RowMenu: React.FC<{
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  primaryVariant?: 'solid' | 'ghost';
  items: RowMenuItem[];
}> = ({ primaryLabel, onPrimary, primaryDisabled, primaryVariant = 'solid', items }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const primaryClass = primaryVariant === 'ghost' ? adminBtnGhostCompactClass : adminBtnCompactClass;

  return (
    <div ref={rootRef} className="relative flex items-center justify-end gap-1.5">
      {primaryLabel && onPrimary ? (
        <button type="button" className={primaryClass} disabled={primaryDisabled} onClick={onPrimary}>
          {primaryLabel}
        </button>
      ) : null}
      {items.length > 0 ? (
        <>
          <button
            type="button"
            className={`${adminBtnGhostCompactClass} w-9 px-0`}
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </button>
          {open ? (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 top-full z-20 mt-1.5 min-w-[148px] overflow-hidden rounded-[12px] border border-[#e8e0d2] bg-white py-1 shadow-lg"
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className={`block w-full px-3 py-2.5 text-left text-[13px] transition hover:bg-[#faf7f2] disabled:opacity-50 ${
                    item.danger ? 'text-[#9b2c2c]' : 'text-[#161616]'
                  }`}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
