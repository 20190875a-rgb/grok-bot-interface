import path from "node:path";
import { addUtcDays, isAlwaysHiddenDate, isoDate } from "@/lib/dates";
import { samplePredictionsData } from "@/lib/fixtures/predictions";
import {
  asArray,
  asBoolean,
  asNumber,
  asRecord,
  asString,
  DATA_ROOT,
  listJsonFiles,
  readJsonFile,
} from "@/lib/json";
import { buildPredictionMatrix, sortAccounts } from "@/lib/prediction-matrix";
import type {
  Account,
  Bet,
  CityHorizons,
  CityId,
  DailyPrediction,
  Horizon,
  Loaded,
  PredictionLead,
  PredictionsPageData,
  SimState,
  TempBucket,
} from "@/lib/types";

const CITY_ALIASES: Record<string, CityId> = {
  london: "London",
  lon: "London",
  tokyo: "Tokyo",
  tyo: "Tokyo",
  hk: "HK",
  hongkong: "HK",
  "hong-kong": "HK",
  "hong_kong": "HK",
};

const emptyBucket: TempBucket = { high_c: null, bucket: null, target_local_date: null };
const emptyCity: CityHorizons = { d1: emptyBucket, d2: emptyBucket, d3: emptyBucket };

export async function loadPredictionsData(): Promise<Loaded<PredictionsPageData>> {
  const hasPredictions = await hasLiveWeatherSim();
  if (!hasPredictions) {
    return { source: "sample", data: samplePredictionsData() };
  }

  const [predictions, accounts, openBets, historyBets, state] = await Promise.all([
    loadDailyPredictions(),
    loadAccounts(),
    loadBets("open.json"),
    loadBets("history.json"),
    loadState(),
  ]);

  const hiddenDates = collectHiddenDates(predictions, state, [...openBets, ...historyBets]);
  const liveHistory = historyBets.filter((bet) => !bet.void && (!bet.date || !hiddenDates.has(bet.date)));
  const matrix = buildPredictionMatrix(accounts, predictions, liveHistory, hiddenDates, state.as_of);

  return {
    source: "repo",
    data: {
      accounts: sortAccounts(accounts),
      columns: matrix.columns,
      rows: matrix.rows,
      asOf: state.as_of,
    },
  };
}

async function hasLiveWeatherSim(): Promise<boolean> {
  const accountsPath = path.join(DATA_ROOT, "weather-sim", "accounts.json");
  if ((await readJsonFile(accountsPath)) !== null) return true;
  const predictionFiles = await listJsonFiles(path.join(DATA_ROOT, "weather-sim", "predictions"));
  return predictionFiles.length > 0;
}

async function loadAccounts(): Promise<Account[]> {
  const parsed = await readJsonFile(path.join(DATA_ROOT, "weather-sim", "accounts.json"));
  const record = asRecord(parsed);
  const list = asArray(record?.accounts ?? parsed);
  const fromArray = list.map(parseAccount).filter((item): item is Account => item !== null);
  if (fromArray.length) return fromArray;

  if (record) {
    const fromMap: Account[] = [];
    for (const [account_id, value] of Object.entries(record)) {
      if (account_id === "accounts") continue;
      const nested = asRecord(value);
      if (!nested) continue;
      const parsedAccount = parseAccount({ ...nested, account_id: asString(nested.account_id) ?? account_id });
      if (parsedAccount) fromMap.push(parsedAccount);
    }
    if (fromMap.length) return fromMap;
  }

  return [];
}

async function loadDailyPredictions(): Promise<DailyPrediction[]> {
  const files = await listJsonFiles(path.join(DATA_ROOT, "weather-sim", "predictions"));
  const predictions: DailyPrediction[] = [];
  for (const file of files) {
    const parsed = parseDailyPrediction(await readJsonFile(file), path.basename(file, ".json"));
    if (parsed) predictions.push(parsed);
  }
  return predictions;
}

async function loadBets(fileName: string): Promise<Bet[]> {
  const parsed = await readJsonFile(path.join(DATA_ROOT, "weather-sim", "bets", fileName));
  const record = asRecord(parsed);
  return asArray(record?.bets ?? parsed)
    .map(parseBet)
    .filter((item): item is Bet => item !== null);
}

async function loadState(): Promise<SimState> {
  const parsed = asRecord(await readJsonFile(path.join(DATA_ROOT, "weather-sim", "state.json")));
  const voidDryRun = asRecord(parsed?.void_dry_run);
  const voidFromState = uniqueDates([
    ...stringsFrom(parsed?.void_dates),
    ...stringsFrom(parsed?.void_dry_run_date),
    ...stringsFrom(voidDryRun?.date),
  ]);
  const dryRunFromState = uniqueDates([
    ...stringsFrom(parsed?.dry_run_dates ?? parsed?.dryrun_dates),
    ...stringsFrom(parsed?.void_dry_run_date),
    ...stringsFrom(voidDryRun?.date),
  ]);
  return {
    as_of:
      asString(parsed?.as_of) ??
      asString(parsed?.updated_at) ??
      asString(parsed?.updated) ??
      asString(parsed?.last_run) ??
      asString(parsed?.last_run_utc),
    void_dates: voidFromState,
    dry_run_dates: dryRunFromState,
  };
}

