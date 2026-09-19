import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Geist, Vazirmatn } from 'next/font/google';

import { SerwistProvider } from '@serwist/next/react';
import { Analytics } from '@vercel/analytics/next';
import { twMerge } from 'tailwind-merge';

import Providers from '@features/Providers';

import UpdatePrompt from '@components/UpdatePrompt';

import { DEFAULT_LOCALE } from '@/i18n/config';
import '@/styles/globals.css';

import AppleSplashScreens from './AppleSplashScreens';

const geistSans = Geist({
  display: 'swap',
  variable: '--font-geist-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

const persianFont = Vazirmatn({
  display: 'swap',
  variable: '--font-persian',
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
});

const APP_URL = 'https://kharji.app';

const LOCALIZED_META = {
  en: {
    brand: 'Kharji',
    description: 'Track expenses, income, and assets — all in one place.',
    ogTitle: 'Kharji – Personal Finance Tracker',
    ogLocale: 'en_US',
  },
  fa: {
    brand: 'خرجی',
    description: 'هزینه‌ها، درآمد و دارایی‌هات، همه یک‌جا.',
    ogTitle: 'خرجی – مدیریت مالی شخصی',
    ogLocale: 'fa_IR',
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = LOCALIZED_META[locale as keyof typeof LOCALIZED_META] ?? LOCALIZED_META[DEFAULT_LOCALE];

  return {
    metadataBase: new URL(APP_URL),
    title: {
      template: `%s | ${m.brand}`,
      default: m.brand,
    },
    description: m.description,
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: m.brand,
    },
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
    openGraph: {
      title: m.ogTitle,
      description: m.description,
      siteName: m.brand,
      url: APP_URL,
      locale: m.ogLocale,
      type: 'website',
      images: [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: m.ogTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: m.ogTitle,
      description: m.description,
      images: ['/opengraph-image'],
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  // Android/Chrome: shrink the layout viewport when the keyboard opens so
  // dvh-sized drawers resize natively. iOS ignores this hint (handled by
  // useKeyboardInset instead).
  interactiveWidget: 'resizes-content',
  // Must track --color-background in src/styles/globals.css, or the mobile
  // browser chrome shows a visible seam against the top of the page.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#121214' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={locale === 'fa' ? 'rtl' : 'ltr'}
      // Font variables live here, not on <body>: globals.css reads them via
      // --app-font-sans on the <html>/html[lang] selectors, and CSS custom
      // properties don't inherit upward from a child to its parent. Moving
      // these to <body> makes --app-font-sans (and everything built on it)
      // silently resolve to the browser default font — see globals.css.
      className={twMerge(geistSans.variable, persianFont.variable, 'bg-background')}
      suppressHydrationWarning
    >
      <head>
        <AppleSplashScreens />
      </head>
      <body className="bg-background antialiased">
        <NextIntlClientProvider>
          <SerwistProvider swUrl="/sw.js" disable={process.env.NODE_ENV === 'development'}>
            <Providers>
              {children}
              <UpdatePrompt />
              <Analytics />
            </Providers>
          </SerwistProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
