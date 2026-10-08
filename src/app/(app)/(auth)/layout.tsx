'use client';

import type { ReactNode } from 'react';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import GuestGuard from '@features/guards/GuestGuard';

import LocaleToggle from '@components/LocaleToggle';
import Logo from '@components/Logo';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const isSignup = pathname === '/signup';
  const isForgotPassword = pathname === '/forgot-password';

  return (
    <GuestGuard>
      <div className="bg-background-content flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Branding */}
          <div className="mb-4 flex flex-col items-center">
            <Logo size="md" wordmark={t('common.appName')} className="mb-1" />
            <p className="text-text-tertiary">{t('auth.tagline')}</p>
          </div>

          {/* Auth Card */}
          <div className="border-border-subtle bg-background rounded-xl border p-5 shadow-sm sm:p-8">{children}</div>

          {/* Footer Link */}
          {isLogin && (
            <p className="text-text-tertiary mt-4 text-center text-sm sm:mt-6">
              {t('auth.footer.noAccount')}{' '}
              <Link href="/signup" className="text-text-primary font-semibold hover:underline">
                {t('auth.footer.signUp')}
              </Link>
            </p>
          )}
          {isSignup && (
            <p className="text-text-tertiary mt-4 text-center text-sm sm:mt-6">
              {t('auth.footer.alreadyHave')}{' '}
              <Link href="/login" className="text-text-primary font-semibold hover:underline">
                {t('auth.footer.signIn')}
              </Link>
            </p>
          )}
          {isForgotPassword && (
            <p className="text-text-tertiary mt-4 text-center text-sm sm:mt-6">
              <Link href="/login" className="text-text-primary font-semibold hover:underline">
                {t('auth.footer.backToLogin')}
              </Link>
            </p>
          )}

          <div className="mt-5 flex justify-center sm:mt-7">
            <LocaleToggle />
          </div>
        </div>
      </div>
    </GuestGuard>
  );
}
