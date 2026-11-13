export type ServiceCategoryId =
  | 'massage'
  | 'spa'
  | 'home-massage'
  | 'couples-massage'
  /** @deprecated Hidden from public explore — preserved for archived data compatibility */
  | 'matchmaking'
  /** @deprecated Hidden from public explore — preserved for archived data compatibility */
  | 'friendship';

export type ServiceCategory = {
  id: ServiceCategoryId;
  slug: string;
  label: string;
  description: string;
  subcategories: string[];
};

/** Flat massage service options shown in Explore filters. */
export const MASSAGE_SERVICE_OPTIONS = [
  'Swedish Massage',
  'Deep Tissue Massage',
  'Relaxation Massage',
  'Aromatherapy',
  'Sports Massage',
  'Hot Stone Massage',
  'Home Massage',
  'Couples Massage',
  'Spa Session',
  'Erotic Massage',
  'Other Massage Service',
] as const;

export type MassageServiceOption = (typeof MASSAGE_SERVICE_OPTIONS)[number];

/**
 * Adults-only (18+) massage categories.
 *
 * Age and legal safeguards apply wherever these are selectable: the service is
 * offered only to adults, must be delivered as a lawful, non-explicit massage,
 * and listings may never include sexual services or explicit imagery.
 */
export const ADULT_SERVICE_OPTIONS = ['Erotic Massage'] as const;

export function isAdultService(label: string | null | undefined): boolean {
  if (!label) return false;
  const key = label.trim().toLowerCase();
  return ADULT_SERVICE_OPTIONS.some((option) => option.toLowerCase() === key);
}

/** Public massage/wellness categories (legacy grouping for profile primaryCategory). */
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'massage',
    slug: 'massage',
    label: 'Massage & Wellness',
    description: 'Professional therapeutic and relaxation massage.',
    subcategories: [
      'Swedish Massage',
      'Deep Tissue Massage',
      'Aromatherapy',
      'Relaxation Massage',
      'Sports Massage',
      'Erotic Massage',
    ],
  },
  {
    id: 'spa',
    slug: 'spa',
    label: 'Spa Services',
    description: 'Spa sessions and restorative body treatments.',
    subcategories: ['Spa Session', 'Wellness Ritual'],
  },
  {
    id: 'home-massage',
    slug: 'home-massage',
    label: 'Home Massage',
    description: 'In-home professional massage sessions.',
    subcategories: ['In-home Massage', 'Home Massage'],
  },
  {
    id: 'couples-massage',
    slug: 'couples-massage',
    label: 'Couples Massage',
    description: 'Shared wellness sessions for two.',
    subcategories: ['Couples Massage'],
  },
];

export function findServiceCategory(slugOrId: string | null | undefined): ServiceCategory | undefined {
  if (!slugOrId) return undefined;
  const key = slugOrId.toLowerCase();
  return SERVICE_CATEGORIES.find((c) => c.id === key || c.slug === key);
}

/** Match a profile against a selected Explore service label. */
export function profileOffersService(
  services: string[],
  offerings: { name: string }[] | undefined,
  selected: string,
): boolean {
  const needle = selected.toLowerCase();
  const haystack = [
    ...services,
    ...(offerings?.map((o) => o.name) ?? []),
  ].map((s) => s.toLowerCase());

  return haystack.some(
    (s) =>
      s === needle ||
      s.includes(needle) ||
      needle.includes(s) ||
      (needle.includes('home') && s.includes('home')) ||
      (needle.includes('spa') && s.includes('spa')) ||
      (needle.includes('aromatherapy') && s.includes('aroma')),
  );
}
