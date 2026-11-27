import assert from 'node:assert/strict';
import { parseStepSegments, formatTimerDisplay } from '../src/utils/durationParser.js';
import { searchFrigoRecipes } from '../src/utils/frigoSearch.js';
import { computeScaledRecipe, formatRatio } from '../src/utils/scaling.js';
import { mergeShoppingItems, parseManualShoppingInput } from '../src/utils/shoppingMerge.js';

// 1. Test du double recalcul proportionnel
const beignets = {
  title: 'Beignets moelleux à la vanille',
  servings: 4,
  ingredients: [
    { quantity: 4, unit: 'pièce(s)', name: 'Œufs' },
    { quantity: 250, unit: 'g', name: 'Farine' },
    { quantity: 200, unit: 'ml', name: 'Lait' },
    { quantity: 1, unit: 'pincée', name: 'Sel' },
    { quantity: null, unit: '', name: 'Sucre glace' },
  ],
};

// Passage de 4 œufs à 3 œufs -> ratio 0.75
const scaledByEggs = computeScaledRecipe(beignets, 3 / 4, {
  type: 'ingredient',
  ingredientIndex: 0,
  ingredientName: 'Œufs',
  targetQuantity: 3,
});

assert.equal(formatRatio(scaledByEggs.scaleFactor), '0,75');
assert.equal(scaledByEggs.scaledServings, 3);
assert.equal(scaledByEggs.scaledIngredients[0].formattedQuantity, '3');
assert.equal(scaledByEggs.scaledIngredients[1].formattedQuantity, '188'); // 250 * 0.75 = 187.5 -> arrondi entier >= 20 g
assert.equal(scaledByEggs.scaledIngredients[2].formattedQuantity, '150'); // 200 * 0.75 = 150 ml
assert.equal(scaledByEggs.scaledIngredients[3].formattedQuantity, '0,8'); // 0.75 -> 1 décimale virgule française
assert.equal(scaledByEggs.scaledIngredients[4].formattedQuantity, '');

// 2. Test recherche Frigo (normalisation œ/oe, pluriels, basiques ignorés, pas de faux positifs)
const sampleFrigo = [
  {
    id: 'r1',
    title: 'Omelette nature',
    category: 'Plats',
    servings: 2,
    ingredients: [
      { quantity: 4, unit: 'pièce(s)', name: 'œufs' },
      { quantity: 10, unit: 'g', name: 'beurre' },
      { quantity: null, unit: '', name: 'sel' },
      { quantity: null, unit: '', name: 'poivre' },
    ],
    steps: ['Battre les œufs.', 'Cuire 4 min.'],
  },
  {
    id: 'r2',
    title: 'Salade de laitue et caille rôtie',
    category: 'Plats',
    servings: 2,
    ingredients: [
      { quantity: 1, unit: 'pièce(s)', name: 'laitue' },
      { quantity: 2, unit: 'pièce(s)', name: 'cailles' },
    ],
    steps: ['Laver la laitue.', 'Rôtir 20 min.'],
  },
  {
    id: 'r3',
    title: 'Spaghetti aux tomates',
    category: 'Plats',
    servings: 2,
    ingredients: [
      { quantity: 200, unit: 'g', name: 'spaghetti' },
      { quantity: 3, unit: 'pièce(s)', name: 'tomates' },
      { quantity: 1, unit: 'c. à soupe', name: "huile d'olive" },
    ],
    steps: ['Cuire les pâtes 8 min.', 'Mélanger.'],
  },
];

const frigoEggs = searchFrigoRecipes({
  recipes: sampleFrigo,
  userIngredients: ['oeuf'],
  ignorePantryBasics: true,
});
assert.equal(frigoEggs.length, 1);
assert.equal(frigoEggs[0].recipe.id, 'r1');
assert.equal(frigoEggs[0].matchPercent, 50); // sel & poivre ignorés -> 1/2 (œufs sur œufs + beurre)

// Vérifier absence de faux positifs : 'ail' ne matche pas 'cailles', 'lait' ne matche pas 'laitue'
const noFalsePositives = searchFrigoRecipes({
  recipes: sampleFrigo,
  userIngredients: ['ail', 'lait'],
  ignorePantryBasics: true,
});
assert.equal(noFalsePositives.length, 0);

// Vérifier alias 'pate' -> 'spaghetti' et 'tomate' -> 'tomates'
const pastaMatch = searchFrigoRecipes({
  recipes: sampleFrigo,
  userIngredients: ['pate', 'tomate'],
  ignorePantryBasics: true,
});
assert.equal(pastaMatch.length, 1);
assert.equal(pastaMatch[0].recipe.id, 'r3');
assert.equal(pastaMatch[0].matchPercent, 100);

// 3. Test fusion liste de courses et saisie manuelle
const parsedBananas = parseManualShoppingInput('2 bananes');
assert.deepEqual(parsedBananas, { quantity: 2, unit: 'pièce(s)', name: 'Bananes' });

const parsedTowel = parseManualShoppingInput('Essuie-tout');
assert.deepEqual(parsedTowel, { quantity: null, unit: '', name: 'Essuie-tout' });

const parsedFlour = parseManualShoppingInput('500 g farine');
assert.deepEqual(parsedFlour, { quantity: 500, unit: 'g', name: 'Farine' });

const merged1 = mergeShoppingItems([], [{ name: 'Œufs', quantity: 2, unit: 'pièce(s)' }]);
const merged2 = mergeShoppingItems(merged1.items, [
  { name: 'oeuf', quantity: 3, unit: 'pièce(s)' },
  parsedTowel,
]);
const eggItem = merged2.items.find((i) => i.name === 'Œufs');
assert.equal(eggItem.quantity, 5);
assert.equal(merged2.items.length, 2);

// 4. Test détection des durées dans les étapes
const segs = parseStepSegments(
  'Laissez mijoter 15 min puis enfournez 1 h 10 et laissez reposer 30 sec (ou 10 à 15 min).'
);
const durations = segs.filter((s) => s.type === 'duration');
assert.deepEqual(
  durations.map((d) => ({ label: d.label, seconds: d.seconds })),
  [
    { label: '15 min', seconds: 900 },
    { label: '1 h 10', seconds: 4200 },
    { label: '30 sec', seconds: 30 },
    { label: '10 à 15 min', seconds: 600 },
  ]
);
assert.equal(formatTimerDisplay(4200), '1:10:00');
assert.equal(formatTimerDisplay(900), '15:00');

console.log('Tous les tests de logique métier ont réussi.');
