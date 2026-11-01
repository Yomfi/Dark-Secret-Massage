import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import { cityExplorePath, searchCities, type MarketplaceCity } from '../../data/locations';
import { buttonClass } from '../ui/Button';

export type CitySearchHandle = {
  submit: () => void;
};

type CitySearchProps = {
  variant?: 'hero' | 'toolbar';
  initialSlug?: string;
  onNavigate?: (slug: string) => void;
  className?: string;
  /** When false, only the location field is rendered (Search lives in its own toolbar column). */
  showSubmitButton?: boolean;
};

export const CitySearch = forwardRef<CitySearchHandle, CitySearchProps>(function CitySearch(
  { variant = 'hero', initialSlug, onNavigate, className = '', showSubmitButton },
  ref,
) {
  const navigate = useNavigate();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<MarketplaceCity | null>(null);
  const [highlight, setHighlight] = useState(0);

  const isHero = variant === 'hero';
  const withButton = showSubmitButton ?? isHero;
  const suggestions = searchCities(query, 8);

  useEffect(() => {
    if (!initialSlug) return;
    const match = searchCities(initialSlug, 20).find((c) => c.slug === initialSlug);
    if (match) {
      setSelected(match);
      setQuery(match.name);
    }
  }, [initialSlug]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const go = (city: MarketplaceCity) => {
    setSelected(city);
    setQuery(city.name);
    setOpen(false);
    if (onNavigate) onNavigate(city.slug);
    else navigate(cityExplorePath(city.slug));
  };

  const submit = () => {
    const city =
      selected && selected.name.toLowerCase() === query.trim().toLowerCase()
        ? selected
        : suggestions[0];
    if (city) go(city);
  };

  useImperativeHandle(ref, () => ({ submit }), [selected, query, suggestions]);

  const showList = open && suggestions.length > 0;

  const listClassName = isHero
    ? 'relative z-30 mt-2 max-h-[min(16rem,45vh)] w-full overflow-y-auto overscroll-contain rounded-xl border border-white/12 bg-brand-surface-elevated py-1.5 shadow-2xl'
    : 'absolute left-0 right-0 z-50 mt-2 max-h-[min(16rem,45vh)] overflow-y-auto overscroll-contain rounded-xl border border-white/12 bg-brand-surface-elevated py-1.5 shadow-2xl';

  return (
    <div ref={wrapRef} className={`relative w-full min-w-0 ${isHero ? 'z-30' : 'z-20'} ${className}`}>
      <div
        className={
          isHero
            ? 'flex w-full flex-col gap-2 rounded-xl border border-white/12 bg-black/45 p-1.5 backdrop-blur-xl sm:flex-row sm:items-center'
            : 'flex min-h-12 w-full items-center rounded-xl border border-white/12 bg-white/[0.04] px-3'
        }
      >
        <label className={`flex min-w-0 flex-1 items-center gap-2.5 ${isHero ? 'min-h-12 px-2.5' : ''}`}>
          <MapPin className="h-4 w-4 shrink-0 text-brand-gold-light" aria-hidden />
          <input
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-label="City"
            value={query}
            placeholder="Where are you looking?"
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (open && suggestions[highlight]) go(suggestions[highlight]);
                else submit();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setOpen(true);
                setHighlight((h) => Math.min(h + 1, Math.max(suggestions.length - 1, 0)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-white outline-none placeholder:text-zinc-500"
          />
        </label>
        {withButton ? (
          <button
            type="button"
            onClick={submit}
            className={buttonClass({
              size: isHero ? 'md' : 'sm',
              className: isHero ? 'w-full sm:w-auto' : 'shrink-0',
            })}
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span>Search</span>
          </button>
        ) : null}
      </div>

      {showList ? (
        <ul id={listId} role="listbox" className={listClassName}>
          {suggestions.map((city, i) => (
            <li key={city.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => go(city)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13.5px] transition-colors ${
                  i === highlight ? 'bg-brand-gold/15 text-white' : 'text-zinc-300 hover:bg-white/[0.05]'
                }`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-gold-light" aria-hidden />
                <span>{city.name}</span>
                <span className="ml-auto text-[11px] text-zinc-500">Ghana</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});
