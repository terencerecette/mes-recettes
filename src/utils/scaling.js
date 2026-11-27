import { canonicalUnit } from './normalize.js';

const WHOLE_NUMBER_UNITS = new Set(['g', 'ml', 'cl']);

function formatFrenchNumber(num, maxDecimals = 1) {
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(num * factor) / factor;
  if (Object.is(rounded, -0) || rounded === 0) return '0';
  const str = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(maxDecimals).replace(/0+$/, '').replace(/\.$/, '');
  return str.replace('.', ',');
}

export function roundScaledQuantity(value, unit = '') {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  if (value <= 0) return 0;

  const u = canonicalUnit(unit);
  if (WHOLE_NUMBER_UNITS.has(u) && value >= 20) {
    return Math.round(value);
  }
  if (value < 0.1) {
    return Math.round(value * 100) / 100;
  }
  return Math.round(value * 10) / 10;
}

export function formatQuantity(value, unit = '') {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '';
  }
  if (value <= 0) return '0';
  const u = canonicalUnit(unit);
  if (WHOLE_NUMBER_UNITS.has(u) && value >= 20) {
    return String(Math.round(value));
  }
  if (value < 0.1) {
    return formatFrenchNumber(value, 2);
  }
  return formatFrenchNumber(value, 1);
}

export function formatRatio(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) return '1';
  return formatFrenchNumber(ratio, 2);
}

export function formatServings(servings) {
  if (!Number.isFinite(servings) || servings <= 0) return '1';
  return formatFrenchNumber(servings, 1);
}

export function parseDecimalInput(raw) {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(/\s+/g, '').replace(',', '.');
  if (!cleaned) return null;
  if (!/^\d*\.?\d+$/.test(cleaned)) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * Calcule les quantités et le nombre de personnes recalculés à partir d'un ratio.
 * Si l'ajustement provient d'un ingrédient pivot (scaleSource.type === 'ingredient'),
 * sa nouvelle quantité saisie est préservée exactement sans dérive d'arrondi.
 */
export function computeScaledRecipe(recipe, scaleFactor = 1, scaleSource = null) {
  const baseServings = Number(recipe?.servings) > 0 ? Number(recipe.servings) : 4;
  const safeRatio = Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1;

  let scaledServings = Math.round(baseServings * safeRatio * 10) / 10;
  if (scaleSource?.type === 'servings' && Number.isFinite(scaleSource.targetServings)) {
    scaledServings = Math.max(0.5, scaleSource.targetServings);
  } else if (scaledServings < 0.5) {
    scaledServings = 0.5;
  }

  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  const scaledIngredients = ingredients.map((ing, index) => {
    const baseQty =
      ing.quantity === null || ing.quantity === undefined || ing.quantity === ''
        ? null
        : Number(ing.quantity);

    if (baseQty === null || !Number.isFinite(baseQty)) {
      return {
        ...ing,
        baseQuantity: null,
        scaledQuantity: null,
        formattedQuantity: '',
      };
    }

    const isPivot =
      scaleSource?.type === 'ingredient' &&
      scaleSource.ingredientIndex === index &&
      Number.isFinite(scaleSource.targetQuantity);

    const rawScaled = isPivot ? scaleSource.targetQuantity : baseQty * safeRatio;
    const rounded = isPivot ? rawScaled : roundScaledQuantity(rawScaled, ing.unit || '');

    return {
      ...ing,
      baseQuantity: baseQty,
      scaledQuantity: rounded,
      formattedQuantity: isPivot
        ? formatFrenchNumber(rawScaled, 2)
        : formatQuantity(rawScaled, ing.unit || ''),
    };
  });

  return {
    scaleFactor: safeRatio,
    scaledServings,
    formattedServings: formatServings(scaledServings),
    scaledIngredients,
  };
}
