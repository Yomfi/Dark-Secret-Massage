import { apiRequest } from './api';

export type CreateBookingBody = {
  serviceId: string;
  providerProfileId?: string;
  scheduledAt: string;
  timeSlot: string;
  locationType: 'studio' | 'home';
  address?: string;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
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
    apiRequest<{ bookingId: string; reference: string; status: string }>(
      '/customer/bookings.php',
      { method: 'POST', body: JSON.stringify({ action: 'create', ...body }) },
    ),
  cancelBooking: (bookingId: string, reason?: string) =>
    apiRequest<{ bookingId: string; status: string }>('/customer/bookings.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'cancel', bookingId, reason }),
    }),
  rescheduleBooking: (bookingId: string, note?: string) =>
    apiRequest<{ bookingId: string; status: string }>('/customer/bookings.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'reschedule', bookingId, note }),
    }),
  profile: () => apiRequest<{ profile: Record<string, unknown> }>('/customer/profile.php'),
  saveProfile: (body: Record<string, unknown>) =>
    apiRequest<{ saved: boolean }>('/customer/profile.php', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
