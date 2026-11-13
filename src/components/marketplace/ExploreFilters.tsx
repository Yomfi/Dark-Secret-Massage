import React, { useRef, useState } from 'react';
import { LocateFixed, Search, SlidersHorizontal, X } from 'lucide-react';
import { MASSAGE_SERVICE_OPTIONS, isAdultService } from '../../data/serviceCategories';
import type { MarketplaceAvailability } from '../../data/marketplaceProfiles';
import type {
  MarketplaceFilters,
  MarketplaceGenderFilter,
  MarketplaceModeFilter,
  MarketplaceProviderTypeFilter,
  MarketplaceSort,
} from '../../lib/marketplace';
import { CitySearch, type CitySearchHandle } from './CitySearch';
import { ExploreViewToggle } from './ExploreViewToggle';
import type { ExploreView } from '../../lib/exploreView';
import { Button } from '../ui/Button';
import { SelectField, TextField } from '../ui/Field';
import { MARKETPLACE_REGIONS, findCityBySlug, findRegionBySlug } from '../../data/locations';

type Props = {
  citySlug: string;
  filters: MarketplaceFilters;
  onChange: (next: MarketplaceFilters) => void;
  onCityChange: (slug: string) => void;
  onRegionChange?: (regionId: string) => void;
  regionSlug?: string;
  onUseCurrentLocation?: () => void;
  locating?: boolean;
  locationLabel?: string | null;
  hasCoordinates?: boolean;
  view: ExploreView;
  onViewChange: (view: ExploreView) => void;
};

const PROVIDER_TYPES: { value: MarketplaceProviderTypeFilter; label: string }[] = [
  { value: 'all', label: 'All providers' },
  { value: 'individuals', label: 'Individuals' },
  { value: 'agencies', label: 'Agencies' },
];

const GENDERS: { value: MarketplaceGenderFilter; label: string }[] = [
  { value: 'all', label: 'Any gender' },
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
];

const AVAILABILITY: { value: MarketplaceAvailability | 'any'; label: string }[] = [
  { value: 'any', label: 'Any availability' },
  { value: 'today', label: 'Available today' },
  { value: 'this_week', label: 'This week' },
  { value: 'flexible', label: 'Flexible' },
];

const MODES: { value: MarketplaceModeFilter; label: string }[] = [
  { value: 'any', label: 'Any setting' },
  { value: 'studio', label: 'In-studio' },
  { value: 'home', label: 'Home visits' },
];

