// Guess an expense's category from what the user has filed before.
//
// No model, no network: the user's own history is the best classifier they
// have. "اسنپ" has gone under Transport forty times, so the forty-first does
// too. Pure, so the guess is the same on every render and easy to test.
import { normalizeText } from './parse';

export interface CategoryHistoryItem {
  description: string;
  categoryId: number;
}

export interface CategoryCandidate {
  id: number;
  name: string;
}

export interface CategorySuggester {
  /** The category id to pre-select, or null when nothing is convincing. */
  suggest: (description: string) => number | null;
}

const tokenize = (text: string): string[] =>
  normalizeText(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2 && !/^\d+$/.test(token));

/** A word must point at one category at least this strongly to decide alone. */
const MIN_CONFIDENCE = 0.6;

export function createCategorySuggester(
  history: CategoryHistoryItem[],
  categories: CategoryCandidate[]
): CategorySuggester {
  const known = new Set(categories.map((c) => c.id));
  const byDescription = new Map<string, Map<number, number>>();
  const byToken = new Map<string, Map<number, number>>();

  const bump = (index: Map<string, Map<number, number>>, key: string, categoryId: number) => {
    const counts = index.get(key) ?? new Map<number, number>();
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
    index.set(key, counts);
  };

  for (const item of history) {
    // A category deleted since can't be suggested.
    if (!known.has(item.categoryId)) continue;
    bump(byDescription, normalizeText(item.description).trim(), item.categoryId);
    for (const token of new Set(tokenize(item.description))) bump(byToken, token, item.categoryId);
  }

  const top = (counts: Map<number, number>): number =>
    Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];

  const suggest = (description: string): number | null => {
    // 1. Seen this exact description before → whatever it was usually filed as.
    const exact = byDescription.get(normalizeText(description).trim());
    if (exact) return top(exact);

    // 2. Otherwise let each known word vote, weighted by how exclusively it
    //    belongs to a category — "قبض" (always Bills) outvotes "خرید" (anything).
    const scores = new Map<number, number>();
    let voters = 0;
    for (const token of new Set(tokenize(description))) {
      const counts = byToken.get(token);
      if (!counts) continue;
      voters++;
      const total = Array.from(counts.values()).reduce((sum, n) => sum + n, 0);
      for (const [categoryId, n] of counts) scores.set(categoryId, (scores.get(categoryId) ?? 0) + n / total);
    }
    if (voters > 0) {
      const [bestId, bestScore] = Array.from(scores.entries()).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
      if (bestScore / voters >= MIN_CONFIDENCE) return bestId;
    }

    // 3. No usable history: a category named in the text itself.
    const normalized = normalizeText(description);
    const named = categories.find((c) => {
      const name = normalizeText(c.name).trim();
      return name.length >= 2 && normalized.includes(name);
    });
    return named?.id ?? null;
  };

  return { suggest };
}
