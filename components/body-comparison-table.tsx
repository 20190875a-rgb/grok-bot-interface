"use client";

import { Link, Table } from "@heroui/react";
import { formatDateTime } from "@/lib/dates";
import type { BodyComparisonColumn, BodyComparisonRow } from "@/lib/body-table";

export function BodyComparisonTable({
  columns,
  rows,
}: {
  columns: BodyComparisonColumn[];
  rows: BodyComparisonRow[];
}) {
  const notes = columns.filter((column) => column.notes);

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Body report comparison" className="min-w-[640px]">
            <Table.Header>
              <Table.Column isRowHeader>Metric</Table.Column>
              <Table.Column>Unit</Table.Column>
              {columns.map((column) => (
                <Table.Column key={column.id}>
                  <div className="flex flex-col gap-1">
                    <span>{formatDateTime(column.measuredAt)}</span>
                    {column.reportUrl ? (
                      <Link
                        className="text-xs font-normal"
                        href={column.reportUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Full report
                        <Link.Icon />
                      </Link>
                    ) : null}
                  </div>
                </Table.Column>
              ))}
            </Table.Header>
            <Table.Body>
              {rows.map((row) => (
                <Table.Row key={row.key}>
                  <Table.Cell>{row.label}</Table.Cell>
                  <Table.Cell>
                    <span className="text-muted">{row.unit ?? "—"}</span>
                  </Table.Cell>
                  {columns.map((column) => (
                    <Table.Cell key={`${row.key}-${column.id}`}>
                      <span className="tabular-nums">{row.valuesByColumn[column.id] ?? "—"}</span>
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      {notes.length
        ? notes.map((column) => (
            <p key={column.id} className="text-sm text-muted">
              {formatDateTime(column.measuredAt)} · {column.notes}
            </p>
          ))
        : null}
    </div>
  );
}
