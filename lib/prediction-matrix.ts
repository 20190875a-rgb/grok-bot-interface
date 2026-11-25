import { addUtcDays, isoDate, utcDayDiff } from "@/lib/dates";
import type {
  Account,
  Bet,
  CityId,
  DailyPrediction,
  Horizon,
  PredictionCell,
  PredictionLead,
  PredictionMatrixRow,
  TempBucket,
} from "@/lib/types";

export const CITIES: CityId[] = ["London", "Tokyo", "HK"];
export const HORIZONS: Horizon[] = ["d3", "d2", "d1"];
export const DATE_COLUMN_COUNT = 3;

export const LEAD_LABELS: Record<PredictionLead, { zh: string; en: string }> = {
  3: { zh: "−3天", en: "−3 day" },
  2: { zh: "−2天", en: "−2 day" },
  1: { zh: "−1天", en: "−1 day" },
};

const CITY_RANK: Record<CityId, number> = { London: 0, Tokyo: 1, HK: 2 };

export function buildPredictionMatrix(
  accounts: Account[],
  predictions: DailyPrediction[],
  historyBets: Bet[],
  hiddenDates: ReadonlySet<string>,
  asOf: string | null,
): { columns: string[]; rows: PredictionMatrixRow[] } {
  const resolved = resolvedByCityDate(historyBets, hiddenDates);
  const forecast = forecastsByAccountDate(predictions, hiddenDates);
  const columns = lastResultDates(forecast.keys(), resolved.keys(), hiddenDates, asOf);
  const rows = matrixAccounts(accounts).map((account) => {
    const city = account.city as CityId;
    const lead = horizonLead(account.horizon as Horizon);
    const cells: Record<string, PredictionCell> = {};
    for (const date of columns) {
      const label = forecast.get(forecastKey(city, lead, date));
      const resolvedBucket = resolved.get(cityDateKey(city, date)) ?? null;
      cells[date] = toneCell(label, resolvedBucket);
    }
    return {
      key: account.account_id,
      account,
      city,
      lead,
      cells,
    };
  });
  return { columns, rows };
}

export function cityLabel(city: CityId): string {
  if (city === "HK") return "Hong Kong";
  return city;
}

export function accountTitle(lead: PredictionLead, city: CityId): { zh: string; en: string } {
  const labels = LEAD_LABELS[lead];
  const cityName = cityLabel(city);
  return { zh: `${labels.zh} ${cityName}`, en: `${labels.en} ${cityName}` };
}

export function sortAccounts(accounts: Account[]): Account[] {
  return [...accounts].sort((left, right) => {
    const leftCity = left.city ? CITY_RANK[left.city] : 99;
    const rightCity = right.city ? CITY_RANK[right.city] : 99;
    if (leftCity !== rightCity) return leftCity - rightCity;
    const leftLead = left.horizon ? horizonLead(left.horizon) : 0;
    const rightLead = right.horizon ? horizonLead(right.horizon) : 0;
    if (leftLead !== rightLead) return rightLead - leftLead;
    return left.account_id.localeCompare(right.account_id);
  });
}

export function formatBankroll(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
}

function matrixAccounts(accounts: Account[]): Account[] {
  const usable = accounts.filter((account) => account.city && account.horizon);
  return sortAccounts(usable.length ? usable : defaultAccounts());
}

function defaultAccounts(): Account[] {
  return CITIES.flatMap((city) =>
    HORIZONS.map((horizon) => ({
      account_id: `${accountCitySlug(city)}_${horizon}`,
      name: accountTitle(horizonLead(horizon), city).en,
      city,
      horizon,
      bankroll: null,
      starting_bankroll: null,
      bets_won: null,
      bets_lost: null,
    })),
  );
}

function forecastsByAccountDate(
  predictions: DailyPrediction[],
  hiddenDates: ReadonlySet<string>,
): Map<string, string> {
  const forecast = new Map<string, string>();
  for (const prediction of predictions) {
    if (prediction.void || prediction.dry_run || hiddenDates.has(prediction.date)) continue;
    for (const city of CITIES) {
      for (const horizon of ["d1", "d2", "d3"] as Horizon[]) {
        const bucket = prediction.cities[city][horizon];
        const label = displayBucket(bucket);
        if (!label || isHiddenBucket(label)) continue;
        const lead = horizonLead(horizon);
        const target = isoDate(bucket.target_local_date) ?? addUtcDays(prediction.date, lead);
        if (!target || hiddenDates.has(target)) continue;
        const actualLead = utcDayDiff(prediction.date, target);
        if (actualLead !== lead) continue;
        forecast.set(forecastKey(city, lead, target), label);
      }
    }
  }
  return forecast;
}

function lastResultDates(
  forecastKeys: Iterable<string>,
  resolvedKeys: Iterable<string>,
  hiddenDates: ReadonlySet<string>,
  asOf: string | null,
): string[] {
  const cap = isoDate(asOf);
  const dates = new Set<string>();
  for (const key of forecastKeys) {
    const date = key.split("|")[2];
    if (date && !hiddenDates.has(date) && (!cap || date <= cap)) dates.add(date);
  }
  for (const key of resolvedKeys) {
    const date = key.split("|")[1];
    if (date && !hiddenDates.has(date) && (!cap || date <= cap)) dates.add(date);
  }
  return [...dates].sort().slice(-DATE_COLUMN_COUNT);
}

function resolvedByCityDate(historyBets: Bet[], hiddenDates: ReadonlySet<string>): Map<string, string> {
  const resolved = new Map<string, string>();
  for (const bet of historyBets) {
    if (bet.void || !bet.city || !bet.date || !bet.resolved_bucket) continue;
    if (hiddenDates.has(bet.date) || isHiddenBucket(bet.resolved_bucket)) continue;
    resolved.set(cityDateKey(bet.city, bet.date), bet.resolved_bucket);
  }
  return resolved;
}

function toneCell(label: string | undefined, resolvedBucket: string | null): PredictionCell {
  if (!label) return { label: null, tone: "empty" };
  if (!resolvedBucket) return { label, tone: "pending" };
  return { label, tone: bucketsMatch(label, resolvedBucket) ? "correct" : "wrong" };
}

function displayBucket(bucket: TempBucket): string | null {
  if (bucket.bucket) return bucket.bucket;
  if (bucket.high_c === null) return null;
  return `${Number.isInteger(bucket.high_c) ? bucket.high_c : bucket.high_c.toFixed(1)}°C`;
}

function bucketsMatch(predicted: string, resolved: string): boolean {
  return normalizeBucket(predicted) === normalizeBucket(resolved);
}

function normalizeBucket(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, "");
}

function isHiddenBucket(label: string): boolean {
  const normalized = normalizeBucket(label);
  return normalized === "void" || normalized === "dry-run" || normalized === "dry_run" || normalized === "void_dry_run";
}

export function horizonLead(horizon: Horizon): PredictionLead {
  if (horizon === "d3") return 3;
  if (horizon === "d2") return 2;
  return 1;
}

function accountCitySlug(city: CityId): string {
  if (city === "HK") return "hong_kong";
  return city.toLowerCase();
}

function forecastKey(city: CityId, lead: PredictionLead, date: string): string {
  return `${city}|${lead}|${date}`;
}

function cityDateKey(city: CityId, date: string): string {
  return `${city}|${date}`;
}
