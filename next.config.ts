import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { withSentryConfig } from '@sentry/nextjs';
import { execSync } from 'child_process';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const getCommitSha = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
};

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: getCommitSha(),
  },
  devIndicators: false,
  // Unmatched URLs render src/app/global-not-found.tsx; a root not-found.tsx
  // would pull per-request locale lookups into every statically rendered route.
  experimental: { globalNotFound: true },
  // next-intl and its deps ship ESM-only; next/jest reads this list to
  // transform them in tests.
  transpilePackages: [
    'next-intl',
    'use-intl',
    'intl-messageformat',
    '@formatjs/fast-memoize',
    '@formatjs/icu-messageformat-parser',
    '@formatjs/icu-skeleton-parser',
  ],
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // org and project are read from SENTRY_ORG / SENTRY_PROJECT env vars
  // (set by the Vercel <-> Sentry integration)
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  // tunnelRoute intentionally omitted: the /monitoring proxy hangs under
  // next start (Next 16 + Turbopack external rewrite), which silently drops
  // all browser events. Direct ingest works; revisit if ad-blocker loss matters.
  silent: !process.env.CI,
});
