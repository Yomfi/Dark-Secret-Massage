import React from 'react';
import { X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  EDUCATION_OPTIONS,
  MARITAL_OPTIONS,
  REGION_OPTIONS,
  type DiscoveryFiltersState,
} from '../../lib/matchDiscovery';

interface DiscoveryFiltersProps {
  open: boolean;
  filters: DiscoveryFiltersState;
  onChange: (next: DiscoveryFiltersState) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}

export const DiscoveryFilters: React.FC<DiscoveryFiltersProps> = ({
  open,
  filters,
  onChange,
  onApply,
  onReset,
  onClose,
}) => {
  const reduceMotion = useReducedMotion();
  if (!open) return null;

  const patch = (p: Partial<DiscoveryFiltersState>) => onChange({ ...filters, ...p });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <button type="button" className="flex-1 cursor-default" aria-label="Close filters" onClick={onClose} />
      <motion.aside
        initial={reduceMotion ? false : { x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={reduceMotion ? undefined : { x: 40, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md h-full bg-[#0a0a10] border-l border-white/10 flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-bold text-white">Filters</h2>
            <p className="text-sm text-zinc-400 font-medium">Based on your marriage preferences</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full border border-white/10 inline-flex items-center justify-center text-zinc-300 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wider text-purple-300 mb-3">
              Age range
            </legend>
            <div className="flex items-center gap-3">
              <NumberField
                label="Min"
                value={filters.ageMin}
                onChange={(ageMin) => patch({ ageMin })}
              />
              <span className="text-zinc-500">–</span>
              <NumberField
                label="Max"
                value={filters.ageMax}
                onChange={(ageMax) => patch({ ageMax })}
              />
            </div>
          </fieldset>

          <SelectField
            label="Region"
            value={filters.region}
            onChange={(region) => patch({ region })}
            options={[{ value: 'all', label: 'Any region' }, ...REGION_OPTIONS.map((r) => ({ value: r, label: r }))]}
          />
          <SelectField
            label="Faith"
            value={filters.faith}
            onChange={(faith) => patch({ faith })}
            options={[
              { value: 'all', label: 'Any' },
              { value: 'Christian', label: 'Christian' },
              { value: 'Muslim', label: 'Muslim' },
              { value: 'Other', label: 'Other' },
            ]}
          />
          <SelectField
            label="Education"
            value={filters.education}
            onChange={(education) => patch({ education })}
            options={[
              { value: 'all', label: 'Any' },
              ...EDUCATION_OPTIONS.map((e) => ({ value: e, label: e })),
            ]}
          />
          <SelectField
            label="Marital status"
            value={filters.maritalStatus}
            onChange={(maritalStatus) => patch({ maritalStatus })}
            options={[
              { value: 'all', label: 'Any' },
              ...MARITAL_OPTIONS.map((m) => ({ value: m, label: m })),
            ]}
          />
          <SelectField
            label="Children"
            value={filters.hasChildren}
            onChange={(hasChildren) =>
              patch({ hasChildren: hasChildren as DiscoveryFiltersState['hasChildren'] })
            }
            options={[
              { value: 'any', label: 'Any' },
              { value: 'no', label: 'No children' },
              { value: 'yes', label: 'Has children' },
            ]}
          />

          <label className="flex items-center gap-3 text-base text-zinc-200 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={filters.verifiedOnly}
              onChange={(e) => patch({ verifiedOnly: e.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-black accent-purple-500"
            />
            Verified profiles only
          </label>
        </div>

        <div className="p-5 border-t border-white/[0.06] flex gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 rounded-full border border-white/15 py-3.5 text-sm font-semibold uppercase tracking-wider text-zinc-300 cursor-pointer"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              onApply();
              onClose();
            }}
            className="flex-1 rounded-full bg-purple-600 py-3.5 text-sm font-semibold uppercase tracking-wider text-white hover:bg-purple-500 cursor-pointer"
          >
            Apply filters
          </button>
        </div>
      </motion.aside>
    </div>
  );
};

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex-1">
      <span className="block text-sm text-zinc-400 mb-1.5 font-medium">{label}</span>
      <input
        type="number"
        min={21}
        max={70}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-base text-white focus:outline-none focus:border-purple-500"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white focus:outline-none focus:border-purple-500 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
