import React, { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { SERVICE_CATEGORIES } from '../../data/serviceCategories';
import type { MarketplaceAvailability } from '../../data/marketplaceProfiles';
import type { MarketplaceFilters, MarketplaceSort } from '../../lib/marketplace';
import { CitySearch } from './CitySearch';

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

function FilterFields({
  filters,
  onChange,
  citySlug,
  onCityChange,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      <div className="xl:col-span-1">
        <label className="block text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-1.5">Location</label>
        <CitySearch variant="toolbar" initialSlug={citySlug} onNavigate={onCityChange} />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-1.5">Service</label>
        <select
          value={filters.service || ''}
          onChange={(e) => onChange({ ...filters, service: e.target.value || null })}
          className="w-full min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-200 outline-none focus:border-purple-400/40"
        >
          <option value="">All services</option>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-1.5">Price (GHS)</label>
        <div className="flex gap-2">
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
            className="w-1/2 min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-200 outline-none focus:border-purple-400/40"
          />
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
            className="w-1/2 min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-200 outline-none focus:border-purple-400/40"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-1.5">Availability</label>
        <select
          value={filters.availability || 'any'}
          onChange={(e) =>
            onChange({
              ...filters,
              availability: e.target.value as MarketplaceAvailability | 'any',
            })
          }
          className="w-full min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-200 outline-none focus:border-purple-400/40"
        >
          {AVAILABILITY.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-1.5">Sort</label>
        <select
          value={filters.sort || 'recommended'}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as MarketplaceSort })}
          className="w-full min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-200 outline-none focus:border-purple-400/40"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export const ExploreFilters: React.FC<Props> = (props) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Desktop / tablet toolbar */}
      <div className="hidden md:block rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <FilterFields {...props} />
      </div>

      {/* Mobile trigger */}
      <div className="md:hidden flex gap-2">
        <div className="flex-1">
          <CitySearch variant="toolbar" initialSlug={props.citySlug} onNavigate={props.onCityChange} />
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-white/15 bg-white/[0.05] text-xs uppercase tracking-widest text-zinc-200"
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
            <FilterFields {...props} />
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-5 w-full min-h-[48px] rounded-full bg-purple-600 text-white text-sm font-semibold uppercase tracking-widest"
            >
              Show results
            </button>
          </div>
        </div>
      )}
    </>
  );
};
