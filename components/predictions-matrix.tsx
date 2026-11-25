import { Table } from "@heroui/react";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/dates";
import { accountTitle } from "@/lib/prediction-matrix";
import type { PredictionCell, PredictionMatrixRow } from "@/lib/types";

export function PredictionsMatrix({
  columns,
  rows,
}: {
  columns: string[];
  rows: PredictionMatrixRow[];
}) {
  if (!rows.length || !columns.length) {
    return (
      <EmptyState
        detail="Add YYYY-MM-DD.json files under data/weather-sim/predictions/. History resolved_bucket colors settled cells."
        title="No predictions"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Account prediction matrix" className="min-w-[640px]">
            <Table.Header>
              <Table.Column isRowHeader>Account</Table.Column>
              {columns.map((date) => (
                <Table.Column key={date}>{formatDate(date)}</Table.Column>
              ))}
            </Table.Header>
            <Table.Body>
              {rows.map((row) => {
                const title = accountTitle(row.lead, row.city);
                return (
                  <Table.Row key={row.key}>
                    <Table.Cell>
                      <div className="flex flex-col">
                        <span className="font-medium">{title.zh}</span>
                        <span className="text-xs text-muted">{title.en}</span>
                      </div>
                    </Table.Cell>
                    {columns.map((date) => (
                      <Table.Cell key={`${row.key}-${date}`}>
                        <BucketCell cell={row.cells[date] ?? { label: null, tone: "empty" }} />
                      </Table.Cell>
                    ))}
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      <p className="text-sm text-muted">
        Each row is a city × horizon account. Columns are the last three target dates. Settled cells
        compare the predicted bucket to history <span className="text-foreground">resolved_bucket</span>
        : green match, red miss. Unsettled stays neutral. Void and dry-run days are hidden.
      </p>
    </div>
  );
}

function BucketCell({ cell }: { cell: PredictionCell }) {
  if (cell.tone === "empty" || !cell.label) return <span className="text-muted">—</span>;
  if (cell.tone === "pending") return <span className="tabular-nums">{cell.label}</span>;
  const toneClass =
    cell.tone === "correct"
      ? "bg-success-soft text-success-soft-foreground"
      : "bg-danger-soft text-danger-soft-foreground";
  return <span className={`inline-flex rounded-lg px-2 py-0.5 tabular-nums ${toneClass}`}>{cell.label}</span>;
}
