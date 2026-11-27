import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookmarkPlus,
  Check,
  ChefHat,
  Edit3,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  ShoppingBasket,
  Timer,
  Trash2,
  Users,
} from 'lucide-react';
import { useTimer } from '../context/TimerContext.jsx';
import { parseStepSegments } from '../utils/durationParser.js';
import {
  computeScaledRecipe,
  formatRatio,
  parseDecimalInput,
} from '../utils/scaling.js';
import AddToShoppingModal from './AddToShoppingModal.jsx';
import ConfirmModal from './ConfirmModal.jsx';

export default function RecipeDetail({
  recipe,
  isFrigoRecipe = false,
  alreadySavedToPersonal = false,
  onBack,
  onEdit,
  onDelete,
  onSaveToPersonal,
  onOpenCookingMode,
  onAddIngredientsToShopping,
}) {
  const { startTimer } = useTimer();

  const [scaleFactor, setScaleFactor] = useState(1);
  const [scaleSource, setScaleSource] = useState(null);
  const [editingIngIdx, setEditingIngIdx] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingServings, setEditingServings] = useState(false);
  const [servingsInput, setServingsInput] = useState('');
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Réinitialiser le ratio uniquement quand on change de recette
  useEffect(() => {
    setScaleFactor(1);
    setScaleSource(null);
    setEditingIngIdx(null);
    setEditingServings(false);
  }, [recipe?.id]);

  const baseServings = Number(recipe?.servings) > 0 ? Number(recipe.servings) : 4;

  const scaled = useMemo(
    () => computeScaledRecipe(recipe, scaleFactor, scaleSource),
    [recipe, scaleFactor, scaleSource]
  );

  const isAdjusted = Math.abs(scaleFactor - 1) > 0.001;

  const handleResetScale = () => {
    setScaleFactor(1);
    setScaleSource(null);
    setEditingIngIdx(null);
    setEditingServings(false);
  };

  const handleStepServings = (delta) => {
    const currentWhole = Math.max(1, Math.round(scaled.scaledServings));
    const nextServings = Math.max(1, currentWhole + delta);
    const ratio = nextServings / baseServings;
    setScaleFactor(ratio);
    setScaleSource({ type: 'servings', targetServings: nextServings });
    setEditingIngIdx(null);
  };

  const commitServingsInput = () => {
    setEditingServings(false);
    const parsed = parseDecimalInput(servingsInput);
    if (parsed !== null && parsed > 0) {
      const clamped = Math.max(0.5, parsed);
      setScaleFactor(clamped / baseServings);
      setScaleSource({ type: 'servings', targetServings: clamped });
    }
  };

  const startEditIngredient = (index, currentFormattedQty) => {
    setEditingIngIdx(index);
    setEditingValue(currentFormattedQty || '');
  };

  const commitIngredientEdit = (index) => {
    if (editingIngIdx !== index) return;
    const ing = scaled.scaledIngredients[index];
    setEditingIngIdx(null);
    if (!ing || ing.baseQuantity === null || ing.baseQuantity <= 0) return;

    const parsed = parseDecimalInput(editingValue);
    if (parsed === null || parsed <= 0) return;

    const newRatio = parsed / ing.baseQuantity;
    setScaleFactor(newRatio);
    setScaleSource({
      type: 'ingredient',
      ingredientIndex: index,
      ingredientName: ing.name,
      targetQuantity: parsed,
    });
  };

  if (!recipe) return null;

  return (
    <div className="space-y-6 pb-8">
      {/* Barre retour */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#EAE5DD] bg-white px-3.5 py-2 text-sm font-medium text-[#26211D] shadow-soft hover:bg-[#FAF8F5] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour</span>
        </button>

        <div className="flex items-center gap-2">
          {!isFrigoRecipe ? (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[#EAE5DD] bg-white px-3.5 py-2 text-sm font-medium text-[#26211D] shadow-soft hover:bg-[#FAF8F5] transition"
              >
                <Edit3 className="h-4 w-4 text-[#70675F]" />
                <span>Modifier</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-[#EAE5DD] bg-white px-3 py-2 text-[#70675F] shadow-soft hover:border-[#C85A32]/40 hover:text-[#C85A32] transition"
                aria-label="Supprimer la recette"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onSaveToPersonal(recipe)}
              disabled={alreadySavedToPersonal}
              className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-soft transition ${
                alreadySavedToPersonal
                  ? 'border-[#4A7C59]/30 bg-[#4A7C59]/10 text-[#4A7C59]'
                  : 'border-[#4A7C59] bg-[#4A7C59] text-white hover:bg-[#3d684a]'
              }`}
            >
              {alreadySavedToPersonal ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Enregistrée dans Mes recettes</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="h-4 w-4" />
                  <span>Enregistrer dans Mes recettes</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Carte en-tête recette */}
      <div className="overflow-hidden rounded-3xl border border-[#EAE5DD] bg-white shadow-soft">
        {recipe.photoUrl && (
          <div className="max-h-[340px] w-full overflow-hidden bg-[#F3EFE8]">
            <img
              src={recipe.photoUrl}
              alt={recipe.title}
              className="h-full max-h-[340px] w-full object-cover"
            />
          </div>
        )}

        <div className="p-5 sm:p-7 space-y-5">
          <div>
            <span className="inline-flex items-center rounded-full border border-[#C85A32]/20 bg-[#C85A32]/10 px-3 py-1 text-xs font-semibold text-[#C85A32]">
              {recipe.category}
            </span>
            <h1 className="mt-3 font-serif text-2xl sm:text-4xl font-semibold leading-tight text-[#26211D]">
              {recipe.title}
            </h1>
          </div>

          {/* Actions directes + sélecteur de personnes */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-t border-[#F3EFE8] pt-5">
            {/* Sélecteur personnes */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-[#70675F]">
                <Users className="h-4 w-4 text-[#C85A32]" />
                <span>Pour</span>
              </div>

              <div className="inline-flex items-center rounded-2xl border border-[#EAE5DD] bg-[#FAF8F5] p-1">
                <button
                  type="button"
                  onClick={() => handleStepServings(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#26211D] hover:bg-white transition"
                  aria-label="Diminuer le nombre de personnes"
                >
                  <Minus className="h-4 w-4" />
                </button>

                {editingServings ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={servingsInput}
                    onChange={(e) => setServingsInput(e.target.value)}
                    onBlur={commitServingsInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitServingsInput();
                      if (e.key === 'Escape') setEditingServings(false);
                    }}
                    className="w-14 bg-white rounded-lg text-center text-sm font-bold text-[#26211D] py-1 focus:outline-none ring-2 ring-[#C85A32]"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setServingsInput(scaled.formattedServings);
                      setEditingServings(true);
                    }}
                    className="min-w-[3.25rem] px-2 text-center text-sm font-bold text-[#26211D] hover:text-[#C85A32]"
                    title="Appuyez pour saisir le nombre de personnes"
                  >
                    {scaled.formattedServings}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleStepServings(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#26211D] hover:bg-white transition"
                  aria-label="Augmenter le nombre de personnes"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <span className="text-sm text-[#70675F]">
                personne{scaled.scaledServings > 1 ? 's' : ''}
              </span>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onOpenCookingMode(scaled)}
                className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-2 rounded-2xl bg-[#C85A32] px-5 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-[#AE4A26] transition"
              >
                <ChefHat className="h-4 w-4" />
                <span>Mode Cuisine</span>
              </button>

              <button
                type="button"
                onClick={() => setShowShoppingModal(true)}
                className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-2 rounded-2xl border border-[#4A7C59]/30 bg-[#4A7C59]/10 px-4 py-2.5 text-sm font-semibold text-[#4A7C59] hover:bg-[#4A7C59] hover:text-white transition"
              >
                <ShoppingBasket className="h-4 w-4" />
                <span>Ajouter aux courses</span>
              </button>
            </div>
          </div>

          {/* Bandeau discret d'ajustement proportionnel */}
          {isAdjusted && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C85A32]/25 bg-[#FAF8F5] px-4 py-3 text-sm">
              <span className="font-medium text-[#26211D]">
                {scaleSource?.type === 'ingredient'
                  ? `Quantités ajustées sur ${scaleSource.ingredientName} (×${formatRatio(scaleFactor)})`
                  : `Quantités ajustées pour ${scaled.formattedServings} personnes (×${formatRatio(scaleFactor)})`}
              </span>
              <button
                type="button"
                onClick={handleResetScale}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAE5DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#C85A32] hover:bg-[#C85A32]/5 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Réinitialiser</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Corps : Ingrédients + Étapes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne Ingrédients */}
        <section className="lg:col-span-5 rounded-3xl border border-[#EAE5DD] bg-white p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl font-semibold text-[#26211D]">
                Ingrédients
              </h2>
              <p className="mt-0.5 text-xs text-[#70675F]">
                Touchez une quantité pour tout recalculer proportionnellement
              </p>
            </div>
          </div>

          <ul className="divide-y divide-[#F3EFE8]">
            {scaled.scaledIngredients.map((ing, idx) => {
              const hasNumericQty = ing.baseQuantity !== null && ing.baseQuantity > 0;
              const isEditing = editingIngIdx === idx;
              const isPivot =
                scaleSource?.type === 'ingredient' &&
                scaleSource.ingredientIndex === idx &&
                isAdjusted;

              return (
                <li
                  key={`${ing.name}-${idx}`}
                  className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"
                >
                  <span className="text-sm sm:text-[15px] font-medium text-[#26211D]">
                    {ing.name}
                  </span>

                  <div className="shrink-0">
                    {hasNumericQty ? (
                      isEditing ? (
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="text"
                            inputMode="decimal"
                            autoFocus
                            value={editingValue}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => commitIngredientEdit(idx)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitIngredientEdit(idx);
                              }
                              if (e.key === 'Escape') {
                                setEditingIngIdx(null);
                              }
                            }}
                            aria-label={`Modifier quantité de ${ing.name}`}
                            className="w-20 rounded-xl border border-[#C85A32] bg-white px-2.5 py-1.5 text-right text-sm font-bold text-[#26211D] focus:outline-none ring-2 ring-[#C85A32]/20"
                          />
                          {ing.unit && (
                            <span className="text-xs font-medium text-[#70675F]">
                              {ing.unit}
                            </span>
                          )}
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => commitIngredientEdit(idx)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4A7C59] text-white"
                            aria-label="Valider"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditIngredient(idx, ing.formattedQuantity)}
                          title="Appuyez pour ajuster toute la recette sur cet ingrédient"
                          className={`group inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                            isPivot
                              ? 'border-[#C85A32] bg-[#C85A32]/10 text-[#C85A32]'
                              : 'border-[#EAE5DD] bg-[#FAF8F5] text-[#26211D] hover:border-[#C85A32]/50 hover:bg-[#C85A32]/5'
                          }`}
                        >
                          <span className="tabular-nums">{ing.formattedQuantity}</span>
                          {ing.unit && (
                            <span className="text-xs font-medium text-[#70675F]">
                              {ing.unit}
                            </span>
                          )}
                          <Pencil className="h-3 w-3 text-[#9A9087] opacity-70 group-hover:text-[#C85A32] group-hover:opacity-100" />
                        </button>
                      )
                    ) : (
                      <span className="text-xs font-medium italic text-[#70675F]">
                        {ing.unit ? ing.unit : 'selon goût'}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Colonne Étapes */}
        <section className="lg:col-span-7 rounded-3xl border border-[#EAE5DD] bg-white p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl font-semibold text-[#26211D]">
                Préparation
              </h2>
              <p className="mt-0.5 text-xs text-[#70675F]">
                Touchez une durée surlignée pour lancer le minuteur
              </p>
            </div>
          </div>

          <ol className="space-y-4">
            {(recipe.steps || []).map((stepText, idx) => {
              const segments = parseStepSegments(stepText);
              return (
                <li
                  key={idx}
                  className="flex items-start gap-3.5 rounded-2xl border border-[#F3EFE8] bg-[#FAF8F5]/70 p-4"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C85A32] text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <p className="text-sm sm:text-[15px] leading-relaxed text-[#26211D]">
                    {segments.map((seg, segIdx) =>
                      seg.type === 'duration' ? (
                        <button
                          key={segIdx}
                          type="button"
                          onClick={() =>
                            startTimer(
                              seg.seconds,
                              `${recipe.title} • ${seg.label}`
                            )
                          }
                          className="mx-0.5 inline-flex items-center gap-1 rounded-lg border border-[#C85A32]/30 bg-[#C85A32]/10 px-2 py-0.5 text-xs font-semibold text-[#C85A32] hover:bg-[#C85A32] hover:text-white transition align-baseline"
                        >
                          <Timer className="h-3 w-3" />
                          <span>{seg.label}</span>
                        </button>
                      ) : (
                        <React.Fragment key={segIdx}>{seg.value}</React.Fragment>
                      )
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      {/* Modale Ajouter aux courses */}
      <AddToShoppingModal
        open={showShoppingModal}
        recipeTitle={recipe.title}
        ingredients={scaled.scaledIngredients}
        onConfirm={(selected) => {
          onAddIngredientsToShopping(selected);
          setShowShoppingModal(false);
        }}
        onClose={() => setShowShoppingModal(false)}
      />

      {/* Modale confirmation suppression */}
      <ConfirmModal
        open={showDeleteConfirm}
        title="Supprimer cette recette ?"
        message={`Voulez-vous vraiment supprimer « ${recipe.title} » de votre carnet ?`}
        confirmLabel="Supprimer"
        danger
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete(recipe.id);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
