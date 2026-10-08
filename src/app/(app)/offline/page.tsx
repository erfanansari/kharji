import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { WifiOff } from 'lucide-react';

import Logo from '@components/Logo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return { title: t('offline') };
}

export default async function OfflinePage() {
  const t = await getTranslations('offlinePage');
  const tCommon = await getTranslations('common');

  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo size="md" wordmark={tCommon('appName')} />

      <div className="border-border-subtle bg-background-secondary mt-10 flex h-14 w-14 items-center justify-center rounded-full border">
        <WifiOff className="text-text-muted h-6 w-6" aria-hidden="true" />
      </div>

      <h1 className="text-text-primary mt-6 text-lg font-semibold">{t('title')}</h1>
      <p className="text-text-tertiary mt-2 max-w-sm text-sm">{t('description')}</p>
    </main>
  );
}
