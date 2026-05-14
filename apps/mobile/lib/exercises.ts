/**
 * Exercise catalog from Supabase (via API). Used to attach video_url + coaching copy to plan activities.
 *
 * Alternative (direct Supabase from the app, same RLS as migration 007):
 *   const { data } = await supabase
 *     .from('exercises')
 *     .select('id, exercise_key, name, phase, body_area, video_url, sets_reps, why_this_helps')
 *     .or(`body_area.eq.${bodyArea},body_area.is.null`)
 *     .order('phase');
 */

import { apiFetch } from './api-fetch';
export type ExerciseCatalogRow = {
  id: string;
  exercise_key: string;
  name: string;
  phase: number;
  body_area: string | null;
  video_url: string;
  sets_reps: string;
  why_this_helps: string;
};

function normalizeActivityText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Pick the best catalog row for a free-text activity from the plan JSON.
 */
export function matchCatalogExercise(
  activityText: string,
  catalog: ExerciseCatalogRow[]
): ExerciseCatalogRow | undefined {
  const n = normalizeActivityText(activityText);
  if (!n) return undefined;

  let best: ExerciseCatalogRow | undefined;
  let bestScore = 0;

  for (const ex of catalog) {
    const nameN = normalizeActivityText(ex.name);
    const keyPhrase = ex.exercise_key.toLowerCase().replace(/_/g, ' ');

    let score = 0;
    if (n === nameN) score = 100;
    else if (n.includes(nameN) && nameN.length >= 4) score = 80;
    else if (nameN.length >= 4 && nameN.split(' ').every((w) => w.length > 2 && n.includes(w)))
      score = 70;
    else if (keyPhrase.length >= 4 && n.includes(keyPhrase)) score = 65;
    else if (keyPhrase.split(' ').every((w) => w.length > 2 && n.includes(w))) score = 60;

    if (score > bestScore) {
      bestScore = score;
      best = ex;
    }
  }

  return bestScore >= 60 ? best : undefined;
}

export function groupCatalogByPhase(catalog: ExerciseCatalogRow[]) {
  const map: Record<1 | 2 | 3, ExerciseCatalogRow[]> = { 1: [], 2: [], 3: [] };
  for (const row of catalog) {
    const p = row.phase as 1 | 2 | 3;
    if (p === 1 || p === 2 || p === 3) map[p].push(row);
  }
  return map;
}

export async function fetchExerciseCatalog(opts?: {
  body_area?: string;
  phase?: number;
}): Promise<ExerciseCatalogRow[]> {
  const params = new URLSearchParams();
  if (opts?.body_area) params.set('body_area', opts.body_area);
  if (opts?.phase != null) params.set('phase', String(opts.phase));

  const q = params.toString();
  const path = `/exercises${q ? `?${q}` : ''}`;

  const response = await apiFetch(path, { method: 'GET' });

  if (!response.ok) {
    console.warn('[exercises] fetch failed', response.status);
    return [];
  }

  const data = await response.json();
  return Array.isArray(data.exercises) ? data.exercises : [];
}

const DEFAULT_WHY =
  'This move supports recovery by improving control and blood flow in the area — stay in a range that feels workable, not sharp.';

export type ResolvedExerciseDemo = {
  displayName: string;
  whyThisHelps: string;
  setsReps: string;
  videoSource: { uri: string } | number | null;
  catalogRow?: ExerciseCatalogRow;
};

const DEFAULT_INSTRUCTION_BULLETS = [
  'Move slowly and keep the motion smooth and controlled.',
  'Stay in a range that feels workable — mild effort is OK, sharp pain is not.',
  'Exhale on the harder part of the motion if that feels natural.',
  'If you need a break, pause and reset before the next rep.',
];

/**
 * Build 3–5 short bullets from plan activity text, padded with sensible defaults.
 */
export function buildInstructionsForActivity(activityText: string): string[] {
  const segments = activityText
    .split(/[;.]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
  if (segments.length >= 3) return segments.slice(0, 5);
  if (segments.length === 2) {
    return [...segments, ...DEFAULT_INSTRUCTION_BULLETS.slice(0, 3)].slice(0, 5);
  }
  if (segments.length === 1) {
    return [segments[0], ...DEFAULT_INSTRUCTION_BULLETS.slice(0, 4)].slice(0, 5);
  }
  return [...DEFAULT_INSTRUCTION_BULLETS].slice(0, 4);
}

/** One sentence for compact exercise cards (first sentence or trim). */
export function whyThisHelpsOneLine(text: string, maxLen = 120): string {
  const t = text.trim();
  if (!t) return '';
  const dot = t.indexOf('.');
  if (dot > 0 && dot + 1 <= maxLen) return t.slice(0, dot + 1).trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trim()}…`;
}

export function resolveExerciseForPlanActivity(
  activityText: string,
  catalog: ExerciseCatalogRow[],
  localAssetSource?: number
): ResolvedExerciseDemo {
  const row = matchCatalogExercise(activityText, catalog);
  if (row?.video_url) {
    return {
      displayName: row.name,
      whyThisHelps: row.why_this_helps?.trim() ? row.why_this_helps : DEFAULT_WHY,
      setsReps: row.sets_reps?.trim() ? row.sets_reps : 'As in your plan',
      videoSource: { uri: row.video_url },
      catalogRow: row,
    };
  }
  if (localAssetSource != null) {
    return {
      displayName: activityText,
      whyThisHelps: DEFAULT_WHY,
      setsReps: 'As in your plan',
      videoSource: localAssetSource,
    };
  }
  return {
    displayName: activityText,
    whyThisHelps: DEFAULT_WHY,
    setsReps: 'As in your plan',
    videoSource: null,
  };
}
