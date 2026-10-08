import * as Sentry from '@sentry/nextjs';

// Errors only, production only — see sentry.server.config.ts.
if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.VERCEL_ENV || 'production',
    tracesSampleRate: 0,
  });
}
