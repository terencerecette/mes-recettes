const INVARIABLE_WORDS = new Set([
  'riz',
  'mais',
  'jus',
  'radis',
  'persil',
  'noix',
  'pois',
  'ananas',
  'couscous',
  'houmous',
  'speculoos',
  'coulis',
  'chorizo',
  'merguez',
  'brebis',
  'panais',
  'salsifis',
  'frais',
  'epais',
  'doux',
  'roux',
  'vieux',
  'gris',
  'tas',
  'cas',
  'bas',
  'gras',
  'plus',
  'sans',
  'sous',
  'dans',
  'pour',
  'avec',
]);

const STOP_WORDS = new Set([
  'de',
  'du',
  'des',
  'd',
  'l',
  'le',
  'la',
  'les',
  'a',
  'au',
  'aux',
  'et',
  'ou',
  'en',
  'un',
  'une',
  'pour',
  'avec',
  'sans',
  'sur',
]);

export function normalizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`´.,;:!?/()[\]{}"_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function singularizeFrenchWord(word) {
  if (!word || typeof word !== 'string') return '';
  if (INVARIABLE_WORDS.has(word)) return word;
  if (word.endsWith('eaux') && word.length > 4) {
    return word.slice(0, -1);
  }
  if (word.endsWith('oux') && word.length > 3) {
    return word.slice(0, -1);
  }
  if ((word.endsWith('s') || word.endsWith('x')) && word.length > 3) {
    return word.slice(0, -1);
  }
  return word;
}

export function normalizeIngredientName(str) {
  const norm = normalizeText(str);
  if (!norm) return '';
  return norm
    .split(' ')
    .filter(Boolean)
    .map(singularizeFrenchWord)
    .join(' ');
}

export function extractIngredientTokens(str) {
  const norm = normalizeText(str);
  if (!norm) return [];
  return norm
    .split(' ')
    .filter((w) => w && !STOP_WORDS.has(w))
    .map(singularizeFrenchWord);
}

const UNIT_MAP = {
  '': '',
  g: 'g',
  gr: 'g',
  gramme: 'g',
  grammes: 'g',
  kg: 'kg',
  kilogramme: 'kg',
  kilogrammes: 'kg',
  ml: 'ml',
  cl: 'cl',
  l: 'L',
  litre: 'L',
  litres: 'L',
  'c. a soupe': 'c. à soupe',
  'c a soupe': 'c. à soupe',
  'c. a s.': 'c. à soupe',
  'c a s': 'c. à soupe',
  cas: 'c. à soupe',
  'cuillere a soupe': 'c. à soupe',
  'cuilleres a soupe': 'c. à soupe',
  'c. a cafe': 'c. à café',
  'c a cafe': 'c. à café',
  'c. a c.': 'c. à café',
  'c a c': 'c. à café',
  cac: 'c. à café',
  'cuillere a cafe': 'c. à café',
  'cuilleres a cafe': 'c. à café',
  piece: 'pièce(s)',
  pieces: 'pièce(s)',
  'piece(s)': 'pièce(s)',
  pce: 'pièce(s)',
  tranche: 'tranche(s)',
  tranches: 'tranche(s)',
  'tranche(s)': 'tranche(s)',
  gousse: 'gousse(s)',
  gousses: 'gousse(s)',
  'gousse(s)': 'gousse(s)',
  pincee: 'pincée',
  pincees: 'pincée',
  sachet: 'sachet',
  sachets: 'sachet',
  boite: 'boîte',
  boites: 'boîte',
  botte: 'botte',
  bottes: 'botte',
  branche: 'branche(s)',
  branches: 'branche(s)',
  'branche(s)': 'branche(s)',
  feuille: 'feuille(s)',
  feuilles: 'feuille(s)',
  'feuille(s)': 'feuille(s)',
  verre: 'verre',
  verres: 'verre',
};

export function canonicalUnit(unit) {
  if (typeof unit !== 'string') return '';
  const trimmed = unit.trim();
  if (!trimmed) return '';
  if (trimmed === 'L') return 'L';
  const cleaned = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return UNIT_MAP[cleaned] ?? trimmed;
}
