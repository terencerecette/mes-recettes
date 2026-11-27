import { PANTRY_BASICS } from './constants.js';
import {
  extractIngredientTokens,
  normalizeIngredientName,
  normalizeText,
} from './normalize.js';

const PANTRY_NORMALIZED_SET = new Set(
  PANTRY_BASICS.map((item) => normalizeIngredientName(item))
);

// Groupes d'alias culinaires français pour enrichir les correspondances Frigo
const ALIAS_GROUPS = [
  [
    'pate',
    'spaghetti',
    'penne',
    'tagliatelle',
    'coquillette',
    'fusilli',
    'macaroni',
    'farfalle',
    'linguine',
    'nouille',
  ],
  ['fromage rape', 'emmental', 'gruyere', 'comte', 'mozzarella rapee'],
  ['creme fraiche', 'creme liquide', 'creme epaisse', 'creme fleurette', 'creme'],
  ['pomme de terre', 'patate'],
  ['poulet', 'blanc de poulet', 'filet de poulet', 'escalope de poulet', 'cuisse de poulet'],
  ['oeuf', 'jaune oeuf', 'blanc oeuf'],
  ['lardon', 'lardons fume', 'poitrine fumee'],
  ['tomate', 'tomate cerise', 'pulpe de tomate', 'tomate pelee', 'couli de tomate'],
  ['oignon', 'oignon rouge', 'oignon blanc', 'oignon jaune', 'echalote'],
  ['chocolat', 'chocolat noir', 'chocolat au lait', 'pepite de chocolat'],
  ['jambon', 'jambon blanc', 'jambon cuit', 'des de jambon'],
  ['thon', 'thon au naturel', 'thon en boite'],
];

const TOKEN_ALIAS_MAP = new Map();
ALIAS_GROUPS.forEach((group) => {
  const normalizedVariants = group.map((g) => extractIngredientTokens(g));
  normalizedVariants.forEach((tokens) => {
    const joined = tokens.join(' ');
    if (!TOKEN_ALIAS_MAP.has(joined)) {
      TOKEN_ALIAS_MAP.set(joined, normalizedVariants);
    }
  });
});

export function isPantryBasic(ingredientName) {
  const norm = normalizeIngredientName(ingredientName);
  if (!norm) return false;
  if (PANTRY_NORMALIZED_SET.has(norm)) return true;
  const tokens = extractIngredientTokens(ingredientName);
  if (tokens.length === 1 && ['sel', 'poivre', 'eau'].includes(tokens[0])) {
    return true;
  }
  return false;
}

function tokensMatch(userTokens, recipeTokens) {
  if (!userTokens.length || !recipeTokens.length) return false;
  // Tous les tokens significatifs de l'ingrédient saisi doivent apparaître
  // comme tokens entiers (jamais comme sous-chaîne d'un autre mot).
  const recipeSet = new Set(recipeTokens);
  return userTokens.every((t) => recipeSet.has(t));
}

function getExpandedUserCandidates(rawUserIng) {
  const baseTokens = extractIngredientTokens(rawUserIng);
  if (!baseTokens.length) return [];
  const joined = baseTokens.join(' ');
  const candidates = [baseTokens];
  const aliases = TOKEN_ALIAS_MAP.get(joined);
  if (aliases) {
    aliases.forEach((variant) => candidates.push(variant));
  }
  return candidates;
}

export function doesIngredientMatchUserList(recipeIngName, userCandidatesList) {
  const recipeTokens = extractIngredientTokens(recipeIngName);
  if (!recipeTokens.length) return false;

  for (const candidates of userCandidatesList) {
    for (const userTokens of candidates) {
      if (tokensMatch(userTokens, recipeTokens)) {
        return true;
      }
      // Match réciproque quand l'utilisateur a tapé un nom composé exact
      // et que la recette utilise le terme générique principal (ex: "creme fraiche" -> "creme")
      if (
        userTokens.length > 1 &&
        recipeTokens.length === 1 &&
        recipeTokens[0].length >= 4 &&
        userTokens.includes(recipeTokens[0])
      ) {
        // Uniquement pour des têtes simples non ambiguës (ex: creme, fromage)
        if (['creme', 'fromage', 'pate', 'riz', 'chocolat', 'poulet'].includes(recipeTokens[0])) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Recherche intelligente Frigo.
 * Trie du meilleur pourcentage de correspondance au plus faible.
 */
export function searchFrigoRecipes({
  recipes = [],
  userIngredients = [],
  category = 'Toutes',
  ignorePantryBasics = true,
  textQuery = '',
}) {
  const cleanUserInputs = userIngredients
    .map((x) => String(x || '').trim())
    .filter(Boolean);

  const userCandidatesList = cleanUserInputs
    .map(getExpandedUserCandidates)
    .filter((c) => c.length > 0);

  const queryNorm = normalizeText(textQuery);

  const results = [];

  for (const recipe of recipes) {
    if (category && category !== 'Toutes' && recipe.category !== category) {
      continue;
    }

    if (queryNorm) {
      const titleNorm = normalizeText(recipe.title);
      const ingMatch = (recipe.ingredients || []).some((ing) =>
        normalizeText(ing.name).includes(queryNorm)
      );
      if (!titleNorm.includes(queryNorm) && !ingMatch) {
        continue;
      }
    }

    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    const matchedIngredients = [];
    const missingIngredients = [];
    const ignoredBasics = [];

    for (const ing of ingredients) {
      const isBasic = ignorePantryBasics && isPantryBasic(ing.name);
      const isUserMatched =
        userCandidatesList.length > 0 &&
        doesIngredientMatchUserList(ing.name, userCandidatesList);

      if (isUserMatched) {
        matchedIngredients.push(ing);
      } else if (isBasic) {
        ignoredBasics.push(ing);
      } else {
        missingIngredients.push(ing);
      }
    }

    if (userCandidatesList.length > 0 && matchedIngredients.length === 0) {
      continue;
    }

    const totalRelevant = matchedIngredients.length + missingIngredients.length;
    const matchPercent =
      userCandidatesList.length === 0
        ? 100
        : totalRelevant > 0
          ? Math.round((matchedIngredients.length / totalRelevant) * 100)
          : 100;

    results.push({
      recipe,
      matchPercent,
      matchedIngredients,
      missingIngredients,
      ignoredBasics,
    });
  }

  results.sort((a, b) => {
    if (b.matchPercent !== a.matchPercent) {
      return b.matchPercent - a.matchPercent;
    }
    if (a.missingIngredients.length !== b.missingIngredients.length) {
      return a.missingIngredients.length - b.missingIngredients.length;
    }
    if (b.matchedIngredients.length !== a.matchedIngredients.length) {
      return b.matchedIngredients.length - a.matchedIngredients.length;
    }
    return a.recipe.title.localeCompare(b.recipe.title, 'fr');
  });

  return results;
}
