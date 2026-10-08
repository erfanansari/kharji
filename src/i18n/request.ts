import { getRequestConfig } from 'next-intl/server';

import { getUserLocale } from '@core/session/locale';

import { isAppLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  // Statically rendered trees pin their language with setRequestLocale, which
  // resolves here without touching cookies. Everything else falls back to the
  // per-request cookie / session lookup.
  const pinned = await requestLocale;
  const locale = isAppLocale(pinned) ? pinned : await getUserLocale();
  const messages = (await import(`../../messages/${locale}.json`)).default;

  return { locale, messages };
});
