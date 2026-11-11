import React, {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, MapPin, Search } from 'lucide-react';
import {
  MARKETPLACE_REGIONS,
  POPULAR_LOCATIONS,
  citiesForRegion,
  cityExplorePath,
  findCityBySlug,
  findRegionBySlug,
  regionExplorePath,
  regionNameForCity,
  searchLocations,
  type MarketplaceCity,
  type MarketplaceRegion,
} from '../../data/locations';
import { buttonClass } from '../ui/Button';

export type CitySearchHandle = {
  submit: () => void;
};

type CitySearchProps = {
  variant?: 'hero' | 'toolbar';
  initialSlug?: string;
  initialRegionSlug?: string;
  onNavigate?: (slug: string) => void;
  onRegionNavigate?: (region: MarketplaceRegion) => void;
  className?: string;
  /** When false, only the location field is rendered (Search lives in its own toolbar column). */
  showSubmitButton?: boolean;
};

type LocationOption =
  | { id: string; kind: 'city'; label: string; city: MarketplaceCity }
  | { id: string; kind: 'region'; label: string; region: MarketplaceRegion };

function preferredCityLabel(city: MarketplaceCity): string {
  return POPULAR_LOCATIONS.find((entry) => entry.city.id === city.id)?.label ?? city.name;
}

function cityOption(city: MarketplaceCity, label = preferredCityLabel(city)): LocationOption {
  return { id: `city-${city.id}`, kind: 'city', label, city };
}

function regionOption(region: MarketplaceRegion): LocationOption {
  return { id: `region-${region.id}`, kind: 'region', label: region.name, region };
}

function sectionLabel(text: string) {
  return (
    <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-purple-light">
      {text}
    </p>
  );
}

