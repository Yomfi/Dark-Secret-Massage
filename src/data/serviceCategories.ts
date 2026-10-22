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

/** Public massage/wellness categories only (matchmaking removed from live explore). */
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
    subcategories: ['In-home Massage'],
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
