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

// Sentry's browser SDK posts events straight to the DSN's ingest host.
const getSentryOrigin = () => {
  try {
    const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
    return dsn ? new URL(dsn).origin : '';
  } catch {
    return '';
  }
};

// Next injects inline bootstrap/hydration scripts and Tailwind/next-font emit
// inline styles, so script-src/style-src need 'unsafe-inline' (a nonce would
// force every page dynamic - see the rendering-model note in CLAUDE.md). The
// wins here are everything else: no foreign scripts, no framing, no plugins,
// no <base>/form hijacking, and connect-src limited to known endpoints.
// 'unsafe-eval' is dev-only (React/Turbopack refresh); Vercel's preview toolbar
// is allowed on previews only.
const buildCsp = () => {
  const isDev = process.env.NODE_ENV !== 'production';
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const sentry = getSentryOrigin();

  const directives: Record<string, string> = {
    'default-src': "'self'",
    'script-src': ["'self'", "'unsafe-inline'", isDev && "'unsafe-eval'", isPreview && 'https://vercel.live']
      .filter(Boolean)
      .join(' '),
    'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data: blob:",
    'font-src': "'self' data:",
    'connect-src': ["'self'", sentry, isPreview && 'https://vercel.live https://*.pusher.com wss://*.pusher.com']
      .filter(Boolean)
      .join(' '),
    'frame-src': isPreview ? 'https://vercel.live' : "'none'",
    'worker-src': "'self' blob:",
    'manifest-src': "'self'",
    'media-src': "'self'",
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'",
    'frame-ancestors': "'none'",
  };

  return [
    ...Object.entries(directives).map(([name, value]) => `${name} ${value}`),
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
};

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: getCommitSha(),
  },
  devIndicators: false,
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'Content-Security-Policy', value: buildCsp() }] }];
  },
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
