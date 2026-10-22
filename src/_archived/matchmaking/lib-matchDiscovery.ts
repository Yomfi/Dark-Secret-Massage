import {
  CURRENT_DEMO_USER,
  DISCOVERY_PROFILES,
  type DiscoveryProfile,
} from '../data/discoveryProfiles';

export type DiscoveryView =
  | 'discover'
  | 'interests'
  | 'connections'
  | 'saved'
  | 'messages'
  | 'profile'
  | 'preferences';

export type InterestStatus = 'pending' | 'accepted' | 'declined';

export interface DiscoveryFiltersState {
  ageMin: number;
  ageMax: number;
  region: string;
  faith: string;
  education: string;
  maritalStatus: string;
  hasChildren: 'any' | 'yes' | 'no';
  verifiedOnly: boolean;
}

export interface SentInterest {
  profileId: string;
  at: string;
}

export interface ReceivedInterest {
  profileId: string;
  at: string;
  status: InterestStatus;
}

export interface Connection {
  profileId: string;
  at: string;
}

export interface MatchDiscoveryState {
  deckIds: string[];
  passedIds: string[];
  savedIds: string[];
  sentInterests: SentInterest[];
  receivedInterests: ReceivedInterest[];
  connections: Connection[];
  blockedIds: string[];
  filters: DiscoveryFiltersState;
}

export const defaultFilters = (): DiscoveryFiltersState => ({
  ageMin: CURRENT_DEMO_USER.preferences.ageMin,
  ageMax: CURRENT_DEMO_USER.preferences.ageMax,
  region: 'all',
  faith: 'all',
  education: 'all',
  maritalStatus: 'all',
  hasChildren: 'any',
  verifiedOnly: false,
});

export function createInitialDiscoveryState(): MatchDiscoveryState {
  const seeking = CURRENT_DEMO_USER.preferences.seekingGender;
  const base = DISCOVERY_PROFILES.filter(
    (p) => p.gender === seeking && !p.id.startsWith('blocked')
  );

  const received: ReceivedInterest[] = base
    .filter((p) => p.alreadyInterestedInUser)
    .map((p) => ({
      profileId: p.id,
      at: new Date().toISOString(),
      status: 'pending' as const,
    }));

  return {
    deckIds: base.map((p) => p.id),
    passedIds: [],
    savedIds: [],
    sentInterests: [],
    receivedInterests: received,
    connections: [],
    blockedIds: [],
    filters: defaultFilters(),
  };
}

export function getProfile(id: string): DiscoveryProfile | undefined {
  return DISCOVERY_PROFILES.find((p) => p.id === id);
}

export function applyFilters(
  profiles: DiscoveryProfile[],
  filters: DiscoveryFiltersState,
  excludeIds: string[]
): DiscoveryProfile[] {
  const excluded = new Set(excludeIds);
  return profiles.filter((p) => {
    if (excluded.has(p.id)) return false;
    if (p.age < filters.ageMin || p.age > filters.ageMax) return false;
    if (filters.region !== 'all' && p.region !== filters.region) return false;
    if (filters.faith !== 'all' && !p.faith.toLowerCase().includes(filters.faith.toLowerCase())) {
      return false;
    }
    if (filters.education !== 'all' && p.education !== filters.education) return false;
    if (filters.maritalStatus !== 'all' && p.maritalStatus !== filters.maritalStatus) return false;
    if (filters.hasChildren === 'yes' && !p.hasChildren) return false;
    if (filters.hasChildren === 'no' && p.hasChildren) return false;
    if (filters.verifiedOnly && !p.verified) return false;
    return true;
  });
}

export function filterDeck(
  state: MatchDiscoveryState,
  all: DiscoveryProfile[] = DISCOVERY_PROFILES
): DiscoveryProfile[] {
  const seeking = CURRENT_DEMO_USER.preferences.seekingGender;
  const pool = all.filter((p) => p.gender === seeking);
  const exclude = [
    ...state.passedIds,
    ...state.sentInterests.map((s) => s.profileId),
    ...state.connections.map((c) => c.profileId),
    ...state.blockedIds,
    ...state.receivedInterests.filter((r) => r.status === 'accepted').map((r) => r.profileId),
  ];
  const filtered = applyFilters(pool, state.filters, exclude);
  // Preserve deck order where possible
  const order = new Map(state.deckIds.map((id, i) => [id, i]));
  return filtered.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
}

