import { buildPredictionMatrix, sortAccounts } from "@/lib/prediction-matrix";
import type {
  Account,
  Bet,
  CityHorizons,
  DailyPrediction,
  PredictionsPageData,
  SimState,
  TempBucket,
} from "@/lib/types";

function bucket(high_c: number | null, label: string, target_local_date: string): TempBucket {
  return { high_c, bucket: label, target_local_date };
}

function bucketVoid(target_local_date: string): TempBucket {
  return { high_c: null, bucket: "void", target_local_date };
}

function city(d1: TempBucket, d2: TempBucket, d3: TempBucket): CityHorizons {
  return { d1, d2, d3 };
}

export const SAMPLE_STATE: SimState = {
  as_of: "2026-09-11T12:00:00Z",
  void_dates: ["2026-09-09"],
  dry_run_dates: ["2026-09-09"],
};

export const SAMPLE_ACCOUNTS: Account[] = [
  { account_id: "london_d3", name: "London D3", city: "London", horizon: "d3", bankroll: 800, starting_bankroll: 1000, bets_won: 0, bets_lost: 0 },
  { account_id: "london_d2", name: "London D2", city: "London", horizon: "d2", bankroll: 1070, starting_bankroll: 1000, bets_won: 1, bets_lost: 0 },
  { account_id: "london_d1", name: "London D1", city: "London", horizon: "d1", bankroll: 600, starting_bankroll: 1000, bets_won: 0, bets_lost: 1 },
  { account_id: "tokyo_d3", name: "Tokyo D3", city: "Tokyo", horizon: "d3", bankroll: 800, starting_bankroll: 1000, bets_won: 0, bets_lost: 0 },
  { account_id: "tokyo_d2", name: "Tokyo D2", city: "Tokyo", horizon: "d2", bankroll: 700, starting_bankroll: 1000, bets_won: 0, bets_lost: 0 },
  { account_id: "tokyo_d1", name: "Tokyo D1", city: "Tokyo", horizon: "d1", bankroll: 1310, starting_bankroll: 1000, bets_won: 1, bets_lost: 0 },
  { account_id: "hong_kong_d3", name: "Hong Kong D3", city: "HK", horizon: "d3", bankroll: 800, starting_bankroll: 1000, bets_won: 0, bets_lost: 0 },
  { account_id: "hong_kong_d2", name: "Hong Kong D2", city: "HK", horizon: "d2", bankroll: 700, starting_bankroll: 1000, bets_won: 0, bets_lost: 0 },
  { account_id: "hong_kong_d1", name: "Hong Kong D1", city: "HK", horizon: "d1", bankroll: 600, starting_bankroll: 1000, bets_won: 0, bets_lost: 0 },
];

export const SAMPLE_PREDICTIONS: DailyPrediction[] = [
  {
    date: "2026-09-08",
    void: false,
    dry_run: false,
    cities: {
      London: city(
        bucket(22, "21-23", "2026-09-09"),
        bucket(20, "19-21", "2026-09-10"),
        bucket(18, "17-19", "2026-09-11"),
      ),
      Tokyo: city(
        bucket(31, "30-32", "2026-09-09"),
        bucket(30, "29-31", "2026-09-10"),
        bucket(29, "28-30", "2026-09-11"),
      ),
      HK: city(
        bucket(33, "32-34", "2026-09-09"),
        bucket(32, "31-33", "2026-09-10"),
        bucket(31, "30-32", "2026-09-11"),
      ),
    },
  },
  {
    date: "2026-09-09",
    void: true,
    dry_run: true,
    cities: {
      London: city(bucketVoid("2026-09-10"), bucketVoid("2026-09-11"), bucketVoid("2026-09-12")),
      Tokyo: city(bucketVoid("2026-09-10"), bucketVoid("2026-09-11"), bucketVoid("2026-09-12")),
      HK: city(bucketVoid("2026-09-10"), bucketVoid("2026-09-11"), bucketVoid("2026-09-12")),
    },
  },
  {
    date: "2026-09-10",
    void: false,
    dry_run: false,
    cities: {
      London: city(
        bucket(21, "20-22", "2026-09-11"),
        bucket(19, "18-20", "2026-09-12"),
        bucket(17, "16-18", "2026-09-13"),
      ),
      Tokyo: city(
        bucket(30, "29-31", "2026-09-11"),
        bucket(29, "28-30", "2026-09-12"),
        bucket(28, "27-29", "2026-09-13"),
      ),
      HK: city(
        bucket(32, "31-33", "2026-09-11"),
        bucket(31, "30-32", "2026-09-12"),
        bucket(30, "29-31", "2026-09-13"),
      ),
    },
  },
];

export const SAMPLE_HISTORY_BETS: Bet[] = [
  {
    id: "h-1",
    account_id: "london_d1",
    city: "London",
    horizon: "d1",
    date: "2026-09-11",
    bucket: "20-22",
    resolved_bucket: "20-22",
    stake: 25,
    status: "settled",
    result: "hit",
    void: false,
  },
  {
    id: "h-2",
    account_id: "tokyo_d1",
    city: "Tokyo",
    horizon: "d1",
    date: "2026-09-11",
    bucket: "29-31",
    resolved_bucket: "28-30",
    stake: 30,
    status: "settled",
    result: "miss",
    void: false,
  },
  {
    id: "h-void",
    account_id: "tokyo_d1",
    city: "Tokyo",
    horizon: "d1",
    date: "2026-09-09",
    bucket: "void",
    resolved_bucket: null,
    stake: 0,
    status: "void",
    result: null,
    void: true,
  },
];

export function samplePredictionsData(): PredictionsPageData {
  const hiddenDates = new Set(["2026-09-09"]);
  const liveHistory = SAMPLE_HISTORY_BETS.filter((bet) => !bet.void && (!bet.date || !hiddenDates.has(bet.date)));
  const matrix = buildPredictionMatrix(
    SAMPLE_ACCOUNTS,
    SAMPLE_PREDICTIONS,
    liveHistory,
    hiddenDates,
    SAMPLE_STATE.as_of,
  );
  return {
    accounts: sortAccounts(SAMPLE_ACCOUNTS),
    columns: matrix.columns,
    rows: matrix.rows,
    asOf: SAMPLE_STATE.as_of,
  };
}
