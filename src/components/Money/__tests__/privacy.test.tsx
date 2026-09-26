import { NextIntlClientProvider } from 'next-intl';

import Money from '..';
import { render } from '@testing-library/react';

import PrivacyProvider from '@features/privacy/PrivacyProvider';

import fa from '../../../../messages/fa.json';

// Money's job here is masking, not conversion — the rates/auth stack behind
// useCurrency would only add setup noise to that question.
jest.mock('@hooks/use-currency', () => ({
  useCurrency: () => ({
    displayItem: () => ({ primary: '۱٬۲۴۰٬۰۰۰ تومان', secondary: '$۱۴٬۲۸۰' }),
    convertItem: () => 1_240_000,
    formatFull: () => '۱٬۲۴۰٬۰۰۰ تومان',
    primaryCurrency: 'IRT',
    secondaryCurrency: 'USD',
  }),
}));

const renderMoney = (hidden: boolean) =>
  render(
    <NextIntlClientProvider locale="fa" messages={fa}>
      <PrivacyProvider initialHidden={hidden}>
        <Money amount={1_240_000} currency="IRT" />
      </PrivacyProvider>
    </NextIntlClientProvider>
  );

describe('Money under privacy mode', () => {
  it('shows both currency lines when privacy is off', () => {
    const { container } = renderMoney(false);

    expect(container.textContent).toContain('۱٬۲۴۰٬۰۰۰');
    expect(container.textContent).toContain('۱۴٬۲۸۰');
  });

  it('masks both lines when privacy is on', () => {
    const { container } = renderMoney(true);

    expect(container.textContent).not.toMatch(/[۰-۹\d]/);
    expect(container.textContent).toContain('•');
  });

  it('drops the hover title when privacy is on', () => {
    expect(renderMoney(false).container.querySelector('[title]')).not.toBeNull();
    expect(renderMoney(true).container.querySelector('[title]')).toBeNull();
  });
});
