export const FOOD_HISTORY_PAGE_SIZE = 14;
export const SESSIONS_PAGE_SIZE = 10;

export function totalPagesFor(count: number, pageSize: number): number {
  if (count <= 0 || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(count / pageSize));
}

export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, page), Math.max(1, totalPages));
}

export function slicePage<T>(items: T[], page: number, pageSize: number): T[] {
  const current = clampPage(page, totalPagesFor(items.length, pageSize));
  const start = (current - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function pageWindow(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  if (page > 3) pages.push("ellipsis");

  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  for (let index = start; index <= end; index += 1) pages.push(index);

  if (page < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}
