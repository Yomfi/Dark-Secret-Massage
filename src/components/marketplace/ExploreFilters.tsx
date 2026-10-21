import React, { useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { SERVICE_CATEGORIES } from '../../data/serviceCategories';
import type { MarketplaceAvailability } from '../../data/marketplaceProfiles';
import type { MarketplaceFilters, MarketplaceSort } from '../../lib/marketplace';
import { CitySearch, type CitySearchHandle } from './CitySearch';

type Props = {
  citySlug: string;
  filters: MarketplaceFilters;
  onChange: (next: MarketplaceFilters) => void;
  onCityChange: (slug: string) => void;
};

const AVAILABILITY: { value: MarketplaceAvailability | 'any'; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'today', label: 'Available today' },
  { value: 'this_week', label: 'This week' },
  { value: 'flexible', label: 'Flexible' },
];

const SORTS: { value: MarketplaceSort; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'recent', label: 'Recently added' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const fieldClass =
  'w-full min-h-[44px] h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-200 outline-none focus:border-purple-400/40';

const labelClass = 'block text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-1.5';

function FilterFields({
  filters,
  onChange,
  citySlug,
  onCityChange,
  layout,
}: Props & { layout: 'toolbar' | 'sheet' }) {
  const citySearchRef = useRef<CitySearchHandle>(null);
  const isSheet = layout === 'sheet';

  return (
    <div
      className={
        isSheet
          ? 'flex flex-col gap-3'
          : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 items-end'
      }
    >
      <div className={`min-w-0 ${isSheet ? '' : 'col-span-2 lg:col-span-1 xl:col-span-1'}`}>
        <label className={labelClass}>Location</label>
        <CitySearch
          ref={citySearchRef}
          variant="toolbar"
          showSubmitButton={false}
          initialSlug={citySlug}
          onNavigate={onCityChange}
        />
      </div>

      <div className="min-w-0">
        <label className={labelClass}>Service</label>
        <select
          value={filters.service || ''}
          onChange={(e) => onChange({ ...filters, service: e.target.value || null })}
          className={fieldClass}
        >
          <option value="">All services</option>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0">
        <label className={labelClass}>Min Price</label>
        <input
          type="number"
          min={0}
          placeholder="Min"
          value={filters.minPrice ?? ''}
          onChange={(e) =>
            onChange({
              ...filters,
              minPrice: e.target.value === '' ? null : Number(e.target.value),
            })
          }
          className={fieldClass}
        />
      </div>

      <div className="min-w-0">
        <label className={labelClass}>Max Price</label>
        <input
          type="number"
          min={0}
          placeholder="Max"
          value={filters.maxPrice ?? ''}
          onChange={(e) =>
            onChange({
              ...filters,
              maxPrice: e.target.value === '' ? null : Number(e.target.value),
            })
          }
          className={fieldClass}
        />
      </div>

      <div className="min-w-0">
        <label className={labelClass}>Availability</label>
        <select
          value={filters.availability || 'any'}
          onChange={(e) =>
            onChange({
              ...filters,
              availability: e.target.value as MarketplaceAvailability | 'any',
            })
          }
          className={fieldClass}
        >
          {AVAILABILITY.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0">
        <label className={labelClass}>Sort</label>
        <select
          value={filters.sort || 'recommended'}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as MarketplaceSort })}
          className={fieldClass}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className={`min-w-0 ${isSheet ? 'pt-2' : ''}`}>
        {!isSheet && <label className={`${labelClass} invisible select-none`}>Search</label>}
        <button
          type="button"
          onClick={() => citySearchRef.current?.submit()}
          className={
            isSheet
              ? 'w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold uppercase tracking-widest transition-colors'
              : 'w-full inline-flex items-center justify-center gap-2 h-11 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold uppercase tracking-widest transition-colors'
          }
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>
    </div>
  );
}

export const ExploreFilters: React.FC<Props> = (props) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const mobileCityRef = useRef<CitySearchHandle>(null);

  return (
    <>
      {/* Desktop / tablet toolbar */}
      <div className="hidden md:block rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <FilterFields {...props} layout="toolbar" />
      </div>

      {/* Mobile trigger */}
      <div className="md:hidden flex gap-2 items-stretch">
        <div className="flex-1 min-w-0">
          <CitySearch
            ref={mobileCityRef}
            variant="toolbar"
            showSubmitButton={false}
            initialSlug={props.citySlug}
            onNavigate={props.onCityChange}
          />
        </div>
        <button
          type="button"
          onClick={() => mobileCityRef.current?.submit()}
          className="inline-flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] px-3 rounded-xl bg-purple-600 text-xs uppercase tracking-widest text-white"
          aria-label="Search city"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center justify-center gap-2 shrink-0 min-h-[44px] px-4 rounded-xl border border-white/15 bg-white/[0.05] text-xs uppercase tracking-widest text-zinc-200"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Mobile bottom sheet */}
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-auto rounded-t-3xl border border-white/10 bg-[#0c0c12] p-5 pb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Filters</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="p-2 rounded-full border border-white/10 text-zinc-300"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <FilterFields {...props} layout="sheet" />
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-4 w-full min-h-[48px] rounded-full border border-white/15 text-white text-sm font-semibold uppercase tracking-widest"
            >
              Show results
            </button>
          </div>
        </div>
      )}
    </>
  );
};
