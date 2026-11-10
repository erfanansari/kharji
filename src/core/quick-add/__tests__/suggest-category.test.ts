import { createCategorySuggester } from '../suggest-category';

const CATEGORIES = [
  { id: 1, name: 'Transport' },
  { id: 2, name: 'Food' },
  { id: 3, name: 'قبض' },
];

const history = [
  { description: 'اسنپ', categoryId: 1 },
  { description: 'اسنپ', categoryId: 1 },
  { description: 'اسنپ', categoryId: 2 },
  { description: 'تاکسی فرودگاه', categoryId: 1 },
  { description: 'ناهار بیرون', categoryId: 2 },
  { description: 'شام بیرون', categoryId: 2 },
  { description: 'خرید میوه', categoryId: 2 },
  { description: 'خرید بلیط', categoryId: 1 },
];

describe('createCategorySuggester', () => {
  const { suggest } = createCategorySuggester(history, CATEGORIES);

  it('reuses the category an identical description was usually filed under', () => {
    expect(suggest('اسنپ')).toBe(1);
  });

  it('matches regardless of digit script, Arabic letter forms and case', () => {
    const s = createCategorySuggester([{ description: 'Snapp کرایه', categoryId: 1 }], CATEGORIES);
    expect(s.suggest('snapp كرايه')).toBe(1);
  });

  it('lets a distinctive word decide when the description is new', () => {
    expect(suggest('تاکسی تا خونه')).toBe(1);
    expect(suggest('صبحانه بیرون')).toBe(2);
  });

  it('stays silent when the only known word is ambiguous', () => {
    // "خرید" has gone under two categories equally.
    expect(suggest('خرید')).toBeNull();
  });

  it('falls back to a category named in the text', () => {
    expect(suggest('قبض برق')).toBe(3);
  });

  it('returns null with nothing to go on', () => {
    expect(suggest('xyz')).toBeNull();
    expect(createCategorySuggester([], CATEGORIES).suggest('whatever')).toBeNull();
  });

  it('never suggests a category that no longer exists', () => {
    const s = createCategorySuggester([{ description: 'gym', categoryId: 99 }], CATEGORIES);
    expect(s.suggest('gym')).toBeNull();
  });
});
