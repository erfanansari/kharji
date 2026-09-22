import en from '../../messages/en.json';
import fa from '../../messages/fa.json';

/** Every leaf key as a dotted path, so a mismatch names exactly what is missing. */
function leafPaths(node: unknown, prefix = ''): string[] {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    leafPaths(value, prefix ? `${prefix}.${key}` : key)
  );
}

/**
 * The two locale files must carry exactly the same keys.
 *
 * next-intl's types are generated from en.json, so a key missing from en.json
 * is a compile error — but a key missing from fa.json is not. It renders as the
 * raw key path to a Persian user, in a Persian-first app, and nothing else in
 * the toolchain notices. Until this test, "keys must stay in lockstep" was
 * enforced by attention alone.
 */
describe('message catalogues', () => {
  const enKeys = new Set(leafPaths(en));
  const faKeys = new Set(leafPaths(fa));

  it('has no key in en.json that is missing from fa.json', () => {
    const missing = [...enKeys].filter((k) => !faKeys.has(k));
    expect(missing).toEqual([]);
  });

  it('has no key in fa.json that is missing from en.json', () => {
    const extra = [...faKeys].filter((k) => !enKeys.has(k));
    expect(extra).toEqual([]);
  });

  it('has no empty translations', () => {
    const empties = (catalogue: unknown, name: string) =>
      leafPaths(catalogue)
        .filter((path) => {
          const value = path
            .split('.')
            .reduce<unknown>((acc, part) => (acc as Record<string, unknown>)[part], catalogue);
          return typeof value === 'string' && value.trim() === '';
        })
        .map((path) => `${name}:${path}`);

    expect([...empties(en, 'en'), ...empties(fa, 'fa')]).toEqual([]);
  });
});
