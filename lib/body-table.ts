import type { BodyReport, BodyTableRow } from "@/lib/types";

const METRIC_ORDER = [
  "height_cm",
  "weight_kg",
  "bmi",
  "age",
  "body_age",
  "fat_percent",
  "fat_kg",
  "muscle_kg",
  "smm_kg",
  "smm_ratio_percent",
  "smi",
  "ffm_kg",
  "bone_kg",
  "bmr_kcal",
  "visceral_fat_level",
  "body_water_percent",
  "body_water_kg",
  "muscle_ratio_percent",
  "degree_of_obesity_percent",
  "std_weight_kg",
  "std_muscle_kg",
];

const SEGMENT_ORDER = ["trunk", "left_arm", "right_arm", "left_leg", "right_leg"];

export type BodyComparisonColumn = {
  id: string;
  measuredAt: string | null;
  reportUrl: string | null;
  notes: string | null;
};

export type BodyComparisonRow = {
  key: string;
  label: string;
  unit: string | null;
  valuesByColumn: Record<string, string | null>;
};

export function rowsForReport(report: BodyReport): BodyTableRow[] {
  if (report.table.length) return report.table;
  return fallbackRows(report);
}

export function reportKey(report: BodyReport, index: number): string {
  return report.id ?? report.measured_at ?? `report-${index}`;
}

export function reportsNewestFirst(reports: BodyReport[]): BodyReport[] {
  return [...reports].sort((a, b) => (b.measured_at ?? "").localeCompare(a.measured_at ?? ""));
}

export function pivotBodyReports(reports: BodyReport[]): {
  columns: BodyComparisonColumn[];
  rows: BodyComparisonRow[];
} {
  const newestFirst = reportsNewestFirst(reports);
  const columns: BodyComparisonColumn[] = newestFirst.map((report, index) => ({
    id: reportKey(report, index),
    measuredAt: report.measured_at,
    reportUrl: report.source_url,
    notes: report.notes,
  }));

  const rows: BodyComparisonRow[] = [];
  const indexByKey = new Map<string, number>();

  newestFirst.forEach((report, reportIndex) => {
    const columnId = columns[reportIndex].id;
    rowsForReport(report).forEach((row, rowIndex) => {
      const key = stableRowKey(row, rowIndex);
      let index = indexByKey.get(key);
      if (index === undefined) {
        index = rows.length;
        indexByKey.set(key, index);
        rows.push({
          key,
          label: row.label,
          unit: row.unit,
          valuesByColumn: {},
        });
      } else {
        if (!rows[index].unit && row.unit) rows[index].unit = row.unit;
      }
      rows[index].valuesByColumn[columnId] = row.value;
    });
  });

  return { columns, rows };
}

function stableRowKey(row: BodyTableRow, index: number): string {
  return row.key ?? `${row.label}::${row.unit ?? ""}::${index}`;
}

function fallbackRows(report: BodyReport): BodyTableRow[] {
  const rows: BodyTableRow[] = [];
  const seen = new Set<string>();

  for (const key of METRIC_ORDER) {
    const row = metricRow(key, report.metrics[key]);
    if (!row) continue;
    rows.push(row);
    seen.add(key);
  }

  for (const key of Object.keys(report.metrics).sort()) {
    if (seen.has(key)) continue;
    const row = metricRow(key, report.metrics[key]);
    if (row) rows.push(row);
  }

  appendSegmental(rows, "muscle", "kg", report.segmental_muscle_kg);
  appendSegmental(rows, "fat_pct", "%", report.segmental_fat_percent);
  return rows;
}

function appendSegmental(
  rows: BodyTableRow[],
  kind: "muscle" | "fat_pct",
  unit: string,
  values: Record<string, number | null> | null,
): void {
  if (!values) return;
  const keys = [
    ...SEGMENT_ORDER.filter((key) => key in values),
    ...Object.keys(values).filter((key) => !SEGMENT_ORDER.includes(key)),
  ];
  for (const key of keys) {
    const value = values[key];
    if (value === null || value === undefined) continue;
    const kindLabel = kind === "muscle" ? "muscle" : "fat";
    rows.push({
      key: `seg_${kind}_${key}`,
      label: `${titleCase(key)} ${kindLabel}`,
      value: String(value),
      unit,
      range: null,
    });
  }
}

function metricRow(key: string, value: number | null | undefined): BodyTableRow | null {
  if (value === null || value === undefined) return null;
  const { label, unit } = splitMetric(key);
  return { key, label, value: String(value), unit, range: null };
}

function splitMetric(key: string): { label: string; unit: string | null } {
  if (key.endsWith("_percent")) return { label: titleCase(key.slice(0, -8)), unit: "%" };
  if (key.endsWith("_kg")) return { label: titleCase(key.slice(0, -3)), unit: "kg" };
  if (key.endsWith("_cm")) return { label: titleCase(key.slice(0, -3)), unit: "cm" };
  if (key.endsWith("_kcal")) return { label: titleCase(key.slice(0, -5)), unit: "kcal" };
  if (key.endsWith("_level")) return { label: titleCase(key.slice(0, -6)), unit: null };
  return { label: titleCase(key), unit: null };
}

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());
}
