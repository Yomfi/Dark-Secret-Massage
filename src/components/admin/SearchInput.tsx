import React, { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { adminInputClass } from './FormField';

export const SearchInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  shortcut?: string;
  className?: string;
  onSubmit?: () => void;
}> = ({ value, onChange, placeholder = 'Search…', shortcut, className = '', onSubmit }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shortcut !== '⌘ K') return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcut]);

  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9184]" aria-hidden />
      <input
        ref={inputRef}
        className={`${adminInputClass} pl-10 ${shortcut ? 'pr-16' : ''}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSubmit) onSubmit();
        }}
        aria-label={placeholder}
      />
      {shortcut ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[#e8e0d2] bg-[#faf7f2] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#8a7a52]">
          {shortcut}
        </span>
      ) : null}
    </div>
  );
};
