import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import Logo from '@components/Logo';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-4 sm:px-6">
      <div className="relative flex max-w-sm flex-col items-center gap-8 py-16 text-center">
        {/* Corner crosshairs */}
        <span className="text-border-default absolute top-0 left-0 text-lg font-light select-none">+</span>
        <span className="text-border-default absolute top-0 right-0 text-lg font-light select-none">+</span>
        <span className="text-border-default absolute bottom-0 left-0 text-lg font-light select-none">+</span>
        <span className="text-border-default absolute right-0 bottom-0 text-lg font-light select-none">+</span>

        {/* Graphic element */}
        <div className="relative flex h-32 w-32 items-center justify-center">
          {/* Outer dashed rotated square */}
          <div className="border-border-subtle absolute inset-0 rotate-12 rounded-xl border-2 border-dashed" />
          {/* Inner brand icon */}
          <Logo size="lg" className="relative z-10 translate-x-2 translate-y-2" />
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-text-primary text-8xl font-bold tracking-tight">{t('code')}</p>
          <p className="text-text-secondary text-sm font-medium">{t('title')}</p>
          <p className="text-text-muted text-xs">{t('description')}</p>
        </div>

        {/* CTA */}
        <Link
          href="/overview"
          className="bg-primary hover:bg-primary-hover text-primary-foreground rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
        >
          {t('goToDashboard')}
        </Link>
      </div>
    </main>
  );
}
