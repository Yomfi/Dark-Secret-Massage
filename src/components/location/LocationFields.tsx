import React, { useEffect, useMemo, useState } from 'react';
import { LocateFixed, MapPin, X } from 'lucide-react';
import {
  MARKETPLACE_REGIONS,
  citiesForRegion,
  districtsForRegion,
  findRegionById,
  nearestCity,
} from '../../data/locations';

export type LocationValue = {
  country: string;
  region: string;
  district: string;
  city: string;
  area: string;
  latitude: number | null;
  longitude: number | null;
};

export const emptyLocation: LocationValue = {
  country: 'Ghana',
  region: '',
  district: '',
  city: '',
  area: '',
  latitude: null,
  longitude: null,
};

type Props = {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  theme?: 'light' | 'dark';
  includeCoordinates?: boolean;
  compact?: boolean;
  disabled?: boolean;
};

const labelClass = (theme: 'light' | 'dark') =>
  theme === 'dark' ? 'text-[12px] font-medium text-zinc-400' : 'text-[12px] font-medium text-[#6b6252]';
const inputClass = (theme: 'light' | 'dark') =>
  theme === 'dark'
    ? 'min-h-12 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 text-[14px] text-white outline-none focus:border-brand-gold/60 focus:ring-2 focus:ring-brand-gold/30'
    : 'min-h-12 w-full rounded-xl border border-[#d9cfba] bg-white px-3 text-[14px] text-[#221f19] outline-none focus:border-[#b8862f] focus:ring-2 focus:ring-[#b8862f]/25';
const hintClass = (theme: 'light' | 'dark') =>
  theme === 'dark' ? 'mt-1 text-[11.5px] leading-relaxed text-zinc-500' : 'mt-1 text-[11.5px] leading-relaxed text-[#8a7a52]';

export const LocationFields: React.FC<Props> = ({
  value,
  onChange,
  theme = 'light',
  includeCoordinates = true,
  compact = false,
  disabled = false,
}) => {
  const [locating, setLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  const region = useMemo(() => findRegionById(MARKETPLACE_REGIONS.find((r) => r.name === value.region)?.id ?? ''), [value.region]);
  const districts = region ? districtsForRegion(region.id) : [];
  const cities = region ? citiesForRegion(region.id) : [];

  useEffect(() => {
    // Keep the district/city consistent when a different region is chosen.
    if (!region) return;
    if (value.district && !districts.includes(value.district)) {
      onChange({ ...value, district: '' });
    }
    if (value.city && !cities.some((c) => c.name.toLowerCase() === value.city.toLowerCase())) {
      // A manual locality is valid; only clear when it belongs to another region.
      const belongsElsewhere = MARKETPLACE_REGIONS.some((other) => {
        if (other.id === region.id) return false;
        return citiesForRegion(other.id).some((c) => c.name.toLowerCase() === value.city.toLowerCase());
      });
      if (belongsElsewhere) onChange({ ...value, city: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.region]);

  const setField = (patch: Partial<LocationValue>) => onChange({ ...value, ...patch });

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoMessage('This browser cannot share a location. Enter your town manually.');
      return;
    }
    setLocating(true);
    setGeoMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        const match = nearestCity(latitude, longitude);
        const matchRegion = match ? findRegionById(match.regionId) : undefined;
        onChange({
          ...value,
          latitude,
          longitude,
          region: value.region || matchRegion?.name || value.region,
          district: value.district || match?.district || value.district,
          city: value.city || match?.name || value.city,
        });
        setGeoMessage(
          match
            ? `Pin saved near ${match.name}. Adjust the town if that is not right.`
            : 'Pin saved. Choose your region and town so providers can be matched.',
        );
        setLocating(false);
      },
      (error) => {
        setGeoMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. You can enter your town manually.'
            : 'We could not read your location. Enter your town manually.',
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass(theme)}>Region</span>
          <select
            className={`${inputClass(theme)} mt-1.5`}
            value={value.region}
            disabled={disabled}
            onChange={(e) => setField({ region: e.target.value, district: '', city: '' })}
          >
            <option value="">Select region</option>
            {MARKETPLACE_REGIONS.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelClass(theme)}>District / Municipality</span>
          <select
            className={`${inputClass(theme)} mt-1.5`}
            value={value.district}
            disabled={disabled || !region}
            onChange={(e) => setField({ district: e.target.value })}
          >
            <option value="">{region ? 'Select district' : 'Choose a region first'}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass(theme)}>City / Town</span>
          <input
            className={`${inputClass(theme)} mt-1.5`}
            list="ms-city-options"
            value={value.city}
            disabled={disabled}
            placeholder={region ? `e.g. ${cities[0]?.name ?? 'Town'}` : 'Choose a region first'}
            onChange={(e) => setField({ city: e.target.value })}
          />
          <datalist id="ms-city-options">
            {cities.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <p className={hintClass(theme)}>Not listed? Type the town or nearest town.</p>
        </label>

        <label className="block">
          <span className={labelClass(theme)}>Area / Neighbourhood</span>
          <input
            className={`${inputClass(theme)} mt-1.5`}
            value={value.area}
            disabled={disabled}
            placeholder="e.g. East Legon"
            onChange={(e) => setField({ area: e.target.value })}
          />
        </label>
      </div>

      {includeCoordinates ? (
        <div
          className={
            theme === 'dark'
              ? 'rounded-xl border border-white/10 bg-white/[0.03] p-3'
              : 'rounded-xl border border-[#eee7d9] bg-[#fbf8f1] p-3'
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold ${theme === 'dark' ? 'text-zinc-200' : 'text-[#221f19]'}`}>
                <MapPin className="h-3.5 w-3.5 text-[#b8862f]" aria-hidden />
                {value.latitude != null && value.longitude != null ? 'Exact pin saved' : 'Exact pin (optional)'}
              </p>
              <p className={hintClass(theme)}>
                {value.latitude != null && value.longitude != null
                  ? `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)} — private, never shown publicly.`
                  : 'A pin improves distance accuracy. Your exact coordinates stay private.'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={disabled || locating}
                onClick={useCurrentLocation}
                className={
                  theme === 'dark'
                    ? 'inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-[12px] font-semibold text-zinc-200 hover:bg-white/[0.06] disabled:opacity-60'
                    : 'inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#d9cfba] bg-white px-3 text-[12px] font-semibold text-[#221f19] hover:bg-[#f2eee4] disabled:opacity-60'
                }
              >
                <LocateFixed className="h-3.5 w-3.5" aria-hidden />
                {locating ? 'Locating…' : 'Use my current location'}
              </button>
              {value.latitude != null && value.longitude != null ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setField({ latitude: null, longitude: null })}
                  className={
                    theme === 'dark'
                      ? 'inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-zinc-400 hover:text-white'
                      : 'inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-[#6b6252] hover:text-[#221f19]'
                  }
                >
                  <X className="h-3.5 w-3.5" aria-hidden /> Remove
                </button>
              ) : null}
            </div>
          </div>
          {geoMessage ? (
            <p role="status" className={`mt-2 text-[11.5px] ${theme === 'dark' ? 'text-brand-gold-light' : 'text-[#8a6a1f]'}`}>
              {geoMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
