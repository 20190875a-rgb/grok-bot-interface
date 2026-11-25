"use client";

import { Pagination } from "@heroui/react";
import { pageWindow, totalPagesFor } from "@/lib/pagination";

export function PagePagination({
  page,
  pageSize,
  totalItems,
  itemLabel,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}) {
  if (!totalItems) return null;

  const totalPages = totalPagesFor(totalItems, pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <Pagination className="w-full">
      <Pagination.Summary>
        {startItem}–{endItem} of {totalItems} {itemLabel}
      </Pagination.Summary>
      {totalPages > 1 ? (
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous isDisabled={page === 1} onPress={() => onPageChange(page - 1)}>
              <Pagination.PreviousIcon />
              <span>Previous</span>
            </Pagination.Previous>
          </Pagination.Item>
          {pageWindow(page, totalPages).map((item, index) =>
            item === "ellipsis" ? (
              <Pagination.Item key={`ellipsis-${index}`}>
                <Pagination.Ellipsis />
              </Pagination.Item>
            ) : (
              <Pagination.Item key={item}>
                <Pagination.Link isActive={item === page} onPress={() => onPageChange(item)}>
                  {item}
                </Pagination.Link>
              </Pagination.Item>
            ),
          )}
          <Pagination.Item>
            <Pagination.Next isDisabled={page === totalPages} onPress={() => onPageChange(page + 1)}>
              <span>Next</span>
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      ) : null}
    </Pagination>
  );
}
