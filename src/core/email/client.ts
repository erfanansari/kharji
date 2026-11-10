import { Resend } from 'resend';

import { EMAIL_LOGO_URL } from '@/emails/brand';

if (!process.env.RESEND_API_KEY) {
  // Don't throw at module load — local dev shouldn't crash without a key.
  // Sends will fail loudly at call time instead.
  console.warn('[email] RESEND_API_KEY is not set; emails will not be sent.');
}

// The Resend constructor itself throws on a missing key, which would undo the
// promise above the moment any page importing this module renders.
export const resend = new Resend(process.env.RESEND_API_KEY || 're_missing_key');

// Single sender for all email — reports, auth, and notifications alike.
// support@ so replies naturally become support requests (REPLY_TO routes them).
export const FROM_ADDRESS = 'Kharji <support@kharji.app>';
export const REPLY_TO = 'dev.erfanansari@gmail.com';

export const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

// Kharji logo. Deliberately NOT derived from APP_URL: a send from local dev
// would otherwise point the recipient's mail client at localhost and render a
// broken image. See src/emails/brand.ts.
export const LOGO_URL = EMAIL_LOGO_URL;

export function unsubscribeUrl(token: string): string {
  return `${APP_URL}/api/unsubscribe/${token}`;
}
