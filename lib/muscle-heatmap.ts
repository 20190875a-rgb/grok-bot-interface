import type {
  ExerciseFrequency,
  ExerciseMuscleCandidate,
  ExerciseMuscleEntry,
  ExerciseMuscleMap,
  GymSession,
  MuscleBodyState,
} from "@/lib/types";

/**
 * Last-resort weights when `weight_defaults` is missing.
 * The checked-in map uses 1.0 / 0.4; scoring prefers the file's numbers.
 */
const FALLBACK_WEIGHT_MAIN = 1;
const FALLBACK_WEIGHT_SUPPORTING = 0.4;

const FULL_WIDTH_PARENS = /（[^）]*）/g;
const ASCII_PARENS = /\([^)]*\)/g;
const TRAILING_CJK = /[\s\u3000-\u303F\u3400-\u9FFF\uF900-\uFAFF]+$/u;

/** Strip full-width/ASCII parentheses and a trailing Chinese suffix, then casefold. */
export function normalizeExerciseName(name: string): string {
  const stripped = name
    .replace(FULL_WIDTH_PARENS, " ")
    .replace(ASCII_PARENS, " ")
    .replace(/\s+/g, " ")
    .trim();
  const withoutSuffix = stripped.replace(TRAILING_CJK, "").trim();
  const base = withoutSuffix.length > 0 ? withoutSuffix : stripped;
  return base.replace(/\s+/g, " ").trim().toLowerCase();
}

export function parseExerciseMuscleMap(value: unknown): ExerciseMuscleMap | null {
  const record = asRecord(value);
  const exercisesRaw = asRecord(record?.exercises);
  if (!record || !exercisesRaw) return null;

  const defaultsRaw = asRecord(record.weight_defaults);
  const weightDefaults = {
    main: finiteNumber(defaultsRaw?.main, FALLBACK_WEIGHT_MAIN),
    supporting: finiteNumber(defaultsRaw?.supporting, FALLBACK_WEIGHT_SUPPORTING),
  };

  const exercises: Record<string, ExerciseMuscleEntry> = {};
  for (const [canonical, raw] of Object.entries(exercisesRaw)) {
    const name = canonical.trim();
    const entry = parseEntry(raw);
    if (!name || !entry) continue;
    exercises[name] = entry;
  }

  const candidates: ExerciseMuscleCandidate[] = [];
  const seen = new Set<string>();
  for (const [canonical, entry] of Object.entries(exercises)) {
    const ownKey = normalizeExerciseName(canonical);
    if (ownKey) pushCandidate(candidates, seen, ownKey, canonical, true);
    for (const alias of entry.aliases) {
      const key = normalizeExerciseName(alias);
      if (!key) continue;
      pushCandidate(candidates, seen, key, canonical, key === ownKey);
    }
  }

  return { weightDefaults, exercises, candidates };
}

/**
 * Longest normalized alias or canonical key wins.
 * `Super high row` / `Iso-lateral incline low row` beat generic `Row` / `Seated row`.
 */
export function resolveExercise(
  map: ExerciseMuscleMap,
  name: string,
): { canonical: string; entry: ExerciseMuscleEntry } | null {
  const query = normalizeExerciseName(name);
  if (!query) return null;

  let best: ExerciseMuscleCandidate | null = null;
  for (const candidate of map.candidates) {
    if (!phraseMatch(query, candidate.key)) continue;
    if (!best || preferCandidate(candidate, best)) best = candidate;
  }
  if (!best) return null;
  const entry = map.exercises[best.canonical];
  return entry ? { canonical: best.canonical, entry } : null;
}

/** Sum per-muscle scores for the given sessions. Unmapped names contribute nothing. */
export function scoreSessions(sessions: GymSession[], map: ExerciseMuscleMap): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (!exercise.name) continue;
      const resolved = resolveExercise(map, exercise.name);
      if (!resolved) continue;
      const sets = setMultiplier(exercise.sets);
      const weightMain = weightOrDefault(resolved.entry.weightMain, map.weightDefaults.main);
      const weightSupporting = weightOrDefault(
        resolved.entry.weightSupporting,
        map.weightDefaults.supporting,
      );
      addMuscles(scores, resolved.entry.main, weightMain * sets);
      addMuscles(scores, resolved.entry.supporting, weightSupporting * sets);
    }
  }
  return scores;
}

