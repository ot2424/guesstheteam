// Maps nationality names (as used by our team/player data) to flagcdn.com country codes.
const COUNTRY_CODES: Record<string, string> = {
  Albania: 'al',
  Algeria: 'dz',
  Angola: 'ao',
  Argentina: 'ar',
  Armenia: 'am',
  Australia: 'au',
  Austria: 'at',
  Belgium: 'be',
  Benin: 'bj',
  Bolivia: 'bo',
  'Bosnia-Herzegovina': 'ba',
  'Bosnia and Herzegovina': 'ba',
  Brazil: 'br',
  'Burkina Faso': 'bf',
  Cameroon: 'cm',
  Canada: 'ca',
  'Cape Verde': 'cv',
  'Central African Republic': 'cf',
  Chad: 'td',
  Chile: 'cl',
  Colombia: 'co',
  Comoros: 'km',
  Congo: 'cg',
  Curacao: 'cw',
  Curaçao: 'cw',
  'Costa Rica': 'cr',
  "Cote d'Ivoire": 'ci',
  "Côte d'Ivoire": 'ci',
  'Ivory Coast': 'ci',
  Croatia: 'hr',
  'Czech Republic': 'cz',
  Czechia: 'cz',
  'DR Congo': 'cd',
  'Democratic Republic of the Congo': 'cd',
  Denmark: 'dk',
  'Dominican Republic': 'do',
  Egypt: 'eg',
  England: 'gb-eng',
  Ecuador: 'ec',
  'Equatorial Guinea': 'gq',
  Finland: 'fi',
  France: 'fr',
  'French Guiana': 'fr',
  Gabon: 'ga',
  Georgia: 'ge',
  Germany: 'de',
  Ghana: 'gh',
  Greece: 'gr',
  Guadeloupe: 'fr',
  'Guinea-Bissau': 'gw',
  Guatemala: 'gt',
  Guinea: 'gn',
  Haiti: 'ht',
  Hungary: 'hu',
  Iceland: 'is',
  Indonesia: 'id',
  Iran: 'ir',
  Ireland: 'ie',
  Israel: 'il',
  Italy: 'it',
  Jamaica: 'jm',
  Japan: 'jp',
  Kosovo: 'xk',
  'Korea, South': 'kr',
  'South Korea': 'kr',
  Korea: 'kr',
  Latvia: 'lv',
  Liberia: 'lr',
  Libya: 'ly',
  Luxembourg: 'lu',
  Lithuania: 'lt',
  Macedonia: 'mk',
  Madagascar: 'mg',
  Mali: 'ml',
  Martinique: 'fr',
  Mauritania: 'mr',
  Mexico: 'mx',
  Moldova: 'md',
  Montenegro: 'me',
  Morocco: 'ma',
  Mozambique: 'mz',
  Netherlands: 'nl',
  Neukaledonien: 'nc',
  'New Caledonia': 'nc',
  'New Zealand': 'nz',
  Nigeria: 'ng',
  'North Macedonia': 'mk',
  'Northern Ireland': 'gb-nir',
  Norway: 'no',
  Panama: 'pa',
  Paraguay: 'py',
  Peru: 'pe',
  Philippines: 'ph',
  Poland: 'pl',
  Portugal: 'pt',
  Romania: 'ro',
  Russia: 'ru',
  Rwanda: 'rw',
  Réunion: 're',
  Scotland: 'gb-sct',
  Senegal: 'sn',
  Serbia: 'rs',
  'Serbia and Montenegro': 'rs',
  'Sierra Leone': 'sl',
  Slovakia: 'sk',
  Slovenia: 'si',
  'South Africa': 'za',
  Spain: 'es',
  Suriname: 'sr',
  Sweden: 'se',
  Switzerland: 'ch',
  Syria: 'sy',
  'The Gambia': 'gm',
  Gambia: 'gm',
  Togo: 'tg',
  'Trinidad and Tobago': 'tt',
  Tunisia: 'tn',
  Türkiye: 'tr',
  Turkey: 'tr',
  Ukraine: 'ua',
  'United States': 'us',
  Uruguay: 'uy',
  Venezuela: 've',
  Wales: 'gb-wls',
  'Yugoslavia (Republic)': 'rs',
  Zaire: 'cd',
  Zambia: 'zm',
  Zimbabwe: 'zw',
  Deutschland: 'de',
  Österreich: 'at',
  Schweiz: 'ch',
  Spanien: 'es',
  Frankreich: 'fr',
  Italien: 'it',
  Schottland: 'gb-sct',
  Irland: 'ie',
  Niederlande: 'nl',
  Belgien: 'be',
  Brasilien: 'br',
  Argentinien: 'ar',
  Polen: 'pl',
  Dänemark: 'dk',
  Schweden: 'se',
  Norwegen: 'no',
  Kroatien: 'hr',
  Serbien: 'rs',
  Türkei: 'tr',
  Marokko: 'ma',
  Kamerun: 'cm',
  Algerien: 'dz',
  Tunesien: 'tn',
  Südkorea: 'kr',
  'USA': 'us',
  'U.S.A.': 'us',
  US: 'us',
  UK: 'gb',
};

export const FLAG_CDN_BASE = 'https://flagcdn.com';

// flagcdn.com only serves these fixed raster widths
const AVAILABLE_WIDTHS = [20, 40, 80, 160, 320, 640, 1280, 2560];

const NORMALIZED_COUNTRY_CODES = Object.fromEntries(
  Object.entries(COUNTRY_CODES).map(([name, code]) => [normalizeCountryName(name), code]),
);

const ISO_LIKE_CODES = new Set(Object.values(COUNTRY_CODES));

function normalizeCountryName(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, ' and ')
    .replace(/['’`´.]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function getCountryCode(nationality: string | undefined | null): string | undefined {
  if (!nationality) return undefined;
  const trimmed = nationality.trim();
  if (!trimmed || /^unknown$/i.test(trimmed)) return undefined;

  const lower = trimmed.toLowerCase();
  if (ISO_LIKE_CODES.has(lower)) return lower;

  return COUNTRY_CODES[trimmed] ?? NORMALIZED_COUNTRY_CODES[normalizeCountryName(trimmed)];
}

function nearestAvailableWidth(width: number): number {
  return AVAILABLE_WIDTHS.find((available) => available >= width) ?? AVAILABLE_WIDTHS[AVAILABLE_WIDTHS.length - 1];
}

export function getFlagUrl(nationality: string | undefined | null, width = 80): string | undefined {
  const code = getCountryCode(nationality);
  return code ? `${FLAG_CDN_BASE}/w${nearestAvailableWidth(width)}/${code}.png` : undefined;
}
