import NetWorthChart from '..';
import userEvent from '@testing-library/user-event';

import { render, screen } from '@/__tests__/test-utils';

const mockUseCurrency = jest.fn();
const sumTo = jest.fn();

jest.mock('@hooks/use-currency', () => ({ useCurrency: () => mockUseCurrency() }));
jest.mock('@hooks/use-money-text', () => ({
  useMoneyText: () => ({ sumDisplay: () => ({ primary: '', secondary: null }), format: () => '' }),
}));
jest.mock('@hooks/use-locale-preferences', () => ({
  useLocalePreferences: () => ({ prefs: { calendar: 'gregorian' } }),
}));
jest.mock('@hooks/use-net-worth-history', () => ({
  useNetWorthHistory: () => ({
    data: [
      { date: '2026-01-01', items: [{ amount: 100, currency: 'IRT', valuedAt: '2026-01-01', entryRate: 1 }] },
      { date: '2026-02-01', items: [{ amount: 300, currency: 'IRT', valuedAt: '2026-01-01', entryRate: 1 }] },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));
// jsdom has no layout, so the real container only logs width/height warnings.
jest.mock('recharts', () => ({
  ...jest.requireActual('recharts'),
  ResponsiveContainer: () => null,
}));
jest.mock('@features/privacy/PrivacyProvider', () => ({ usePrivacy: () => ({ hidden: false }) }));
jest.mock('@components/AnimatedMoney', () => ({
  __esModule: true,
  default: ({ amount, currency }: { amount: number; currency: string }) => (
    <span data-testid="delta">{`${amount} ${currency}`}</span>
  ),
}));

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

function setup(primaryCurrency: string) {
  // Pretend 1 USD = 10 of the pivot, so a USD reading is a tenth of the pivot sum.
  sumTo.mockImplementation(
    (items: { amount: number }[], to: string) => items.reduce((sum, i) => sum + i.amount, 0) / (to === 'USD' ? 10 : 1)
  );
  mockUseCurrency.mockReturnValue({ sumTo, primaryCurrency });
  render(<NetWorthChart />);
}

describe('NetWorthChart currency toggle', () => {
  it('offers the primary currency and USD, starting on the primary', () => {
    setup('IRT');

    expect(screen.getByRole('button', { name: 'IRT' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'USD' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('delta')).toHaveTextContent('200 IRT');
  });

  it('re-expresses the change in USD when USD is picked', async () => {
    setup('IRT');

    await userEvent.click(screen.getByRole('button', { name: 'USD' }));

    expect(screen.getByRole('button', { name: 'USD' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('delta')).toHaveTextContent('20 USD');
  });

  it('hides the toggle when USD is already the primary currency', () => {
    setup('USD');

    expect(screen.queryByRole('button', { name: 'USD' })).not.toBeInTheDocument();
    expect(screen.getByTestId('delta')).toHaveTextContent('20 USD');
  });
});
