import { getLocale } from 'next-intl/server';
import { cookies } from 'next/headers';

import { isPrivacyHidden, PRIVACY_COOKIE } from '@core/privacy/cookie';

import type { AppLocale } from '@/i18n/config';

import { buildMetadata, RootShell } from '../_shell';

export { rootViewport as viewport } from '../_shell';

export async function generateMetadata() {
  return buildMetadata(await getLocale());
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as AppLocale;
  // Resolved here rather than in the client so the first painted frame is
  // already masked — reading it after hydration would flash the real figures.
  const privacyHidden = isPrivacyHidden((await cookies()).get(PRIVACY_COOKIE)?.value);

  return (
    <RootShell locale={locale} privacyHidden={privacyHidden}>
      {children}
    </RootShell>
  );
}
