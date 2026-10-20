import React from 'react';
import { Building2, Home, Check } from 'lucide-react';
import {
  STUDIO_LOCATION_LABEL,
  type HomeLocationDetails,
  type LocationType,
  type StepFieldErrors,
} from '../../lib/massageBooking';

interface LocationSelectorProps {
  locationType: LocationType | '';
  homeLocation: HomeLocationDetails;
  errors: StepFieldErrors;
  onSelectType: (type: LocationType) => void;
  onHomeChange: (patch: Partial<HomeLocationDetails>) => void;
}

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base font-normal text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 transition-colors';

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  locationType,
  homeLocation,
  errors,
  onSelectType,
  onHomeChange,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Choose your setting</h2>
        <p className="mt-2 text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
          Book at our treatment studio or request a private in-home session. Your address stays confidential.
        </p>
      </div>

      {errors.locationType && (
        <p className="text-sm font-medium text-rose-300" role="alert">
          {errors.locationType}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onSelectType('studio')}
          className={`relative text-left rounded-2xl border p-5 transition-all duration-300 cursor-pointer ${
            locationType === 'studio'
              ? 'border-purple-500/70 bg-purple-950/35 shadow-[0_0_32px_-12px_rgba(168,85,247,0.55)]'
              : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
          }`}
        >
          {locationType === 'studio' && (
            <span className="absolute top-4 right-4 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
            </span>
          )}
          <Building2 className="h-6 w-6 text-purple-300 mb-3" aria-hidden />
          <h3 className="text-base sm:text-lg font-semibold text-white">Studio / Treatment Location</h3>
          <p className="mt-2 text-sm sm:text-base text-zinc-300 font-normal leading-snug">
            Arrive at a private wellness suite prepared for your session.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelectType('home')}
          className={`relative text-left rounded-2xl border p-5 transition-all duration-300 cursor-pointer ${
            locationType === 'home'
              ? 'border-purple-500/70 bg-purple-950/35 shadow-[0_0_32px_-12px_rgba(168,85,247,0.55)]'
              : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
          }`}
        >
          {locationType === 'home' && (
            <span className="absolute top-4 right-4 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
            </span>
          )}
          <Home className="h-6 w-6 text-purple-300 mb-3" aria-hidden />
          <h3 className="text-base sm:text-lg font-semibold text-white">In-Home / Mobile Massage</h3>
          <p className="mt-2 text-sm sm:text-base text-zinc-300 font-normal leading-snug">
            A provider visits your location. Travel fee may apply. Availability by area.
          </p>
        </button>
      </div>

      {locationType === 'studio' && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-300 mb-1.5">
            Studio location
          </p>
          <p className="text-base text-white font-medium">{STUDIO_LOCATION_LABEL}</p>
          <p className="mt-1 text-sm text-zinc-400 font-normal">
            Exact suite details are shared privately after your request is accepted.
          </p>
        </div>
      )}

      {locationType === 'home' && (
        <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
          <p className="text-sm text-zinc-300 font-normal">
            Address details are private and used only for session logistics.
          </p>

          <Field
            id="region"
            label="Region"
            value={homeLocation.region}
            error={errors.region}
            onChange={(v) => onHomeChange({ region: v })}
            placeholder="e.g. Greater Accra"
          />
          <Field
            id="cityArea"
            label="City / Area"
            value={homeLocation.cityArea}
            error={errors.cityArea}
            onChange={(v) => onHomeChange({ cityArea: v })}
            placeholder="e.g. Cantonments"
          />
          <Field
            id="address"
            label="Address"
            value={homeLocation.address}
            error={errors.address}
            onChange={(v) => onHomeChange({ address: v })}
            placeholder="Street, building, unit"
          />
          <Field
            id="landmark"
            label="Landmark"
            value={homeLocation.landmark}
            onChange={(v) => onHomeChange({ landmark: v })}
            placeholder="Optional nearby landmark"
            optional
          />
          <Field
            id="mapsLink"
            label="Google Maps link"
            value={homeLocation.mapsLink}
            onChange={(v) => onHomeChange({ mapsLink: v })}
            placeholder="Optional maps URL"
            optional
          />
          <div>
            <label htmlFor="accessNotes" className="block text-sm font-semibold text-zinc-200 mb-1.5">
              Access instructions / notes{' '}
              <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <textarea
              id="accessNotes"
              rows={3}
              value={homeLocation.accessNotes}
              onChange={(e) => onHomeChange({ accessNotes: e.target.value })}
              placeholder="Gate code, parking, floor, etc."
              className={`${fieldClass} resize-y min-h-[96px]`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  optional,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-zinc-200 mb-1.5">
        {label} {optional && <span className="font-normal text-zinc-500">(optional)</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={fieldClass}
        autoComplete="off"
      />
      {error && (
        <p className="mt-1.5 text-sm font-medium text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
