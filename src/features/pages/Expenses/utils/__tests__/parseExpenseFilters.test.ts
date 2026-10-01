import { parseExpenseFilters } from '../index';

describe('parseExpenseFilters', () => {
  it('returns no filters for empty search params', () => {
    expect(parseExpenseFilters({})).toEqual({});
  });

  it('parses comma-separated and repeated id params, de-duplicated', () => {
    expect(parseExpenseFilters({ categoryIds: '1,2,2', tagIds: ['3', '4,5'] })).toEqual({
      categoryIds: [1, 2],
      tagIds: [3, 4, 5],
    });
  });

  it('accepts the legacy singular categoryId param', () => {
    expect(parseExpenseFilters({ categoryId: '7' })).toEqual({ categoryIds: [7] });
  });

  it('drops invalid ids', () => {
    expect(parseExpenseFilters({ categoryIds: 'abc,0,-3,1.5,4', tagIds: 'x' })).toEqual({ categoryIds: [4] });
  });

  it('only accepts YYYY-MM-DD dates', () => {
    expect(parseExpenseFilters({ dateFrom: '2026-08-01', dateTo: '01/09/2026' })).toEqual({ dateFrom: '2026-08-01' });
  });

  it('trims the description and ignores a blank one', () => {
    expect(parseExpenseFilters({ description: '  rent ' })).toEqual({ description: 'rent' });
    expect(parseExpenseFilters({ description: '   ' })).toEqual({});
  });

  it('uses the first value when a scalar param is repeated', () => {
    expect(parseExpenseFilters({ description: ['a', 'b'] })).toEqual({ description: 'a' });
  });
});