const SORTS: { value: MarketplaceSort; label: string }[] = [
  { value: 'nearest', label: 'Nearest first' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'recent', label: 'Recently added' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

const RADIUS_PRESETS = [5, 10, 20, 50];

function FilterFields({ filters, onChange, citySlug, onCityChange, onRegionChange, regionSlug, onUseCurrentLocation, locating, locationLabel, hasCoordinates, view, onViewChange, layout }: Props & { layout: 'toolbar' | 'sheet' }) {
  const citySearchRef = useRef<CitySearchHandle>(null);
  const isSheet = layout === 'sheet';
  const city = findCityBySlug(citySlug);
  const region = regionSlug ? findRegionBySlug(regionSlug) : undefined;
  const [customOpen, setCustomOpen] = useState(
    filters.radiusKm != null && !RADIUS_PRESETS.includes(filters.radiusKm),
  );
  const radiusValue =
    filters.radiusKm == null ? '' : RADIUS_PRESETS.includes(filters.radiusKm) ? String(filters.radiusKm) : 'custom';

  return (
    <div className={isSheet ? 'flex flex-col gap-3.5' : 'space-y-3'}>
      <div className={isSheet ? '' : 'flex flex-col gap-3 sm:flex-row sm:items-end'}>
        <div className="min-w-0 flex-1">
          <SelectField
            label="Region"
            value={region?.id ?? city?.regionId ?? ''}
            onChange={(e) => onRegionChange?.(e.target.value)}
          >
            <option value="">All regions</option>
            {MARKETPLACE_REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 block text-[12px] font-medium text-zinc-400">Location</label>
          <CitySearch
            ref={citySearchRef}
            variant="toolbar"
            showSubmitButton={false}
            initialSlug={citySlug}
            initialRegionSlug={regionSlug}
            onNavigate={onCityChange}
            onRegionNavigate={(selectedRegion) => onRegionChange?.(selectedRegion.id)}
          />
        </div>
        <Button
          onClick={() => citySearchRef.current?.submit()}
          iconLeft={<Search className="h-4 w-4" aria-hidden />}
          className={isSheet ? 'w-full' : 'w-full sm:w-auto'}
        >
          Search
        </Button>
        {isSheet ? null : (
          <div className="shrink-0">
            <span className="mb-1.5 block text-[12px] font-medium text-zinc-400">View</span>
            <ExploreViewToggle value={view} onChange={onViewChange} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
        <p className="text-[12px] text-zinc-400">
          {locationLabel ? (
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <LocateFixed className="h-3.5 w-3.5 text-brand-purple-light" aria-hidden /> {locationLabel}
            </span>
          ) : (
            'General results — set a town or share your location for nearest-first matching.'
          )}
        </p>
        <button
          type="button"
          onClick={onUseCurrentLocation}
          disabled={locating}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-brand-purple/40 px-3 text-[12px] font-semibold text-brand-purple-light hover:bg-brand-purple/10 disabled:opacity-60"
        >
          <LocateFixed className="h-3.5 w-3.5" aria-hidden />
          {locating ? 'Locating…' : 'Use current location'}
        </button>
      </div>

      <div className={isSheet ? 'flex flex-col gap-3.5' : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'}>
        <SelectField
          label="Provider type"
          value={filters.providerType || 'all'}
          onChange={(e) =>
            onChange({ ...filters, providerType: e.target.value as MarketplaceProviderTypeFilter })
          }
        >
          {PROVIDER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Gender"
          value={filters.gender || 'all'}
          onChange={(e) => onChange({ ...filters, gender: e.target.value as MarketplaceGenderFilter })}
        >
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Service"
          value={filters.service || ''}
          onChange={(e) => onChange({ ...filters, service: e.target.value || null })}
        >
          <option value="">All services</option>
          {MASSAGE_SERVICE_OPTIONS.map((label) => (
            <option key={label} value={label}>
              {isAdultService(label) ? `${label} (18+)` : label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Setting"
          value={filters.mode || 'any'}
          onChange={(e) => onChange({ ...filters, mode: e.target.value as MarketplaceModeFilter })}
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Distance"
          value={radiusValue}
          onChange={(e) => {
            const next = e.target.value;
            if (next === '') {
              setCustomOpen(false);
              onChange({ ...filters, radiusKm: null });
            } else if (next === 'custom') {
              setCustomOpen(true);
              onChange({ ...filters, radiusKm: filters.radiusKm ?? 10 });
            } else {
              setCustomOpen(false);
              onChange({ ...filters, radiusKm: Number(next) });
            }
          }}
        >
          <option value="">Any distance</option>
          {RADIUS_PRESETS.map((km) => (
            <option key={km} value={km}>
              Within {km} km
            </option>
          ))}
          <option value="custom">Custom…</option>
        </SelectField>

        {(customOpen || radiusValue === 'custom') && filters.radiusKm != null ? (
          <TextField
            label="Custom radius (km)"
            type="number"
            min={1}
            max={500}
            value={filters.radiusKm}
            onChange={(e) =>
              onChange({ ...filters, radiusKm: e.target.value === '' ? null : Number(e.target.value) })
            }
            hint={hasCoordinates ? undefined : 'Exact distances need a town pin or current location.'}
          />
        ) : null}

        <SelectField
          label="Availability"
          value={filters.availability || 'any'}
          onChange={(e) =>
            onChange({ ...filters, availability: e.target.value as MarketplaceAvailability | 'any' })
          }
        >
          {AVAILABILITY.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </SelectField>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Min price"
            type="number"
            min={0}
            placeholder="GHS"
            inputMode="numeric"
            value={filters.minPrice ?? ''}
            onChange={(e) =>
              onChange({ ...filters, minPrice: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
          <TextField
            label="Max price"
            type="number"
            min={0}
            placeholder="GHS"
            inputMode="numeric"
            value={filters.maxPrice ?? ''}
            onChange={(e) =>
              onChange({ ...filters, maxPrice: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
        </div>

        <SelectField
          label="Sort by"
          value={filters.sort || 'recommended'}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as MarketplaceSort })}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </SelectField>
      </div>
    </div>
  );
}

export const ExploreFilters: React.FC<Props> = (props) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const mobileCityRef = useRef<CitySearchHandle>(null);

  return (
    <>
      <div className="hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:block">
        <FilterFields {...props} layout="toolbar" />
      </div>

      <div className="md:hidden">
        <div className="flex items-stretch gap-2">
          <div className="min-w-0 flex-1">
            <CitySearch
              ref={mobileCityRef}
              variant="toolbar"
              showSubmitButton={false}
              initialSlug={props.citySlug}
              initialRegionSlug={props.regionSlug}
              onNavigate={props.onCityChange}
              onRegionNavigate={(selectedRegion) => props.onRegionChange?.(selectedRegion.id)}
            />
          </div>
          <Button onClick={() => mobileCityRef.current?.submit()} className="shrink-0 px-4" aria-label="Search city">
            <Search className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="secondary"
            onClick={() => setSheetOpen(true)}
            className="shrink-0 px-4"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
          </Button>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-medium text-zinc-500">Provider layout</span>
          <ExploreViewToggle value={props.view} onChange={props.onViewChange} />
        </div>
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-brand-surface-elevated p-5 pb-8 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-white">Filters</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <FilterFields {...props} layout="sheet" />
            <Button fullWidth onClick={() => setSheetOpen(false)} className="mt-5">
              Show results
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
};
