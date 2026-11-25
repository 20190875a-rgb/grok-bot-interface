import path from "node:path";
import { isoDate, todayIsoDate } from "@/lib/dates";
import { sampleGymData } from "@/lib/fixtures/gym";
import {
  asArray,
  asNumber,
  asNumeric,
  asRecord,
  asString,
  DATA_ROOT,
  domainHasJson,
  listDirectories,
  listJsonFiles,
  readJsonFile,
} from "@/lib/json";
import { parseExerciseMuscleMap } from "@/lib/muscle-heatmap";
import type {
  BodyMetrics,
  BodyReport,
  BodyTableRow,
  ExerciseMuscleMap,
  FoodDay,
  FoodEntry,
  FoodItem,
  GymExercise,
  GymPageData,
  GymSession,
  GymSnapshot,
  Loaded,
  MacroTotals,
  NextSession,
  NextSessionDuration,
  NextSessionExercise,
  NextSessionPriority,
  NextSessionShortExercise,
} from "@/lib/types";

const emptyMacros: MacroTotals = {
  kcal: null,
  protein_g: null,
  carb_g: null,
  fat_g: null,
};

export async function loadGymData(): Promise<Loaded<GymPageData>> {
  const hasFood = await domainHasJson("food-log");
  const hasGym = await domainHasJson("gym-log");
  const hasBody = await domainHasJson("body-reports");

  if (!hasFood && !hasGym && !hasBody) {
    return { source: "sample", data: sampleGymData() };
  }

  const [food, sessions, bodyReports, nextSession, muscleMap] = await Promise.all([
    loadFoodLogs(),
    loadGymSessions(),
    loadBodyReports(),
    loadNextSession(),
    loadExerciseMuscles(),
  ]);

  return {
    source: "repo",
    data: buildGymPageData(food.targets, food.entries, sessions, bodyReports, nextSession, muscleMap),
  };
}

export function buildGymPageData(
  targets: MacroTotals,
  foodEntries: FoodEntry[],
  sessions: GymSession[],
  bodyReports: BodyReport[],
  nextSession: NextSession | null = null,
  muscleMap: ExerciseMuscleMap | null = null,
): GymPageData {
  const today = todayIsoDate();
  const todayEntries = foodEntries.filter((entry) => entry.date === today);
  const sortedSessions = [...sessions].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.id ?? "").localeCompare(a.id ?? ""),
  );
  const sortedBody = [...bodyReports].sort((a, b) =>
    (a.measured_at ?? "").localeCompare(b.measured_at ?? ""),
  );

  const snapshot: GymSnapshot = {
    today,
    targets,
    todayTotals: todayEntries.length ? sumMacros(todayEntries) : emptyMacros,
    todayEntryCount: todayEntries.length,
    latestSession: sortedSessions[0] ?? null,
    sessionCount: sortedSessions.length,
    latestBody: sortedBody[sortedBody.length - 1] ?? null,
  };

  return {
    snapshot,
    sessions: sortedSessions,
    bodyReports: sortedBody,
    foodEntries,
    nextSession,
    muscleMap,
  };
}

export function groupFoodDays(entries: FoodEntry[]): FoodDay[] {
  const byDate = new Map<string, FoodEntry[]>();
  for (const entry of entries) {
    const list = byDate.get(entry.date);
    if (list) list.push(entry);
    else byDate.set(entry.date, [entry]);
  }

  return [...byDate.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, meals]) => ({
      date,
      meals,
      totals: sumMacros(meals),
    }));
}

async function loadExerciseMuscles(): Promise<ExerciseMuscleMap | null> {
  try {
    const parsed = await readJsonFile(path.join(DATA_ROOT, "gym-log", "exercise-muscles.json"));
    return parseExerciseMuscleMap(parsed);
  } catch {
    return null;
  }
}

async function loadNextSession(): Promise<NextSession | null> {
  const parsed = await readJsonFile(path.join(DATA_ROOT, "gym-log", "next-session.json"));
  return parseNextSession(parsed);
}

