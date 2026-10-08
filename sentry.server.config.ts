import * as Sentry from '@sentry/nextjs';

// Errors only, production only. Performance traces, logs, local variables and
// replays are deliberately off: this is a small app on free tiers, and Sentry
// quota or per-request overhead is not worth the extra signal.
// VERCEL_ENV is unset off Vercel, so a plain `next start` still reports.
if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.VERCEL_ENV || 'production',
    tracesSampleRate: 0,
  });
}
