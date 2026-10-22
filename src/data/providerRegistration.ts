export type ProviderType = 'individual' | 'agency';
export type ProviderGender = 'female' | 'male';

export const MASSAGE_SERVICE_OPTIONS = [
  'Swedish Massage',
  'Deep Tissue Massage',
  'Relaxation Massage',
  'Aromatherapy',
  'Sports Massage',
  'Hot Stone Massage',
  'Couples Massage',
  'Home Massage',
  'Spa Session',
  'Other Massage Service',
] as const;

export const SERVICE_SETTING_OPTIONS: { id: string; label: string }[] = [
  { id: 'studio', label: 'Studio' },
  { id: 'home_visit', label: 'Home Visit' },
  { id: 'hotel_visit', label: 'Hotel Visit' },
  { id: 'client_location', label: 'Client Location' },
  { id: 'flexible', label: 'Flexible' },
];

export const RATE_DURATIONS = [60, 90] as const;

export type ServiceRateDraft = {
  service: string;
  durationMinutes: number;
  price: string;
};

export function emptyRatesForServices(services: string[]): ServiceRateDraft[] {
  const rows: ServiceRateDraft[] = [];
  for (const service of services) {
    for (const durationMinutes of RATE_DURATIONS) {
      rows.push({ service, durationMinutes, price: '' });
    }
  }
  return rows;
}

export function computeLocalCompletion(input: {
  providerType: ProviderType;
  gender?: ProviderGender | '';
  displayName: string;
  businessName?: string;
  city: string;
  about: string;
  primaryImage: string;
  coverImage?: string;
  services: string[];
  startingPrice: string;
  rates: ServiceRateDraft[];
}): number {
  const checks: boolean[] = [];
  if (input.providerType === 'agency') {
    checks.push(Boolean(input.businessName?.trim() || input.displayName.trim()));
    checks.push(Boolean(input.displayName.trim() || input.businessName?.trim()));
    checks.push(Boolean(input.city.trim()));
    checks.push(Boolean(input.primaryImage.trim() || input.coverImage?.trim()));
    checks.push(Boolean(input.about.trim()));
    checks.push(input.services.length > 0);
    checks.push(
      Boolean(input.startingPrice.trim()) ||
        input.rates.some((r) => r.price.trim() !== ''),
    );
  } else {
    checks.push(true);
    checks.push(input.gender === 'female' || input.gender === 'male');
    checks.push(Boolean(input.displayName.trim()));
    checks.push(true);
    checks.push(Boolean(input.city.trim()));
    checks.push(Boolean(input.primaryImage.trim()));
    checks.push(Boolean(input.about.trim()));
    checks.push(input.services.length > 0);
    checks.push(
      Boolean(input.startingPrice.trim()) ||
        input.rates.some((r) => r.price.trim() !== ''),
    );
  }
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}
