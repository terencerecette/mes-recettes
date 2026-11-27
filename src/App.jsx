import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CookingMode from './components/CookingMode.jsx';
import FrigoTab from './components/FrigoTab.jsx';
import Navigation from './components/Navigation.jsx';
import RecipeDetail from './components/RecipeDetail.jsx';
import RecipeFormModal from './components/RecipeFormModal.jsx';
import RecipesTab from './components/RecipesTab.jsx';
import ShoppingTab from './components/ShoppingTab.jsx';
import SyncTab from './components/SyncTab.jsx';
import TimerWidget from './components/TimerWidget.jsx';
import Toast from './components/Toast.jsx';
import { TimerProvider } from './context/TimerContext.jsx';
import frigoRecipes from './data/frigo_recipes.json';
import {
  createUuid,
  loadDeletedIds,
  loadInitialRecipes,
  loadLastSync,
  loadShoppingItems,
  loadSyncConfig,
  saveDeletedIds,
  saveLastSync,
  saveRecipes,
  saveShoppingItems,
  saveSyncConfig,
} from './services/storage.js';
import {
  fromRemoteRecipeRow,
  fromRemoteShoppingRow,
  isSyncConfigured,
  pushRecipeDelete,
  pushRecipeUpsert,
  pushShoppingBulkUpsert,
  pushShoppingDeleteIds,
  pushShoppingUpsert,
  subscribeToNotebook,
  testAndSync,
  uploadRecipePhoto,
} from './services/syncService.js';
import { normalizeText } from './utils/normalize.js';
import { mergeShoppingItems } from './utils/shoppingMerge.js';

const VALID_TABS = new Set(['recipes', 'frigo', 'shopping', 'sync']);

