/** Editable fictional demo profiles for Find a Life Partner discovery. */

export interface DiscoveryProfile {
  id: string;
  firstName: string;
  age: number;
  city: string;
  region: string;
  gender: 'female' | 'male';
  profession: string;
  education: string;
  faith: string;
  denomination: string;
  marriageIntent: string;
  maritalStatus: string;
  hasChildren: boolean;
  languages: string[];
  lifestyle: string[];
  interests: string[];
  about: string;
  lookingFor: string;
  photos: string[];
  verified: boolean;
  /** Demo: they already expressed interest in the current user */
  alreadyInterestedInUser?: boolean;
  highlights?: string[];
}

export const CURRENT_DEMO_USER = {
  id: 'user-demo',
  firstName: 'Kwabena',
  age: 33,
  city: 'Accra',
  region: 'Greater Accra',
  gender: 'male' as const,
  preferences: {
    ageMin: 26,
    ageMax: 36,
    regions: ['Greater Accra', 'Ashanti'],
    faith: 'Christian',
    seekingGender: 'female' as const,
  },
};

export const DISCOVERY_PROFILES: DiscoveryProfile[] = [
  {
    id: 'disc-ama',
    firstName: 'Ama',
    age: 29,
    city: 'Accra',
    region: 'Greater Accra',
    gender: 'female',
    profession: 'Marketing Executive',
    education: "Master's Degree",
    faith: 'Christian',
    denomination: 'Non-denominational',
    marriageIntent: 'Seeking Marriage',
    maritalStatus: 'Never married',
    hasChildren: false,
    languages: ['English', 'Twi'],
    lifestyle: ['Active', 'Faith-centred', 'Career-focused'],
    interests: ['Travel', 'Cooking', 'Contemporary art', 'Sunday fellowship'],
    about:
      'I value quiet depth, thoughtful conversation, and building a home rooted in faith and mutual respect. Weekends often mean coastal walks, family gatherings, or a good book.',
    lookingFor:
      'A grounded, intentional man who is ready for marriage, shares Christian values, and wants an equal partnership.',
    photos: ['/profiles/profile_ama.jpg', '/ghanaian_couple_picnic.jpg'],
    verified: true,
    alreadyInterestedInUser: true,
    highlights: ['Matches your age preference', 'Same faith preference', 'Located in Greater Accra'],
  },
  {
    id: 'disc-yaa',
    firstName: 'Yaa',
    age: 31,
    city: 'Kumasi',
    region: 'Ashanti',
    gender: 'female',
    profession: 'Pediatric Specialist',
    education: 'Medical Degree',
    faith: 'Christian',
    denomination: 'Methodist',
    marriageIntent: 'Within 1–2 years',
    maritalStatus: 'Never married',
    hasChildren: false,
    languages: ['English', 'Twi', 'French'],
    lifestyle: ['Service-oriented', 'Family-minded'],
    interests: ['Community health', 'Jazz', 'Gardening'],
    about:
      'I split time between clinical work and community health initiatives. Warmth, humour, and deliberate purpose matter deeply to me.',
    lookingFor:
      'A supportive life partner who values kindness, intellectual curiosity, and long-term companionship.',
    photos: ['/profiles/profile_yaa.jpg', '/Warm%20Amber%20Whisper.png'],
    verified: true,
    highlights: ['Matches your age preference', 'Same faith preference'],
  },
  {
    id: 'disc-abena',
    firstName: 'Abena',
    age: 32,
    city: 'Accra',
    region: 'Greater Accra',
    gender: 'female',
    profession: 'Architect',
    education: "Master's Degree",
    faith: 'Christian',
    denomination: 'Presbyterian',
    marriageIntent: 'Within 12–18 months',
    maritalStatus: 'Never married',
    hasChildren: false,
    languages: ['English', 'Twi'],
    lifestyle: ['Creative', 'Intentional living'],
    interests: ['Design', 'Art galleries', 'Weekend drives'],
    about:
      'I design contemporary African spaces and love slow Sundays, galleries, and spontaneous trips to the Volta region.',
    lookingFor:
      'A mature gentleman with purpose, empathy, and shared spiritual devotion.',
    photos: ['/profiles/profile_abena.jpg', '/ghanaian_couple_picnic.jpg'],
    verified: true,
    alreadyInterestedInUser: true,
    highlights: ['Same faith preference', 'Located in Greater Accra'],
  },
  {
    id: 'disc-akosua',
    firstName: 'Akosua',
    age: 28,
    city: 'Accra',
    region: 'Greater Accra',
    gender: 'female',
    profession: 'Brand Strategist',
    education: "Bachelor's Degree",
    faith: 'Christian',
    denomination: 'Charismatic',
    marriageIntent: 'Seeking Marriage',
    maritalStatus: 'Never married',
    hasChildren: false,
    languages: ['English', 'Ga', 'Twi'],
    lifestyle: ['Social', 'Career-focused'],
    interests: ['Branding', 'Fitness', 'Worship music'],
    about:
      'Energetic, intentional, and family-oriented. I build brands by day and cherish quiet evenings with close friends.',
    lookingFor:
      'Someone emotionally available, faith-rooted, and serious about building a lasting marriage.',
    photos: ['/profiles/profile_akosua.jpg'],
    verified: true,
    highlights: ['Matches your age preference', 'Located in Greater Accra'],
  },
  {
    id: 'disc-esi',
    firstName: 'Esi',
    age: 30,
    city: 'Tema',
    region: 'Greater Accra',
    gender: 'female',
    profession: 'Education Consultant',
    education: "Master's Degree",
    faith: 'Christian',
    denomination: 'Catholic',
    marriageIntent: 'Within 1–2 years',
    maritalStatus: 'Never married',
    hasChildren: false,
    languages: ['English', 'Fante'],
    lifestyle: ['Reflective', 'Community-minded'],
    interests: ['Reading', 'Mentoring youth', 'Coastal walks'],
    about:
      'I help schools raise standards across Ghana. Calm temperament, strong values, and a soft spot for good conversation.',
    lookingFor:
      'A thoughtful partner who respects faith, family, and personal growth.',
    photos: ['/profiles/profile_esi.jpg', '/Warm%20Amber%20Whisper.png'],
    verified: false,
    highlights: ['Matches your age preference', 'Same faith preference'],
  },
  {
    id: 'disc-adwoa',
    firstName: 'Adwoa',
    age: 33,
    city: 'Accra',
    region: 'Greater Accra',
    gender: 'female',
    profession: 'Investment Analyst',
    education: "Master's Degree",
    faith: 'Christian',
    denomination: 'Anglican',
    marriageIntent: 'Ready for marriage',
    maritalStatus: 'Never married',
    hasChildren: false,
    languages: ['English', 'Twi'],
    lifestyle: ['Disciplined', 'Travel-curious'],
    interests: ['Finance', 'Tennis', 'Classical music'],
    about:
      'I work across West African markets and value integrity above performance. Looking for depth, not distraction.',
    lookingFor:
      'An intentional man prepared for marriage, shared stewardship, and emotional honesty.',
    photos: ['/profiles/profile_adwoa.jpg'],
    verified: true,
    highlights: ['Same faith preference', 'Located in Greater Accra'],
  },
  {
    id: 'disc-afua',
    firstName: 'Afua',
    age: 27,
    city: 'Cape Coast',
    region: 'Central',
    gender: 'female',
    profession: 'Communications Manager',
    education: "Bachelor's Degree",
    faith: 'Christian',
    denomination: 'Pentecostal',
    marriageIntent: 'Seeking Marriage',
    maritalStatus: 'Never married',
    hasChildren: false,
    languages: ['English', 'Fante'],
    lifestyle: ['Outgoing', 'Faith-centred'],
    interests: ['Media', 'Volunteering', 'Beach Sundays'],
    about:
      'Storyteller by trade, intentional about relationships. Close to family and open to relocating for the right partnership.',
    lookingFor:
      'A kind, ambitious partner who leads with character and wants a faith-centred home.',
    photos: ['/profiles/profile_akosua.jpg', '/ghanaian_couple_picnic.jpg'],
    verified: true,
    highlights: ['Matches your age preference'],
  },
  {
    id: 'disc-maame',
    firstName: 'Maame',
    age: 34,
    city: 'Accra',
    region: 'Greater Accra',
    gender: 'female',
    profession: 'HR Director',
    education: "Master's Degree",
    faith: 'Christian',
    denomination: 'Non-denominational',
    marriageIntent: 'Ready for marriage',
    maritalStatus: 'Divorced',
    hasChildren: true,
    languages: ['English', 'Twi'],
    lifestyle: ['Family-first', 'Balanced'],
    interests: ['Parenting', 'Wellness', 'Travel'],
    about:
      'Building a peaceful next chapter. Clear about values, soft in approach, serious about commitment.',
    lookingFor:
      'A respectful partner open to family life, emotional maturity, and shared Christian faith.',
    photos: ['/profiles/profile_esi.jpg', '/profiles/profile_abena.jpg'],
    verified: true,
    highlights: ['Same faith preference', 'Located in Greater Accra'],
  },
];
