import { getLocale } from 'next-intl/server';

import type { AppLocale } from '@/i18n/config';

import NotFound from './(app)/not-found';
import { RootShell } from './_shell';

// Unmatched URLs have no route group, hence no root layout: this renders its
// own <html>. Per-request on purpose (it reads the visitor's locale cookie) —
// keeping it out of the route groups is what lets the landing page stay static.
export default async function GlobalNotFound() {
  const locale = (await getLocale()) as AppLocale;
  return (
    <RootShell locale={locale} privacyHidden={false}>
      <NotFound />
    </RootShell>
  );
}
