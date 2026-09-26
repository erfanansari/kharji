/**
 * number-flow ships ESM that this Jest transform chain won't compile, and its
 * whole job — animating between two numbers — has nothing to test here. This
 * stands in with the same rendered text so components that use it stay testable.
 */
import type { FC } from 'react';

interface NumberFlowProps {
  value: number;
  locales?: string;
  format?: Intl.NumberFormatOptions;
  prefix?: string;
  suffix?: string;
  className?: string;
}

const NumberFlow: FC<NumberFlowProps> = ({ value, locales = 'en-US', format, prefix = '', suffix = '', className }) => (
  <span className={className}>{`${prefix}${new Intl.NumberFormat(locales, format).format(value)}${suffix}`}</span>
);

export const NumberFlowGroup: FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;

export default NumberFlow;
