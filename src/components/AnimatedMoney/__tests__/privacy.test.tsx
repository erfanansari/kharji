import { NextIntlClientProvider } from 'next-intl';

import AnimatedMoney from '..';
import { render } from '@testing-library/react';

import PrivacyProvider from '@features/privacy/PrivacyProvider';

import en from '../../../../messages/en.json';
import fa from '../../../../messages/fa.json';

const renderMoney = (
  hidden: boolean,
  props: Partial<React.ComponentProps<typeof AnimatedMoney>> = {},
  locale: 'en' | 'fa' = 'fa'
) =>
  render(
    <NextIntlClientProvider locale={locale} messages={locale === 'fa' ? fa : en}>
      <PrivacyProvider initialHidden={hidden}>
        <AnimatedMoney amount={1_240_000} currency="IRT" {...props} />
      </PrivacyProvider>
    </NextIntlClientProvider>
  );

describe('AnimatedMoney under privacy mode', () => {
  it('shows the figure when privacy is off', () => {
    const { container } = renderMoney(false);

    expect(container.textContent).toMatch(/\d|[۰-۹]/);
    expect(container.textContent).not.toContain('•');
  });

  it('renders dots instead of digits when privacy is on', () => {
    const { container } = renderMoney(true);

    expect(container.textContent).toContain('•');
    expect(container.textContent).not.toMatch(/\d|[۰-۹]/);
  });

  // The whole point of masking is that the number is gone, not covered. A
  // `title` left behind would hand the exact amount back on hover.
  it('drops the hover title when privacy is on', () => {
    const visible = renderMoney(false);
    expect(visible.container.querySelector('[title]')).not.toBeNull();

    const masked = renderMoney(true);
    expect(masked.container.querySelector('[title]')).toBeNull();
  });

  it('keeps the currency visible so the figure still reads as money', () => {
    const { container } = renderMoney(true);

    expect(container.textContent).toContain('تومان');
  });

  // The USD/Toman rate is published, identical for everyone, and says nothing
  // about this user — it is the one figure that stays readable. If someone
  // "fixes" this later, this test is the reason not to.
  it('leaves a non-sensitive figure alone when privacy is on', () => {
    const { container } = renderMoney(true, { sensitive: false });

    expect(container.textContent).not.toContain('•');
    expect(container.textContent).toMatch(/\d|[۰-۹]/);
  });
});