async function loadFoodLogs(): Promise<{ targets: MacroTotals; entries: FoodEntry[] }> {
  const files = await listJsonFiles(path.join(DATA_ROOT, "food-log"));
  const entries: FoodEntry[] = [];
  let targets: MacroTotals = emptyMacros;

  for (const file of files) {
    const parsed = asRecord(await readJsonFile(file));
    if (!parsed) continue;
    targets = parseMacros(parsed.daily_targets) ?? targets;
    for (const item of asArray(parsed.entries)) {
      const entry = parseFoodEntry(item);
      if (entry) entries.push(entry);
    }
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));
  return { targets, entries };
}

async function loadGymSessions(): Promise<GymSession[]> {
  const gymRoot = path.join(DATA_ROOT, "gym-log");
  const months = await listDirectories(gymRoot);
  const sessions: GymSession[] = [];
  const seen = new Set<string>();

  for (const monthDir of months) {
    const index = asRecord(await readJsonFile(path.join(monthDir, "index.json")));
    const listed = asArray(index?.sessions ?? index?.files);

    for (const item of listed) {
      if (typeof item === "string") {
        const session = await loadSessionFile(sessionPathCandidates(gymRoot, monthDir, item));
        rememberSession(sessions, seen, session);
        continue;
      }

      const record = asRecord(item);
      if (!record) continue;
      const fileName = asString(record.file);
      if (fileName) {
        const session = await loadSessionFile(sessionPathCandidates(gymRoot, monthDir, fileName));
        if (session) {
          rememberSession(sessions, seen, {
            ...session,
            id: session.id ?? asString(record.id),
            session_type: parseSessionType(record.session_type) ?? session.session_type,
          });
          continue;
        }
      }
      if (asArray(record.exercises).length) {
        rememberSession(sessions, seen, parseSession(record));
      }
    }

    const jsonFiles = await listJsonFiles(monthDir);
    for (const file of jsonFiles) {
      const base = path.basename(file);
      if (base === "index.json" || base === "next-session.json") continue;
      const session = await loadSessionFile([file]);
      rememberSession(sessions, seen, session);
    }
  }

  return sessions;
}

function rememberSession(
  sessions: GymSession[],
  seen: Set<string>,
  session: GymSession | null,
): void {
  if (!session) return;
  const key = session.id ?? `${session.date}-${session.session_type ?? "session"}-${session.exercises.map((ex) => ex.name).join(",")}`;
  if (seen.has(key)) return;
  seen.add(key);
  sessions.push(session);
}

function sessionPathCandidates(gymRoot: string, monthDir: string, fileName: string): string[] {
  return [
    path.join(monthDir, fileName),
    path.join(monthDir, path.basename(fileName)),
    path.join(gymRoot, fileName),
    path.join(DATA_ROOT, fileName),
  ];
}

async function loadSessionFile(candidates: string[]): Promise<GymSession | null> {
  for (const candidate of candidates) {
    const parsed = parseSession(asRecord(await readJsonFile(candidate)));
    if (parsed) return parsed;
  }
  return null;
}

async function loadBodyReports(): Promise<BodyReport[]> {
  const byKey = new Map<string, BodyReport>();
  const files = await listJsonFiles(path.join(DATA_ROOT, "body-reports"));

  for (const file of files) {
    const parsed = asRecord(await readJsonFile(file));
    if (!parsed) continue;
    const items = asArray(parsed.reports).length ? asArray(parsed.reports) : [parsed];
    for (const item of items) {
      const report = parseBodyReport(item);
      if (!report) continue;
      const key = report.id ?? report.measured_at ?? file;
      const existing = byKey.get(key);
      if (!existing || isRicherBodyReport(report, existing)) byKey.set(key, report);
    }
  }

  return [...byKey.values()];
}

function parseFoodEntry(value: unknown): FoodEntry | null {
  const record = asRecord(value);
  const date = isoDate(asString(record?.date));
  if (!record || !date) return null;
  const items = asArray(record.items).map(parseFoodItem).filter((item): item is FoodItem => item !== null);
  return {
    date,
    meal: asString(record.meal),
    items,
    totals: parseMacros(record.totals) ?? emptyMacros,
  };
}

function parseFoodItem(value: unknown): FoodItem | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    name: asString(record.name),
    amount: asString(record.amount),
    kcal: asNumber(record.kcal),
    protein_g: asNumber(record.protein_g),
    carb_g: asNumber(record.carb_g),
    fat_g: asNumber(record.fat_g),
  };
}

