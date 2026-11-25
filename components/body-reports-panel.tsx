import { EmptyState } from "@/components/empty-state";
import { BodyComparisonTable } from "@/components/body-comparison-table";
import { pivotBodyReports } from "@/lib/body-table";
import type { BodyReport } from "@/lib/types";

export function BodyReportsPanel({ reports }: { reports: BodyReport[] }) {
  const { columns, rows } = pivotBodyReports(reports);
  const trendPoints = [...reports]
    .sort((a, b) => (a.measured_at ?? "").localeCompare(b.measured_at ?? ""))
    .filter((report) => report.metrics.weight_kg !== null || report.metrics.smm_kg !== null);

  if (!columns.length || !rows.length) {
    return (
      <EmptyState
        detail="Add reports[] to data/body-reports/index.json (table[] preferred; metrics still work)."
        title="No body reports"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <BodyComparisonTable columns={columns} rows={rows} />
      {trendPoints.length > 1 ? <SecondaryTrend reports={trendPoints} /> : null}
    </div>
  );
}

function SecondaryTrend({ reports }: { reports: BodyReport[] }) {
  const width = 560;
  const height = 120;
  const pad = 16;
  const weightLine = polyline(
    reports.map((report) => report.metrics.weight_kg),
    width,
    height,
    pad,
  );
  const smmLine = polyline(
    reports.map((report) => report.metrics.smm_kg),
    width,
    height,
    pad,
  );

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">Trend</p>
      <svg className="h-28 w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Weight and SMM trend">
        <polyline fill="none" points={weightLine} stroke="var(--accent)" strokeWidth="2.5" />
        <polyline fill="none" points={smmLine} stroke="var(--success)" strokeWidth="2.5" />
      </svg>
      <div className="flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          weight_kg
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-success" />
          smm_kg
        </span>
      </div>
    </div>
  );
}

function polyline(values: Array<number | null>, width: number, height: number, pad: number): string {
  const numeric = values.filter((value): value is number => value !== null);
  if (!numeric.length) return "";
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const span = max - min || 1;
  return values
    .map((value, index) => {
      if (value === null) return null;
      const x = pad + (index / Math.max(values.length - 1, 1)) * (width - pad * 2);
      const y = height - pad - ((value - min) / span) * (height - pad * 2);
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");
}
