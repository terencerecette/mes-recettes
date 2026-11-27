import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const recipesPath = path.resolve(__dirname, '../src/data/frigo_recipes.json');

const ALLOWED_CATEGORIES = new Set(['Entrées', 'Plats', 'Desserts']);
const ARTIFICIAL_PATTERNS = [/#\d+/, /\brecette\s*\d+\b/i, /\bplat\s+simple\s*\d*\b/i];

function normalizeTitle(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const raw = fs.readFileSync(recipesPath, 'utf8');
const recipes = JSON.parse(raw);

const errors = [];

if (!Array.isArray(recipes)) {
  errors.push('Le fichier frigo_recipes.json doit contenir un tableau JSON.');
} else {
  if (recipes.length !== 500) {
    errors.push(`Nombre de recettes incorrect : ${recipes.length} (attendu : 500).`);
  }

  const exactTitles = new Set();
  const normTitles = new Set();
  const categoryCounts = { Entrées: 0, Plats: 0, Desserts: 0 };

  recipes.forEach((recipe, idx) => {
    const label = `Recette #${idx + 1} (${recipe?.title || 'sans titre'})`;

    if (!recipe || typeof recipe !== 'object') {
      errors.push(`${label} : objet invalide.`);
      return;
    }

    const title = typeof recipe.title === 'string' ? recipe.title.trim() : '';
    if (!title) {
      errors.push(`${label} : titre manquant ou vide.`);
    } else {
      if (exactTitles.has(title)) {
        errors.push(`Doublon exact de titre : "${title}".`);
      }
      exactTitles.add(title);

      const norm = normalizeTitle(title);
      if (normTitles.has(norm)) {
        errors.push(`Doublon normalisé de titre : "${title}".`);
      }
      normTitles.add(norm);

      for (const rx of ARTIFICIAL_PATTERNS) {
        if (rx.test(title)) {
          errors.push(`Titre artificiel détecté : "${title}".`);
        }
      }
    }

    if (!ALLOWED_CATEGORIES.has(recipe.category)) {
      errors.push(`${label} : catégorie non autorisée "${recipe.category}".`);
    } else {
      categoryCounts[recipe.category] += 1;
    }

    if (!Number.isInteger(recipe.servings) || recipe.servings < 1) {
      errors.push(`${label} : servings invalide (${recipe.servings}).`);
    }

    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length < 2) {
      errors.push(`${label} : doit contenir au moins 2 ingrédients structurés.`);
    } else {
      recipe.ingredients.forEach((ing, ingIdx) => {
        if (!ing || typeof ing !== 'object') {
          errors.push(`${label} ingrédient #${ingIdx + 1} : invalide.`);
          return;
        }
        if (typeof ing.name !== 'string' || !ing.name.trim()) {
          errors.push(`${label} ingrédient #${ingIdx + 1} : nom manquant.`);
        }
        if (typeof ing.unit !== 'string') {
          errors.push(`${label} ingrédient #${ingIdx + 1} : unité doit être une chaîne.`);
        }
        if (
          ing.quantity !== null &&
          (typeof ing.quantity !== 'number' || !Number.isFinite(ing.quantity) || ing.quantity <= 0)
        ) {
          errors.push(`${label} ingrédient #${ingIdx + 1} : quantité invalide (${ing.quantity}).`);
        }
      });
    }

    if (!Array.isArray(recipe.steps) || recipe.steps.length < 2) {
      errors.push(`${label} : doit contenir au moins 2 étapes.`);
    } else {
      recipe.steps.forEach((step, sIdx) => {
        if (typeof step !== 'string' || !step.trim()) {
          errors.push(`${label} étape #${sIdx + 1} : vide.`);
        }
      });
    }
  });

  console.log(`Total recettes : ${recipes.length}`);
  console.log(`Titres uniques : ${normTitles.size} (0 doublon si égal à 500)`);
  console.log(
    `Catégories : Entrées=${categoryCounts.Entrées}, Plats=${categoryCounts.Plats}, Desserts=${categoryCounts.Desserts}`
  );
}

if (errors.length > 0) {
  console.error(`\n${errors.length} erreur(s) détectée(s) :`);
  errors.slice(0, 30).forEach((e) => console.error(' -', e));
  process.exit(1);
}

console.log('Vérification réussie : 0 erreur de structure, 500 recettes valides et uniques.');
