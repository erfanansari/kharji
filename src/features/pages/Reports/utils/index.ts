import { format } from 'date-fns';

import type { DateRange } from '@features/expenses/components/DateRangeSelector';
import { getDateRangeFilter } from '@features/expenses/components/DateRangeSelector';

import type { ResolvedCalendar } from '@utils';

interface BuildExpensesHrefOptions {
  dateRange: DateRange;
  calendar: ResolvedCalendar;
  categoryIds: number[];
  tagIds: number[];
}

export const buildExpensesHref = ({ dateRange, calendar, categoryIds, tagIds }: BuildExpensesHrefOptions): string => {
  const params = new URLSearchParams();
  const dateFilter = getDateRangeFilter(dateRange, calendar);

  if (dateFilter) {
    params.set('dateFrom', format(dateFilter.start, 'yyyy-MM-dd'));
    params.set('dateTo', format(dateFilter.end, 'yyyy-MM-dd'));
  }
  if (categoryIds.length > 0) params.set('categoryIds', categoryIds.join(','));
  if (tagIds.length > 0) params.set('tagIds', tagIds.join(','));

  const query = params.toString();
  return query ? `/expenses?${query}` : '/expenses';
};
