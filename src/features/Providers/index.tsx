'use client';

import { ThemeProvider } from 'next-themes';

import ClientProvider from '@core/client/provider';

import GlobalDrawers from '@features/drawers/GlobalDrawers';
import CurrencyHydrator from '@features/ExchangeRate/CurrencyHydrator';
import PrivacyProvider from '@features/privacy/PrivacyProvider';

import { CommandPaletteProvider } from '@components/CommandPalette/CommandPaletteProvider';
import Toaster from '@components/Toast/Toaster';

import UnauthorizedListener from './UnauthorizedListener';

interface ProvidersProps {
  children: React.ReactNode;
  /** Privacy mode as resolved from the cookie by the root layout. */
  privacyHidden: boolean;
}

const Providers = ({ children, privacyHidden }: ProvidersProps) => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <ClientProvider>
      <PrivacyProvider initialHidden={privacyHidden}>
        <UnauthorizedListener />
        <CurrencyHydrator />
        <CommandPaletteProvider>{children}</CommandPaletteProvider>
        <GlobalDrawers />
        <Toaster />
      </PrivacyProvider>
    </ClientProvider>
  </ThemeProvider>
);

export default Providers;