export type SwipeResult =
  | { type: 'pass'; profileId: string }
  | { type: 'save'; profileId: string }
  | { type: 'interest'; profileId: string; mutual: boolean; connection?: Connection };

export function applyPass(state: MatchDiscoveryState, profileId: string): MatchDiscoveryState {
  return {
    ...state,
    deckIds: state.deckIds.filter((id) => id !== profileId),
    passedIds: state.passedIds.includes(profileId)
      ? state.passedIds
      : [...state.passedIds, profileId],
  };
}

export function applySave(state: MatchDiscoveryState, profileId: string): MatchDiscoveryState {
  return {
    ...state,
    savedIds: state.savedIds.includes(profileId) ? state.savedIds : [...state.savedIds, profileId],
  };
}

export function applyInterest(
  state: MatchDiscoveryState,
  profileId: string
): { state: MatchDiscoveryState; mutual: boolean; connection?: Connection } {
  const profile = getProfile(profileId);
  const alreadyFromThem =
    profile?.alreadyInterestedInUser ||
    state.receivedInterests.some((r) => r.profileId === profileId && r.status === 'pending');

  const sent: SentInterest = { profileId, at: new Date().toISOString() };
  let next: MatchDiscoveryState = {
    ...state,
    deckIds: state.deckIds.filter((id) => id !== profileId),
    sentInterests: state.sentInterests.some((s) => s.profileId === profileId)
      ? state.sentInterests
      : [...state.sentInterests, sent],
  };

  if (alreadyFromThem) {
    const connection: Connection = { profileId, at: new Date().toISOString() };
    next = {
      ...next,
      connections: [...next.connections, connection],
      receivedInterests: next.receivedInterests.map((r) =>
        r.profileId === profileId ? { ...r, status: 'accepted' } : r
      ),
      savedIds: next.savedIds.filter((id) => id !== profileId),
    };
    return { state: next, mutual: true, connection };
  }

  return { state: next, mutual: false };
}

export function acceptReceivedInterest(
  state: MatchDiscoveryState,
  profileId: string
): MatchDiscoveryState {
  const connection: Connection = { profileId, at: new Date().toISOString() };
  return {
    ...state,
    connections: state.connections.some((c) => c.profileId === profileId)
      ? state.connections
      : [...state.connections, connection],
    receivedInterests: state.receivedInterests.map((r) =>
      r.profileId === profileId ? { ...r, status: 'accepted' } : r
    ),
    deckIds: state.deckIds.filter((id) => id !== profileId),
    sentInterests: state.sentInterests.some((s) => s.profileId === profileId)
      ? state.sentInterests
      : [...state.sentInterests, { profileId, at: new Date().toISOString() }],
  };
}

export function declineReceivedInterest(
  state: MatchDiscoveryState,
  profileId: string
): MatchDiscoveryState {
  return {
    ...state,
    receivedInterests: state.receivedInterests.map((r) =>
      r.profileId === profileId ? { ...r, status: 'declined' } : r
    ),
    passedIds: state.passedIds.includes(profileId)
      ? state.passedIds
      : [...state.passedIds, profileId],
    deckIds: state.deckIds.filter((id) => id !== profileId),
  };
}

export function blockProfile(state: MatchDiscoveryState, profileId: string): MatchDiscoveryState {
  return {
    ...state,
    blockedIds: [...state.blockedIds, profileId],
    deckIds: state.deckIds.filter((id) => id !== profileId),
    savedIds: state.savedIds.filter((id) => id !== profileId),
    receivedInterests: state.receivedInterests.filter((r) => r.profileId !== profileId),
    sentInterests: state.sentInterests.filter((s) => s.profileId !== profileId),
  };
}

export const REGION_OPTIONS = [
  'Greater Accra',
  'Ashanti',
  'Central',
  'Western',
  'Eastern',
  'Northern',
];

export const EDUCATION_OPTIONS = [
  "Bachelor's Degree",
  "Master's Degree",
  'Medical Degree',
  'Doctorate',
];

export const MARITAL_OPTIONS = ['Never married', 'Divorced', 'Widowed'];
