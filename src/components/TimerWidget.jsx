import React, { useState } from 'react';
import { BellRing, Pause, Play, Plus, RotateCcw, Timer, Trash2, X } from 'lucide-react';
import { useTimer } from '../context/TimerContext.jsx';
import { formatTimerDisplay } from '../utils/durationParser.js';

const PRESETS = [
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
];

export default function TimerWidget({ showTriggerButton = false }) {
  const {
    initialSeconds,
    remainingSeconds,
    isRunning,
    isFinished,
    label,
    isOpen,
    hasTimer,
    setOpen,
    startTimer,
    togglePause,
    addMinute,
    resetTimer,
    clearTimer,
    dismissFinished,
  } = useTimer();

  const [customMinutes, setCustomMinutes] = useState('10');
  const [customSeconds, setCustomSeconds] = useState('0');

  const shouldShowButton = showTriggerButton || hasTimer;
  if (!shouldShowButton && !isOpen) return null;

  const progress =
    initialSeconds > 0
      ? Math.max(0, Math.min(1, remainingSeconds / initialSeconds))
      : 0;

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const mins = Math.max(0, parseInt(customMinutes || '0', 10) || 0);
    const secs = Math.max(0, parseInt(customSeconds || '0', 10) || 0);
    const total = mins * 60 + secs;
    if (total > 0) {
      startTimer(total, 'Minuteur personnalisé');
    }
  };

  return (
    <>
      {/* Bouton flottant discret */}
      {shouldShowButton && !isOpen && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`fixed right-4 z-40 flex items-center gap-2 rounded-full border px-4 py-2.5 shadow-card transition-all active:scale-95 ${
            isFinished
              ? 'animate-bounce border-[#C85A32] bg-[#C85A32] text-white'
              : isRunning
                ? 'border-[#C85A32]/30 bg-white text-[#C85A32]'
                : 'border-[#EAE5DD] bg-white text-[#26211D] hover:border-[#C85A32]/40'
          } bottom-24 md:bottom-6`}
          style={{
            marginBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          aria-label="Ouvrir le minuteur"
        >
          {isFinished ? (
            <BellRing className="h-4 w-4" />
          ) : (
            <Timer className="h-4 w-4 text-[#C85A32]" />
          )}
          <span className="font-mono text-sm font-semibold tabular-nums">
            {hasTimer ? (isFinished ? 'Terminé !' : formatTimerDisplay(remainingSeconds)) : 'Minuteur'}
          </span>
        </button>
      )}

      {/* Tiroir / Panneau Minuteur */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:right-5 sm:bottom-5 z-[60] sm:w-[360px]">
          <div
            className="rounded-t-3xl sm:rounded-3xl border border-[#EAE5DD] bg-white shadow-card overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* En-tête */}
            <div className="flex items-center justify-between border-b border-[#EAE5DD] bg-[#FAF8F5] px-5 py-3.5">
              <div className="flex items-center gap-2 min-w-0">
                <Timer className="h-4 w-4 shrink-0 text-[#C85A32]" />
                <span className="truncate text-sm font-semibold text-[#26211D]">
                  {label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-[#70675F] hover:bg-white hover:text-[#26211D]"
                aria-label="Réduire le minuteur"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Alerte temps écoulé */}
              {isFinished && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#C85A32]/30 bg-[#C85A32]/10 px-4 py-3 text-[#AE4A26]">
                  <div className="flex items-center gap-2.5">
                    <BellRing className="h-5 w-5 shrink-0 text-[#C85A32]" />
                    <span className="text-sm font-semibold">Temps écoulé !</span>
                  </div>
                  <button
                    type="button"
                    onClick={dismissFinished}
                    className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-[#C85A32] border border-[#C85A32]/20"
                  >
                    OK
                  </button>
                </div>
              )}

              {/* Affichage principal */}
              {hasTimer ? (
                <div className="text-center space-y-4">
                  <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="#F3EFE8"
                        strokeWidth="8"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke={isFinished ? '#4A7C59' : '#C85A32'}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 52}
                        strokeDashoffset={2 * Math.PI * 52 * (1 - progress)}
                        className="transition-all duration-300"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-mono text-3xl font-bold tracking-tight text-[#26211D] tabular-nums">
                        {formatTimerDisplay(remainingSeconds)}
                      </span>
                      <span className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[#70675F]">
                        {isFinished ? 'Terminé' : isRunning ? 'En cours' : 'En pause'}
                      </span>
                    </div>
                  </div>

                  {/* Commandes */}
                  <div className="flex items-center justify-center gap-2.5">
                    {!isFinished && (
                      <button
                        type="button"
                        onClick={togglePause}
                        className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#C85A32] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#AE4A26] transition"
                      >
                        {isRunning ? (
                          <>
                            <Pause className="h-4 w-4" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            <span>Démarrer</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={addMinute}
                      className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-[#EAE5DD] bg-[#FAF8F5] px-3.5 py-2.5 text-sm font-semibold text-[#26211D] hover:bg-[#F3EFE8] transition"
                    >
                      <Plus className="h-4 w-4" />
                      <span>1 min</span>
                    </button>

                    <button
                      type="button"
                      onClick={resetTimer}
                      className="flex min-h-[44px] items-center justify-center rounded-xl border border-[#EAE5DD] bg-white px-3 text-[#70675F] hover:bg-[#FAF8F5] hover:text-[#26211D] transition"
                      title="Réinitialiser"
                      aria-label="Réinitialiser le minuteur"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={clearTimer}
                      className="flex min-h-[44px] items-center justify-center rounded-xl border border-[#EAE5DD] bg-white px-3 text-[#70675F] hover:bg-[#C85A32]/10 hover:text-[#C85A32] transition"
                      title="Effacer"
                      aria-label="Effacer le minuteur"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-1">
                  <p className="text-sm text-[#70675F]">
                    Choisissez une durée rapide ou entrez votre temps ci-dessous.
                  </p>
                </div>
              )}

              {/* Raccourcis & saisie libre */}
              <div className="space-y-3 border-t border-[#EAE5DD] pt-4">
                <div className="grid grid-cols-4 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => startTimer(preset.seconds, `Minuteur (${preset.label})`)}
                      className="min-h-[38px] rounded-xl border border-[#EAE5DD] bg-[#FAF8F5] px-2 py-1.5 text-xs font-semibold text-[#26211D] hover:border-[#C85A32]/40 hover:bg-[#C85A32]/5 transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleCustomSubmit} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-[#70675F] mb-1">
                      Min
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      inputMode="numeric"
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(e.target.value)}
                      className="w-full min-h-[42px] rounded-xl border border-[#EAE5DD] bg-[#FAF8F5] px-3 py-1.5 text-sm text-[#26211D] focus:border-[#C85A32] focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-[#70675F] mb-1">
                      Sec
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      inputMode="numeric"
                      value={customSeconds}
                      onChange={(e) => setCustomSeconds(e.target.value)}
                      className="w-full min-h-[42px] rounded-xl border border-[#EAE5DD] bg-[#FAF8F5] px-3 py-1.5 text-sm text-[#26211D] focus:border-[#C85A32] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="min-h-[42px] rounded-xl bg-[#4A7C59] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3d684a] transition"
                  >
                    Lancer
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
