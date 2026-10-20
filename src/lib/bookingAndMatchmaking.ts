export interface MatchmakingProfile {
  id: string;
  fullName: string;
  age: number;
  location: string;
  profession: string;
  education: string;
  values: string[];
  faith: string;
  marriageTimeline: string;
  bio: string;
  verified: boolean;
  avatarSeed: string;
  gender: 'female' | 'male';
}

export interface MassageTherapist {
  id: string;
  name: string;
  title: string;
  licenseNumber: string;
  experienceYears: number;
  location: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  hourlyRateGHS: number;
  bio: string;
  verified: boolean;
  studioAvailable: boolean;
  homeVisitAvailable: boolean;
}

export interface BookingRequest {
  therapistId: string;
  serviceType: string;
  durationMinutes: number;
  date: string;
  timeSlot: string;
  locationType: 'studio' | 'home';
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  specialRequests?: string;
}

export function filterProfiles(
  profiles: MatchmakingProfile[],
  filters: {
    location?: string;
    minAge?: number;
    maxAge?: number;
    faith?: string;
    searchQuery?: string;
  }
): MatchmakingProfile[] {
  return profiles.filter((profile) => {
    if (filters.location && filters.location !== 'all' && !profile.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    if (filters.minAge && profile.age < filters.minAge) {
      return false;
    }
    if (filters.maxAge && profile.age > filters.maxAge) {
      return false;
    }
    if (filters.faith && filters.faith !== 'all' && profile.faith.toLowerCase() !== filters.faith.toLowerCase()) {
      return false;
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        profile.fullName.toLowerCase().includes(q) ||
        profile.profession.toLowerCase().includes(q) ||
        profile.location.toLowerCase().includes(q) ||
        profile.values.some((v) => v.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
}

export function calculateBookingPrice(
  hourlyRateGHS: number,
  durationMinutes: number,
  locationType: 'studio' | 'home'
): { baseRate: number; travelFee: number; totalGHS: number; durationHours: number } {
  if (durationMinutes <= 0) {
    throw new Error('Duration must be greater than zero');
  }
  const durationHours = durationMinutes / 60;
  const baseRate = Math.round(hourlyRateGHS * durationHours);
  const travelFee = locationType === 'home' ? 120 : 0; // Travel fee for home wellness visit
  const totalGHS = baseRate + travelFee;
  return {
    baseRate,
    travelFee,
    totalGHS,
    durationHours,
  };
}

export function validateBookingForm(request: Partial<BookingRequest>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.therapistId) errors.push('Please select a certified therapist');
  if (!request.serviceType) errors.push('Please select a massage therapy type');
  if (!request.durationMinutes || request.durationMinutes < 45) {
    errors.push('Minimum session duration is 45 minutes');
  }
  if (!request.date) errors.push('Please choose a booking date');
  if (!request.timeSlot) errors.push('Please select a time slot');
  if (!request.clientName || request.clientName.trim().length < 2) {
    errors.push('Valid full name is required');
  }
  if (!request.clientPhone || request.clientPhone.trim().length < 8) {
    errors.push('Valid contact phone number is required');
  }
  if (request.locationType === 'home' && (!request.clientAddress || request.clientAddress.trim().length < 5)) {
    errors.push('Residential address is required for in-home private sessions');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
