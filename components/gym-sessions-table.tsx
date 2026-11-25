"use client";

import { useState } from "react";
import { Chip, Table } from "@heroui/react";
import { EmptyState } from "@/components/empty-state";
import { PagePagination } from "@/components/page-pagination";
import { formatDate } from "@/lib/dates";
import { clampPage, SESSIONS_PAGE_SIZE, slicePage, totalPagesFor } from "@/lib/pagination";
import type { GymSession } from "@/lib/types";

export function GymSessionsTable({ sessions }: { sessions: GymSession[] }) {
  const [page, setPage] = useState(1);

  if (!sessions.length) {
    return (
      <EmptyState
        detail="Add session files under data/gym-log/YYYY-MM/ to populate this timeline."
        title="No gym sessions"
      />
    );
  }

  const totalPages = totalPagesFor(sessions.length, SESSIONS_PAGE_SIZE);
  const currentPage = clampPage(page, totalPages);
  const visibleSessions = slicePage(sessions, currentPage, SESSIONS_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Gym sessions" className="min-w-[640px]">
            <Table.Header>
              <Table.Column isRowHeader>Date</Table.Column>
              <Table.Column>Type</Table.Column>
              <Table.Column>Exercises</Table.Column>
              <Table.Column>Work</Table.Column>
            </Table.Header>
            <Table.Body>
              {visibleSessions.map((session, index) => (
                <Table.Row key={session.id ?? `${session.date}-${session.session_type ?? "session"}-${index}`}>
                  <Table.Cell>{formatDate(session.date)}</Table.Cell>
                  <Table.Cell>
                    <SessionTypeChip value={session.session_type} />
                  </Table.Cell>
                  <Table.Cell>{session.exercises.length}</Table.Cell>
                  <Table.Cell>
                    <span className="text-sm text-muted">
                      {session.exercises
                        .map((exercise) => formatLift(exercise.name, exercise.sets, exercise.reps))
                        .join(" · ") || "—"}
                    </span>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      <PagePagination
        itemLabel="sessions"
        page={currentPage}
        pageSize={SESSIONS_PAGE_SIZE}
        totalItems={sessions.length}
        onPageChange={setPage}
      />
    </div>
  );
}

function SessionTypeChip({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted">—</span>;
  const color = value.startsWith("A") ? "accent" : value.startsWith("B") ? "success" : "default";
  return (
    <Chip color={color} size="sm" variant="soft">
      {value.replaceAll("_", " ")}
    </Chip>
  );
}

function formatLift(name: string | null, sets: number | null, reps: number | string | null): string {
  const label = name ?? "Exercise";
  if (sets === null && reps === null) return label;
  return `${label} ${sets ?? "?"}×${reps ?? "?"}`;
}
