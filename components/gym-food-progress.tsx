import { Chip, Label, ProgressBar } from "@heroui/react";
import { Card } from "@heroui/react";
import type { MacroTotals } from "@/lib/types";

export function GymFoodProgress({
  today,
  totals,
  targets,
  entryCount,
}: {
  today: string;
  totals: MacroTotals;
  targets: MacroTotals;
  entryCount: number;
}) {
  if (!entryCount) {
    return (
      <Card className="w-full">
        <Card.Header>
          <Card.Title>Today&apos;s food</Card.Title>
          <Card.Description>No meals logged for {today} yet.</Card.Description>
        </Card.Header>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <Card.Header>
        <div className="flex items-center justify-between gap-3">
          <Card.Title>Today&apos;s food</Card.Title>
          <Chip size="sm" variant="soft">
            {today}
          </Chip>
        </div>
        <Card.Description>Totals vs daily targets (kcal + protein).</Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-5">
        <MacroBar
          color="accent"
          label="Calories"
          target={targets.kcal}
          unit="kcal"
          value={totals.kcal}
        />
        <MacroBar
          color="success"
          label="Protein"
          target={targets.protein_g}
          unit="g"
          value={totals.protein_g}
        />
      </Card.Content>
    </Card>
  );
}

function MacroBar({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string;
  value: number | null;
  target: number | null;
  unit: string;
  color: "accent" | "success";
}) {
  const max = target ?? Math.max(value ?? 0, 1);
  const current = value ?? 0;
  return (
    <ProgressBar
      aria-label={label}
      className="w-full"
      color={color}
      formatOptions={{ style: "decimal", maximumFractionDigits: 0 }}
      maxValue={max}
      minValue={0}
      value={Math.min(current, max)}
      valueLabel={`${formatNum(value)} / ${formatNum(target)} ${unit}`}
    >
      <Label>{label}</Label>
      <ProgressBar.Output />
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

function formatNum(value: number | null): string {
  return value === null ? "—" : String(Math.round(value));
}
