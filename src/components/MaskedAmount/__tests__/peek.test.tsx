import { NextIntlClientProvider } from 'next-intl';

import MaskedAmount from '..';
import { act, fireEvent, render, screen } from '@testing-library/react';

import fa from '../../../../messages/fa.json';

const maskOf = (container: HTMLElement): Element => {
  const el = container.querySelector('.kh-mask');
  if (!el) throw new Error('no masked figure rendered');
  return el;
};

const renderMask = () =>
  render(
    <NextIntlClientProvider locale="fa" messages={fa}>
      <MaskedAmount currency="IRT" peek={<span>۴٫۶۲ میلیارد تومان</span>} />
    </NextIntlClientProvider>
  );

const pressMouse = (el: Element) => fireEvent.pointerDown(el, { pointerType: 'mouse' });

describe('MaskedAmount peek', () => {
  it('reveals the real figure while the mouse is held down', () => {
    const { container } = renderMask();
    pressMouse(maskOf(container));

    expect(screen.getByText('۴٫۶۲ میلیارد تومان')).toBeInTheDocument();
  });

  // Release happens wherever the cursor ended up, which is often not on the
  // figure. Listening only on the element leaves the amount stranded on screen.
  it('re-masks when the release lands somewhere else entirely', () => {
    const { container } = renderMask();
    pressMouse(maskOf(container));

    act(() => {
      window.dispatchEvent(new Event('pointerup'));
    });

    expect(screen.queryByText('۴٫۶۲ میلیارد تومان')).not.toBeInTheDocument();
  });

  it('re-masks when the tab is hidden mid-peek', () => {
    const { container } = renderMask();
    pressMouse(maskOf(container));

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.queryByText('۴٫۶۲ میلیارد تومان')).not.toBeInTheDocument();
  });

  // The mask has to sit where the real figure sat. Building it out of flex
  // children put the symbol on the wrong side under RTL, because flex reverses
  // child order while text does not — so a masked $ ended up trailing the dots
  // when the real one led them.
  it('keeps the symbol on the same side as the real figure would', () => {
    const { container } = render(
      <NextIntlClientProvider locale="fa" messages={fa}>
        <MaskedAmount currency="USD" />
      </NextIntlClientProvider>
    );

    const text = container.textContent ?? '';
    expect(text.indexOf('$')).toBeLessThan(text.indexOf('•'));
  });

  // jsdom does no layout, so visual order can't be asserted here. What this
  // pins is that splitting the string into per-character spans to animate the
  // dots doesn't drop the bidi isolate that holds the symbol on the left.
  it('carries the bidi isolate through the per-character split', () => {
    const { container } = render(
      <NextIntlClientProvider locale="fa" messages={fa}>
        <MaskedAmount currency="USD" />
      </NextIntlClientProvider>
    );

    const text = maskOf(container).textContent ?? '';
    expect(text.startsWith('⁦')).toBe(true);
    expect(text.endsWith('⁩')).toBe(true);
  });

  // Persian is cursive: its letters join, and they only join within a single
  // text node. Animating each character of the mask separately split تومان into
  // five nodes and the word came apart on screen.
  it('keeps the currency word in one text node so its letters still join', () => {
    const { container } = render(
      <NextIntlClientProvider locale="fa" messages={fa}>
        <MaskedAmount currency="IRT" />
      </NextIntlClientProvider>
    );

    const textNodes: string[] = [];
    const walker = document.createTreeWalker(maskOf(container), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) textNodes.push(walker.currentNode.textContent ?? '');

    expect(textNodes).toContainEqual(expect.stringContaining('تومان'));
  });

  it('puts a suffix currency after the dots', () => {
    const { container } = render(
      <NextIntlClientProvider locale="fa" messages={fa}>
        <MaskedAmount currency="IRT" />
      </NextIntlClientProvider>
    );

    const text = container.textContent ?? '';
    expect(text.indexOf('•')).toBeLessThan(text.indexOf('تومان'));
  });

  it('does not offer peek when no real figure was handed to it', () => {
    const { container } = render(
      <NextIntlClientProvider locale="fa" messages={fa}>
        <MaskedAmount currency="IRT" />
      </NextIntlClientProvider>
    );
    pressMouse(maskOf(container));

    expect(container.textContent).toContain('•');
  });
});
