import { apiRequest } from './api';

export type CreateBookingBody = {
  serviceId: string;
  providerProfileId?: string;
  scheduledAt: string;
  timeSlotId?: string;
  timeSlot: string;
  locationType: 'studio' | 'home';
  address?: string;
  customerLocation?: {
    region?: string;
    district?: string;
    city?: string;
    area?: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
};

export type CustomerLocationDto = {
  country: string;
  region: string | null;
  district: string | null;
  city: string | null;
  area: string | null;
  description: string | null;
  latitude?: number | null;
  longitude?: number | null;
  updatedAt?: string | null;
};

export type CustomerBookingDto = {
  id: string;
  reference: string | null;
  status: string;
  serviceName: string;
  price: number;
  currency: string;
  scheduledAt: string | null;
  timeSlot: string | null;
  locationType: string | null;
  providerName?: string | null;
  canCancel?: boolean;
  canReschedule?: boolean;
};

export const customerApi = {
  listBookings: () =>
    apiRequest<{ bookings: CustomerBookingDto[]; upcoming: CustomerBookingDto[] }>(
      '/customer/bookings.php',
    ),
  createBooking: (body: CreateBookingBody) =>
    apiRequest<{
      bookingId: string;
      reference: string;
      status: string;
      serviceName: string;
      durationMinutes: number;
      price: number;
      currency: string;
      scheduledAt: string | null;
      timeSlot: string | null;
    }>('/customer/bookings.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', ...body }),
    }),
  cancelBooking: (bookingId: string, reason?: string) =>
    apiRequest<{ bookingId: string; status: string }>('/customer/bookings.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'cancel', bookingId, reason }),
    }),
  rescheduleBooking: (
    bookingId: string,
    slot?: { scheduledAt: string; timeSlotId: string; timeSlot: string; note?: string },
  ) =>
    apiRequest<{ bookingId: string; status: string; scheduledAt?: string | null }>(
      '/customer/bookings.php',
      {
        method: 'POST',
        body: JSON.stringify({ action: 'reschedule', bookingId, ...(slot ?? {}) }),
      },
    ),
  profile: () => apiRequest<{ profile: Record<string, unknown> }>('/customer/profile.php'),
  saveProfile: (body: Record<string, unknown>) =>
    apiRequest<{ saved: boolean }>('/customer/profile.php', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getLocation: () =>
    apiRequest<{ location: CustomerLocationDto | null; country: string }>('/customer/location.php'),
  saveLocation: (body: Record<string, unknown>) =>
    apiRequest<{ saved: boolean; location: CustomerLocationDto; message?: string }>(
      '/customer/location.php',
      { method: 'POST', body: JSON.stringify({ action: 'save', ...body }) },
    ),
  clearLocation: () =>
    apiRequest<{ cleared: boolean }>('/customer/location.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'clear' }),
    }),
};
