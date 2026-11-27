import { createClient } from '@supabase/supabase-js';
import { canonicalUnit, normalizeIngredientName } from '../utils/normalize.js';

let cachedKey = '';
let cachedClient = null;

export function isSyncConfigured(config) {
  if (!config || !config.enabled) return false;
  return validateConfigFields(config).ok;
}

export function validateConfigFields(config) {
  const url = String(config?.url || '').trim();
  const anonKey = String(config?.anonKey || '').trim();
  const notebookCode = String(config?.notebookCode || '').trim();

  if (!url || !/^https?:\/\/.+/i.test(url)) {
    return { ok: false, error: "Veuillez saisir une URL Supabase valide (commençant par https://)." };
  }
  if (!anonKey || anonKey.length < 16) {
    return { ok: false, error: 'Veuillez saisir votre clé Anon (publishable key) Supabase.' };
  }
  if (!notebookCode || notebookCode.length < 3) {
    return {
      ok: false,
      error: 'Le Code carnet doit contenir au moins 3 caractères (ex : famille-dupont).',
    };
  }
  return { ok: true, url, anonKey, notebookCode };
}

function getClient(config) {
  const valid = validateConfigFields(config);
  if (!valid.ok) {
    throw new Error(valid.error);
  }
  const cacheSignature = `${valid.url}|${valid.anonKey}`;
  if (!cachedClient || cachedKey !== cacheSignature) {
    cachedClient = createClient(valid.url, valid.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedKey = cacheSignature;
  }
  return { client: cachedClient, notebookCode: valid.notebookCode };
}

function formatSupabaseError(error) {
  if (!error) return 'Erreur de connexion Supabase.';
  const code = error.code || '';
  const msg = String(error.message || '');
  if (
    code === '42P01' ||
    /relation .* does not exist/i.test(msg) ||
    /Could not find the table/i.test(msg)
  ) {
    return 'Les tables Supabase n’existent pas encore. Copiez et exécutez le fichier supabase_setup.sql dans l’éditeur SQL de Supabase.';
  }
  if (code === '42501' || /row-level security/i.test(msg)) {
    return 'Accès refusé par les politiques RLS. Vérifiez votre Code carnet (min. 3 caractères) et supabase_setup.sql.';
  }
  if (/Invalid API key/i.test(msg) || /JWT/i.test(msg)) {
    return 'Clé Anon Supabase invalide. Vérifiez la clé copiée depuis Project Settings -> API.';
  }
  if (/Failed to fetch/i.test(msg) || /NetworkError/i.test(msg)) {
    return 'Impossible de joindre Supabase. Vérifiez l’URL du projet et votre connexion internet.';
  }
  return msg || 'Erreur lors de la synchronisation Supabase.';
}

function sanitizeStorageSegment(code) {
  return (
    String(code || 'carnet')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'carnet'
  );
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function uploadRecipePhoto(config, recipeId, blobOrDataUrl) {
  const { client, notebookCode } = getClient(config);
  const blob =
    typeof blobOrDataUrl === 'string' && blobOrDataUrl.startsWith('data:')
      ? dataUrlToBlob(blobOrDataUrl)
      : blobOrDataUrl;

  if (!(blob instanceof Blob)) {
    throw new Error('Format photo invalide pour l’envoi vers Supabase.');
  }

  const folder = sanitizeStorageSegment(notebookCode);
  const path = `${folder}/${recipeId}-${Date.now()}.jpg`;

  const { error: uploadError } = await client.storage
    .from('recipe-photos')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(formatSupabaseError(uploadError));
  }

  const { data } = client.storage.from('recipe-photos').getPublicUrl(path);
  return data.publicUrl;
}

function toRemoteRecipeRow(recipe, notebookCode) {
  return {
    id: recipe.id,
    notebook_code: notebookCode,
    title: recipe.title,
    category: recipe.category,
    servings: Number(recipe.servings) || 4,
    photo_url: recipe.photoUrl || null,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    created_at: recipe.createdAt || new Date().toISOString(),
    updated_at: recipe.updatedAt || new Date().toISOString(),
  };
}

function fromRemoteRecipeRow(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    servings: Number(row.servings) || 4,
    photoUrl: row.photo_url || '',
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    steps: Array.isArray(row.steps) ? row.steps : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRemoteShoppingRow(item, notebookCode) {
  return {
    id: item.id,
    notebook_code: notebookCode,
    name: item.name,
    normalized_name: item.normalizedName || normalizeIngredientName(item.name),
    quantity:
      item.quantity === null || item.quantity === undefined || item.quantity === ''
        ? null
        : Number(item.quantity),
    unit: canonicalUnit(item.unit || ''),
    checked: Boolean(item.checked),
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString(),
  };
}

function fromRemoteShoppingRow(row) {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name || normalizeIngredientName(row.name),
    quantity: row.quantity === null || row.quantity === undefined ? null : Number(row.quantity),
    unit: canonicalUnit(row.unit || ''),
    checked: Boolean(row.checked),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mergeByTimestamp(localList, remoteList, tombstoneSet) {
  const map = new Map();
  for (const item of remoteList) {
    if (!tombstoneSet.has(item.id)) {
      map.set(item.id, { item, source: 'remote' });
    }
  }
  const toPush = [];
  for (const localItem of localList) {
    if (tombstoneSet.has(localItem.id)) continue;
    const existing = map.get(localItem.id);
    if (!existing) {
      map.set(localItem.id, { item: localItem, source: 'local' });
      toPush.push(localItem);
    } else {
      const localTs = Date.parse(localItem.updatedAt || localItem.createdAt || 0) || 0;
      const remoteTs =
        Date.parse(existing.item.updatedAt || existing.item.createdAt || 0) || 0;
      if (localTs > remoteTs) {
        map.set(localItem.id, { item: localItem, source: 'local' });
        toPush.push(localItem);
      }
    }
  }
  return {
    merged: Array.from(map.values()).map((entry) => entry.item),
    toPush,
  };
}

export async function testAndSync({
  config,
  localRecipes = [],
  localShopping = [],
  deletedRecipeIds = [],
  deletedShoppingIds = [],
}) {
  const { client, notebookCode } = getClient(config);

  const recipeTombstones = new Set(deletedRecipeIds);
  const shoppingTombstones = new Set(deletedShoppingIds);

  // 1. Appliquer les suppressions locales sur Supabase
  if (deletedRecipeIds.length > 0) {
    const { error } = await client
      .from('recipes')
      .delete()
      .eq('notebook_code', notebookCode)
      .in('id', deletedRecipeIds);
    if (error) throw new Error(formatSupabaseError(error));
  }

  if (deletedShoppingIds.length > 0) {
    const { error } = await client
      .from('shopping_items')
      .delete()
      .eq('notebook_code', notebookCode)
      .in('id', deletedShoppingIds);
    if (error) throw new Error(formatSupabaseError(error));
  }

  // 2. Récupérer les données distantes du carnet
  const [recipesRes, shoppingRes] = await Promise.all([
    client
      .from('recipes')
      .select('*')
      .eq('notebook_code', notebookCode)
      .order('updated_at', { ascending: false }),
    client
      .from('shopping_items')
      .select('*')
      .eq('notebook_code', notebookCode)
      .order('created_at', { ascending: true }),
  ]);

  if (recipesRes.error) throw new Error(formatSupabaseError(recipesRes.error));
  if (shoppingRes.error) throw new Error(formatSupabaseError(shoppingRes.error));

  const remoteRecipes = (recipesRes.data || []).map(fromRemoteRecipeRow);
  const remoteShopping = (shoppingRes.data || []).map(fromRemoteShoppingRow);

  // 3. Fusion bidirectionnelle par horodatage
  const { merged: mergedRecipes, toPush: recipesToPush } = mergeByTimestamp(
    localRecipes,
    remoteRecipes,
    recipeTombstones
  );
  const { merged: mergedShopping, toPush: shoppingToPush } = mergeByTimestamp(
    localShopping,
    remoteShopping,
    shoppingTombstones
  );

  // 4. Envoyer les photos base64 locales des recettes à pousser vers Supabase Storage
  const uploadedPhotoUrls = new Map();
  for (const recipe of recipesToPush) {
    if (recipe.photoUrl && recipe.photoUrl.startsWith('data:image/')) {
      try {
        const publicUrl = await uploadRecipePhoto(config, recipe.id, recipe.photoUrl);
        uploadedPhotoUrls.set(recipe.id, publicUrl);
      } catch {
        // Si le bucket échoue, on garde le dataUrl plutôt que de bloquer la synchro
      }
    }
  }

  const finalRecipes = mergedRecipes.map((r) =>
    uploadedPhotoUrls.has(r.id) ? { ...r, photoUrl: uploadedPhotoUrls.get(r.id) } : r
  );

  const finalPushRecipes = recipesToPush.map((r) =>
    uploadedPhotoUrls.has(r.id) ? { ...r, photoUrl: uploadedPhotoUrls.get(r.id) } : r
  );

  if (finalPushRecipes.length > 0) {
    const rows = finalPushRecipes.map((r) => toRemoteRecipeRow(r, notebookCode));
    const { error } = await client.from('recipes').upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(formatSupabaseError(error));
  }

  if (shoppingToPush.length > 0) {
    const rows = shoppingToPush.map((s) => toRemoteShoppingRow(s, notebookCode));
    const { error } = await client
      .from('shopping_items')
      .upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(formatSupabaseError(error));
  }

  // Tri des recettes du plus récent au plus ancien
  finalRecipes.sort(
    (a, b) =>
      (Date.parse(b.updatedAt || b.createdAt || 0) || 0) -
      (Date.parse(a.updatedAt || a.createdAt || 0) || 0)
  );

  return {
    recipes: finalRecipes,
    shoppingItems: mergedShopping,
    syncedAt: new Date().toISOString(),
  };
}

export async function pushRecipeUpsert(config, recipe) {
  if (!isSyncConfigured(config)) return;
  const { client, notebookCode } = getClient(config);
  const { error } = await client
    .from('recipes')
    .upsert(toRemoteRecipeRow(recipe, notebookCode), { onConflict: 'id' });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function pushRecipeDelete(config, recipeId) {
  if (!isSyncConfigured(config)) return;
  const { client, notebookCode } = getClient(config);
  const { error } = await client
    .from('recipes')
    .delete()
    .eq('notebook_code', notebookCode)
    .eq('id', recipeId);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function pushShoppingUpsert(config, item) {
  if (!isSyncConfigured(config)) return;
  const { client, notebookCode } = getClient(config);
  const { error } = await client
    .from('shopping_items')
    .upsert(toRemoteShoppingRow(item, notebookCode), { onConflict: 'id' });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function pushShoppingBulkUpsert(config, items) {
  if (!isSyncConfigured(config) || !items?.length) return;
  const { client, notebookCode } = getClient(config);
  const rows = items.map((item) => toRemoteShoppingRow(item, notebookCode));
  const { error } = await client
    .from('shopping_items')
    .upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function pushShoppingDeleteIds(config, ids) {
  if (!isSyncConfigured(config) || !ids?.length) return;
  const { client, notebookCode } = getClient(config);
  const { error } = await client
    .from('shopping_items')
    .delete()
    .eq('notebook_code', notebookCode)
    .in('id', ids);
  if (error) throw new Error(formatSupabaseError(error));
}

export function subscribeToNotebook({ config, onRemoteUpdate }) {
  if (!isSyncConfigured(config)) return () => {};
  try {
    const { client, notebookCode } = getClient(config);
    const channel = client
      .channel(`mes-recettes-${sanitizeStorageSegment(notebookCode)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipes',
          filter: `notebook_code=eq.${notebookCode}`,
        },
        (payload) => {
          onRemoteUpdate?.('recipes', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_items',
          filter: `notebook_code=eq.${notebookCode}`,
        },
        (payload) => {
          onRemoteUpdate?.('shopping', payload);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}

export { fromRemoteRecipeRow, fromRemoteShoppingRow };
