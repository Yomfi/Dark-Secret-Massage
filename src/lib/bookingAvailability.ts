/** Prototype availability — replace with live provider calendar later. */

export type TimePeriod = 'morning' | 'afternoon' | 'evening';

export interface AvailabilitySlot {
  id: string;
  label: string;
  start: string; // HH:mm
  end: string;
  period: TimePeriod;
  available: boolean;
}

const BASE_SLOTS: Omit<AvailabilitySlot, 'available'>[] = [
  { id: 'slot-0900', label: '9:00 AM', start: '09:00', end: '10:00', period: 'morning' },
  { id: 'slot-1030', label: '10:30 AM', start: '10:30', end: '11:30', period: 'morning' },
  { id: 'slot-1200', label: '12:00 PM', start: '12:00', end: '13:00', period: 'afternoon' },
  { id: 'slot-1400', label: '2:00 PM', start: '14:00', end: '15:00', period: 'afternoon' },
  { id: 'slot-1530', label: '3:30 PM', start: '15:30', end: '16:30', period: 'afternoon' },
  { id: 'slot-1700', label: '5:00 PM', start: '17:00', end: '18:00', period: 'evening' },
  { id: 'slot-1830', label: '6:30 PM', start: '18:30', end: '19:30', period: 'evening' },
];

/** Deterministic prototype unavailability so UI can show disabled slots. */
function isPrototypeUnavailable(dateISO: string, slotId: string): boolean {
  const day = new Date(`${dateISO}T12:00:00`).getDay();
  if (day === 0) return slotId === 'slot-0900' || slotId === 'slot-1830';
  if (day === 6) return slotId === 'slot-1200';
  const hash = dateISO.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + slotId.length;
  return hash % 7 === 0;
}

function isSlotInPast(dateISO: string, startHHMM: string): boolean {
  const now = new Date();
  const [h, m] = startHHMM.split(':').map(Number);
  const slot = new Date(`${dateISO}T00:00:00`);
  slot.setHours(h, m, 0, 0);
  return slot.getTime() <= now.getTime();
}

export function getAvailableSlotsForDate(dateISO: string): AvailabilitySlot[] {
  if (!dateISO) return [];
  return BASE_SLOTS.map((slot) => ({
    ...slot,
    available: !isPrototypeUnavailable(dateISO, slot.id) && !isSlotInPast(dateISO, slot.start),
  }));
}

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