/** Overall tab: intensity = round(10 * score / max(scores)), capped 0–10. */
export function overallBodyState(scores: Record<string, number>): MuscleBodyState {
  let max = 0;
  for (const score of Object.values(scores)) {
    if (score > max) max = score;
  }
  const state: MuscleBodyState = {};
  if (max <= 0) return state;
  for (const [id, score] of Object.entries(scores)) {
    const intensity = clampIntensity(Math.round((10 * score) / max));
    if (intensity <= 0) continue;
    state[id] = { intensity, selected: false };
  }
  return state;
}

/** Latest-session tab: intensity = min(10, round(score * 2)). */
export function sessionBodyState(scores: Record<string, number>): MuscleBodyState {
  const state: MuscleBodyState = {};
  for (const [id, score] of Object.entries(scores)) {
    const intensity = clampIntensity(Math.round(score * 2));
    if (intensity <= 0) continue;
    state[id] = { intensity, selected: false };
  }
  return state;
}

export function withSelected(state: MuscleBodyState, selectedId: string | null): MuscleBodyState {
  if (!selectedId) return state;
  const current = state[selectedId];
  return {
    ...state,
    [selectedId]: {
      intensity: current?.intensity ?? 0,
      selected: true,
    },
  };
}

export function topExercises(
  sessions: GymSession[],
  map: ExerciseMuscleMap | null,
  limit = 5,
): ExerciseFrequency[] {
  const counts = new Map<string, ExerciseFrequency>();
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const raw = exercise.name?.trim();
      if (!raw) continue;
      const resolved = map ? resolveExercise(map, raw) : null;
      const key = resolved?.canonical ?? (normalizeExerciseName(raw) || raw.toLowerCase());
      const display = resolved?.canonical ?? raw;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { name: display, count: 1 });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function pushCandidate(
  candidates: ExerciseMuscleCandidate[],
  seen: Set<string>,
  key: string,
  canonical: string,
  ownsName: boolean,
): void {
  const id = `${canonical}\0${key}`;
  if (seen.has(id)) return;
  seen.add(id);
  candidates.push({ key, canonical, ownsName });
}

function preferCandidate(next: ExerciseMuscleCandidate, best: ExerciseMuscleCandidate): boolean {
  if (next.key.length !== best.key.length) return next.key.length > best.key.length;
  if (next.ownsName !== best.ownsName) return next.ownsName;
  if (next.canonical.length !== best.canonical.length) return next.canonical.length > best.canonical.length;
  return next.canonical.localeCompare(best.canonical) < 0;
}

function phraseMatch(query: string, key: string): boolean {
  if (!key) return false;
  if (query === key) return true;
  let from = 0;
  while (from <= query.length - key.length) {
    const index = query.indexOf(key, from);
    if (index < 0) return false;
    const before = index === 0 || isBoundary(query[index - 1] ?? "");
    const afterIndex = index + key.length;
    const after = afterIndex === query.length || isBoundary(query[afterIndex] ?? "");
    if (before && after) return true;
    from = index + 1;
  }
  return false;
}

function isBoundary(char: string): boolean {
  return char === " " || char === "-" || char === "/" || char === "·";
}

function addMuscles(scores: Record<string, number>, ids: string[], amount: number): void {
  if (!Number.isFinite(amount) || amount === 0) return;
  for (const id of ids) {
    scores[id] = (scores[id] ?? 0) + amount;
  }
}

function setMultiplier(sets: number | null): number {
  if (sets === null || !Number.isFinite(sets) || sets < 0) return 1;
  return sets;
}

function weightOrDefault(value: number | null, fallback: number): number {
  return value === null || !Number.isFinite(value) ? fallback : value;
}

function clampIntensity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10, Math.max(0, value));
}

function parseEntry(value: unknown): ExerciseMuscleEntry | null {
  const record = asRecord(value);
  if (!record) return null;
  const main = stringList(record.main);
  const supporting = stringList(record.supporting);
  if (!main.length && !supporting.length) return null;
  return {
    aliases: stringList(record.aliases),
    main,
    supporting,
    weightMain: asFinite(record.weight_main),
    weightSupporting: asFinite(record.weight_supporting),
  };
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed) out.push(trimmed);
  }
  return out;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asFinite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function finiteNumber(value: unknown, fallback: number): number {
  return asFinite(value) ?? fallback;
}
