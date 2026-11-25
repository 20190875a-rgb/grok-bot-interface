"use client";

import { useState } from "react";
import { Accordion, Table } from "@heroui/react";
import { EmptyState } from "@/components/empty-state";
import { PagePagination } from "@/components/page-pagination";
import { formatDate } from "@/lib/dates";
import { clampPage, FOOD_HISTORY_PAGE_SIZE, slicePage, totalPagesFor } from "@/lib/pagination";
import type { FoodDay, FoodEntry, FoodItem, MacroTotals } from "@/lib/types";

export function GymFoodHistory({ days }: { days: FoodDay[] }) {
  const [page, setPage] = useState(1);

  if (!days.length) {
    return (
      <EmptyState
        detail="Add meal entries under data/food-log/YYYY-MM.json to populate this list."
        title="No food history"
      />
    );
  }

  const totalPages = totalPagesFor(days.length, FOOD_HISTORY_PAGE_SIZE);
  const currentPage = clampPage(page, totalPages);
  const visibleDays = slicePage(days, currentPage, FOOD_HISTORY_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <Accordion allowsMultipleExpanded className="w-full" variant="surface">
        {visibleDays.map((day) => (
          <Accordion.Item key={day.date} id={day.date}>
            <Accordion.Heading>
              <Accordion.Trigger>
                {formatDayLabel(day.date, day.totals)}
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="flex flex-col gap-4">
                {day.meals.map((meal, index) => (
                  <MealBlock key={`${day.date}-${meal.meal ?? "meal"}-${index}`} meal={meal} />
                ))}
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
      <PagePagination
        itemLabel="days"
        page={currentPage}
        pageSize={FOOD_HISTORY_PAGE_SIZE}
        totalItems={days.length}
        onPageChange={setPage}
      />
    </div>
  );
}

function MealBlock({ meal }: { meal: FoodEntry }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium capitalize">{meal.meal ?? "Meal"}</h3>
      {meal.items.length ? (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label={`${meal.meal ?? "Meal"} items`} className="min-w-[420px]">
              <Table.Header>
                <Table.Column isRowHeader>Item</Table.Column>
                <Table.Column>kcal</Table.Column>
                <Table.Column>Protein</Table.Column>
              </Table.Header>
              <Table.Body>
                {meal.items.map((item, index) => (
                  <Table.Row key={`${item.name ?? "item"}-${index}`}>
                    <Table.Cell>{formatItemName(item)}</Table.Cell>
                    <Table.Cell>{formatNumber(item.kcal)}</Table.Cell>
                    <Table.Cell>{formatProtein(item.protein_g)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      ) : (
        <p className="text-sm text-muted">
          {formatNumber(meal.totals.kcal)} kcal · {formatProtein(meal.totals.protein_g)}
        </p>
      )}
    </div>
  );
}

function formatDayLabel(date: string, totals: MacroTotals): string {
  return `${formatDate(date)} · ${formatNumber(totals.kcal)} kcal · ${formatProtein(totals.protein_g)}`;
}

function formatItemName(item: FoodItem): string {
  return [item.name ?? "Item", item.amount].filter(Boolean).join(" · ");
}

function formatNumber(value: number | null): string {
  return value === null ? "—" : String(Math.round(value));
}

function formatProtein(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}g`;
}
