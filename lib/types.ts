export type MacroTotals = {
  kcal: number | null;
  protein_g: number | null;
  carb_g: number | null;
  fat_g: number | null;
};

export type FoodItem = {
  name: string | null;
  amount: string | null;
  kcal: number | null;
  protein_g: number | null;
  carb_g: number | null;
  fat_g: number | null;
};

export type FoodEntry = {
  date: string;
  meal: string | null;
  items: FoodItem[];
  totals: MacroTotals;
};

export type FoodLogFile = {
  daily_targets: MacroTotals;
  entries: FoodEntry[];
};

export type FoodDay = {
  date: string;
  totals: MacroTotals;
  meals: FoodEntry[];
};

export type GymExercise = {
  name: string | null;
  sets: number | null;
  reps: number | string | null;
};

export type GymSession = {
  id: string | null;
  date: string;
  session_type: string | null;
  exercises: GymExercise[];
};

export type NextSessionPriority = "primary" | "secondary" | "accessory";

export type NextSessionExercise = {
  name: string | null;
  sets: number | null;
  reps: number | string | null;
  priority: NextSessionPriority | null;
  notes: string | null;
};

export type NextSessionShortExercise = {
  name: string | null;
  sets: number | null;
  reps: number | string | null;
};

export type NextSessionDuration = {
  full: number | null;
  short: number | null;
};

export type NextSession = {
  version: number | null;
  generated_at: string | null;
  based_on_session_id: string | null;
  based_on_date: string | null;
  based_on_session_type: string | null;
  session_type: string | null;
  split_label: string | null;
  suggested_date: string | null;
  suggested_date_note: string | null;
  duration_min: NextSessionDuration | null;
  rest_between_sets: string | null;
  goals: string[];
  exercises: NextSessionExercise[];
  short_version: NextSessionShortExercise[];
  notes: string | null;
};

export type BodyMetrics = {
  weight_kg: number | null;
  fat_percent: number | null;
  muscle_kg: number | null;
  smm_kg: number | null;
  bmr_kcal: number | null;
} & Record<string, number | null>;

export type BodyTableRow = {
  key: string | null;
  label: string;
  value: string | null;
  unit: string | null;
  range: string | null;
};

export type BodyReport = {
  id: string | null;
  measured_at: string | null;
  notes: string | null;
  source_url: string | null;
  metrics: BodyMetrics;
  segmental_muscle_kg: Record<string, number | null> | null;
  segmental_fat_percent: Record<string, number | null> | null;
  table: BodyTableRow[];
};

export type GymSnapshot = {
  today: string;
  targets: MacroTotals;
  todayTotals: MacroTotals;
  todayEntryCount: number;
  latestSession: GymSession | null;
  sessionCount: number;
  latestBody: BodyReport | null;
};

/** One exercise row from `data/gym-log/exercise-muscles.json`. Weights fall back to `weight_defaults`. */
export type ExerciseMuscleEntry = {
  aliases: string[];
  main: string[];
  supporting: string[];
  weightMain: number | null;
  weightSupporting: number | null;
};

/** Normalized alias or canonical name used for longest-match resolve. */
export type ExerciseMuscleCandidate = {
  key: string;
  canonical: string;
  /** True when `key` is this entry's own canonical name, not only an alias. */
  ownsName: boolean;
};

/** Parsed muscle map. `candidates` are normalized keys; longest match wins. */
export type ExerciseMuscleMap = {
  weightDefaults: { main: number; supporting: number };
  exercises: Record<string, ExerciseMuscleEntry>;
  candidates: ExerciseMuscleCandidate[];
};

export type MuscleBodyState = Partial<Record<string, { intensity: number; selected: boolean }>>;

export type ExerciseFrequency = {
  name: string;
  count: number;
};

export type GymPageData = {
  snapshot: GymSnapshot;
  sessions: GymSession[];
  bodyReports: BodyReport[];
  foodEntries: FoodEntry[];
  nextSession: NextSession | null;
  muscleMap: ExerciseMuscleMap | null;
};

export type CityId = "London" | "Tokyo" | "HK";
export type Horizon = "d1" | "d2" | "d3";

export type TempBucket = {
  high_c: number | null;
  bucket: string | null;
  target_local_date: string | null;
};

export type CityHorizons = Record<Horizon, TempBucket>;

export type DailyPrediction = {
  date: string;
  void: boolean;
  dry_run: boolean;
  cities: Record<CityId, CityHorizons>;
};

export type Account = {
  account_id: string;
  name: string | null;
  city: CityId | null;
  horizon: Horizon | null;
  bankroll: number | null;
  starting_bankroll: number | null;
  bets_won: number | null;
  bets_lost: number | null;
};

export type Bet = {
  id: string | null;
  account_id: string | null;
  city: CityId | null;
  horizon: Horizon | null;
  date: string | null;
  bucket: string | null;
  resolved_bucket: string | null;
  stake: number | null;
  status: string | null;
  result: string | null;
  void: boolean;
};

export type SimState = {
  as_of: string | null;
  void_dates: string[];
  dry_run_dates: string[];
};

export type PredictionLead = 1 | 2 | 3;

export type PredictionCellTone = "correct" | "wrong" | "pending" | "empty";

export type PredictionCell = {
  label: string | null;
  tone: PredictionCellTone;
};

export type PredictionMatrixRow = {
  key: string;
  account: Account;
  city: CityId;
  lead: PredictionLead;
  cells: Record<string, PredictionCell>;
};

export type PredictionsPageData = {
  accounts: Account[];
  columns: string[];
  rows: PredictionMatrixRow[];
  asOf: string | null;
};

export type DataSource = "repo" | "sample";

export type Loaded<T> = {
  source: DataSource;
  data: T;
};
