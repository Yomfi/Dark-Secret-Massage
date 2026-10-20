import { MASSAGE_SERVICES, type MassageService } from '../data/mockData';
import { calculateBookingPrice } from './bookingAndMatchmaking';

export type BookingStatus =
  | 'pending'
  | 'pending_payment'
  | 'confirmed'
  | 'provider_accepted'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type LocationType = 'studio' | 'home';
export type ProviderPreference = 'any' | 'specific';

export interface HomeLocationDetails {
  region: string;
  cityArea: string;
  address: string;
  landmark: string;
  mapsLink: string;
  accessNotes: string;
}

export interface MassageBookingDraft {
  serviceId: string;
  durationMinutes: number;
  locationType: LocationType | '';
  homeLocation: HomeLocationDetails;
  date: string;
  timeSlotId: string;
  timeSlotLabel: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  providerPreference: ProviderPreference;
  preferredTherapistId: string;
  specialRequests: string;
  tensionNotes: string;
  accessibilityNeeds: string;
}

export interface MassageBookingRecord extends MassageBookingDraft {
  id: string;
  reference: string;
  serviceName: string;
  totalGHS: number;
  baseRate: number;
  travelFee: number;
  status: BookingStatus;
  createdAt: string;
  locationType: LocationType;
  studioLabel?: string;
}

export const STUDIO_LOCATION_LABEL = 'Airport Residential Treatment Studio, Accra';

export const emptyHomeLocation = (): HomeLocationDetails => ({
  region: '',
  cityArea: '',
  address: '',
  landmark: '',
  mapsLink: '',
  accessNotes: '',
});

export const createEmptyDraft = (preselectedServiceId?: string): MassageBookingDraft => ({
  serviceId: preselectedServiceId || '',
  durationMinutes: 0,
  locationType: '',
  homeLocation: emptyHomeLocation(),
  date: '',
  timeSlotId: '',
  timeSlotLabel: '',
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  providerPreference: 'any',
  preferredTherapistId: '',
  specialRequests: '',
  tensionNotes: '',
  accessibilityNeeds: '',
});

export function getServiceById(serviceId: string): MassageService | undefined {
  return MASSAGE_SERVICES.find((s) => s.id === serviceId);
}

/** Price from service starting rate (treated as 60-min base) + home travel fee. */
export function calculateServicePrice(
  service: MassageService | undefined,
  durationMinutes: number,
  locationType: LocationType | ''
): { baseRate: number; travelFee: number; totalGHS: number } {
  if (!service || !durationMinutes || !locationType) {
    return { baseRate: 0, travelFee: 0, totalGHS: 0 };
  }
  return calculateBookingPrice(service.basePriceGHS, durationMinutes, locationType);
}

export function generateBookingReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DSM-${stamp.slice(-4)}${rand}`;
}

export type StepFieldErrors = Record<string, string>;

export function validateStep(
  step: number,
  draft: MassageBookingDraft
): { valid: boolean; errors: StepFieldErrors } {
  const errors: StepFieldErrors = {};

  if (step === 1) {
    if (!draft.serviceId) errors.serviceId = 'Please select a massage therapy.';
    if (!draft.durationMinutes) errors.durationMinutes = 'Please choose a session duration.';
  }

  if (step === 2) {
    if (!draft.locationType) errors.locationType = 'Please choose a session setting.';
    if (draft.locationType === 'home') {
      if (!draft.homeLocation.region.trim()) errors.region = 'Region is required for in-home sessions.';
      if (!draft.homeLocation.cityArea.trim()) errors.cityArea = 'City / area is required.';
      if (draft.homeLocation.address.trim().length < 5) {
        errors.address = 'A full private address is required for mobile massage.';
      }
    }
  }

  if (step === 3) {
    if (!draft.date) errors.date = 'Please select a date.';
    else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const chosen = new Date(`${draft.date}T12:00:00`);
      chosen.setHours(0, 0, 0, 0);
      if (chosen.getTime() < today.getTime()) errors.date = 'Please choose today or a future date.';
    }
    if (!draft.timeSlotId || !draft.timeSlotLabel) errors.timeSlot = 'Please select an available time slot.';
  }

  if (step === 4) {
    if (draft.clientName.trim().length < 2) errors.clientName = 'Full name is required.';
    if (!isValidPhone(draft.clientPhone)) errors.clientPhone = 'Enter a valid phone number.';
    if (!isValidEmail(draft.clientEmail)) errors.clientEmail = 'Enter a valid email address.';
    if (draft.providerPreference === 'specific' && !draft.preferredTherapistId) {
      errors.preferredTherapistId = 'Please choose a preferred provider, or select any available.';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

export function buildBookingRecord(draft: MassageBookingDraft): MassageBookingRecord {
  const service = getServiceById(draft.serviceId)!;
  const locationType = draft.locationType as LocationType;
  const pricing = calculateServicePrice(service, draft.durationMinutes, locationType);
  const reference = generateBookingReference();

  return {
    ...draft,
    locationType,
    id: `bk-${Date.now().toString(36)}`,
    reference,
    serviceName: service.name,
    totalGHS: pricing.totalGHS,
    baseRate: pricing.baseRate,
    travelFee: pricing.travelFee,
    status: 'pending_payment',
    createdAt: new Date().toISOString(),
    studioLabel: locationType === 'studio' ? STUDIO_LOCATION_LABEL : undefined,
  };
}