function getInitialTabFromHash() {
  if (typeof window === 'undefined') return 'recipes';
  const raw = window.location.hash.replace(/^#/, '');
  return VALID_TABS.has(raw) ? raw : 'recipes';
}

export default function App() {
  const [activeTab, setActiveTab] = useState(getInitialTabFromHash);
  const [recipes, setRecipes] = useState(() => loadInitialRecipes());
  const [shoppingItems, setShoppingItems] = useState(() => loadShoppingItems());
  const [syncConfig, setSyncConfig] = useState(() => loadSyncConfig());
  const [deletedRecipeIds, setDeletedRecipeIds] = useState(() =>
    loadDeletedIds('recipes')
  );
  const [deletedShoppingIds, setDeletedShoppingIds] = useState(() =>
    loadDeletedIds('shopping')
  );
  const [lastSync, setLastSync] = useState(() => loadLastSync());
  const [syncStatus, setSyncStatus] = useState(() =>
    isSyncConfigured(loadSyncConfig()) ? 'connected' : 'local'
  );

  const [selectedRecipeState, setSelectedRecipeState] = useState(null);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [cookingSession, setCookingSession] = useState(null);
  const [toast, setToast] = useState(null);

  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3400);
  }, []);

  // Synchronisation légère avec le hash URL (100% statique pour GitHub Pages)
  const handleSelectTab = useCallback((tab) => {
    setActiveTab(tab);
    setSelectedRecipeState(null);
    if (typeof window !== 'undefined' && window.location.hash !== `#${tab}`) {
      window.location.hash = `#${tab}`;
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const next = getInitialTabFromHash();
      setActiveTab(next);
      setSelectedRecipeState(null);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Sauvegarde automatique locale à chaque modification
  useEffect(() => {
    const res = saveRecipes(recipes);
    if (!res.ok && res.error) {
      showToast(res.error, 'error');
    }
  }, [recipes, showToast]);

  useEffect(() => {
    const res = saveShoppingItems(shoppingItems);
    if (!res.ok && res.error) {
      showToast(res.error, 'error');
    }
  }, [shoppingItems, showToast]);

  useEffect(() => {
    saveDeletedIds('recipes', deletedRecipeIds);
  }, [deletedRecipeIds]);

  useEffect(() => {
    saveDeletedIds('shopping', deletedShoppingIds);
  }, [deletedShoppingIds]);

  const runFullSync = useCallback(
    async (configToUse, silent = false) => {
      const result = await testAndSync({
        config: configToUse,
        localRecipes: recipes,
        localShopping: shoppingItems,
        deletedRecipeIds,
        deletedShoppingIds,
      });

      setRecipes(result.recipes);
      setShoppingItems(result.shoppingItems);
      setDeletedRecipeIds([]);
      setDeletedShoppingIds([]);
      setLastSync(result.syncedAt);
      saveLastSync(result.syncedAt);
      setSyncConfig(configToUse);
      saveSyncConfig(configToUse);
      setSyncStatus('connected');

      if (!silent) {
        showToast('Synchronisation Supabase réussie !', 'success');
      }
    },
    [recipes, shoppingItems, deletedRecipeIds, deletedShoppingIds, showToast]
  );

  // Synchronisation silencieuse au démarrage si activée
  const initialSyncAttemptedRef = useRef(false);
  useEffect(() => {
    if (initialSyncAttemptedRef.current) return;
    initialSyncAttemptedRef.current = true;
    if (isSyncConfigured(syncConfig)) {
      runFullSync(syncConfig, true).catch(() => {
        setSyncStatus('error');
      });
    }
  }, [syncConfig, runFullSync]);

  // Abonnement Supabase Realtime quand la synchro est active
  useEffect(() => {
    if (!isSyncConfigured(syncConfig)) return undefined;

    const unsubscribe = subscribeToNotebook({
      config: syncConfig,
      onRemoteUpdate: (kind, payload) => {
        const eventType = payload?.eventType;
        if (kind === 'recipes') {
          if (eventType === 'DELETE' && payload.old?.id) {
            setRecipes((prev) => prev.filter((r) => r.id !== payload.old.id));
          } else if (payload.new?.id) {
            const incoming = fromRemoteRecipeRow(payload.new);
            setRecipes((prev) => {
              const exists = prev.some((r) => r.id === incoming.id);
              if (exists) {
                return prev.map((r) => (r.id === incoming.id ? incoming : r));
              }
              return [incoming, ...prev];
            });
          }
        } else if (kind === 'shopping') {
          if (eventType === 'DELETE' && payload.old?.id) {
            setShoppingItems((prev) => prev.filter((s) => s.id !== payload.old.id));
          } else if (payload.new?.id) {
            const incoming = fromRemoteShoppingRow(payload.new);
            setShoppingItems((prev) => {
              const exists = prev.some((s) => s.id === incoming.id);
              if (exists) {
                return prev.map((s) => (s.id === incoming.id ? incoming : s));
              }
              return [incoming, ...prev];
            });
          }
        }
      },
    });

    return unsubscribe;
  }, [syncConfig]);

  // Actions Recettes perso
  const handleSaveRecipeForm = async (formData) => {
    const now = new Date().toISOString();
    const recipeId = formData.id || createUuid();
    let finalPhotoUrl = formData.photoUrl || '';

    if (formData.photoBlob && isSyncConfigured(syncConfig)) {
      try {
        finalPhotoUrl = await uploadRecipePhoto(
          syncConfig,
          recipeId,
          formData.photoBlob
        );
      } catch {
        // Fallback transparent sur le dataUrl compressé
      }
    }

    const nextRecipe = {
      id: recipeId,
      title: formData.title,
      category: formData.category,
      servings: formData.servings,
      photoUrl: finalPhotoUrl,
      ingredients: formData.ingredients,
      steps: formData.steps,
      createdAt: formData.createdAt || now,
      updatedAt: now,
    };

    setRecipes((prev) => {
      const exists = prev.some((r) => r.id === recipeId);
      if (exists) {
        return prev.map((r) => (r.id === recipeId ? nextRecipe : r));
      }
      return [nextRecipe, ...prev];
    });

    if (selectedRecipeState && selectedRecipeState.recipe?.id === recipeId) {
      setSelectedRecipeState({ recipe: nextRecipe, isFrigo: false });
    }

    setShowRecipeForm(false);
    setEditingRecipe(null);
    showToast(
      formData.id ? 'Recette mise à jour.' : 'Recette ajoutée à votre carnet.',
      'success'
    );

    if (isSyncConfigured(syncConfig)) {
      pushRecipeUpsert(syncConfig, nextRecipe).catch(() => setSyncStatus('error'));
    }
  };

  const handleDeleteRecipe = (recipeId) => {
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    setSelectedRecipeState(null);
    showToast('Recette supprimée.', 'info');

    if (isSyncConfigured(syncConfig)) {
      pushRecipeDelete(syncConfig, recipeId).catch(() => {
        setDeletedRecipeIds((prev) => [...prev, recipeId]);
        setSyncStatus('error');
      });
    } else {
      setDeletedRecipeIds((prev) => [...prev, recipeId]);
    }
  };

  const savedTitleSet = useMemo(
    () => new Set(recipes.map((r) => normalizeText(r.title))),
    [recipes]
  );

  const handleSaveFrigoToPersonal = (frigoRecipe) => {
    if (savedTitleSet.has(normalizeText(frigoRecipe.title))) {
      showToast('Cette recette est déjà dans votre carnet.', 'info');
      return;
    }

    const now = new Date().toISOString();
    const copy = {
      id: createUuid(),
      title: frigoRecipe.title,
      category: frigoRecipe.category,
      servings: frigoRecipe.servings,
      photoUrl: '',
      ingredients: (frigoRecipe.ingredients || []).map((ing) => ({ ...ing })),
      steps: [...(frigoRecipe.steps || [])],
      createdAt: now,
      updatedAt: now,
    };

    setRecipes((prev) => [copy, ...prev]);
    showToast(`« ${copy.title} » enregistrée dans Mes recettes.`, 'success');

    if (isSyncConfigured(syncConfig)) {
      pushRecipeUpsert(syncConfig, copy).catch(() => setSyncStatus('error'));
    }
  };

  // Actions Courses
  const handleAddIngredientsToShopping = (incomingIngredients) => {
    const merged = mergeShoppingItems(shoppingItems, incomingIngredients);
    setShoppingItems(merged.items);

    const totalTouched = merged.addedCount + merged.mergedCount;
    showToast(
      totalTouched > 1
        ? `${totalTouched} ingrédients ajoutés aux courses.`
        : 'Ingrédient ajouté aux courses.',
      'success'
    );

    if (isSyncConfigured(syncConfig) && merged.touchedItems.length > 0) {
      pushShoppingBulkUpsert(syncConfig, merged.touchedItems).catch(() =>
        setSyncStatus('error')
      );
    }
  };

  const handleAddManualShopping = (parsedItem) => {
    const merged = mergeShoppingItems(shoppingItems, [parsedItem]);
    setShoppingItems(merged.items);

    if (isSyncConfigured(syncConfig) && merged.touchedItems.length > 0) {
      pushShoppingBulkUpsert(syncConfig, merged.touchedItems).catch(() =>
        setSyncStatus('error')
      );
    }
  };

  const handleToggleShoppingItem = (itemId) => {
    const now = new Date().toISOString();
    let updatedItem = null;
    setShoppingItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        updatedItem = { ...item, checked: !item.checked, updatedAt: now };
        return updatedItem;
      })
    );

    if (updatedItem && isSyncConfigured(syncConfig)) {
      pushShoppingUpsert(syncConfig, updatedItem).catch(() =>
        setSyncStatus('error')
      );
    }
  };

  const handleDeleteShoppingItem = (itemId) => {
    setShoppingItems((prev) => prev.filter((item) => item.id !== itemId));
    if (isSyncConfigured(syncConfig)) {
      pushShoppingDeleteIds(syncConfig, [itemId]).catch(() => {
        setDeletedShoppingIds((prev) => [...prev, itemId]);
        setSyncStatus('error');
      });
    } else {
      setDeletedShoppingIds((prev) => [...prev, itemId]);
    }
  };

  const handleClearCheckedShopping = () => {
    const idsToDelete = shoppingItems.filter((i) => i.checked).map((i) => i.id);
    if (idsToDelete.length === 0) return;

    setShoppingItems((prev) => prev.filter((i) => !i.checked));
    showToast('Articles cochés effacés.', 'info');

    if (isSyncConfigured(syncConfig)) {
      pushShoppingDeleteIds(syncConfig, idsToDelete).catch(() => {
        setDeletedShoppingIds((prev) => [...prev, ...idsToDelete]);
        setSyncStatus('error');
      });
    } else {
      setDeletedShoppingIds((prev) => [...prev, ...idsToDelete]);
    }
  };

  const handleClearAllShopping = () => {
    const idsToDelete = shoppingItems.map((i) => i.id);
    setShoppingItems([]);
    showToast('Liste de courses vidée.', 'info');

    if (idsToDelete.length > 0) {
      if (isSyncConfigured(syncConfig)) {
        pushShoppingDeleteIds(syncConfig, idsToDelete).catch(() => {
          setDeletedShoppingIds((prev) => [...prev, ...idsToDelete]);
          setSyncStatus('error');
        });
      } else {
        setDeletedShoppingIds((prev) => [...prev, ...idsToDelete]);
      }
    }
  };

  // Actions Synchro & Import JSON
  const handleDisconnectSync = () => {
    const nextConfig = { ...syncConfig, enabled: false };
    setSyncConfig(nextConfig);
    saveSyncConfig(nextConfig);
    setSyncStatus('local');
    showToast('Mode local activé.', 'info');
  };

  const handleImportBackup = async (parsed) => {
    let importedRecipesCount = 0;
    setRecipes((prev) => {
      const map = new Map(prev.map((r) => [r.id, r]));
      for (const r of parsed.recipes) {
        map.set(r.id, r);
        importedRecipesCount += 1;
      }
      return Array.from(map.values());
    });

    if (parsed.shoppingItems.length > 0) {
      setShoppingItems((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]));
        for (const s of parsed.shoppingItems) {
          map.set(s.id, s);
        }
        return Array.from(map.values());
      });
    }

    showToast(
      `${importedRecipesCount} recette${importedRecipesCount > 1 ? 's' : ''} importée${importedRecipesCount > 1 ? 's' : ''}.`,
      'success'
    );
  };

  const shoppingUncheckedCount = useMemo(
    () => shoppingItems.filter((item) => !item.checked).length,
    [shoppingItems]
  );

  const selectedRecipe = selectedRecipeState?.recipe || null;
  const isSelectedFromFrigo = Boolean(selectedRecipeState?.isFrigo);

  return (
    <TimerProvider>
      <div className="min-h-dvh bg-[#FAF8F5] text-[#26211D]">
        <Toast toast={toast} />

        <Navigation
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          shoppingUncheckedCount={shoppingUncheckedCount}
          isSyncActive={syncStatus === 'connected' && syncConfig.enabled}
          recipesCount={recipes.length}
        />

        {/* Contenu principal */}
        <main className="md:pl-64 min-h-dvh safe-top">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-mobile-nav">
            {selectedRecipe ? (
              <RecipeDetail
                recipe={selectedRecipe}
                isFrigoRecipe={isSelectedFromFrigo}
                alreadySavedToPersonal={
                  isSelectedFromFrigo &&
                  savedTitleSet.has(normalizeText(selectedRecipe.title))
                }
                onBack={() => setSelectedRecipeState(null)}
                onEdit={() => {
                  setEditingRecipe(selectedRecipe);
                  setShowRecipeForm(true);
                }}
                onDelete={handleDeleteRecipe}
                onSaveToPersonal={handleSaveFrigoToPersonal}
                onOpenCookingMode={(scaled) =>
                  setCookingSession({ recipe: selectedRecipe, scaled })
                }
                onAddIngredientsToShopping={handleAddIngredientsToShopping}
              />
            ) : (
              <>
                {activeTab === 'recipes' && (
                  <RecipesTab
                    recipes={recipes}
                    onSelectRecipe={(recipe) =>
                      setSelectedRecipeState({ recipe, isFrigo: false })
                    }
                    onCreateNew={() => {
                      setEditingRecipe(null);
                      setShowRecipeForm(true);
                    }}
                  />
                )}

                {activeTab === 'frigo' && (
                  <FrigoTab
                    frigoRecipes={frigoRecipes}
                    personalRecipes={recipes}
                    savedTitleSet={savedTitleSet}
                    onSelectRecipe={(recipe, isFrigo = true) =>
                      setSelectedRecipeState({ recipe, isFrigo })
                    }
                    onSaveToPersonal={handleSaveFrigoToPersonal}
                  />
                )}

                {activeTab === 'shopping' && (
                  <ShoppingTab
                    items={shoppingItems}
                    onAddManual={handleAddManualShopping}
                    onToggleItem={handleToggleShoppingItem}
                    onDeleteItem={handleDeleteShoppingItem}
                    onClearChecked={handleClearCheckedShopping}
                    onClearAll={handleClearAllShopping}
                  />
                )}

                {activeTab === 'sync' && (
                  <SyncTab
                    syncConfig={syncConfig}
                    syncStatus={syncStatus}
                    lastSync={lastSync}
                    recipes={recipes}
                    shoppingItems={shoppingItems}
                    onTestAndSync={(cfg) => runFullSync(cfg, false)}
                    onDisconnectSync={handleDisconnectSync}
                    onImportBackup={handleImportBackup}
                    onShowToast={showToast}
                  />
                )}
              </>
            )}
          </div>
        </main>

        {/* Modale création / édition de recette */}
        <RecipeFormModal
          open={showRecipeForm}
          initialRecipe={editingRecipe}
          onSave={handleSaveRecipeForm}
          onClose={() => {
            setShowRecipeForm(false);
            setEditingRecipe(null);
          }}
        />

        {/* Mode Cuisine plein écran */}
        {cookingSession && (
          <CookingMode
            recipe={cookingSession.recipe}
            scaled={cookingSession.scaled}
            onClose={() => setCookingSession(null)}
          />
        )}

        {/* Minuteur flottant persistant */}
        <TimerWidget
          showTriggerButton={Boolean(selectedRecipe || cookingSession)}
        />
      </div>
    </TimerProvider>
  );
}
