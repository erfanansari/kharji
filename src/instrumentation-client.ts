import * as Sentry from '@sentry/nextjs';

// Errors only, production only. No replays, traces or logs — they ate the whole
// Sentry replay quota in a month on a small app. See sentry.server.config.ts.
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_VERCEL_ENV !== 'preview') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'production',
    tracesSampleRate: 0,
    // Browser noise we can't act on: failed service-worker registration
    // (offline, private mode, interrupted install) and extension chatter.
    ignoreErrors: [
      /Failed to register a ServiceWorker/,
      'Non-Error promise rejection captured',
      'Non-Error exception captured',
    ],
    denyUrls: [/^chrome-extension:\/\//i, /^moz-extension:\/\//i, /^safari-extension:\/\//i],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
