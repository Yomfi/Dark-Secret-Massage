import { apiRequest } from './api';

/**
 * Availability is calculated by the API (`/api/public/availability.php`) from
 * real bookings, durations and the server clock. Nothing here invents,
 * randomises or hides slots locally: if the server cannot answer, the UI says so
 * instead of guessing.
 */

export type TimePeriod = 'morning' | 'afternoon' | 'evening';

export interface AvailabilitySlot {
  id: string;
  label: string;
  start: string; // HH:mm
  end: string;
  period: TimePeriod;
  available: boolean;
  reason?: string | null;
}

export type AvailabilityResponse = {
  date: string;
  durationMinutes: number;
  timezone: string;
  slots: AvailabilitySlot[];
};

const PERIOD_LABELS_INTERNAL: Record<string, TimePeriod> = {
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
};

function normaliseSlot(raw: Record<string, unknown>): AvailabilitySlot | null {
  const id = String(raw.id ?? '').trim();
  if (!id) return null;
  const period = PERIOD_LABELS_INTERNAL[String(raw.period ?? '').toLowerCase()] ?? 'morning';
  return {
    id,
    label: String(raw.label ?? id),
    start: String(raw.start ?? ''),
    end: String(raw.end ?? ''),
    period,
    available: raw.available === true,
    reason: raw.reason != null ? String(raw.reason) : null,
  };
}

export async function fetchAvailability(params: {
  date: string;
  serviceId?: string;
  providerProfileId?: string;
}): Promise<AvailabilityResponse> {
  const query = new URLSearchParams({ date: params.date });
  if (params.serviceId) query.set('serviceId', params.serviceId);
  if (params.providerProfileId) query.set('providerProfileId', params.providerProfileId);

  const data = await apiRequest<AvailabilityResponse>(`/public/availability.php?${query}`);
  return {
    date: String(data.date ?? params.date),
    durationMinutes: Number(data.durationMinutes ?? 0),
    timezone: String(data.timezone ?? ''),
    slots: Array.isArray(data.slots)
      ? (data.slots as unknown as Record<string, unknown>[])
          .map(normaliseSlot)
          .filter((slot): slot is AvailabilitySlot => slot !== null)
      : [],
  };
}

export const SLOT_REASON_LABELS: Record<string, string> = {
  booked: 'Booked',
  past: 'Passed',
  team_busy: 'Fully booked',
  closed: 'Closed',
};

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDisplayDate(dateISO: string): string {
  if (!dateISO) return '—';
  const d = new Date(`${dateISO}T12:00:00`);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const PERIOD_LABELS: Record<TimePeriod, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};
