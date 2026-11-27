import { INGREDIENT_UNITS } from './constants.js';
import { canonicalUnit, normalizeIngredientName } from './normalize.js';
import { parseDecimalInput, roundScaledQuantity } from './scaling.js';

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const KNOWN_UNIT_REGEX = (() => {
  const escaped = INGREDIENT_UNITS.filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Ajoute aussi formes courtes usuelles (cas, cac, gr, pieces, etc.)
  const extras = ['c\\.\\s*à\\s*s\\.?', 'c\\.\\s*à\\s*c\\.?', 'cas', 'cac', 'gr', 'pièces?', 'tranches?', 'gousses?', 'sachets?', 'boîtes?', 'bottes?', 'branches?', 'feuilles?', 'verres?', 'pincées?'];
  return new RegExp(`^(${[...escaped, ...extras].join('|')})\\b(?:\\s+(?:de\\s+|d['’])?)?(.*)$`, 'i');
})();

/**
 * Analyse une saisie manuelle rapide comme :
 * - "2 bananes" -> { quantity: 2, unit: 'pièce(s)', name: 'Bananes' }
 * - "500 g farine" -> { quantity: 500, unit: 'g', name: 'Farine' }
 * - "Essuie-tout" -> { quantity: null, unit: '', name: 'Essuie-tout' }
 */
export function parseManualShoppingInput(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;

  const qtyMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (!qtyMatch) {
    return {
      quantity: null,
      unit: '',
      name: capitalizeFirst(trimmed),
    };
  }

  const quantity = parseDecimalInput(qtyMatch[1]);
  const rest = qtyMatch[2].trim();
  const unitMatch = rest.match(KNOWN_UNIT_REGEX);

  if (unitMatch && unitMatch[2]?.trim()) {
    const unit = canonicalUnit(unitMatch[1]);
    const name = capitalizeFirst(unitMatch[2].trim());
    return { quantity, unit, name };
  }

  return {
    quantity,
    unit: 'pièce(s)',
    name: capitalizeFirst(rest),
  };
}

function areUnitsCompatible(unitA, unitB) {
  const a = canonicalUnit(unitA);
  const b = canonicalUnit(unitB);
  if (a === b) return true;
  // '' et 'pièce(s)' sont compatibles lorsque la quantité existe ou s'ajoute
  if ((a === '' && b === 'pièce(s)') || (a === 'pièce(s)' && b === '')) {
    return true;
  }
  return false;
}

function pickMergedUnit(unitA, unitB) {
  const a = canonicalUnit(unitA);
  const b = canonicalUnit(unitB);
  if (a === b) return a;
  if (a === 'pièce(s)' || b === 'pièce(s)') return 'pièce(s)';
  return a || b;
}

/**
 * Fusionne de nouveaux articles dans une liste existante.
 * Les articles non cochés ayant même nom normalisé et unité compatible sont additionnés.
 * Retourne { items, updatedItems, createdItems, mergedCount, addedCount }.
 */
export function mergeShoppingItems(existingItems = [], incomingItems = []) {
  const nowIso = new Date().toISOString();
  const next = existingItems.map((item) => ({ ...item }));
  const touchedIds = new Set();
  const createdIds = new Set();
  let mergedCount = 0;
  let addedCount = 0;

  for (const raw of incomingItems) {
    const name = String(raw?.name || '').trim();
    if (!name) continue;
    const normName = normalizeIngredientName(name);
    const unit = canonicalUnit(raw?.unit || '');
    const qty =
      raw?.quantity === null || raw?.quantity === undefined || raw?.quantity === ''
        ? null
        : Number(raw.quantity);
    const validQty = qty !== null && Number.isFinite(qty) && qty > 0 ? qty : null;

    const existingIdx = next.findIndex(
      (item) =>
        !item.checked &&
        (item.normalizedName || normalizeIngredientName(item.name)) === normName &&
        areUnitsCompatible(item.unit, unit)
    );

    if (existingIdx !== -1) {
      const target = next[existingIdx];
      const mergedUnit = pickMergedUnit(target.unit, unit);
      let newQty = target.quantity ?? null;
      if (target.quantity !== null && validQty !== null) {
        newQty = roundScaledQuantity(target.quantity + validQty, mergedUnit);
      } else if (target.quantity === null && validQty !== null) {
        newQty = validQty;
      }

      next[existingIdx] = {
        ...target,
        unit: mergedUnit,
        quantity: newQty,
        updatedAt: nowIso,
      };
      touchedIds.add(target.id);
      mergedCount += 1;
    } else {
      const newItem = {
        id: raw.id || createId(),
        name,
        normalizedName: normName,
        quantity: validQty,
        unit,
        checked: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      next.unshift(newItem);
      touchedIds.add(newItem.id);
      createdIds.add(newItem.id);
      addedCount += 1;
    }
  }

  const touchedItems = next.filter((item) => touchedIds.has(item.id));

  return {
    items: next,
    touchedItems,
    mergedCount,
    addedCount,
    createdCount: createdIds.size,
  };
}
