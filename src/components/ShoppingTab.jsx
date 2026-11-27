import React, { useMemo, useState } from 'react';
import {
  Check,
  Plus,
  ShoppingBasket,
  Trash2,
} from 'lucide-react';
import { formatQuantity } from '../utils/scaling.js';
import { parseManualShoppingInput } from '../utils/shoppingMerge.js';
import ConfirmModal from './ConfirmModal.jsx';

export default function ShoppingTab({
  items,
  onAddManual,
  onToggleItem,
  onDeleteItem,
  onClearChecked,
  onClearAll,
}) {
  const [quickInput, setQuickInput] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const { uncheckedItems, checkedItems } = useMemo(() => {
    const unchecked = [];
    const checked = [];
    for (const item of items) {
      if (item.checked) checked.push(item);
      else unchecked.push(item);
    }
    return { uncheckedItems: unchecked, checkedItems: checked };
  }, [items]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = parseManualShoppingInput(quickInput);
    if (!parsed) return;
    onAddManual(parsed);
    setQuickInput('');
  };

  const renderItemRow = (item) => {
    const formattedQty = formatQuantity(item.quantity, item.unit);
    return (
      <div
        key={item.id}
        className={`flex min-h-[54px] items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 transition ${
          item.checked
            ? 'border-[#F3EFE8] bg-[#FAF8F5] opacity-70'
            : 'border-[#EAE5DD] bg-white shadow-soft'
        }`}
      >
        <button
          type="button"
          onClick={() => onToggleItem(item.id)}
          className="flex flex-1 items-center gap-3.5 text-left min-w-0 py-1"
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
              item.checked
                ? 'border-[#4A7C59] bg-[#4A7C59] text-white'
                : 'border-[#D5CDC2] bg-white text-transparent'
            }`}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>

          <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 min-w-0">
            <span
              className={`text-sm sm:text-[15px] font-medium ${
                item.checked ? 'line-through text-[#70675F]' : 'text-[#26211D]'
              }`}
            >
              {item.name}
            </span>

            {(formattedQty || item.unit) && (
              <span className="text-xs font-semibold text-[#C85A32] tabular-nums">
                {formattedQty} {item.unit}
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onDeleteItem(item.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#9A9087] hover:bg-[#C85A32]/10 hover:text-[#C85A32] transition"
          aria-label={`Supprimer ${item.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[#26211D]">
            Liste de courses
          </h2>
          <p className="mt-1 text-sm text-[#70675F]">
            {uncheckedItems.length === 0 && checkedItems.length === 0
              ? 'Aucun article pour le moment'
              : `${uncheckedItems.length} à acheter • ${checkedItems.length} dans le panier`}
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {checkedItems.length > 0 && (
              <button
                type="button"
                onClick={onClearChecked}
                className="min-h-[40px] rounded-xl border border-[#EAE5DD] bg-white px-3.5 py-2 text-xs font-semibold text-[#4A7C59] shadow-soft hover:bg-[#4A7C59]/10 transition"
              >
                Effacer les articles cochés ({checkedItems.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="min-h-[40px] rounded-xl border border-[#EAE5DD] bg-white px-3.5 py-2 text-xs font-semibold text-[#C85A32] shadow-soft hover:bg-[#C85A32]/10 transition"
            >
              Tout vider
            </button>
          </div>
        )}
      </div>

      {/* Champ d'ajout manuel rapide */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2.5 rounded-3xl border border-[#EAE5DD] bg-white p-3 shadow-soft"
      >
        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          placeholder="Ajout rapide (ex : Essuie-tout, 2 bananes, 500 g farine)..."
          aria-label="Ajouter un article aux courses"
          className="flex-1 min-h-[44px] rounded-2xl border border-[#EAE5DD] bg-[#FAF8F5] px-4 py-2 text-sm text-[#26211D] placeholder:text-[#9A9087] focus:border-[#C85A32] focus:bg-white focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-[#C85A32] px-4 sm:px-5 py-2 text-sm font-semibold text-white hover:bg-[#AE4A26] transition"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ajouter</span>
        </button>
      </form>

      {/* Liste */}
      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#EAE5DD] bg-white px-6 py-12 text-center shadow-soft">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF8F5] text-[#C85A32]">
            <ShoppingBasket className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-serif text-lg font-semibold text-[#26211D]">
            Votre liste de courses est vide
          </h3>
          <p className="mt-1.5 text-sm text-[#70675F] max-w-md mx-auto">
            Ajoutez des articles manuellement ci-dessus ou cliquez sur « Ajouter aux courses » depuis n’importe quelle recette.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {uncheckedItems.length > 0 && (
            <div className="space-y-2">
              {uncheckedItems.map(renderItemRow)}
            </div>
          )}

          {checkedItems.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#70675F] px-1">
                Déjà dans le panier ({checkedItems.length})
              </p>
              {checkedItems.map(renderItemRow)}
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmClearAll}
        title="Vider toute la liste de courses ?"
        message="Tous les articles cochés et non cochés seront supprimés."
        confirmLabel="Tout vider"
        danger
        onConfirm={() => {
          setConfirmClearAll(false);
          onClearAll();
        }}
        onCancel={() => setConfirmClearAll(false)}
      />
    </div>
  );
}
