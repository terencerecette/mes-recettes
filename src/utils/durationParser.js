// Détection des durées naturelles en français dans le texte des étapes de recette.

const DURATION_REGEX = new RegExp(
  [
    // 1. Heures + minutes : "1 h 10", "1h30", "1 h 15 min", "2 heures 20"
    '(?:\\b(\\d+(?:[.,]\\d+)?)\\s*(?:heures?|h)\\s*(\\d{1,2})(?:\\s*(?:minutes?|min|mn))?\\b)',
    // 2. Plage en heures : "1 à 2 heures", "1-2 h"
    '(?:\\b(\\d+(?:[.,]\\d+)?)\\s*(?:à|-)\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:heures?|h)\\b)',
    // 3. Plage en minutes : "15 à 20 min", "10-15 minutes"
    '(?:\\b(\\d+(?:[.,]\\d+)?)\\s*(?:à|-)\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:minutes?|min|mn)\\b)',
    // 4. Minutes + secondes : "1 min 30", "2 min 30 sec"
    '(?:\\b(\\d+)\\s*(?:minutes?|min|mn)\\s*(\\d{1,2})(?:\\s*(?:secondes?|sec|s))?\\b)',
    // 5. Heures simples : "1 h", "2 heures", "1,5 h"
    '(?:\\b(\\d+(?:[.,]\\d+)?)\\s*(?:heures?|h)\\b)',
    // 6. Minutes simples : "15 min", "20 minutes", "5 mn"
    '(?:\\b(\\d+(?:[.,]\\d+)?)\\s*(?:minutes?|min|mn)\\b)',
    // 7. Secondes simples : "30 sec", "45 secondes", "30 s"
    '(?:\\b(\\d+(?:[.,]\\d+)?)\\s*(?:secondes?|sec|s)\\b)',
  ].join('|'),
  'gi'
);

function toNumber(val) {
  return Number(String(val).replace(',', '.'));
}

function computeSecondsFromMatch(match) {
  if (match[1] !== undefined && match[2] !== undefined) {
    // Heures + minutes
    return Math.round(toNumber(match[1]) * 3600 + Number(match[2]) * 60);
  }
  if (match[3] !== undefined && match[4] !== undefined) {
    // Plage en heures -> borne basse
    return Math.round(toNumber(match[3]) * 3600);
  }
  if (match[5] !== undefined && match[6] !== undefined) {
    // Plage en minutes -> borne basse
    return Math.round(toNumber(match[5]) * 60);
  }
  if (match[7] !== undefined && match[8] !== undefined) {
    // Minutes + secondes
    return Math.round(Number(match[7]) * 60 + Number(match[8]));
  }
  if (match[9] !== undefined) {
    // Heures simples
    return Math.round(toNumber(match[9]) * 3600);
  }
  if (match[10] !== undefined) {
    // Minutes simples
    return Math.round(toNumber(match[10]) * 60);
  }
  if (match[11] !== undefined) {
    // Secondes simples
    return Math.round(toNumber(match[11]));
  }
  return 0;
}

export function parseStepSegments(text) {
  if (typeof text !== 'string' || !text) {
    return [{ type: 'text', value: '' }];
  }

  const segments = [];
  let lastIndex = 0;
  DURATION_REGEX.lastIndex = 0;

  let match;
  while ((match = DURATION_REGEX.exec(text)) !== null) {
    const start = match.index;
    const end = DURATION_REGEX.lastIndex;
    const seconds = computeSecondsFromMatch(match);

    if (seconds <= 0) continue;

    if (start > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, start) });
    }
    segments.push({
      type: 'duration',
      label: match[0],
      seconds,
    });
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }];
}

export function formatTimerDisplay(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
