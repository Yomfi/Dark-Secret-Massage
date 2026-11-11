/**
 * Extensible location taxonomy: Country → Region → District → City/Area.
 *
 * Ghana's 16 regions are fixed. The town list covers regional and district
 * capitals plus the main neighbourhoods customers search for; a locality that
 * is not listed can still be entered manually on every location form. Latitude
 * and longitude are approximate town-centre coordinates used only for
 * straight-line distance, never as a boundary claim.
 */

export type MarketplaceCountry = {
  code: string;
  name: string;
  slug: string;
};

export type MarketplaceRegion = {
  id: string;
  countryCode: string;
  name: string;
  slug: string;
};

export type MarketplaceCity = {
  id: string;
  slug: string;
  name: string;
  regionId: string;
  countryCode: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  aliases?: string[];
};

export const MARKETPLACE_COUNTRIES: MarketplaceCountry[] = [
  { code: 'GH', name: 'Ghana', slug: 'ghana' },
];

export const MARKETPLACE_REGIONS: MarketplaceRegion[] = [
  { id: 'gh-ga', countryCode: 'GH', name: 'Greater Accra', slug: 'greater-accra' },
  { id: 'gh-as', countryCode: 'GH', name: 'Ashanti', slug: 'ashanti' },
  { id: 'gh-cr', countryCode: 'GH', name: 'Central', slug: 'central' },
  { id: 'gh-er', countryCode: 'GH', name: 'Eastern', slug: 'eastern' },
  { id: 'gh-wr', countryCode: 'GH', name: 'Western', slug: 'western' },
  { id: 'gh-wn', countryCode: 'GH', name: 'Western North', slug: 'western-north' },
  { id: 'gh-vr', countryCode: 'GH', name: 'Volta', slug: 'volta' },
  { id: 'gh-ot', countryCode: 'GH', name: 'Oti', slug: 'oti' },
  { id: 'gh-nr', countryCode: 'GH', name: 'Northern', slug: 'northern' },
  { id: 'gh-ne', countryCode: 'GH', name: 'North East', slug: 'north-east' },
  { id: 'gh-sv', countryCode: 'GH', name: 'Savannah', slug: 'savannah' },
  { id: 'gh-ue', countryCode: 'GH', name: 'Upper East', slug: 'upper-east' },
  { id: 'gh-uw', countryCode: 'GH', name: 'Upper West', slug: 'upper-west' },
  { id: 'gh-bo', countryCode: 'GH', name: 'Bono', slug: 'bono' },
  { id: 'gh-be', countryCode: 'GH', name: 'Bono East', slug: 'bono-east' },
  { id: 'gh-ah', countryCode: 'GH', name: 'Ahafo', slug: 'ahafo' },
];

type CitySeed = [
  regionId: string,
  name: string,
  district: string,
  lat: number,
  lng: number,
  aliases?: string[],
];