function parseSession(value: unknown): GymSession | null {
  const record = asRecord(value);
  const date = isoDate(asString(record?.date));
  if (!record || !date) return null;
  return {
    id: asString(record.id),
    date,
    session_type: parseSessionType(record.session_type),
    exercises: asArray(record.exercises)
      .map(parseExercise)
      .filter((item): item is GymExercise => item !== null),
  };
}

function parseSessionType(value: unknown): string | null {
  return asString(value);
}

function parseExercise(value: unknown): GymExercise | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    name: asString(record.name),
    sets: asNumber(record.sets),
    reps: parseReps(record.reps),
  };
}

function parseNextSession(value: unknown): NextSession | null {
  const record = asRecord(value);
  if (!record) return null;

  const exercises = asArray(record.exercises)
    .map(parseNextExercise)
    .filter((item): item is NextSessionExercise => item !== null);
  const short_version = asArray(record.short_version)
    .map(parseShortExercise)
    .filter((item): item is NextSessionShortExercise => item !== null);
  const goals = asArray(record.goals)
    .map((item) => asString(item))
    .filter((item): item is string => item !== null);
  const session_type = asString(record.session_type);
  const split_label = asString(record.split_label);

  if (!session_type && !split_label && !exercises.length && !short_version.length) {
    return null;
  }

  return {
    version: asNumber(record.version),
    generated_at: asString(record.generated_at),
    based_on_session_id: asString(record.based_on_session_id),
    based_on_date: isoDate(asString(record.based_on_date)),
    based_on_session_type: asString(record.based_on_session_type),
    session_type,
    split_label,
    suggested_date: isoDate(asString(record.suggested_date)),
    suggested_date_note: asString(record.suggested_date_note),
    duration_min: parseDuration(record.duration_min),
    rest_between_sets: asString(record.rest_between_sets),
    goals,
    exercises,
    short_version,
    notes: asString(record.notes),
  };
}

function parseNextExercise(value: unknown): NextSessionExercise | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    name: asString(record.name),
    sets: asNumber(record.sets),
    reps: parseReps(record.reps),
    priority: parsePriority(record.priority),
    notes: asString(record.notes),
  };
}

function parseShortExercise(value: unknown): NextSessionShortExercise | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    name: asString(record.name),
    sets: asNumber(record.sets),
    reps: parseReps(record.reps),
  };
}

function parseDuration(value: unknown): NextSessionDuration | null {
  const record = asRecord(value);
  if (!record) return null;
  const full = asNumber(record.full);
  const short = asNumber(record.short);
  if (full === null && short === null) return null;
  return { full, short };
}

function parsePriority(value: unknown): NextSessionPriority | null {
  const label = asString(value);
  if (label === "primary" || label === "secondary" || label === "accessory") return label;
  return null;
}

function parseReps(value: unknown): number | string | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return asString(value);
}

function parseBodyReport(value: unknown): BodyReport | null {
  const record = asRecord(value);
  if (!record) return null;
  const metrics = parseBodyMetrics(record.metrics);
  const table = parseBodyTable(record.table ?? record.rows);
  const measured_at = asString(record.measured_at) ?? asString(record.date);
  if (!measured_at && !metrics && !table.length) return null;
  return {
    id: asString(record.id),
    measured_at,
    notes: asString(record.notes),
    source_url: parseReportLink(record),
    metrics: metrics ?? emptyBodyMetrics(),
    segmental_muscle_kg: parseSegmental(record.segmental_muscle_kg),
    segmental_fat_percent: parseSegmental(record.segmental_fat_percent),
    table,
  };
}

function emptyBodyMetrics(): BodyMetrics {
  return {
    weight_kg: null,
    fat_percent: null,
    muscle_kg: null,
    smm_kg: null,
    bmr_kcal: null,
  };
}

function parseBodyMetrics(value: unknown): BodyMetrics | null {
  const record = asRecord(value);
  if (!record) return null;
  const metrics = emptyBodyMetrics();
  let any = false;
  for (const [key, raw] of Object.entries(record)) {
    const numeric = asNumeric(raw);
    if (numeric === null) continue;
    metrics[key] = numeric;
    any = true;
  }
  return any ? metrics : null;
}

