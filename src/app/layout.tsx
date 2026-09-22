import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import localFont from 'next/font/local';

import { SerwistProvider } from '@serwist/next/react';
import { Analytics } from '@vercel/analytics/next';
import { GeistSans as geistSans } from 'geist/font/sans';
import { twMerge } from 'tailwind-merge';

import Providers from '@features/Providers';

import UpdatePrompt from '@components/UpdatePrompt';

import { DEFAULT_LOCALE } from '@/i18n/config';
import '@/styles/globals.css';

import AppleSplashScreens from './AppleSplashScreens';

// Both fonts are self-hosted — no next/font/google, no live fetch to Google
// Fonts at dev-server boot. Turbopack's resolver for that path has a known,
// sporadic upstream bug (vercel/next.js#81697, discussion #61886: "Can't
// resolve '@vercel/turbopack-next/internal/font/google/font'") that this
// sidesteps entirely rather than works around.
//
// Geist comes from Vercel's own `geist` package — it's still next/font, just
// pointed at a local file instead of fetched from Google; the CSS variable
// name it exports (--font-geist-sans) already matches what globals.css reads.
//
// Vazirmatn has no such first-party package, so its variable-weight woff2 is
// vendored at src/assets/fonts/ from the official `vazirmatn` npm package
// (OFL-licensed, same upstream source Google Fonts itself subsets from — see
// node_modules/vazirmatn for the full family and licence). Update it by
// bumping the `vazirmatn` dependency and re-copying that one file; see the
// comment on `persianFont` below.
const persianFont = localFont({
  src: '../assets/fonts/Vazirmatn-Variable.woff2',
  display: 'swap',
  variable: '--font-persian',
  // A single variable file covering the whole weight axis, unlike the five
  // discrete cuts the old next/font/google config requested — a strict
  // superset, so every existing font-weight utility still resolves.
  weight: '100 900',
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
