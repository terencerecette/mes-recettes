import React, { useEffect, useState } from 'react';
import { Check, ShoppingBasket, X } from 'lucide-react';

export default function AddToShoppingModal({
  open,
  recipeTitle,
  ingredients,
  onConfirm,
  onClose,
}) {
  const [checkedMap, setCheckedMap] = useState({});

  useEffect(() => {
    if (!open) return;
    const initial = {};
    (ingredients || []).forEach((_, idx) => {
      initial[idx] = true;
    });
    setCheckedMap(initial);
  }, [open, ingredients]);

  if (!open) return null;

  const list = ingredients || [];
  const selectedCount = list.filter((_, idx) => checkedMap[idx]).length;
  const allSelected = list.length > 0 && selectedCount === list.length;

  const toggleAll = () => {
    const next = {};
    list.forEach((_, idx) => {
      next[idx] = !allSelected;
    });
    setCheckedMap(next);
  };

  const handleConfirm = () => {
    const chosen = list
      .filter((_, idx) => checkedMap[idx])
      .map((ing) => ({
        name: ing.name,
        quantity: ing.scaledQuantity ?? ing.quantity ?? null,
        unit: ing.unit || '',
      }));
    onConfirm(chosen);
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-[#26211D]/45 backdrop-blur-[2px] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shopping-modal-title"
    >
      <div className="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl border border-[#EAE5DD] bg-white shadow-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#EAE5DD] bg-[#FAF8F5] px-5 py-4">
          <div className="min-w-0">
            <h3
              id="shopping-modal-title"
              className="font-serif text-lg font-semibold text-[#26211D]"
            >
              Ajouter aux courses
            </h3>
            <p className="truncate text-xs text-[#70675F]">{recipeTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#70675F] hover:bg-white hover:text-[#26211D]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-[#F3EFE8] px-5 py-2.5 text-xs">
          <span className="text-[#70675F]">
            Décochez ce que vous avez déjà chez vous
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="font-semibold text-[#C85A32] hover:underline"
          >
            {allSelected ? 'Tout décocher' : 'Tout cocher'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 divide-y divide-[#F3EFE8]">
          {list.map((ing, idx) => {
            const isChecked = Boolean(checkedMap[idx]);
            return (
              <label
                key={`${ing.name}-${idx}`}
                className="flex min-h-[48px] cursor-pointer items-center justify-between gap-3 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() =>
                      setCheckedMap((prev) => ({ ...prev, [idx]: !prev[idx] }))
                    }
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
                      isChecked
                        ? 'border-[#4A7C59] bg-[#4A7C59] text-white'
                        : 'border-[#D5CDC2] bg-white text-transparent'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                  <span
                    className={`text-sm font-medium ${
                      isChecked ? 'text-[#26211D]' : 'text-[#9A9087] line-through'
                    }`}
                  >
                    {ing.name}
                  </span>
                </div>

                {(ing.formattedQuantity || ing.unit) && (
                  <span className="shrink-0 text-xs font-semibold text-[#70675F] tabular-nums">
                    {ing.formattedQuantity} {ing.unit}
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <div
          className="flex items-center justify-end gap-3 border-t border-[#EAE5DD] bg-[#FAF8F5] px-5 py-3.5"
          style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-[#EAE5DD] bg-white px-4 py-2 text-sm font-medium text-[#26211D]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#4A7C59] px-5 py-2 text-sm font-semibold text-white hover:bg-[#3d684a] disabled:opacity-50 transition"
          >
            <ShoppingBasket className="h-4 w-4" />
            <span>Ajouter ({selectedCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
