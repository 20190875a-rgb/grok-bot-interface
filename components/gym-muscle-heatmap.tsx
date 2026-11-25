"use client";

import { Chip, Tabs } from "@heroui/react";
import { BodyChart, ViewSide, type BodyState } from "body-muscles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Key } from "react";
import { formatDate } from "@/lib/dates";
import {
  overallBodyState,
  scoreSessions,
  sessionBodyState,
  topExercises,
  withSelected,
} from "@/lib/muscle-heatmap";
import type { ExerciseMuscleMap, GymSession, MuscleBodyState } from "@/lib/types";

type HeatmapTab = "overall" | "latest";

export function GymMuscleHeatmap({
  sessions,
  muscleMap,
}: {
  sessions: GymSession[];
  muscleMap: ExerciseMuscleMap | null;
}) {
  const [tab, setTab] = useState<HeatmapTab>("overall");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const latest = sessions[0] ?? null;

  const overallScores = useMemo(
    () => (muscleMap ? scoreSessions(sessions, muscleMap) : {}),
    [sessions, muscleMap],
  );
  const latestScores = useMemo(
    () => (muscleMap && latest ? scoreSessions([latest], muscleMap) : {}),
    [muscleMap, latest],
  );
  const ranking = useMemo(() => topExercises(sessions, muscleMap), [sessions, muscleMap]);

  const baseState = useMemo(
    () => (tab === "latest" ? sessionBodyState(latestScores) : overallBodyState(overallScores)),
    [tab, latestScores, overallScores],
  );
  // Front and back charts both receive this same object.
  const bodyState = useMemo(() => withSelected(baseState, selectedId), [baseState, selectedId]);

  const onSelect = useCallback((id: string) => {
    setSelectedId((current) => (current === id ? null : id));
  }, []);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-medium">肌群熱圖</h2>
        <p className="text-sm text-muted">Muscle heatmap</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border p-3">
          <BodyChartPane
            bodyState={bodyState}
            caption="正面 · Front"
            view={ViewSide.FRONT}
            onSelect={onSelect}
          />
          <BodyChartPane
            bodyState={bodyState}
            caption="背面 · Back"
            view={ViewSide.BACK}
            onSelect={onSelect}
          />
        </div>
        <Tabs
          className="w-full"
          selectedKey={tab}
          variant="secondary"
          onSelectionChange={(key: Key) => {
            setTab(String(key) === "latest" ? "latest" : "overall");
            setSelectedId(null);
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="肌群熱圖 Muscle heatmap">
              <Tabs.Tab id="overall">
                整體 <span className="text-muted">Overall</span>
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="latest">
                最近一次 <span className="text-muted">Latest</span>
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="overall" className="pt-4">
            <OverallPanel ranking={ranking} />
          </Tabs.Panel>
          <Tabs.Panel id="latest" className="pt-4">
            <LatestPanel session={latest} />
          </Tabs.Panel>
        </Tabs>
      </div>
      {muscleMap ? null : (
        <p className="text-sm text-muted">尚未載入肌群對照，熱圖為空。Muscle map unavailable. Heatmap is empty.</p>
      )}
    </section>
  );
}

function BodyChartPane({
  view,
  bodyState,
  caption,
  onSelect,
}: {
  view: ViewSide;
  bodyState: MuscleBodyState;
  caption: string;
  onSelect: (id: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<BodyChart | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const chart = new BodyChart(host, {
      view,
      bodyState: {},
      ariaLabel: caption,
      onMuscleClick: (id) => {
        onSelectRef.current(id);
      },
    });
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [view, caption]);

  useEffect(() => {
    chartRef.current?.update({ bodyState: bodyState as BodyState });
  }, [bodyState]);

  return (
    <figure className="flex min-w-0 flex-col gap-1">
      <div ref={hostRef} className="min-h-48 w-full" />
      <figcaption className="text-center text-xs text-muted">{caption}</figcaption>
    </figure>
  );
}

function OverallPanel({ ranking }: { ranking: { name: string; count: number }[] }) {
  if (!ranking.length) {
    return (
      <p className="text-sm text-muted">尚無訓練紀錄。No exercises in history.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">最常練 Top 5</p>
      <ol className="flex flex-col gap-2">
        {ranking.map((item, index) => (
          <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
            <span>
              <span className="mr-2 text-muted">{index + 1}</span>
              {item.name}
            </span>
            <span className="text-muted">{item.count} 次</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LatestPanel({ session }: { session: GymSession | null }) {
  if (!session) {
    return <p className="text-sm text-muted">尚無最近一次訓練。No session logged yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{formatDate(session.date)}</span>
        {session.session_type ? (
          <Chip size="sm" variant="soft">
            {session.session_type.replaceAll("_", " ")}
          </Chip>
        ) : null}
      </div>
      {session.exercises.length ? (
        <ul className="flex flex-col gap-2">
          {session.exercises.map((exercise, index) => (
            <li
              key={`${exercise.name ?? "exercise"}-${index}`}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span>{exercise.name ?? "Exercise"}</span>
              <span className="shrink-0 text-muted">{formatWork(exercise.sets, exercise.reps)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">這次沒有動作紀錄。No exercises in this session.</p>
      )}
    </div>
  );
}

function formatWork(sets: number | null, reps: number | string | null): string {
  if (sets === null && reps === null) return "—";
  if (reps === null) return `${sets ?? "?"} sets`;
  return `${sets ?? "?"}×${reps}`;
}
