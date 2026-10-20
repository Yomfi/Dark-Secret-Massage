import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProfiles,
  calculateBookingPrice,
  validateBookingForm,
  type MatchmakingProfile,
  type BookingRequest,
} from './bookingAndMatchmaking.ts';

const mockProfiles: MatchmakingProfile[] = [
  {
    id: 'p1',
    fullName: 'Ama Serwaa Mensah',
    age: 29,
    location: 'Airport Residential, Accra',
    profession: 'Senior Corporate Counsel',
    education: 'LL.M, University of Ghana / LSE',
    values: ['Faith', 'Family Leadership', 'Intellectual Drive'],
    faith: 'Christian',
    marriageTimeline: 'Within 1-2 years',
    bio: 'Warm, grounded professional seeking a partner committed to enduring family legacy.',
    verified: true,
    avatarSeed: 'ama',
    gender: 'female',
  },
  {
    id: 'p2',
    fullName: 'Kwame Osei-Tutu',
    age: 34,
    location: 'Cantonments, Accra',
    profession: 'Managing Director, Infrastructure Finance',
    education: 'MSc Financial Economics, Oxford',
    values: ['Integrity', 'Heritage', 'Christian Values'],
    faith: 'Christian',
    marriageTimeline: 'Ready for marriage',
    bio: 'Passionate about building across Africa. Seeking someone mindful, kind, and family-oriented.',
    verified: true,
    avatarSeed: 'kwame',
    gender: 'male',
  },
  {
    id: 'p3',
    fullName: 'Yaa Boateng',
    age: 31,
    location: 'London & Kumasi',
    profession: 'Pediatric Specialist',
    education: 'MBChB, KNUST / MRCPCH',
    values: ['Compassion', 'Discipline', 'Christian Faith'],
    faith: 'Christian',
    marriageTimeline: 'Within 2 years',
    bio: 'Dividing time between UK and Ghana. Dedicated to healthcare and rooted in intentional companionship.',
    verified: true,
    avatarSeed: 'yaa',
    gender: 'female',
  },
];

test('filterProfiles filters correctly by location and search keyword', () => {
  const accraOnly = filterProfiles(mockProfiles, { location: 'Accra' });
  assert.equal(accraOnly.length, 2);

  const londonOnly = filterProfiles(mockProfiles, { location: 'London' });
  assert.equal(londonOnly.length, 1);
  assert.equal(londonOnly[0].id, 'p3');

  const querySearch = filterProfiles(mockProfiles, { searchQuery: 'Counsel' });
  assert.equal(querySearch.length, 1);
  assert.equal(querySearch[0].fullName, 'Ama Serwaa Mensah');
});

test('filterProfiles filters correctly by age range', () => {
  const ageFiltered = filterProfiles(mockProfiles, { minAge: 30, maxAge: 35 });
  assert.equal(ageFiltered.length, 2);
  assert.ok(ageFiltered.every((p) => p.age >= 30 && p.age <= 35));
});

test('calculateBookingPrice calculates studio vs home visit correctly', () => {
  const hourlyRate = 600; // GHS
  const studio60 = calculateBookingPrice(hourlyRate, 60, 'studio');
  assert.equal(studio60.baseRate, 600);
  assert.equal(studio60.travelFee, 0);
  assert.equal(studio60.totalGHS, 600);
  assert.equal(studio60.durationHours, 1);

  const home90 = calculateBookingPrice(hourlyRate, 90, 'home');
  assert.equal(home90.baseRate, 900);
  assert.equal(home90.travelFee, 120);
  assert.equal(home90.totalGHS, 1020);
  assert.equal(home90.durationHours, 1.5);
});

test('validateBookingForm flags missing fields and accepts valid requests', () => {
  const invalidRequest: Partial<BookingRequest> = {
    therapistId: '',
    serviceType: '',
  };
  const invalidResult = validateBookingForm(invalidRequest);
  assert.equal(invalidResult.valid, false);
  assert.ok(invalidResult.errors.length >= 4);

  const validRequest: BookingRequest = {
    therapistId: 't1',
    serviceType: 'Deep Tissue Recovery Therapy',
    durationMinutes: 90,
    date: '2026-10-25',
    timeSlot: '14:00 - 15:30',
    locationType: 'studio',
    clientName: 'Kofi Mensah',
    clientPhone: '+233 24 456 7890',
  };
  const validResult = validateBookingForm(validRequest);
  assert.equal(validResult.valid, true);
  assert.equal(validResult.errors.length, 0);
});