export const CitySearch = forwardRef<CitySearchHandle, CitySearchProps>(function CitySearch(
  {
    variant = 'hero',
    initialSlug,
    initialRegionSlug,
    onNavigate,
    onRegionNavigate,
    className = '',
    showSubmitButton,
  },
  ref,
) {
  const navigate = useNavigate();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedCity, setSelectedCity] = useState<MarketplaceCity | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<MarketplaceRegion | null>(null);
  const [highlight, setHighlight] = useState(0);

  const isHero = variant === 'hero';
  const withButton = showSubmitButton ?? isHero;
  const trimmedQuery = query.trim();

  const popularOptions = useMemo(
    () => POPULAR_LOCATIONS.map(({ city, label }) => cityOption(city, label)),
    [],
  );
  const regionOptions = useMemo(() => MARKETPLACE_REGIONS.map(regionOption), []);
  const groupedCities = useMemo(() => {
    const shownAsPopular = new Set(POPULAR_LOCATIONS.map(({ city }) => city.id));
    return MARKETPLACE_REGIONS.map((region) => ({
      region,
      cities: citiesForRegion(region.id)
        .filter((city) => !shownAsPopular.has(city.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((group) => group.cities.length > 0);
  }, []);

  const searchOptions = useMemo(
    () =>
      searchLocations(trimmedQuery).map((match) =>
        match.kind === 'city' ? cityOption(match.city) : regionOption(match.region),
      ),
    [trimmedQuery],
  );

  const options = useMemo(() => {
    if (trimmedQuery) return searchOptions;
    if (!expanded) return popularOptions;
    return [
      ...popularOptions,
      ...regionOptions,
      ...groupedCities.flatMap((group) => group.cities.map((city) => cityOption(city))),
    ];
  }, [expanded, groupedCities, popularOptions, regionOptions, searchOptions, trimmedQuery]);

  const activeIndex = Math.min(highlight, Math.max(options.length - 1, 0));
  const activeOption = options[activeIndex];
  const optionId = (option: LocationOption) => `${listId}-option-${option.id}`;

  useEffect(() => {
    if (initialRegionSlug) {
      const match = findRegionBySlug(initialRegionSlug);
      setSelectedRegion(match ?? null);
      setSelectedCity(null);
      setQuery(match?.name ?? '');
      return;
    }
    if (!initialSlug) return;
    const match = findCityBySlug(initialSlug);
    setSelectedCity(match ?? null);
    setSelectedRegion(null);
    setQuery(match ? preferredCityLabel(match) : '');
  }, [initialSlug, initialRegionSlug]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!open || !activeOption) return;
    const option = document.getElementById(optionId(activeOption));
    const container = listRef.current;
    if (!option || !container) return;
    const optionRect = option.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (optionRect.top < containerRect.top) {
      container.scrollTop -= containerRect.top - optionRect.top;
    } else if (optionRect.bottom > containerRect.bottom) {
      container.scrollTop += optionRect.bottom - containerRect.bottom;
    }
  }, [activeOption, open, listId]);

  const closeDropdown = () => {
    setOpen(false);
    setExpanded(false);
  };

  const goCity = (city: MarketplaceCity, label = city.name) => {
    setSelectedCity(city);
    setSelectedRegion(null);
    setQuery(label);
    closeDropdown();
    if (onNavigate) onNavigate(city.slug);
    else navigate(cityExplorePath(city.slug));
  };

  const goRegion = (region: MarketplaceRegion) => {
    setSelectedRegion(region);
    setSelectedCity(null);
    setQuery(region.name);
    closeDropdown();
    if (onRegionNavigate) onRegionNavigate(region);
    else navigate(regionExplorePath(region.slug));
  };

  const selectOption = (option: LocationOption) => {
    if (option.kind === 'city') {
      goCity(option.city, option.label);
    } else {
      goRegion(option.region);
    }
  };

  const submit = () => {
    if (selectedRegion) {
      goRegion(selectedRegion);
      return;
    }
    if (selectedCity) {
      goCity(selectedCity, query.trim() || selectedCity.name);
      return;
    }
    const option = options[activeIndex] ?? options[0];
    if (option) selectOption(option);
  };

  useImperativeHandle(ref, () => ({ submit }), [activeIndex, options, query, selectedCity, selectedRegion]);

  const optionClassName = (index: number) =>
    `flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
      index === activeIndex
        ? 'bg-brand-purple/20 text-white'
        : 'text-zinc-300 hover:bg-brand-purple/12 hover:text-white'
    }`;

  const renderOption = (option: LocationOption) => {
    const index = options.findIndex((candidate) => candidate.id === option.id);
    const secondary =
      option.kind === 'region' ? 'Region' : regionNameForCity(option.city) || 'Ghana';
    return (
      <button
        key={option.id}
        id={optionId(option)}
        type="button"
        role="option"
        aria-selected={index === activeIndex}
        tabIndex={-1}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => setHighlight(index)}
        onClick={() => selectOption(option)}
        className={optionClassName(index)}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-purple-light" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{option.label}</span>
        <span className="shrink-0 text-[11px] text-zinc-500">{secondary}</span>
      </button>
    );
  };

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
          <MapPin className="h-4 w-4 shrink-0 text-brand-purple-light" aria-hidden />
          <input
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-activedescendant={open && activeOption ? optionId(activeOption) : undefined}
            aria-label="City, area or region"
            value={query}
            placeholder="Where are you looking?"
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedCity(null);
              setSelectedRegion(null);
              setOpen(true);
              setExpanded(false);
              setHighlight(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (open && activeOption) selectOption(activeOption);
                else submit();
              } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                setOpen(true);
                if (!open) {
                  setHighlight(0);
                  return;
                }
                setHighlight((current) =>
                  Math.min(current + 1, Math.max(options.length - 1, 0)),
                );
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setHighlight((current) => Math.max(current - 1, 0));
              } else if (event.key === 'Escape') {
                event.preventDefault();
                closeDropdown();
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

      {open ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 flex max-h-[min(23rem,44svh)] flex-col overflow-hidden rounded-xl border border-white/12 bg-brand-surface-elevated shadow-2xl">
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Ghana locations"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1.5"
          >
            {trimmedQuery ? (
              <>
                {sectionLabel('Matching locations')}
                {options.length > 0 ? (
                  options.map(renderOption)
                ) : (
                  <div className="px-3 py-5">
                    <p className="text-[13.5px] font-medium text-zinc-200">No locations found</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
                      Try a town, neighbourhood or one of Ghana’s 16 regions.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {sectionLabel('Popular Locations')}
                {popularOptions.map(renderOption)}
                {expanded ? (
                  <>
                    {sectionLabel('Browse by Region')}
                    {regionOptions.map(renderOption)}
                    {sectionLabel('Cities & Towns')}
                    {groupedCities.map((group) => (
                      <React.Fragment key={group.region.id}>
                        <p className="px-3 pb-0.5 pt-2 text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-500">
                          {group.region.name}
                        </p>
                        {group.cities.map((city) => renderOption(cityOption(city)))}
                      </React.Fragment>
                    ))}
                  </>
                ) : null}
              </>
            )}
          </div>
          {!trimmedQuery ? (
            <button
              type="button"
              onClick={() => {
                setExpanded((current) => !current);
                setHighlight(0);
              }}
              className="flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 border-t border-white/10 px-3 text-[12.5px] font-semibold text-brand-purple-light hover:bg-brand-purple/10"
              aria-expanded={expanded}
            >
              {expanded ? 'Show Less' : 'See More Locations'}
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
