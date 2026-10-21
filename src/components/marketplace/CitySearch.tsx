import React, { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import { cityExplorePath, searchCities, type MarketplaceCity } from '../../data/locations';

type CitySearchProps = {
  variant?: 'hero' | 'toolbar';
  initialSlug?: string;
  onNavigate?: (slug: string) => void;
  className?: string;
};

export const CitySearch: React.FC<CitySearchProps> = ({
  variant = 'hero',
  initialSlug,
  onNavigate,
  className = '',
}) => {
  const navigate = useNavigate();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<MarketplaceCity | null>(null);
  const [highlight, setHighlight] = useState(0);

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

  const isHero = variant === 'hero';
  const showList = open && suggestions.length > 0;

  // Hero: in-flow list reserves vertical space so trust/next sections never sit under it.
  // Toolbar: absolute overlay keeps the filter bar compact.
  const listClassName = isHero
    ? 'relative z-30 w-full mt-2 max-h-[min(16rem,45vh)] overflow-y-auto overscroll-contain rounded-2xl border border-white/12 bg-[#0c0c12] shadow-[0_24px_48px_rgba(0,0,0,0.85)] py-2'
    : 'absolute z-50 left-0 right-0 mt-2 max-h-[min(16rem,45vh)] overflow-y-auto overscroll-contain rounded-2xl border border-white/12 bg-[#0c0c12] shadow-[0_24px_48px_rgba(0,0,0,0.85)] py-2';

  return (
    <div
      ref={wrapRef}
      className={`relative w-full ${isHero ? 'z-30' : 'z-20'} ${className}`}
    >
      <div
        className={
          isHero
            ? 'flex flex-col sm:flex-row gap-2 sm:gap-0 w-full rounded-2xl sm:rounded-full border border-white/15 bg-black/50 backdrop-blur-xl p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]'
            : 'flex flex-col sm:flex-row gap-2 sm:gap-0 w-full rounded-xl border border-white/10 bg-white/[0.04] p-1'
        }
      >
        <label className="flex flex-1 items-center gap-2 px-3 sm:px-4 min-h-[48px]">
          <MapPin className="w-4 h-4 text-purple-300 shrink-0" aria-hidden />
          <input
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
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
            className="flex-1 bg-transparent border-0 outline-none text-sm sm:text-base text-white placeholder:text-zinc-500"
          />
        </label>
        <button
          type="button"
          onClick={submit}
          className={
            isHero
              ? 'inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-xl sm:rounded-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold tracking-wide transition-colors'
              : 'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold uppercase tracking-wider transition-colors'
          }
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>

      {showList && (
        <ul id={listId} role="listbox" className={listClassName}>
          {suggestions.map((city, i) => (
            <li key={city.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => go(city)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  i === highlight ? 'bg-purple-500/15 text-white' : 'text-zinc-300 hover:bg-white/[0.04]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <span>{city.name}</span>
                <span className="ml-auto text-[10px] uppercase tracking-widest text-zinc-500">Ghana</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