function parseDailyPrediction(value: unknown, fallbackDate: string): DailyPrediction | null {
  const record = asRecord(value);
  if (!record) return null;
  const date = isoDate(asString(record.date) ?? fallbackDate);
  if (!date) return null;
  const citiesSource = asRecord(record.cities) ?? record;
  const cities = {
    London: parseCity(citiesSource.London ?? citiesSource.london ?? citiesSource.LON, date),
    Tokyo: parseCity(citiesSource.Tokyo ?? citiesSource.tokyo ?? citiesSource.TYO, date),
    HK: parseCity(
      citiesSource.HK ??
        citiesSource.hk ??
        citiesSource.HongKong ??
        citiesSource.hong_kong ??
        citiesSource["hong-kong"],
      date,
    ),
  };
  const status = (asString(record.status) ?? "").toLowerCase();
  const excluded = asBoolean(record.exclude_from_scoring);
  const isVoidDryRun = status === "void_dry_run" || status === "void-dry-run";
  return {
    date,
    void: asBoolean(record.void) || status === "void" || isVoidDryRun || excluded,
    dry_run:
      asBoolean(record.dry_run) ||
      asBoolean(record.dryRun) ||
      status === "dry-run" ||
      status === "dry_run" ||
      isVoidDryRun ||
      excluded,
    cities,
  };
}

function parseCity(value: unknown, fileDate: string): CityHorizons {
  const record = asRecord(value);
  if (!record) return emptyCity;
  const horizons = asRecord(record.horizons) ?? record;
  return {
    d1: parseBucket(horizons.d1 ?? record.d1, fileDate, 1),
    d2: parseBucket(horizons.d2 ?? record.d2, fileDate, 2),
    d3: parseBucket(horizons.d3 ?? record.d3, fileDate, 3),
  };
}

function parseBucket(value: unknown, fileDate: string, lead: PredictionLead): TempBucket {
  const fallbackTarget = addUtcDays(fileDate, lead);
  if (typeof value === "string") return { high_c: null, bucket: value, target_local_date: fallbackTarget };
  if (typeof value === "number") return { high_c: value, bucket: String(value), target_local_date: fallbackTarget };
  const record = asRecord(value);
  if (!record) return { ...emptyBucket, target_local_date: fallbackTarget };
  return {
    high_c:
      asNumber(record.high_c) ??
      asNumber(record.high) ??
      asNumber(record.temp_c) ??
      asNumber(record.predicted_tmax_c),
    bucket: asString(record.bucket) ?? asString(record.label) ?? asString(record.predicted_bucket),
    target_local_date: isoDate(asString(record.target_local_date)) ?? fallbackTarget,
  };
}

function parseAccount(value: unknown): Account | null {
  const record = asRecord(value);
  const account_id = asString(record?.account_id) ?? asString(record?.id);
  if (!record || !account_id) return null;
  const identity = identityFromAccountId(account_id);
  return {
    account_id,
    name: asString(record.name) ?? asString(record.label),
    city: parseCityId(record.city) ?? identity.city,
    horizon: parseHorizon(record.horizon ?? record.horizon_tag ?? record.day) ?? identity.horizon,
    bankroll: asNumber(record.bankroll) ?? asNumber(record.balance),
    starting_bankroll: asNumber(record.starting_bankroll) ?? asNumber(record.startingBankroll),
    bets_won: asNumber(record.bets_won),
    bets_lost: asNumber(record.bets_lost),
  };
}

function identityFromAccountId(accountId: string): { city: CityId | null; horizon: Horizon | null } {
  const match = accountId.toLowerCase().match(/^(london|lon|tokyo|tyo|hong_kong|hong-kong|hk)_d([123])$/);
  if (!match) return { city: null, horizon: null };
  return {
    city: parseCityId(match[1]),
    horizon: `d${match[2]}` as Horizon,
  };
}

function parseBet(value: unknown): Bet | null {
  const record = asRecord(value);
  if (!record) return null;
  const status = asString(record.status);
  return {
    id: asString(record.id) ?? asString(record.bet_id),
    account_id: asString(record.account_id),
    city: parseCityId(record.city),
    horizon: parseHorizon(record.horizon ?? record.day),
    date: isoDate(asString(record.date) ?? asString(record.target_date) ?? asString(record.predicted_at)),
    bucket: asString(record.bucket),
    resolved_bucket: asString(record.resolved_bucket) ?? asString(record.resolved),
    stake: asNumber(record.stake),
    status,
    result: asString(record.result),
    void:
      asBoolean(record.void) ||
      status?.toLowerCase() === "void" ||
      status?.toLowerCase() === "void_dry_run",
  };
}

function parseCityId(value: unknown): CityId | null {
  const raw = asString(value);
  if (!raw) return null;
  return CITY_ALIASES[raw.toLowerCase().replace(/\s+/g, "")] ?? null;
}

function parseHorizon(value: unknown): Horizon | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 3) {
    return `d${value}` as Horizon;
  }
  const raw = asString(value)?.toLowerCase();
  if (raw === "d1" || raw === "d2" || raw === "d3") return raw;
  if (raw === "1" || raw === "2" || raw === "3") return `d${raw}` as Horizon;
  return null;
}

function stringsFrom(value: unknown): string[] {
  if (typeof value === "string") {
    const date = isoDate(value);
    return date ? [date] : [];
  }
  return asArray(value)
    .map((item) => isoDate(asString(item)))
    .filter((item): item is string => item !== null);
}

function uniqueDates(dates: string[]): string[] {
  return [...new Set(dates)].sort();
}

function collectHiddenDates(predictions: DailyPrediction[], state: SimState, bets: Bet[]): Set<string> {
  const hidden = new Set<string>([...state.void_dates, ...state.dry_run_dates]);
  hidden.add("2026-09-09");
  for (const prediction of predictions) {
    if (prediction.void || prediction.dry_run || isAlwaysHiddenDate(prediction.date)) {
      hidden.add(prediction.date);
    }
  }
  for (const bet of bets) {
    if (bet.date && (bet.void || isAlwaysHiddenDate(bet.date))) hidden.add(bet.date);
  }
  return hidden;
}
