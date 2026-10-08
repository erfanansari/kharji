import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { isAppLocale, LOCALES } from '@/i18n/config';

import { buildMetadata, RootShell } from '../../_shell';

export { rootViewport as viewport } from '../../_shell';

// Prerendered once per language at build time and served from the CDN. The
// proxy rewrites `/` to the matching variant from the locale cookie, so this
// tree never reads cookies or headers itself — that is what keeps it static.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildMetadata(locale);
}

export default async function MarketingLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  setRequestLocale(locale);
  const messages = (await import(`../../../../messages/${locale}.json`)).default;

  return (
    <RootShell locale={locale} privacyHidden={false} staticIntl={{ messages }}>
      {children}
    </RootShell>
  );
}