const CITY_SEEDS: CitySeed[] = [
  // Greater Accra
  ['gh-ga', 'Accra', 'Accra Metropolitan', 5.6037, -0.187],
  ['gh-ga', 'Tema', 'Tema Metropolitan', 5.6698, -0.0166],
  ['gh-ga', 'East Legon', 'Accra Metropolitan', 5.635, -0.156],
  ['gh-ga', 'Osu', 'Accra Metropolitan', 5.558, -0.177],
  ['gh-ga', 'Airport Residential', 'Accra Metropolitan', 5.606, -0.173, ['Airport Residential Area']],
  ['gh-ga', 'West Legon', 'Accra Metropolitan', 5.651, -0.207],
  ['gh-ga', 'Cantonments', 'Accra Metropolitan', 5.573, -0.174],
  ['gh-ga', 'Labone', 'Accra Metropolitan', 5.567, -0.173],
  ['gh-ga', 'Tesano', 'Accra Metropolitan', 5.607, -0.233],
  ['gh-ga', 'Haatso', 'Ga East', 5.657, -0.214],
  ['gh-ga', 'Weija', 'Ga South', 5.575, -0.337],
  ['gh-ga', 'Community 25', 'Tema Metropolitan', 5.65, 0.02, ['Tema Community 25']],
  ['gh-ga', 'Spintex', 'Ledzokuku / Krowor', 5.626, -0.093],
  ['gh-ga', 'Madina', 'La Nkwantanang Madina', 5.683, -0.166],
  ['gh-ga', 'Adenta', 'Adentan Municipal', 5.707, -0.16],
  ['gh-ga', 'Achimota', 'Accra Metropolitan', 5.617, -0.226],
  ['gh-ga', 'Dansoman', 'Ablekuma West', 5.548, -0.262],
  ['gh-ga', 'Ashaiman', 'Ashaiman Municipal', 5.696, -0.031],
  ['gh-ga', 'Teshie', 'Ledzokuku', 5.583, -0.105],
  ['gh-ga', 'Nungua', 'Ledzokuku', 5.601, -0.073],
  ['gh-ga', 'Dome', 'Ga East', 5.65, -0.235],
  ['gh-ga', 'Amasaman', 'Ga West', 5.7, -0.3],
  ['gh-ga', 'Kpone', 'Kpone Katamanso', 5.692, 0.057],
  ['gh-ga', 'Prampram', 'Ningo Prampram', 5.708, 0.106],
  ['gh-ga', 'Ada Foah', 'Ada East', 5.7833, 0.6333],
  // Ashanti
  ['gh-as', 'Kumasi', 'Kumasi Metropolitan', 6.6885, -1.6244],
  ['gh-as', 'Obuasi', 'Obuasi Municipal', 6.202, -1.689],
  ['gh-as', 'Ejisu', 'Ejisu Juaben', 6.739, -1.363],
  ['gh-as', 'Mampong', 'Mampong Municipal', 7.062, -1.4],
  ['gh-as', 'Konongo', 'Asante Akim Central', 6.617, -1.217],
  ['gh-as', 'Bekwai', 'Bekwai Municipal', 6.45, -1.583],
  ['gh-as', 'Offinso', 'Offinso Municipal', 6.95, -1.667],
  ['gh-as', 'Ejura', 'Ejura Sekyedumase', 7.3833, -1.3667],
  ['gh-as', 'Tepa', 'Ahafo Ano North', 6.983, -2.167],
  ['gh-as', 'Nkawie', 'Atwima Nwabiagya', 6.7167, -2.0167],
  ['gh-as', 'Juaso', 'Asante Akim South', 6.75, -1.3333],
  ['gh-as', 'Kumawu', 'Sekyere Kumawu', 6.9, -1.3],
  ['gh-as', 'Effiduase', 'Sekyere East', 6.85, -1.4],
  ['gh-as', 'Agona Ashanti', 'Sekyere Central', 6.8, -1.45],
  ['gh-as', 'Jacobu', 'Amansie Central', 6.7333, -1.9333],
  ['gh-as', 'Fomena', 'Adansi North', 6.2167, -1.85],
  ['gh-as', 'Akrokerri', 'Adansi South', 6.2833, -1.65],
  ['gh-as', 'Manso Nkwanta', 'Amansie West', 6.4667, -2.0],
  // Central
  ['gh-cr', 'Cape Coast', 'Cape Coast Metropolitan', 5.1315, -1.2795],
  ['gh-cr', 'Kasoa', 'Awutu Senya East', 5.5333, -0.4167],
  ['gh-cr', 'Winneba', 'Effutu Municipal', 5.3511, -0.6266],
  ['gh-cr', 'Saltpond', 'Mfantsiman', 5.2, -1.0667],
  ['gh-cr', 'Mankessim', 'Mfantsiman', 5.2667, -1.0167],
  ['gh-cr', 'Elmina', 'Komenda Edina Eguafo Abirem', 5.0847, -1.3506],
  ['gh-cr', 'Apam', 'Gomoa West', 5.2833, -0.7333],
  ['gh-cr', 'Agona Swedru', 'Agona West', 5.5333, -0.7],
  ['gh-cr', 'Dunkwa-on-Offin', 'Upper Denkyira East', 5.9667, -1.7833],
  ['gh-cr', 'Assin Fosu', 'Assin Central', 5.8, -1.2833],
  ['gh-cr', 'Twifo Praso', 'Twifo Atti Morkwa', 5.6, -1.5333],
  ['gh-cr', 'Breman Asikuma', 'Asikuma Odoben Brakwa', 5.5833, -0.9833],
  ['gh-cr', 'Senya Beraku', 'Awutu Senya West', 5.3833, -0.55],
  ['gh-cr', 'Abura Dunkwa', 'Abura Asebu Kwamankese', 5.2833, -1.1667],
  ['gh-cr', 'Moree', 'Abura Asebu Kwamankese', 5.1333, -1.15],
  // Eastern
  ['gh-er', 'Koforidua', 'New Juaben South', 6.094, -0.2591],
  ['gh-er', 'Nkawkaw', 'Kwahu West', 6.55, -0.7667],
  ['gh-er', 'Suhum', 'Suhum Municipal', 6.0333, -0.45],
  ['gh-er', 'Akim Oda', 'Birim Central', 5.9333, -0.9833],
  ['gh-er', 'Somanya', 'Yilo Krobo', 6.1, 0.0167],
  ['gh-er', 'Odumase Krobo', 'Lower Manya Krobo', 6.0833, -0.0167],
  ['gh-er', 'Aburi', 'Akuapem South', 5.85, -0.1833],
  ['gh-er', 'Nsawam', 'Nsawam Adoagyiri', 5.8, -0.35],
  ['gh-er', 'Asamankese', 'West Akim', 5.8667, -0.6667],
  ['gh-er', 'Kade', 'Kwaebibirem', 6.0833, -0.8333],
  ['gh-er', 'Mpraeso', 'Kwahu South', 6.5833, -0.7333],
  ['gh-er', 'Begoro', 'Fanteakwa North', 6.3833, -0.3833],
  ['gh-er', 'Kibi', 'Abuakwa South', 6.1667, -0.55],
  ['gh-er', 'Akropong', 'Akuapem North', 5.9667, -0.0833],
  ['gh-er', 'Akosombo', 'Asuogyaman', 6.3, 0.05],
  ['gh-er', 'Donkorkrom', 'Kwahu Afram Plains North', 7.05, -0.05],
  // Western
  ['gh-wr', 'Sekondi-Takoradi', 'Sekondi Takoradi Metropolitan', 4.9344, -1.7131, ['Sekondi', 'Takoradi']],
  ['gh-wr', 'Tarkwa', 'Tarkwa Nsuaem', 5.3, -1.9833],
  ['gh-wr', 'Axim', 'Nzema East', 4.8667, -2.2333],
  ['gh-wr', 'Elubo', 'Jomoro', 5.1, -2.8],
  ['gh-wr', 'Agona Nkwanta', 'Ahanta West', 4.8833, -2.0],
  ['gh-wr', 'Shama', 'Shama', 5.0167, -1.6333],
  ['gh-wr', 'Prestea', 'Prestea Huni Valley', 5.4333, -2.15],
  ['gh-wr', 'Bogoso', 'Prestea Huni Valley', 5.5667, -2.0333],
  ['gh-wr', 'Half Assini', 'Jomoro', 5.05, -2.8833],
  ['gh-wr', 'Daboase', 'Wassa East', 5.1667, -1.9667],
  ['gh-wr', 'Aboso', 'Tarkwa Nsuaem', 5.3667, -1.95],
  // Western North
  ['gh-wn', 'Sefwi Wiawso', 'Sefwi Wiawso Municipal', 6.2, -2.4833],
  ['gh-wn', 'Bibiani', 'Bibiani Anhwiaso Bekwai', 6.45, -2.3167],
  ['gh-wn', 'Sefwi Bekwai', 'Bibiani Anhwiaso Bekwai', 6.2, -2.3167],
  ['gh-wn', 'Enchi', 'Aowin', 5.8167, -2.8167],
  ['gh-wn', 'Juaboso', 'Juaboso', 6.3333, -2.8],
  ['gh-wn', 'Bodi', 'Bodi', 6.2167, -2.75],
  ['gh-wn', 'Akontombra', 'Sefwi Akontombra', 6.05, -2.85],
  // Volta
  ['gh-vr', 'Ho', 'Ho Municipal', 6.6008, 0.4713],
  ['gh-vr', 'Hohoe', 'Hohoe Municipal', 7.15, 0.4667],
  ['gh-vr', 'Keta', 'Keta Municipal', 5.9167, 0.9833],
  ['gh-vr', 'Aflao', 'Ketu South', 6.1167, 1.1833],
  ['gh-vr', 'Anloga', 'Anloga', 5.7833, 0.9],
  ['gh-vr', 'Akatsi', 'Akatsi South', 6.1, 0.8],
  ['gh-vr', 'Dzodze', 'Ketu North', 6.2333, 0.9833],
  ['gh-vr', 'Sogakope', 'South Tongu', 6.0, 0.5833],
  ['gh-vr', 'Kpando', 'Kpando Municipal', 6.9833, 0.2833],
  ['gh-vr', 'Jasikan', 'Jasikan', 7.4167, 0.4667],
  ['gh-vr', 'Peki', 'South Dayi', 6.5, 0.25],
  ['gh-vr', 'Adidome', 'North Tongu', 6.0833, 0.5333],
  ['gh-vr', 'Battor', 'North Tongu', 6.0833, 0.4167],
  // Oti
  ['gh-ot', 'Dambai', 'Krachi East', 8.0667, 0.1833],
  ['gh-ot', 'Nkwanta', 'Nkwanta South', 8.25, 0.5167],
  ['gh-ot', 'Kete Krachi', 'Krachi West', 7.8, 0.05],
  ['gh-ot', 'Kadjebi', 'Kadjebi', 7.5, 0.4667],
  ['gh-ot', 'Worawora', 'Biakoye', 7.5, 0.4],
  ['gh-ot', 'Chinderi', 'Krachi Nchumuru', 8.0, 0.4],
  // Northern
  ['gh-nr', 'Tamale', 'Tamale Metropolitan', 9.4008, -0.8393],
  ['gh-nr', 'Yendi', 'Yendi Municipal', 9.4427, -0.0098],
  ['gh-nr', 'Savelugu', 'Savelugu Municipal', 9.6167, -0.8333],
  ['gh-nr', 'Nanton', 'Nanton', 9.7333, -0.8833],
  ['gh-nr', 'Tolon', 'Tolon', 9.4333, -1.0667],
  ['gh-nr', 'Kumbungu', 'Kumbungu', 9.5, -0.9833],
  ['gh-nr', 'Gushegu', 'Gushegu', 9.9167, -0.4667],
  ['gh-nr', 'Karaga', 'Karaga', 9.9167, -0.6167],
  ['gh-nr', 'Sagnarigu', 'Sagnarigu', 9.4167, -0.6333],
  ['gh-nr', 'Zabzugu', 'Zabzugu', 9.2833, -0.3667],
  ['gh-nr', 'Tatale', 'Tatale Sanguli', 9.3, 0.3833],
  ['gh-nr', 'Bimbilla', 'Nanumba North', 8.85, -0.05],
  // North East
  ['gh-ne', 'Nalerigu', 'East Mamprusi', 10.5333, -0.3667],
  ['gh-ne', 'Gambaga', 'East Mamprusi', 10.5333, -0.4333],
  ['gh-ne', 'Walewale', 'West Mamprusi', 10.35, -0.8],
  ['gh-ne', 'Bunkpurugu', 'Bunkpurugu Nakpanduri', 10.5167, -0.1],
  ['gh-ne', 'Chereponi', 'Chereponi', 10.1333, 0.2333],
  ['gh-ne', 'Saboba', 'Saboba', 9.7, 0.3167],
  ['gh-ne', 'Yunyoo', 'Yunyoo Nasuan', 10.4667, -0.0167],
  // Savannah
  ['gh-sv', 'Damongo', 'West Gonja', 9.0833, -1.8167],
  ['gh-sv', 'Bole', 'Bole', 9.0333, -2.4833],
  ['gh-sv', 'Sawla', 'Sawla Tuna Kalba', 9.2833, -2.4167],
  ['gh-sv', 'Salaga', 'East Gonja', 8.55, -0.5167],
  ['gh-sv', 'Daboya', 'North Gonja', 9.5333, -1.3833],
  ['gh-sv', 'Buipe', 'Central Gonja', 8.7667, -1.5333],
  ['gh-sv', 'Yapei', 'Central Gonja', 9.15, -1.15],
  ['gh-sv', 'Tuna', 'Sawla Tuna Kalba', 9.1, -1.8333],
  // Upper East
  ['gh-ue', 'Bolgatanga', 'Bolgatanga Municipal', 10.7856, -0.8514],
  ['gh-ue', 'Bawku', 'Bawku Municipal', 11.06, -0.2417],
  ['gh-ue', 'Navrongo', 'Kassena Nankana', 10.8956, -1.0919],
  ['gh-ue', 'Zebilla', 'Bawku West', 10.9333, -0.5],
  ['gh-ue', 'Sandema', 'Builsa North', 10.7333, -1.2833],
  ['gh-ue', 'Garu', 'Garu', 10.85, -0.1833],
  ['gh-ue', 'Paga', 'Kassena Nankana West', 10.9833, -0.8],
  ['gh-ue', 'Bongo', 'Bongo', 10.9, -0.8],
  ['gh-ue', 'Tongo', 'Talensi', 10.8667, -0.8167],
  ['gh-ue', 'Pusiga', 'Pusiga', 11.0667, -0.1167],
  // Upper West
  ['gh-uw', 'Wa', 'Wa Municipal', 10.0601, -2.5099],
  ['gh-uw', 'Lawra', 'Lawra', 10.65, -2.8833],
  ['gh-uw', 'Nandom', 'Nandom', 10.8333, -2.75],
  ['gh-uw', 'Jirapa', 'Jirapa', 10.5333, -2.7],
  ['gh-uw', 'Tumu', 'Sissala East', 10.8833, -1.9833],
  ['gh-uw', 'Gwollu', 'Sissala West', 11.0, -2.5],
  ['gh-uw', 'Funsi', 'Wa East', 10.2833, -2.2833],
  ['gh-uw', 'Wechiau', 'Wa West', 10.0833, -2.5],
  ['gh-uw', 'Nadowli', 'Nadowli Kaleo', 10.4167, -2.6],
  ['gh-uw', 'Lambussie', 'Lambussie Karni', 10.8, -2.7],
  // Bono
  ['gh-bo', 'Sunyani', 'Sunyani Municipal', 7.3399, -2.3268],
  ['gh-bo', 'Berekum', 'Berekum Municipal', 7.45, -2.5833],
  ['gh-bo', 'Dormaa Ahenkro', 'Dormaa Central', 7.2833, -2.8833],
  ['gh-bo', 'Wenchi', 'Wenchi Municipal', 7.7333, -2.1],
  ['gh-bo', 'Nsoatre', 'Sunyani West', 7.4, -2.4667],
  ['gh-bo', 'Odumase Sunyani', 'Sunyani West', 7.3667, -2.3167],
  ['gh-bo', 'Japekrom', 'Jaman South', 7.5833, -2.7833],
  ['gh-bo', 'Drobo', 'Jaman North', 7.5833, -2.6333],
  ['gh-bo', 'Sampa', 'Jaman North', 7.95, -2.6833],
  // Bono East
  ['gh-be', 'Techiman', 'Techiman Municipal', 7.5836, -1.9394],
  ['gh-be', 'Kintampo', 'Kintampo North', 8.05, -1.7333],
  ['gh-be', 'Atebubu', 'Atebubu Amantin', 7.75, -0.9833],
  ['gh-be', 'Yeji', 'Pru East', 8.2, -0.65],
  ['gh-be', 'Nkoranza', 'Nkoranza South', 7.5667, -1.7],
  ['gh-be', 'Jema', 'Kintampo South', 7.6667, -1.8167],
  ['gh-be', 'Prang', 'Pru West', 7.85, -1.35],
  ['gh-be', 'Kwame Danso', 'Sene West', 7.7, -0.85],
  ['gh-be', 'Kajaji', 'Sene East', 7.95, -0.4833],
  ['gh-be', 'Busunya', 'Nkoranza North', 7.6833, -1.6],
  // Ahafo
  ['gh-ah', 'Goaso', 'Asunafo North', 6.8, -2.5167],
  ['gh-ah', 'Hwidiem', 'Asutifi South', 6.8333, -2.55],
  ['gh-ah', 'Bechem', 'Tano South', 7.0833, -2.2167],
  ['gh-ah', 'Duayaw Nkwanta', 'Tano North', 7.1667, -2.1],
  ['gh-ah', 'Kukuom', 'Asunafo South', 6.7, -2.4333],
  ['gh-ah', 'Mim', 'Asunafo North', 6.9, -2.5667],
  ['gh-ah', 'Acherensua', 'Asutifi North', 6.9167, -2.45],
  ['gh-ah', 'Sankore', 'Tano South', 6.9833, -2.2],
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const seen = new Set<string>();

export const MARKETPLACE_CITIES: MarketplaceCity[] = CITY_SEEDS.map(([regionId, name, district, lat, lng, aliases]) => {
  const base = slugify(name);
  let slug = base;
  if (seen.has(slug)) {
    const region = MARKETPLACE_REGIONS.find((r) => r.id === regionId);
    slug = `${base}-${region ? region.slug : regionId}`;
  }
  seen.add(slug);
  return {
    id: slug,
    slug,
    name,
    regionId,
    countryCode: 'GH',
    district,
    latitude: lat,
    longitude: lng,
    aliases,
  };
});

/** Homepage order for the common city and neighbourhood searches. */
const POPULAR_LOCATION_SEEDS: Array<{ citySlug: string; label?: string }> = [
  { citySlug: 'accra' },
  { citySlug: 'kumasi' },
  { citySlug: 'tema' },
  { citySlug: 'east-legon' },
  { citySlug: 'sekondi-takoradi', label: 'Takoradi' },
  { citySlug: 'cape-coast' },
  { citySlug: 'tamale' },
  { citySlug: 'kasoa' },
];

export const POPULAR_LOCATIONS: Array<{ city: MarketplaceCity; label: string }> =
  POPULAR_LOCATION_SEEDS.flatMap(({ citySlug, label }) => {
    const city = MARKETPLACE_CITIES.find((candidate) => candidate.slug === citySlug);
    return city ? [{ city, label: label ?? city.name }] : [];
  });

export function findCityBySlug(slug: string): MarketplaceCity | undefined {
  const key = slug.trim().toLowerCase();
  return MARKETPLACE_CITIES.find((c) => c.slug === key);
}

export function findRegionById(id: string): MarketplaceRegion | undefined {
  return MARKETPLACE_REGIONS.find((r) => r.id === id);
}

export function findRegionByName(name: string): MarketplaceRegion | undefined {
  const key = name.trim().toLowerCase();
  return MARKETPLACE_REGIONS.find((r) => r.name.toLowerCase() === key);
}

export function findRegionBySlug(slug: string): MarketplaceRegion | undefined {
  const key = slug.trim().toLowerCase();
  return MARKETPLACE_REGIONS.find((r) => r.slug === key);
}

export function citiesForRegion(regionId: string): MarketplaceCity[] {
  return MARKETPLACE_CITIES.filter((c) => c.regionId === regionId);
}

export function districtsForRegion(regionId: string): string[] {
  const values = new Set<string>();
  for (const city of citiesForRegion(regionId)) {
    if (city.district) values.add(city.district);
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

export function searchCities(query: string, limit = 8, regionId?: string): MarketplaceCity[] {
  const q = query.trim().toLowerCase();
  const pool = regionId ? citiesForRegion(regionId) : MARKETPLACE_CITIES;
  if (!q) return pool.slice(0, limit);
  return pool
    .filter((c) => {
      const hay = [c.name, c.slug, c.district, ...(c.aliases || [])].join(' ').toLowerCase();
      return hay.includes(q);
    })
    .slice(0, limit);
}

export function cityExplorePath(slug: string): string {
  return `/explore/${slug}`;
}

export function regionExplorePath(slug: string): string {
  return `/explore/region/${slug}`;
}

export type MarketplaceLocationMatch =
  | { kind: 'city'; city: MarketplaceCity }
  | { kind: 'region'; region: MarketplaceRegion };

function normalized(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function startsWithWord(value: string, query: string): boolean {
  return value.split(/[\s,/()-]+/).some((word) => word.startsWith(query));
}

function citySearchScore(city: MarketplaceCity, query: string): number | null {
  const name = normalized(city.name);
  const aliases = (city.aliases ?? []).map(normalized);
  const region = normalized(regionNameForCity(city));
  const district = normalized(city.district ?? '');
  if (name === query) return 0;
  if (aliases.includes(query)) return 1;
  if (name.startsWith(query)) return 2;
  if (aliases.some((alias) => alias.startsWith(query))) return 3;
  if (startsWithWord(name, query) || aliases.some((alias) => startsWithWord(alias, query))) return 4;
  if (name.includes(query) || aliases.some((alias) => alias.includes(query))) return 5;
  if (region === query || region.startsWith(query)) return 6;
  if (region.includes(query) || district.includes(query)) return 7;
  return null;
}

function regionSearchScore(region: MarketplaceRegion, query: string): number | null {
  const name = normalized(region.name);
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (startsWithWord(name, query)) return 4;
  if (name.includes(query)) return 5;
  return null;
}

/** Search regions, towns and neighbourhoods with exact matches first. */
export function searchLocations(query: string, limit = 50): MarketplaceLocationMatch[] {
  const q = normalized(query);
  if (!q) return [];

  const matches: Array<{ match: MarketplaceLocationMatch; score: number; name: string }> = [];
  for (const region of MARKETPLACE_REGIONS) {
    const score = regionSearchScore(region, q);
    if (score !== null) {
      matches.push({ match: { kind: 'region', region }, score, name: region.name });
    }
  }
  for (const city of MARKETPLACE_CITIES) {
    const score = citySearchScore(city, q);
    if (score !== null) {
      matches.push({ match: { kind: 'city', city }, score, name: city.name });
    }
  }

  matches.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.match.kind !== b.match.kind) return a.match.kind === 'region' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return matches.slice(0, limit).map(({ match }) => match);
}

/** Nearest known town to a coordinate, used only to prefill a form after consent. */
export function nearestCity(latitude: number, longitude: number): MarketplaceCity | undefined {
  let best: MarketplaceCity | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const city of MARKETPLACE_CITIES) {
    if (city.latitude == null || city.longitude == null) continue;
    const dLat = ((city.latitude - latitude) * Math.PI) / 180;
    const dLng = ((city.longitude - longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((latitude * Math.PI) / 180) *
        Math.cos((city.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const distance = 2 * 6371.0088 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = city;
    }
  }
  return best;
}

export function regionNameForCity(city: MarketplaceCity | undefined): string {
  if (!city) return '';
  return findRegionById(city.regionId)?.name ?? '';
}
