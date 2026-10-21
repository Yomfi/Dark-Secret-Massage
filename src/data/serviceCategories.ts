export type ServiceCategoryId =
  | 'massage'
  | 'spa'
  | 'home-massage'
  | 'couples-massage'
  | 'matchmaking'
  | 'friendship';

export type ServiceCategory = {
  id: ServiceCategoryId;
  slug: string;
  label: string;
  description: string;
  subcategories: string[];
};

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
  {
    id: 'matchmaking',
    slug: 'matchmaking',
    label: 'Matchmaking / Marriage',
    description: 'Marriage-focused and serious relationship introductions.',
    subcategories: ['Marriage-focused', 'Serious Relationship'],
  },
  {
    id: 'friendship',
    slug: 'friendship',
    label: 'Friendship / Social Connection',
    description: 'Genuine friendship and social connection.',
    subcategories: ['Friendship', 'Social Connection'],
  },
];

export function findServiceCategory(slugOrId: string | null | undefined): ServiceCategory | undefined {
  if (!slugOrId) return undefined;
  const key = slugOrId.toLowerCase();
  return SERVICE_CATEGORIES.find((c) => c.id === key || c.slug === key);
}
