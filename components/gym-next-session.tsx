"use client";

import { Accordion, Chip, Table } from "@heroui/react";
import { formatDate } from "@/lib/dates";
import type { NextSession, NextSessionPriority } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";

export function GymNextSession({ nextSession }: { nextSession: NextSession | null }) {
  if (!nextSession) {
    return (
      <EmptyState detail="No target on file." title="No next session" />
    );
  }

  return (
    <Accordion className="w-full" defaultExpandedKeys={[]} variant="surface">
      <Accordion.Item id="next-session">
        <Accordion.Heading>
          <Accordion.Trigger>
            {collapsedLabel(nextSession)}
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="flex flex-col gap-5">
            <NextSessionDetails nextSession={nextSession} />
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

function NextSessionDetails({ nextSession }: { nextSession: NextSession }) {
  const basedOn = formatBasedOn(nextSession.based_on_session_type, nextSession.based_on_date);

  return (
    <>
      {nextSession.duration_min?.full != null || nextSession.duration_min?.short != null ? (
        <div className="flex flex-wrap items-center gap-2">
          {nextSession.duration_min?.full != null ? (
            <Chip size="sm" variant="soft">
              {nextSession.duration_min.full} min
            </Chip>
          ) : null}
          {nextSession.duration_min?.short != null ? (
            <Chip size="sm" variant="soft">
              short {nextSession.duration_min.short} min
            </Chip>
          ) : null}
        </div>
      ) : null}

      {nextSession.suggested_date_note ? (
        <p className="text-sm text-muted">{nextSession.suggested_date_note}</p>
      ) : null}

      {basedOn || nextSession.rest_between_sets ? (
        <p className="text-sm text-muted">
          {[basedOn ? `Based on ${basedOn}` : null, nextSession.rest_between_sets]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      {nextSession.goals.length ? (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {nextSession.goals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      ) : null}

      {nextSession.exercises.length ? (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Next session exercises" className="min-w-[640px]">
              <Table.Header>
                <Table.Column isRowHeader>Exercise</Table.Column>
                <Table.Column>Sets</Table.Column>
                <Table.Column>Reps</Table.Column>
                <Table.Column>Priority</Table.Column>
                <Table.Column>Notes</Table.Column>
              </Table.Header>
              <Table.Body>
                {nextSession.exercises.map((exercise, index) => (
                  <Table.Row key={`${exercise.name ?? "exercise"}-${index}`}>
                    <Table.Cell>{exercise.name ?? "—"}</Table.Cell>
                    <Table.Cell>{exercise.sets ?? "—"}</Table.Cell>
                    <Table.Cell>{exercise.reps ?? "—"}</Table.Cell>
                    <Table.Cell>
                      <PriorityChip value={exercise.priority} />
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm text-muted">{exercise.notes ?? "—"}</span>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      ) : null}

      {nextSession.short_version.length ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">
            Short
            {nextSession.duration_min?.short != null
              ? ` · ${nextSession.duration_min.short} min`
              : ""}
          </h3>
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Short next session" className="min-w-[420px]">
                <Table.Header>
                  <Table.Column isRowHeader>Exercise</Table.Column>
                  <Table.Column>Sets</Table.Column>
                  <Table.Column>Reps</Table.Column>
                </Table.Header>
                <Table.Body>
                  {nextSession.short_version.map((exercise, index) => (
                    <Table.Row key={`${exercise.name ?? "short"}-${index}`}>
                      <Table.Cell>{exercise.name ?? "—"}</Table.Cell>
                      <Table.Cell>{exercise.sets ?? "—"}</Table.Cell>
                      <Table.Cell>{exercise.reps ?? "—"}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>
      ) : null}

      {nextSession.notes ? <p className="text-sm text-muted">{nextSession.notes}</p> : null}
    </>
  );
}

function collapsedLabel(nextSession: NextSession): string {
  const type = nextSession.session_type ? nextSession.session_type.replaceAll("_", " ") : null;
  const date = nextSession.suggested_date ? formatDate(nextSession.suggested_date) : null;
  return [type, date].filter(Boolean).join(" · ") || "Next session";
}

function PriorityChip({ value }: { value: NextSessionPriority | null }) {
  if (!value) return <span className="text-muted">—</span>;
  const color = value === "primary" ? "accent" : value === "secondary" ? "success" : "default";
  return (
    <Chip color={color} size="sm" variant="soft">
      {value}
    </Chip>
  );
}

function formatBasedOn(sessionType: string | null, date: string | null): string | null {
  const type = sessionType ? sessionType.replaceAll("_", " ") : null;
  const when = date ? formatDate(date) : null;
  if (!type && !when) return null;
  return [type, when].filter(Boolean).join(" · ");
}
