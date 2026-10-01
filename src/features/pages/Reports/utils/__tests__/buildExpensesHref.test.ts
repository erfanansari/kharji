import { buildExpensesHref } from '../index';

describe('buildExpensesHref', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 18)); // 2026-05-18
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('links to the bare expenses page when nothing is filtered', () => {
    expect(buildExpensesHref({ dateRange: 'ALL_TIME', calendar: 'gregorian', categoryIds: [], tagIds: [] })).toBe(
      '/expenses'
    );
  });

  it('carries the report date window', () => {
    const href = buildExpensesHref({ dateRange: '7D', calendar: 'gregorian', categoryIds: [], tagIds: [] });
    expect(href).toBe('/expenses?dateFrom=2026-05-12&dateTo=2026-05-18');
  });

  it('carries category and tag filters as comma-separated ids', () => {
    const href = buildExpensesHref({ dateRange: 'ALL_TIME', calendar: 'gregorian', categoryIds: [1, 2], tagIds: [9] });
    const params = new URL(href, 'http://x').searchParams;
    expect(params.get('categoryIds')).toBe('1,2');
    expect(params.get('tagIds')).toBe('9');
  });

  it('produces a URL that parseExpenseFilters reads back', async () => {
    const { parseExpenseFilters } = await import('@features/pages/Expenses/utils');
    const href = buildExpensesHref({
      dateRange: 'THIS_MONTH',
      calendar: 'gregorian',
      categoryIds: [3],
      tagIds: [4, 5],
    });
    const params = Object.fromEntries(new URL(href, 'http://x').searchParams);
    expect(parseExpenseFilters(params)).toEqual({
      dateFrom: '2026-05-01',
      dateTo: '2026-05-18',
      categoryIds: [3],
      tagIds: [4, 5],
    });
  });
});
