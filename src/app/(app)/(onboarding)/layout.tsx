import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';

import AuthGuard from '@features/guards/AuthGuard';

import Logo from '@components/Logo';

// Same visual shell as the auth pages (logo + centered card), but for
// signed-in users — no TopNav, no GuestGuard.
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations();

  return (
    <AuthGuard>
      <div className="bg-background-content flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-4 flex flex-col items-center">
            <Logo size="md" wordmark={t('common.appName')} className="mb-1" />
            <p className="text-text-tertiary">{t('auth.tagline')}</p>
          </div>

          <div className="border-border-subtle bg-background rounded-xl border p-5 shadow-sm sm:p-8">{children}</div>
        </div>
      </div>
    </AuthGuard>
  );
}
