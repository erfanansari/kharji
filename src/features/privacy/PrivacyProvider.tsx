'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { writePrivacyCookie } from '@core/privacy/cookie';

interface PrivacyValue {
  /** True while amounts are masked. */
  hidden: boolean;
  toggle: () => void;
}

const PrivacyContext = createContext<PrivacyValue>({ hidden: false, toggle: () => {} });

interface PrivacyProviderProps {
  /**
   * Resolved from the privacy cookie by the root layout. Passing it through
   * props rather than reading it in an effect is what keeps the first painted
   * frame correct: server and client agree on render #1, so a real figure
   * never reaches the screen before being replaced.
   */
  initialHidden: boolean;
  children: ReactNode;
}

const PrivacyProvider = ({ initialHidden, children }: PrivacyProviderProps) => {
  const [hidden, setHidden] = useState(initialHidden);

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      writePrivacyCookie(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ hidden, toggle }), [hidden, toggle]);

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
};

export const usePrivacy = (): PrivacyValue => useContext(PrivacyContext);

export default PrivacyProvider;
