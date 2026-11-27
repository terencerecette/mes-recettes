import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[#26211D]/40 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#EAE5DD] shadow-card overflow-hidden animate-in fade-in duration-150">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {danger && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C85A32]/10 text-[#C85A32]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              )}
              <h3
                id="confirm-modal-title"
                className="font-serif text-lg font-semibold text-[#26211D]"
              >
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg p-1.5 text-[#70675F] hover:bg-[#FAF8F5] hover:text-[#26211D]"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {message && (
            <p className="mt-3 text-sm leading-relaxed text-[#70675F]">{message}</p>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 border-t border-[#EAE5DD] bg-[#FAF8F5] px-5 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded-xl border border-[#EAE5DD] bg-white px-4 py-2 text-sm font-medium text-[#26211D] hover:bg-[#F3EFE8] transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
              danger
                ? 'bg-[#C85A32] hover:bg-[#AE4A26]'
                : 'bg-[#4A7C59] hover:bg-[#3d684a]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
