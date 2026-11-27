import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { CATEGORIES, INGREDIENT_UNITS } from '../utils/constants.js';
import { compressImageFile } from '../utils/imageCompression.js';
import { canonicalUnit } from '../utils/normalize.js';
import { parseDecimalInput } from '../utils/scaling.js';

function emptyIngredient() {
  return { quantity: '', unit: 'g', name: '' };
}

export default function RecipeFormModal({
  open,
  initialRecipe = null,
  onSave,
  onClose,
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Plats');
  const [servings, setServings] = useState('4');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoBlob, setPhotoBlob] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [ingredients, setIngredients] = useState([
    emptyIngredient(),
    emptyIngredient(),
  ]);
  const [steps, setSteps] = useState(['', '']);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (initialRecipe) {
      setTitle(initialRecipe.title || '');
      setCategory(
        CATEGORIES.includes(initialRecipe.category) ? initialRecipe.category : 'Plats'
      );
      setServings(String(initialRecipe.servings || 4));
      setPhotoUrl(initialRecipe.photoUrl || '');
      setPhotoBlob(null);
      setIngredients(
        Array.isArray(initialRecipe.ingredients) && initialRecipe.ingredients.length > 0
          ? initialRecipe.ingredients.map((ing) => ({
              quantity:
                ing.quantity === null || ing.quantity === undefined
                  ? ''
                  : String(ing.quantity).replace('.', ','),
              unit: canonicalUnit(ing.unit || ''),
              name: ing.name || '',
            }))
          : [emptyIngredient()]
      );
      setSteps(
        Array.isArray(initialRecipe.steps) && initialRecipe.steps.length > 0
          ? [...initialRecipe.steps]
          : ['']
      );
    } else {
      setTitle('');
      setCategory('Plats');
      setServings('4');
      setPhotoUrl('');
      setPhotoBlob(null);
      setIngredients([emptyIngredient(), emptyIngredient()]);
      setSteps(['', '']);
    }
    setError('');
    setIsSaving(false);
  }, [open, initialRecipe]);

  if (!open) return null;

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setIsCompressing(true);
    try {
      const compressed = await compressImageFile(file, 1200, 0.78);
      setPhotoUrl(compressed.dataUrl);
      setPhotoBlob(compressed.blob);
    } catch (err) {
      setError(err.message || 'Impossible de traiter la photo.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleIngredientChange = (index, field, value) => {
    setIngredients((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const moveIngredient = (index, delta) => {
    setIngredients((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const removeIngredient = (index) => {
    setIngredients((prev) =>
      prev.length <= 1 ? [emptyIngredient()] : prev.filter((_, idx) => idx !== index)
    );
  };

  const handleStepChange = (index, value) => {
    setSteps((prev) => prev.map((s, idx) => (idx === index ? value : s)));
  };

  const moveStep = (index, delta) => {
    setSteps((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const removeStep = (index) => {
    setSteps((prev) => (prev.length <= 1 ? [''] : prev.filter((_, idx) => idx !== index)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Veuillez saisir un titre pour votre recette.');
      return;
    }

    const parsedServings = Math.max(1, Math.round(parseDecimalInput(servings) || 0));
    if (!parsedServings) {
      setError('Le nombre de personnes doit être supérieur ou égal à 1.');
      return;
    }

    const cleanIngredients = ingredients
      .map((ing) => {
        const name = ing.name.trim();
        if (!name) return null;
        const parsedQty =
          ing.quantity.trim() === '' ? null : parseDecimalInput(ing.quantity);
        if (ing.quantity.trim() !== '' && parsedQty === null) {
          throw new Error(`Quantité invalide pour « ${name} ».`);
        }
        return {
          quantity: parsedQty,
          unit: canonicalUnit(ing.unit || ''),
          name,
        };
      })
      .filter(Boolean);

    if (cleanIngredients.length === 0) {
      setError('Ajoutez au moins un ingrédient.');
      return;
    }

    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
    if (cleanSteps.length === 0) {
      setError('Ajoutez au moins une étape de préparation.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: initialRecipe?.id,
        title: cleanTitle,
        category,
        servings: parsedServings,
        photoUrl,
        photoBlob,
        ingredients: cleanIngredients,
        steps: cleanSteps,
        createdAt: initialRecipe?.createdAt,
      });
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde.');
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#26211D]/45 backdrop-blur-[2px] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-form-title"
    >
      <div className="flex max-h-[94dvh] w-full max-w-2xl flex-col rounded-t-3xl sm:rounded-3xl border border-[#EAE5DD] bg-[#FAF8F5] shadow-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE5DD] bg-white px-5 py-4 safe-top">
          <h2
            id="recipe-form-title"
            className="font-serif text-xl font-semibold text-[#26211D]"
          >
            {initialRecipe ? 'Modifier la recette' : 'Nouvelle recette'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#70675F] hover:bg-[#FAF8F5] hover:text-[#26211D]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulaire scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
          {error && (
            <div className="rounded-2xl border border-[#C85A32]/30 bg-[#C85A32]/10 px-4 py-3 text-sm font-medium text-[#AE4A26]">
              {error}
            </div>
          )}

          {/* Titre, catégorie, personnes */}
          <div className="rounded-2xl border border-[#EAE5DD] bg-white p-4 sm:p-5 space-y-4 shadow-soft">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#70675F] mb-1.5">
                Titre de la recette
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Tarte aux pommes rustique"
                className="w-full min-h-[46px] rounded-xl border border-[#EAE5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#26211D] focus:border-[#C85A32] focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#70675F] mb-1.5">
                  Catégorie
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`min-h-[42px] rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                        category === cat
                          ? 'border-[#C85A32] bg-[#C85A32] text-white'
                          : 'border-[#EAE5DD] bg-[#FAF8F5] text-[#70675F] hover:text-[#26211D]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#70675F] mb-1.5">
                  Nombre de personnes de base
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  inputMode="numeric"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-[#EAE5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#26211D] focus:border-[#C85A32] focus:bg-white focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Photo */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#70675F] mb-1.5">
                Photo (optionnel)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />

              {photoUrl ? (
                <div className="relative overflow-hidden rounded-2xl border border-[#EAE5DD] bg-[#F3EFE8]">
                  <img
                    src={photoUrl}
                    alt="Aperçu"
                    className="max-h-56 w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#26211D] shadow-soft"
                    >
                      Changer la photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUrl('');
                        setPhotoBlob(null);
                      }}
                      className="rounded-xl bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#C85A32] shadow-soft"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="flex w-full min-h-[54px] items-center justify-center gap-2.5 rounded-2xl border border-dashed border-[#D5CDC2] bg-[#FAF8F5] px-4 py-3 text-sm font-medium text-[#70675F] hover:border-[#C85A32] hover:text-[#C85A32] transition"
                >
                  {isCompressing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#C85A32]" />
                      <span>Compression automatique en cours...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 text-[#C85A32]" />
                      <span>Prendre une photo / Choisir dans la galerie</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Ingrédients structurés */}
          <div className="rounded-2xl border border-[#EAE5DD] bg-white p-4 sm:p-5 space-y-3 shadow-soft">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-semibold text-[#26211D]">
                Ingrédients
              </h3>
              <span className="text-xs text-[#70675F]">
                Laissez la quantité vide pour « selon goût »
              </span>
            </div>

            <div className="space-y-2.5">
              {ingredients.map((ing, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-xl border border-[#F3EFE8] bg-[#FAF8F5] p-2"
                >
                  <input
                    type="text"
                    inputMode="decimal"
                    value={ing.quantity}
                    onChange={(e) =>
                      handleIngredientChange(idx, 'quantity', e.target.value)
                    }
                    placeholder="Qté"
                    aria-label={`Quantité ingrédient ${idx + 1}`}
                    className="w-20 min-h-[40px] rounded-lg border border-[#EAE5DD] bg-white px-2.5 py-1.5 text-sm text-[#26211D] focus:border-[#C85A32] focus:outline-none"
                  />

                  <select
                    value={ing.unit}
                    onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                    aria-label={`Unité ingrédient ${idx + 1}`}
                    className="w-28 min-h-[40px] rounded-lg border border-[#EAE5DD] bg-white px-2 py-1.5 text-sm text-[#26211D] focus:border-[#C85A32] focus:outline-none"
                  >
                    {INGREDIENT_UNITS.map((u) => (
                      <option key={u || 'none'} value={u}>
                        {u || '(sans unité)'}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                    placeholder="Nom de l'ingrédient"
                    aria-label={`Nom ingrédient ${idx + 1}`}
                    className="flex-1 min-w-[140px] min-h-[40px] rounded-lg border border-[#EAE5DD] bg-white px-3 py-1.5 text-sm text-[#26211D] focus:border-[#C85A32] focus:outline-none"
                  />

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      type="button"
                      onClick={() => moveIngredient(idx, -1)}
                      disabled={idx === 0}
                      className="rounded-lg p-1.5 text-[#70675F] hover:bg-white disabled:opacity-30"
                      aria-label="Monter"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveIngredient(idx, 1)}
                      disabled={idx === ingredients.length - 1}
                      className="rounded-lg p-1.5 text-[#70675F] hover:bg-white disabled:opacity-30"
                      aria-label="Descendre"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeIngredient(idx)}
                      className="rounded-lg p-1.5 text-[#70675F] hover:bg-[#C85A32]/10 hover:text-[#C85A32]"
                      aria-label="Supprimer cet ingrédient"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIngredients((prev) => [...prev, emptyIngredient()])}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#EAE5DD] bg-[#FAF8F5] px-3.5 py-2 text-xs font-semibold text-[#C85A32] hover:bg-[#F3EFE8] transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ajouter un ingrédient</span>
            </button>
          </div>

          {/* Étapes */}
          <div className="rounded-2xl border border-[#EAE5DD] bg-white p-4 sm:p-5 space-y-3 shadow-soft">
            <div>
              <h3 className="font-serif text-base font-semibold text-[#26211D]">
                Étapes de préparation
              </h3>
              <p className="mt-0.5 text-xs text-[#70675F]">
                Indiquez vos temps directement dans le texte (ex : 15 min) pour lancer le minuteur en un tap.
              </p>
            </div>

            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 rounded-xl border border-[#F3EFE8] bg-[#FAF8F5] p-2.5"
                >
                  <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C85A32] text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <textarea
                    rows={2}
                    value={step}
                    onChange={(e) => handleStepChange(idx, e.target.value)}
                    placeholder={`Décrivez l'étape ${idx + 1}...`}
                    className="flex-1 rounded-lg border border-[#EAE5DD] bg-white px-3 py-2 text-sm text-[#26211D] focus:border-[#C85A32] focus:outline-none"
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveStep(idx, -1)}
                      disabled={idx === 0}
                      className="rounded-lg p-1 text-[#70675F] hover:bg-white disabled:opacity-30"
                      aria-label="Monter l'étape"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(idx, 1)}
                      disabled={idx === steps.length - 1}
                      className="rounded-lg p-1 text-[#70675F] hover:bg-white disabled:opacity-30"
                      aria-label="Descendre l'étape"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="rounded-lg p-1 text-[#70675F] hover:bg-[#C85A32]/10 hover:text-[#C85A32]"
                      aria-label="Supprimer l'étape"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSteps((prev) => [...prev, ''])}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#EAE5DD] bg-[#FAF8F5] px-3.5 py-2 text-xs font-semibold text-[#C85A32] hover:bg-[#F3EFE8] transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ajouter une étape</span>
            </button>
          </div>
        </form>

        {/* Footer actions */}
        <div
          className="flex items-center justify-end gap-3 border-t border-[#EAE5DD] bg-white px-5 py-3.5"
          style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-[#EAE5DD] bg-white px-4 py-2 text-sm font-medium text-[#26211D] hover:bg-[#FAF8F5]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || isCompressing}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#C85A32] px-5 py-2 text-sm font-semibold text-white hover:bg-[#AE4A26] disabled:opacity-60 transition"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{initialRecipe ? 'Enregistrer' : 'Créer la recette'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
