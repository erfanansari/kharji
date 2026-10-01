import { z } from 'zod';

import { RELEASES } from '@/content/releases';

const localizedText = z.object({
  en: z.string().trim().min(1),
  fa: z.string().trim().min(1),
});

const releaseSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'must be a plain semver version, without a `v` prefix'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO calendar date, YYYY-MM-DD'),
  title: localizedText.optional(),
  summary: localizedText.optional(),
  highlights: z
    .array(
      localizedText.extend({
        type: z.enum(['feature', 'improvement', 'fix']),
      })
    )
    .min(1, 'a release needs at least one highlight'),
});

/** `1.2.10` -> `[1, 2, 10]`, for numeric comparison rather than lexicographic. */
const toParts = (version: string) => version.split('.').map(Number);

const compareDesc = (a: string, b: string) => {
  const [aParts, bParts] = [toParts(a), toParts(b)];
  for (let i = 0; i < 3; i += 1) {
    if (aParts[i] !== bParts[i]) return bParts[i] - aParts[i];
  }
  return 0;
};

describe('release notes', () => {
  it('has at least one release', () => {
    expect(RELEASES.length).toBeGreaterThan(0);
  });

  it.each(RELEASES.map((release) => [release.version, release] as const))(
    'v%s matches the release schema',
    (_version, release) => {
      // Fails loudly with the offending path when a locale is missing or a date is malformed.
      expect(() => releaseSchema.parse(release)).not.toThrow();
    }
  );

  it('has no duplicate versions', () => {
    const versions = RELEASES.map((release) => release.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('is ordered newest first', () => {
    const versions = RELEASES.map((release) => release.version);
    expect(versions).toEqual([...versions].sort(compareDesc));
  });

  it('has a date for every release that is not in the future', () => {
    // Guards against a placeholder date left behind while drafting notes.
    const today = new Date().toISOString().slice(0, 10);
    RELEASES.forEach((release) => {
      expect(release.date <= today).toBe(true);
    });
  });

  it('keeps package.json at the newest release, or the one before it while a release is pending', async () => {
    // The release flow commits the notes first and only then runs `pnpm release`,
    // which bumps package.json. In that window the newest notes are one ahead of
    // package.json; anything further apart means notes or version were forgotten.
    const { version } = await import('../../../../package.json');
    expect([RELEASES[0].version, RELEASES[1]?.version]).toContain(version);
  });
});
