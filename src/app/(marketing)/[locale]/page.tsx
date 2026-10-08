import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import Landing from '@features/pages/Landing';

import { isAppLocale, LOCALES } from '@/i18n/config';

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'metaTitles' });
  return {
    title: t('landing'),
    description: t('landingDescription'),
  };
}

const LandingPage = async ({ params }: Props) => {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  setRequestLocale(locale);
  return <Landing />;
};

export default LandingPage;
