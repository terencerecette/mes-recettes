import { getStarterRecipes } from '../data/starterRecipes.js';
import { CATEGORIES } from '../utils/constants.js';
import { canonicalUnit, normalizeIngredientName } from '../utils/normalize.js';

const KEYS = {
  recipes: 'mes_recettes_recipes',
  shopping: 'mes_recettes_shopping',
  syncConfig: 'mes_recettes_sync_config',
  deletedRecipes: 'mes_recettes_deleted_recipes',
  deletedShopping: 'mes_recettes_deleted_shopping',
  initialized: 'mes_recettes_initialized',
  lastSync: 'mes_recettes_last_sync',
};

export function createUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function safeReadJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeWriteJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err) {
    if (
      err?.name === 'QuotaExceededError' ||
      err?.code === 22 ||
      err?.code === 1014
    ) {
      return {
        ok: false,
        error:
          "Espace de stockage local saturé. Supprimez d'anciennes photos ou activez la synchro Supabase.",
      };
    }
    return {
      ok: false,
      error: "Impossible d'enregistrer les données localement.",
    };
  }
}

export function loadInitialRecipes() {
  const initialized = window.localStorage.getItem(KEYS.initialized);
  const stored = safeReadJson(KEYS.recipes, null);
  if (!initialized && !Array.isArray(stored)) {
    const starters = getStarterRecipes();
    safeWriteJson(KEYS.recipes, starters);
    window.localStorage.setItem(KEYS.initialized, '1');
    return starters;
  }
  if (!initialized) {
    window.localStorage.setItem(KEYS.initialized, '1');
  }
  return Array.isArray(stored) ? stored : [];
}

export function saveRecipes(recipes) {
  return safeWriteJson(KEYS.recipes, recipes);
}

export function loadShoppingItems() {
  const stored = safeReadJson(KEYS.shopping, []);
  return Array.isArray(stored) ? stored : [];
}

export function saveShoppingItems(items) {
  return safeWriteJson(KEYS.shopping, items);
}

export function loadSyncConfig() {
  const stored = safeReadJson(KEYS.syncConfig, null);
  return {
    url: stored?.url || '',
    anonKey: stored?.anonKey || '',
    notebookCode: stored?.notebookCode || '',
    enabled: Boolean(stored?.enabled),
  };
}

export function saveSyncConfig(config) {
  return safeWriteJson(KEYS.syncConfig, {
    url: (config?.url || '').trim(),
    anonKey: (config?.anonKey || '').trim(),
    notebookCode: (config?.notebookCode || '').trim(),
    enabled: Boolean(config?.enabled),
  });
}

export function loadDeletedIds(type) {
  const key = type === 'recipes' ? KEYS.deletedRecipes : KEYS.deletedShopping;
  const stored = safeReadJson(key, []);
  return Array.isArray(stored) ? stored : [];
}

export function saveDeletedIds(type, ids) {
  const key = type === 'recipes' ? KEYS.deletedRecipes : KEYS.deletedShopping;
  return safeWriteJson(key, Array.from(new Set(ids)));
}

export function loadLastSync() {
  return window.localStorage.getItem(KEYS.lastSync) || '';
}

export function saveLastSync(isoDate) {
  try {
    if (isoDate) {
      window.localStorage.setItem(KEYS.lastSync, isoDate);
    } else {
      window.localStorage.removeItem(KEYS.lastSync);
    }
  } catch {
    // Ignore storage error
  }
}

export function buildBackupPayload(recipes, shoppingItems) {
  return {
    app: 'Mes recettes',
    version: 1,
    exportedAt: new Date().toISOString(),
    recipes: Array.isArray(recipes) ? recipes : [],
    shoppingItems: Array.isArray(shoppingItems) ? shoppingItems : [],
  };
}

function sanitizeImportedRecipe(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = String(raw.title || '').trim();
  if (!title) return null;

  const category = CATEGORIES.includes(raw.category) ? raw.category : 'Plats';
  const servings = Number.isInteger(Number(raw.servings)) && Number(raw.servings) >= 1
    ? Math.round(Number(raw.servings))
    : 4;

  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients
        .filter((ing) => ing && String(ing.name || '').trim())
        .map((ing) => ({
          quantity:
            ing.quantity === null || ing.quantity === undefined || ing.quantity === ''
              ? null
              : Number.isFinite(Number(ing.quantity))
                ? Number(ing.quantity)
                : null,
          unit: canonicalUnit(ing.unit || ''),
          name: String(ing.name).trim(),
        }))
    : [];

  const steps = Array.isArray(raw.steps)
    ? raw.steps.map((s) => String(s || '').trim()).filter(Boolean)
    : [];

  const now = new Date().toISOString();
  return {
    id: typeof raw.id === 'string' && raw.id.length >= 8 ? raw.id : createUuid(),
    title,
    category,
    servings,
    photoUrl: typeof raw.photoUrl === 'string' ? raw.photoUrl : typeof raw.photo_url === 'string' ? raw.photo_url : '',
    ingredients,
    steps,
    createdAt: raw.createdAt || raw.created_at || now,
    updatedAt: raw.updatedAt || raw.updated_at || now,
  };
}

function sanitizeImportedShoppingItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name || '').trim();
  if (!name) return null;
  const now = new Date().toISOString();
  const qty =
    raw.quantity === null || raw.quantity === undefined || raw.quantity === ''
      ? null
      : Number.isFinite(Number(raw.quantity))
        ? Number(raw.quantity)
        : null;

  return {
    id: typeof raw.id === 'string' && raw.id.length >= 8 ? raw.id : createUuid(),
    name,
    normalizedName: raw.normalizedName || raw.normalized_name || normalizeIngredientName(name),
    quantity: qty,
    unit: canonicalUnit(raw.unit || ''),
    checked: Boolean(raw.checked),
    createdAt: raw.createdAt || raw.created_at || now,
    updatedAt: raw.updatedAt || raw.updated_at || now,
  };
}

export function parseAndValidateBackup(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Le fichier sélectionné n’est pas un JSON valide.');
  }

  // Accepte soit le format complet { recipes, shoppingItems }, soit un tableau direct de recettes
  const rawRecipes = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.recipes)
      ? parsed.recipes
      : null;

  if (!rawRecipes) {
    throw new Error('Format de sauvegarde non reconnu (tableau de recettes introuvable).');
  }

  const recipes = rawRecipes.map(sanitizeImportedRecipe).filter(Boolean);
  const rawShopping = Array.isArray(parsed?.shoppingItems) ? parsed.shoppingItems : [];
  const shoppingItems = rawShopping.map(sanitizeImportedShoppingItem).filter(Boolean);

  if (recipes.length === 0 && shoppingItems.length === 0) {
    throw new Error('Aucune recette ou course valide trouvée dans ce fichier.');
  }

  return { recipes, shoppingItems };
}
