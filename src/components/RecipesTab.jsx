import React, { useMemo, useState } from 'react';
import { ChefHat, Plus, Search, Users, Utensils } from 'lucide-react';
import { FILTER_CATEGORIES } from '../utils/constants.js';
import { normalizeText } from '../utils/normalize.js';

const CATEGORY_COLORS = {
  Entrées: 'bg-[#4A7C59]/10 text-[#4A7C59] border-[#4A7C59]/20',
  Plats: 'bg-[#C85A32]/10 text-[#C85A32] border-[#C85A32]/20',
  Desserts: 'bg-[#B87D3B]/10 text-[#9B6325] border-[#B87D3B]/20',
};

export default function RecipesTab({
  recipes,
  onSelectRecipe,
  onCreateNew,
}) {
  const [selectedCategory, setSelectedCategory] = useState('Toutes');
  const [searchQuery, setSearchQuery] = useState('');

  const categoryCounts = useMemo(() => {
    const counts = { Toutes: recipes.length, Entrées: 0, Plats: 0, Desserts: 0 };
    for (const r of recipes) {
      if (counts[r.category] !== undefined) {
        counts[r.category] += 1;
      }
    }
    return counts;
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const q = normalizeText(searchQuery);
    return recipes.filter((recipe) => {
      if (selectedCategory !== 'Toutes' && recipe.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      const inTitle = normalizeText(recipe.title).includes(q);
      if (inTitle) return true;
      return (recipe.ingredients || []).some((ing) =>
        normalizeText(ing.name).includes(q)
      );
    });
  }, [recipes, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[#26211D]">
            Mes recettes
          </h2>
          <p className="mt-1 text-sm text-[#70675F]">
            Votre carnet personnel de recettes du quotidien
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#C85A32] px-5 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-[#AE4A26] active:scale-[0.99] transition"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          <span>Nouvelle recette</span>
        </button>
      </div>

      {/* Recherche + filtres */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#70675F]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre ou ingrédient (ex : chocolat, œufs)..."
            className="w-full min-h-[48px] rounded-2xl border border-[#EAE5DD] bg-white pl-11 pr-4 py-2.5 text-sm text-[#26211D] placeholder:text-[#9A9087] shadow-soft focus:border-[#C85A32] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {FILTER_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'border-[#C85A32] bg-[#C85A32] text-white shadow-soft'
                    : 'border-[#EAE5DD] bg-white text-[#70675F] hover:border-[#C85A32]/40 hover:text-[#26211D]'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
                    active ? 'bg-white/20 text-white' : 'bg-[#F3EFE8] text-[#70675F]'
                  }`}
                >
                  {categoryCounts[cat] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grille des recettes */}
      {filteredRecipes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#EAE5DD] bg-white px-6 py-12 text-center shadow-soft">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF8F5] text-[#C85A32]">
            <ChefHat className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-serif text-lg font-semibold text-[#26211D]">
            {recipes.length === 0
              ? 'Votre carnet est encore vide'
              : 'Aucune recette ne correspond'}
          </h3>
          <p className="mt-1.5 text-sm text-[#70675F] max-w-md mx-auto">
            {recipes.length === 0
              ? 'Ajoutez votre première recette ou explorez les 500 idées dans l’onglet Frigo.'
              : 'Essayez un autre mot-clé ou affichez toutes les catégories.'}
          </p>
          {recipes.length === 0 && (
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#C85A32] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#AE4A26] transition"
            >
              <Plus className="h-4 w-4" />
              <span>Créer une recette</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredRecipes.map((recipe) => {
            const badgeStyle =
              CATEGORY_COLORS[recipe.category] ||
              'bg-[#F3EFE8] text-[#70675F] border-[#EAE5DD]';
            return (
              <article
                key={recipe.id}
                onClick={() => onSelectRecipe(recipe)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectRecipe(recipe);
                  }
                }}
                tabIndex={0}
                role="button"
                className="group cursor-pointer overflow-hidden rounded-3xl border border-[#EAE5DD] bg-white shadow-soft hover:shadow-card hover:border-[#C85A32]/30 transition-all flex flex-col"
              >
                {recipe.photoUrl ? (
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F3EFE8]">
                    <img
                      src={recipe.photoUrl}
                      alt={recipe.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                ) : (
                  <div className="relative flex aspect-[16/10] w-full flex-col items-center justify-center bg-gradient-to-br from-[#FAF8F5] to-[#F1EAE0] px-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-[#C85A32] shadow-soft border border-[#EAE5DD]">
                      <Utensils className="h-5 w-5" />
                    </div>
                  </div>
                )}

                <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeStyle}`}
                    >
                      {recipe.category}
                    </span>
                    <h3 className="mt-2.5 font-serif text-lg font-semibold leading-snug text-[#26211D] group-hover:text-[#C85A32] transition-colors line-clamp-2">
                      {recipe.title}
                    </h3>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#F3EFE8] pt-3 text-xs font-medium text-[#70675F]">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-[#C85A32]" />
                      <span>
                        {recipe.servings} pers.
                      </span>
                    </span>
                    <span>
                      {(recipe.ingredients || []).length} ingrédient
                      {(recipe.ingredients || []).length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
