import React, { useState } from 'react';
import {
  Check,
  ChefHat,
  ListChecks,
  Sun,
  Timer,
  X,
} from 'lucide-react';
import { useTimer } from '../context/TimerContext.jsx';
import { useWakeLock } from '../hooks/useWakeLock.js';
import { parseStepSegments } from '../utils/durationParser.js';

export default function CookingMode({ recipe, scaled, onClose }) {
  const { startTimer } = useTimer();
  const { isActive: wakeLockActive } = useWakeLock(true);

  const [completedSteps, setCompletedSteps] = useState({});
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const [showIngredientsDrawer, setShowIngredientsDrawer] = useState(false);

  if (!recipe || !scaled) return null;

  const steps = recipe.steps || [];
  const doneCount = steps.filter((_, idx) => completedSteps[idx]).length;
  const progressPercent = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#FAF8F5] text-[#26211D]"
      role="dialog"
      aria-modal="true"
      aria-label={`Mode Cuisine - ${recipe.title}`}
    >
      {/* Barre supérieure */}
      <header
        className="border-b border-[#EAE5DD] bg-white px-4 sm:px-6 py-3.5 shadow-soft"
        style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top))' }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C85A32] text-white">
              <ChefHat className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-serif text-lg sm:text-xl font-semibold text-[#26211D]">
                {recipe.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#70675F]">
                <span>{scaled.formattedServings} pers.</span>
                {wakeLockActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#4A7C59]/10 px-2 py-0.5 font-medium text-[#4A7C59]">
                    <Sun className="h-3 w-3" />
                    <span>Écran maintenu allumé</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowIngredientsDrawer((prev) => !prev)}
              className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                showIngredientsDrawer
                  ? 'border-[#C85A32] bg-[#C85A32] text-white'
                  : 'border-[#EAE5DD] bg-[#FAF8F5] text-[#26211D] hover:border-[#C85A32]/40'
              }`}
            >
              <ListChecks className="h-4 w-4" />
              <span>Ingrédients</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-[#EAE5DD] bg-white text-[#26211D] hover:bg-[#FAF8F5]"
              aria-label="Quitter le Mode Cuisine"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mx-auto mt-3 max-w-4xl">
          <div className="flex items-center justify-between text-xs font-medium text-[#70675F] mb-1">
            <span>Progression</span>
            <span>
              {doneCount} / {steps.length} étapes
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3EFE8]">
            <div
              className="h-full rounded-full bg-[#4A7C59] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Tiroir rapide Ingrédients */}
      {showIngredientsDrawer && (
        <div className="border-b border-[#EAE5DD] bg-white/95 px-4 sm:px-6 py-4 shadow-soft max-h-[44dvh] overflow-y-auto">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-base font-semibold text-[#26211D]">
                Ingrédients ({scaled.formattedServings} pers.)
              </h2>
              <button
                type="button"
                onClick={() => setShowIngredientsDrawer(false)}
                className="text-xs font-semibold text-[#C85A32]"
              >
                Masquer
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {scaled.scaledIngredients.map((ing, idx) => {
                const checked = Boolean(checkedIngredients[idx]);
                return (
                  <button
                    key={`${ing.name}-${idx}`}
                    type="button"
                    onClick={() =>
                      setCheckedIngredients((prev) => ({
                        ...prev,
                        [idx]: !prev[idx],
                      }))
                    }
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition ${
                      checked
                        ? 'border-[#4A7C59]/30 bg-[#4A7C59]/10 text-[#70675F] line-through'
                        : 'border-[#EAE5DD] bg-[#FAF8F5] text-[#26211D]'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? 'border-[#4A7C59] bg-[#4A7C59] text-white'
                            : 'border-[#D5CDC2] bg-white text-transparent'
                        }`}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span>{ing.name}</span>
                    </span>
                    {(ing.formattedQuantity || ing.unit) && (
                      <span className="shrink-0 text-xs font-semibold tabular-nums">
                        {ing.formattedQuantity} {ing.unit}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Étapes grand format */}
      <main
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
        style={{ paddingBottom: 'max(5.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {steps.map((stepText, idx) => {
            const isDone = Boolean(completedSteps[idx]);
            const segments = parseStepSegments(stepText);
            return (
              <div
                key={idx}
                className={`rounded-3xl border p-5 sm:p-6 transition-all ${
                  isDone
                    ? 'border-[#4A7C59]/30 bg-[#4A7C59]/5 opacity-75'
                    : 'border-[#EAE5DD] bg-white shadow-soft'
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setCompletedSteps((prev) => ({
                        ...prev,
                        [idx]: !prev[idx],
                      }))
                    }
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-bold transition ${
                      isDone
                        ? 'border-[#4A7C59] bg-[#4A7C59] text-white'
                        : 'border-[#C85A32] bg-[#FAF8F5] text-[#C85A32]'
                    }`}
                    aria-label={isDone ? `Étape ${idx + 1} terminée` : `Marquer l'étape ${idx + 1} comme terminée`}
                  >
                    {isDone ? <Check className="h-5 w-5" strokeWidth={3} /> : idx + 1}
                  </button>

                  <div className="flex-1">
                    <p
                      className={`text-lg sm:text-xl leading-relaxed font-medium ${
                        isDone ? 'line-through text-[#70675F]' : 'text-[#26211D]'
                      }`}
                    >
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
                            className="mx-1 inline-flex items-center gap-1.5 rounded-xl border border-[#C85A32]/35 bg-[#C85A32]/10 px-3 py-1 text-base font-bold text-[#C85A32] hover:bg-[#C85A32] hover:text-white transition align-baseline"
                          >
                            <Timer className="h-4 w-4" />
                            <span>{seg.label}</span>
                          </button>
                        ) : (
                          <React.Fragment key={segIdx}>{seg.value}</React.Fragment>
                        )
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
