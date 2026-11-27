let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  return audioCtx;
}

export function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {
    // Ignore audio errors on restricted environments
  }
}

export function playTimerChime() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([220, 120, 220, 120, 320]);
    }

    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Suite douce de 3 notes (Do5 - Mi5 - Sol5) puis rappel léger
    const notes = [
      { freq: 523.25, start: 0.0, dur: 0.35, gain: 0.16 },
      { freq: 659.25, start: 0.22, dur: 0.35, gain: 0.18 },
      { freq: 783.99, start: 0.44, dur: 0.65, gain: 0.2 },
      { freq: 1046.5, start: 0.92, dur: 0.75, gain: 0.14 },
    ];

    notes.forEach(({ freq, start, dur, gain: peak }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gainNode.gain.setValueAtTime(0.0001, now + start);
      gainNode.gain.exponentialRampToValueAtTime(peak, now + start + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    });
  } catch {
    // Fallback visuel toujours affiché même si audio bloqué
  }
}
