import type {
  BodyReport,
  FoodLogFile,
  GymPageData,
  GymSession,
  GymSnapshot,
  MacroTotals,
} from "@/lib/types";
import { todayIsoDate } from "@/lib/dates";

const emptyMacros: MacroTotals = {
  kcal: null,
  protein_g: null,
  carb_g: null,
  fat_g: null,
};

const SAMPLE_TARGETS: MacroTotals = {
  kcal: 2400,
  protein_g: 180,
  carb_g: 250,
  fat_g: 70,
};

export const SAMPLE_FOOD_LOG: FoodLogFile = {
  daily_targets: SAMPLE_TARGETS,
  entries: [
    {
      date: "2026-09-10",
      meal: "breakfast",
      items: [
        { name: "Eggs + rice", amount: null, kcal: 620, protein_g: 38, carb_g: 55, fat_g: 22 },
        { name: "Greek yogurt", amount: null, kcal: 180, protein_g: 20, carb_g: 12, fat_g: 4 },
      ],
      totals: { kcal: 800, protein_g: 58, carb_g: 67, fat_g: 26 },
    },
    {
      date: "2026-09-10",
      meal: "lunch",
      items: [
        { name: "Chicken bowl", amount: null, kcal: 850, protein_g: 62, carb_g: 80, fat_g: 22 },
      ],
      totals: { kcal: 850, protein_g: 62, carb_g: 80, fat_g: 22 },
    },
    {
      date: "2026-09-08",
      meal: "dinner",
      items: [
        { name: "Salmon + potatoes", amount: null, kcal: 910, protein_g: 54, carb_g: 70, fat_g: 38 },
      ],
      totals: { kcal: 910, protein_g: 54, carb_g: 70, fat_g: 38 },
    },
  ],
};

export const SAMPLE_SESSIONS: GymSession[] = [
  {
    id: "sample-20260910-b",
    date: "2026-09-10",
    session_type: "B_lower",
    exercises: [
      { name: "Back squat", sets: 4, reps: 6 },
      { name: "Romanian deadlift", sets: 3, reps: 8 },
      { name: "Walking lunge", sets: 3, reps: 10 },
    ],
  },
  {
    id: "sample-20260908-a",
    date: "2026-09-08",
    session_type: "A_upper",
    exercises: [
      { name: "Bench press", sets: 4, reps: 8 },
      { name: "Barbell row", sets: 4, reps: 8 },
      { name: "Overhead press", sets: 3, reps: 10 },
    ],
  },
];

export const SAMPLE_BODY_REPORTS: BodyReport[] = [
  {
    id: "sample-2026-08-20",
    measured_at: "2026-08-20T08:00:00Z",
    notes: null,
    source_url: null,
    metrics: {
      weight_kg: 82.4,
      fat_percent: 18.6,
      muscle_kg: 63.1,
      smm_kg: 37.8,
      bmr_kcal: 1780,
    },
    segmental_muscle_kg: null,
    segmental_fat_percent: null,
    table: [],
  },
  {
    id: "sample-2026-08-30",
    measured_at: "2026-08-30T08:00:00Z",
    notes: null,
    source_url: null,
    metrics: {
      weight_kg: 81.9,
      fat_percent: 18.1,
      muscle_kg: 63.4,
      smm_kg: 38.1,
      bmr_kcal: 1788,
    },
    segmental_muscle_kg: null,
    segmental_fat_percent: null,
    table: [],
  },
  {
    id: "sample-2026-09-08",
    measured_at: "2026-09-08T08:00:00Z",
    notes: null,
    source_url: null,
    metrics: {
      weight_kg: 81.6,
      fat_percent: 17.8,
      muscle_kg: 63.7,
      smm_kg: 38.4,
      bmr_kcal: 1794,
    },
    segmental_muscle_kg: null,
    segmental_fat_percent: null,
    table: [],
  },
];

function sumMacros(entries: FoodLogFile["entries"], date: string): MacroTotals {
  return entries
    .filter((entry) => entry.date === date)
    .reduce<MacroTotals>(
      (acc, entry) => ({
        kcal: (acc.kcal ?? 0) + (entry.totals.kcal ?? 0),
        protein_g: (acc.protein_g ?? 0) + (entry.totals.protein_g ?? 0),
        carb_g: (acc.carb_g ?? 0) + (entry.totals.carb_g ?? 0),
        fat_g: (acc.fat_g ?? 0) + (entry.totals.fat_g ?? 0),
      }),
      { ...emptyMacros, kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
    );
}

export function sampleGymData(): GymPageData {
  const today = todayIsoDate();
  const todayTotals = sumMacros(SAMPLE_FOOD_LOG.entries, today);
  const todayEntryCount = SAMPLE_FOOD_LOG.entries.filter((entry) => entry.date === today).length;
  const sessions = [...SAMPLE_SESSIONS].sort((a, b) => b.date.localeCompare(a.date));
  const snapshot: GymSnapshot = {
    today,
    targets: SAMPLE_TARGETS,
    todayTotals: todayEntryCount ? todayTotals : emptyMacros,
    todayEntryCount,
    latestSession: sessions[0] ?? null,
    sessionCount: sessions.length,
    latestBody: SAMPLE_BODY_REPORTS[SAMPLE_BODY_REPORTS.length - 1] ?? null,
  };

  return {
    snapshot,
    sessions,
    bodyReports: SAMPLE_BODY_REPORTS,
    foodEntries: SAMPLE_FOOD_LOG.entries,
    nextSession: null,
    muscleMap: null,
  };
}
