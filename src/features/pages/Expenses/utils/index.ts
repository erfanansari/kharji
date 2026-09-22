import type { ExpenseFilters } from '@api/getExpenseListQuery';

type SearchParams = Record<string, string | string[] | undefined>;

const readValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const readIds = (value: string | string[] | undefined): number[] | undefined => {
  let values: string[] = [];
  if (Array.isArray(value)) values = value;
  else if (value) values = [value];
  const ids = [
    ...new Set(
      values
        .flatMap((item) => item.split(','))
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];
  return ids.length > 0 ? ids : undefined;
};

const readDate = (value: string | string[] | undefined): string | undefined => {
  const date = readValue(value);
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
};

export const parseExpenseFilters = (searchParams: SearchParams): ExpenseFilters => {
  const categoryIds = readIds(searchParams.categoryIds ?? searchParams.categoryId);
  const tagIds = readIds(searchParams.tagIds);
  const description = readValue(searchParams.description)?.trim() || undefined;
  const dateFrom = readDate(searchParams.dateFrom);
  const dateTo = readDate(searchParams.dateTo);

  return {
    ...(description ? { description } : {}),
    ...(categoryIds ? { categoryIds } : {}),
    ...(tagIds ? { tagIds } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };
};
