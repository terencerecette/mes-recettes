import React, { useMemo, useState } from 'react';
import {
  BookmarkPlus,
  Check,
  Plus,
  Refrigerator,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { COMMON_FRIGO_CHIPS, FILTER_CATEGORIES } from '../utils/constants.js';
import { searchFrigoRecipes } from '../utils/frigoSearch.js';
import { normalizeText } from '../utils/normalize.js';

const PAGE_SIZE = 24;

export default function FrigoTab({
  frigoRecipes,
  personalRecipes,
  savedTitleSet,
  onSelectRecipe,
  onSaveToPersonal,
}) {
  const [inputValue, setInputValue] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [category, setCategory] = useState('Toutes');
  const [textQuery, setTextQuery] = useState('');
  const [ignoreBasics, setIgnoreBasics] = useState(true);
  const [includePersonal, setIncludePersonal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const addIngredientTerm = (rawTerm) => {
    const parts = String(rawTerm || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    setSelectedIngredients((prev) => {
      const existingNorm = new Set(prev.map((x) => normalizeText(x)));
      const next = [...prev];
      for (const p of parts) {
        const norm = normalizeText(p);
        if (norm && !existingNorm.has(norm)) {
          existingNorm.add(norm);
          next.push(p);
        }
      }
      return next;
    });
    setVisibleCount(PAGE_SIZE);
  };

  const removeIngredientTerm = (idx) => {
    setSelectedIngredients((prev) => prev.filter((_, i) => i !== idx));
    setVisibleCount(PAGE_SIZE);
  };

  const toggleQuickChip = (chip) => {
    const chipNorm = normalizeText(chip);
    const existsIdx = selectedIngredients.findIndex(
      (item) => normalizeText(item) === chipNorm
    );
    if (existsIdx !== -1) {
      removeIngredientTerm(existsIdx);
    } else {
      addIngredientTerm(chip);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addIngredientTerm(inputValue);
        setInputValue('');
      }
    }
  };

  const handleAddClick = () => {
    if (inputValue.trim()) {
      addIngredientTerm(inputValue);
      setInputValue('');
    }
  };

  const combinedPool = useMemo(() => {
    const taggedFrigo = frigoRecipes.map((r) => ({ ...r, _isFrigo: true }));
    if (!includePersonal) return taggedFrigo;
    const taggedPersonal = personalRecipes.map((r) => ({
      ...r,
      _isFrigo: false,
      _isPersonal: true,
    }));
    return [...taggedPersonal, ...taggedFrigo];
  }, [frigoRecipes, personalRecipes, includePersonal]);

  const results = useMemo(() => {
    return searchFrigoRecipes({
      recipes: combinedPool,
      userIngredients: selectedIngredients,
      category,
      ignorePantryBasics: ignoreBasics,
      textQuery,
    });
  }, [combinedPool, selectedIngredients, category, ignoreBasics, textQuery]);

  const visibleResults = results.slice(0, visibleCount);
  const remainingCount = Math.max(0, results.length - visibleResults.length);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[#26211D]">
          Dans mon frigo
        </h2>
        <p className="mt-1 text-sm text-[#70675F]">
          Saisissez ce que vous avez sous la main parmi {frigoRecipes.length} idées du quotidien
        </p>
      </div>

      {/* Panneau de recherche ingrédients */}
      <div className="rounded-3xl border border-[#EAE5DD] bg-white p-4 sm:p-6 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Refrigerator className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C85A32]" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                const val = e.target.value;
                if (val.includes(',')) {
                  const segments = val.split(',');
                  const complete = segments.slice(0, -1).join(',');
                  if (complete.trim()) {
                    addIngredientTerm(complete);
                  }
                  setInputValue(segments[segments.length - 1]);
                } else {
                  setInputValue(val);
                }
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Ajouter un ingrédient (ex : œufs, tomates, pâtes)..."
              aria-label="Ajouter un ingrédient du frigo"
              className="w-full min-h-[46px] rounded-2xl border border-[#EAE5DD] bg-[#FAF8F5] pl-10 pr-4 py-2 text-sm text-[#26211D] placeholder:text-[#9A9087] focus:border-[#C85A32] focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleAddClick}
            className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl bg-[#C85A32] px-5 py-2 text-sm font-semibold text-white hover:bg-[#AE4A26] transition"
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter</span>
          </button>
        </div>

        {/* Ingrédients sélectionnés */}
        {selectedIngredients.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#FAF8F5] p-3 border border-[#F3EFE8]">
            <span className="text-xs font-semibold text-[#70675F] mr-1">
              Mon frigo :
            </span>
            {selectedIngredients.map((item, idx) => (
              <span
                key={`${item}-${idx}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#4A7C59] px-3 py-1 text-xs font-semibold text-white"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => removeIngredientTerm(idx)}
                  className="rounded-full p-0.5 hover:bg-white/20"
                  aria-label={`Retirer ${item}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => {
                setSelectedIngredients([]);
                setVisibleCount(PAGE_SIZE);
              }}
              className="ml-auto text-xs font-semibold text-[#C85A32] hover:underline"
            >
              Tout effacer
            </button>
          </div>
        )}

        {/* Chips de sélection rapide */}
        <div>
          <p className="text-xs font-medium text-[#70675F] mb-2">
            Sélection rapide :
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_FRIGO_CHIPS.map((chip) => {
              const isSelected = selectedIngredients.some(
                (sel) => normalizeText(sel) === normalizeText(chip)
              );
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleQuickChip(chip)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? 'border-[#4A7C59] bg-[#4A7C59]/10 text-[#4A7C59] font-semibold'
                      : 'border-[#EAE5DD] bg-[#FAF8F5] text-[#70675F] hover:border-[#C85A32]/40 hover:text-[#26211D]'
                  }`}
                >
                  {isSelected ? '✓ ' : '+ '}
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        {/* Options et filtre catégorie */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-t border-[#F3EFE8] pt-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {FILTER_CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'border-[#C85A32] bg-[#C85A32] text-white'
                      : 'border-[#EAE5DD] bg-[#FAF8F5] text-[#70675F] hover:text-[#26211D]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#70675F]" />
            <input
              type="search"
              value={textQuery}
              onChange={(e) => {
                setTextQuery(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder="Filtrer par nom de plat..."
              className="w-full min-h-[38px] rounded-xl border border-[#EAE5DD] bg-[#FAF8F5] pl-8 pr-3 py-1.5 text-xs text-[#26211D] placeholder:text-[#9A9087] focus:border-[#C85A32] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#70675F]">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={ignoreBasics}
              onChange={(e) => setIgnoreBasics(e.target.checked)}
              className="h-4 w-4 rounded border-[#D5CDC2] text-[#4A7C59] focus:ring-[#4A7C59]"
            />
            <span>Ignorer les basiques de placard (sel, poivre, huile, eau)</span>
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={includePersonal}
              onChange={(e) => setIncludePersonal(e.target.checked)}
              className="h-4 w-4 rounded border-[#D5CDC2] text-[#C85A32] focus:ring-[#C85A32]"
            />
            <span>Inclure aussi mes recettes perso</span>
          </label>
        </div>
      </div>

      {/* Résultats */}
      <div className="flex items-center justify-between text-xs font-medium text-[#70675F]">
        <span>
          {results.length} recette{results.length > 1 ? 's' : ''} trouvée
          {results.length > 1 ? 's' : ''}
          {selectedIngredients.length > 0 ? ' (triées par correspondance)' : ''}
        </span>
      </div>

      {results.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#EAE5DD] bg-white px-6 py-12 text-center shadow-soft">
          <Sparkles className="mx-auto h-8 w-8 text-[#C85A32]" />
          <h3 className="mt-3 font-serif text-lg font-semibold text-[#26211D]">
            Aucune recette trouvée avec ces filtres
          </h3>
          <p className="mt-1 text-sm text-[#70675F]">
            Essayez de retirer un ingrédient ou passez le filtre sur « Toutes ».
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleResults.map(({ recipe, matchPercent, matchedIngredients, missingIngredients }) => {
              const isSaved =
                Boolean(recipe._isPersonal) ||
                savedTitleSet.has(normalizeText(recipe.title));

              return (
                <article
                  key={`${recipe._isPersonal ? 'p' : 'f'}-${recipe.id}`}
                  className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[#EAE5DD] bg-white p-5 shadow-soft hover:shadow-card hover:border-[#C85A32]/30 transition-all"
                >
                  <div
                    onClick={() => onSelectRecipe(recipe, !recipe._isPersonal)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectRecipe(recipe, !recipe._isPersonal);
                      }
                    }}
                    className="cursor-pointer space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full border border-[#EAE5DD] bg-[#FAF8F5] px-2.5 py-0.5 text-[11px] font-semibold text-[#70675F]">
                          {recipe.category}
                        </span>
                        {recipe._isPersonal && (
                          <span className="rounded-full bg-[#C85A32]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#C85A32]">
                            Perso
                          </span>
                        )}
                      </div>

                      {selectedIngredients.length > 0 && (
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            matchPercent >= 75
                              ? 'bg-[#4A7C59] text-white'
                              : matchPercent >= 40
                                ? 'bg-[#4A7C59]/15 text-[#4A7C59]'
                                : 'bg-[#F3EFE8] text-[#70675F]'
                          }`}
                        >
                          {matchPercent} % match
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif text-lg font-semibold leading-snug text-[#26211D] hover:text-[#C85A32] transition-colors">
                      {recipe.title}
                    </h3>

                    {/* Badges ingrédients */}
                    <div className="flex flex-wrap gap-1.5">
                      {matchedIngredients.map((ing, i) => (
                        <span
                          key={`m-${i}`}
                          className="inline-flex items-center gap-1 rounded-full border border-[#4A7C59]/25 bg-[#4A7C59]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#4A7C59]"
                        >
                          <Check className="h-3 w-3" />
                          {ing.name}
                        </span>
                      ))}
                      {missingIngredients.slice(0, 6).map((ing, i) => (
                        <span
                          key={`x-${i}`}
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                            selectedIngredients.length > 0
                              ? 'border-[#C85A32]/20 bg-[#C85A32]/5 text-[#AE4A26]'
                              : 'border-[#EAE5DD] bg-[#FAF8F5] text-[#70675F]'
                          }`}
                        >
                          {ing.name}
                        </span>
                      ))}
                      {missingIngredients.length > 6 && (
                        <span className="rounded-full bg-[#F3EFE8] px-2 py-0.5 text-[11px] font-medium text-[#70675F]">
                          +{missingIngredients.length - 6} autres
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#F3EFE8] pt-3">
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#70675F]">
                      <Users className="h-3.5 w-3.5 text-[#C85A32]" />
                      {recipe.servings} pers.
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {!recipe._isPersonal && (
                        <button
                          type="button"
                          onClick={() => onSaveToPersonal(recipe)}
                          disabled={isSaved}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                            isSaved
                              ? 'border-[#4A7C59]/25 bg-[#4A7C59]/10 text-[#4A7C59]'
                              : 'border-[#EAE5DD] bg-[#FAF8F5] text-[#26211D] hover:border-[#4A7C59] hover:text-[#4A7C59]'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Enregistrée</span>
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="h-3.5 w-3.5" />
                              <span>Enregistrer</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectRecipe(recipe, !recipe._isPersonal)}
                        className="rounded-xl bg-[#C85A32]/10 px-3 py-1.5 text-xs font-semibold text-[#C85A32] hover:bg-[#C85A32] hover:text-white transition"
                      >
                        Voir
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {remainingCount > 0 && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="min-h-[44px] rounded-2xl border border-[#EAE5DD] bg-white px-6 py-2.5 text-sm font-semibold text-[#26211D] shadow-soft hover:border-[#C85A32]/40 hover:text-[#C85A32] transition"
              >
                Afficher plus ({remainingCount} restante{remainingCount > 1 ? 's' : ''})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