function parseSegmental(value: unknown): Record<string, number | null> | null {
  const record = asRecord(value);
  if (!record) return null;
  const out: Record<string, number | null> = {};
  let any = false;
  for (const [key, raw] of Object.entries(record)) {
    const numeric = asNumeric(raw);
    if (numeric === null) continue;
    out[key] = numeric;
    any = true;
  }
  return any ? out : null;
}

function parseBodyTable(value: unknown): BodyTableRow[] {
  const rows: BodyTableRow[] = [];
  for (const item of asArray(value)) {
    const record = asRecord(item);
    const nested = record ? asArray(record.rows ?? record.items ?? record.table) : [];
    if (record && nested.length) {
      for (const child of nested) {
        const row = parseBodyTableRow(child);
        if (row) rows.push(row);
      }
      continue;
    }
    const row = parseBodyTableRow(item);
    if (row) rows.push(row);
  }
  return rows;
}

function parseBodyTableRow(value: unknown): BodyTableRow | null {
  if (Array.isArray(value)) {
    const cells = value.map(asDisplayCell);
    const label = cells[0];
    if (!label) return null;
    return {
      key: null,
      label,
      value: cells[1],
      unit: cells[2],
      range: cells[3],
    };
  }

  const record = asRecord(value);
  if (!record) {
    const label = asDisplayCell(value);
    return label ? { key: null, label, value: null, unit: null, range: null } : null;
  }

  const key = asString(record.key) ?? asString(record.id) ?? asString(record.metric);
  const label =
    asDisplayCell(record.label) ??
    asDisplayCell(record.name) ??
    asDisplayCell(record.item) ??
    asDisplayCell(record.metric) ??
    asDisplayCell(record.key) ??
    asDisplayCell(record.title);
  if (!label) return null;

  return {
    key,
    label,
    value: asDisplayCell(record.value) ?? asDisplayCell(record.measured) ?? asDisplayCell(record.result) ?? asDisplayCell(record.current),
    unit: asDisplayCell(record.unit),
    range: parseRange(record),
  };
}

function parseReportLink(record: Record<string, unknown>): string | null {
  return (
    asString(record.report_url) ??
    asString(record.source_url) ??
    asString(record.url) ??
    asString(record.href) ??
    asString(record.path) ??
    asString(record.report_path)
  );
}

function parseRange(record: Record<string, unknown>): string | null {
  const direct =
    asDisplayCell(record.range) ??
    asDisplayCell(record.reference) ??
    asDisplayCell(record.reference_range) ??
    asDisplayCell(record.ref) ??
    asDisplayCell(record.standard);
  if (direct) return direct;

  const min =
    asDisplayCell(record.min) ??
    asDisplayCell(record.low) ??
    asDisplayCell(record.ref_low) ??
    asDisplayCell(record.range_min) ??
    asDisplayCell(record.std_min);
  const max =
    asDisplayCell(record.max) ??
    asDisplayCell(record.high) ??
    asDisplayCell(record.ref_high) ??
    asDisplayCell(record.range_max) ??
    asDisplayCell(record.std_max);
  if (min && max) return `${min}–${max}`;
  return min ?? max;
}

function asDisplayCell(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return typeof value === "string" ? asString(value) : null;
}

function isRicherBodyReport(candidate: BodyReport, existing: BodyReport): boolean {
  if (candidate.table.length !== existing.table.length) return candidate.table.length > existing.table.length;
  const candidateMetrics = Object.values(candidate.metrics).filter((value) => value !== null).length;
  const existingMetrics = Object.values(existing.metrics).filter((value) => value !== null).length;
  return candidateMetrics > existingMetrics;
}

function parseMacros(value: unknown): MacroTotals | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    kcal: asNumber(record.kcal),
    protein_g: asNumber(record.protein_g),
    carb_g: asNumber(record.carb_g),
    fat_g: asNumber(record.fat_g),
  };
}

function sumMacros(entries: FoodEntry[]): MacroTotals {
  return entries.reduce<MacroTotals>(
    (acc, entry) => ({
      kcal: add(acc.kcal, entry.totals.kcal),
      protein_g: add(acc.protein_g, entry.totals.protein_g),
      carb_g: add(acc.carb_g, entry.totals.carb_g),
      fat_g: add(acc.fat_g, entry.totals.fat_g),
    }),
    { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
  );
}

function add(left: number | null, right: number | null): number | null {
  if (left === null && right === null) return null;
  return (left ?? 0) + (right ?? 0);
}
