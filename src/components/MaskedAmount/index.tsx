'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { MASK_CHAR, maskMoney } from '@features/ExchangeRate/utils/currency';

/** How long a touch must be held before it counts as a peek and not a scroll. */
const TOUCH_HOLD_MS = 350;

interface MaskedAmountProps {
  /** Currency of the figure being withheld — stays visible. */
  currency: string;
  /** Dots to draw. Four on secondary captions so they read as subordinate. */
  dots?: number;
  className?: string;
  /** The real figure, revealed only while the user holds the mask. */
  peek?: ReactNode;
}

/**
 * A figure with its digits withheld. The real value is never rendered while
 * masked — not hidden behind a filter, not present in the accessible name —
 * so nothing leaks to a screen reader, a copy-paste or the DOM inspector.
 *
 * Press and hold to reveal just this one figure; releasing, or leaving the tab,
 * puts it back.
 */
const MaskedAmount = ({ currency, dots = 5, className, peek }: MaskedAmountProps) => {
  const locale = useLocale() as 'en' | 'fa';
  const t = useTranslations('common');
  const [peeking, setPeeking] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPeek = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setPeeking(false);
  };

  // Listening on the window rather than the element: a release that lands
  // anywhere else — or a tab switch — must put the figure back. Anything that
  // can leave it revealed while the user has stopped looking defeats the point.
  useEffect(() => {
    if (!peeking) return;
    const events = ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'blur'] as const;
    events.forEach((e) => window.addEventListener(e, stopPeek));
    document.addEventListener('visibilitychange', stopPeek);
    return () => {
      events.forEach((e) => window.removeEventListener(e, stopPeek));
      document.removeEventListener('visibilitychange', stopPeek);
    };
  }, [peeking]);

  useEffect(() => () => stopPeek(), []);

  if (peeking && peek) {
    return <span className={className}>{peek}</span>;
  }

  const canPeek = !!peek;

  // Rendered from the string maskMoney produces rather than assembled from
  // parts: it already carries the symbol side, the spacing rule and the bidi
  // isolate, so the dots land exactly where the real digits were. Laying the
  // symbol and dots out as flex children instead put the symbol on the wrong
  // side under RTL, because flex reverses child order and text does not.
  //
  // Only the dot run is broken into spans, and the text either side is left
  // whole. Splitting every character — which is what animating them one by one
  // invites — also splits تومان into five text nodes, and Persian is cursive:
  // its letters stop joining and the word falls apart.
  const text = maskMoney(currency, { locale, dots });
  const firstDot = text.indexOf(MASK_CHAR);
  const lastDot = text.lastIndexOf(MASK_CHAR);
  const content = (
    <>
      {text.slice(0, firstDot)}
      {Array.from(text.slice(firstDot, lastDot + 1)).map((char, i) => (
        <span key={i} className="kh-mask-dot" style={{ animationDelay: `${i * 35}ms` }} aria-hidden="true">
          {char}
        </span>
      ))}
      {text.slice(lastDot + 1)}
    </>
  );

  return (
    <span
      className={`kh-mask ${canPeek ? 'cursor-pointer select-none' : ''} ${className ?? ''}`}
      aria-label={t('amountHidden')}
      role="img"
      // Touch raises pointerdown too, but revealing on it instantly would fire
      // mid-scroll — touch goes through the hold timer below instead.
      onPointerDown={canPeek ? (e) => e.pointerType !== 'touch' && setPeeking(true) : undefined}
      onPointerLeave={canPeek ? stopPeek : undefined}
      onTouchStart={
        canPeek
          ? () => {
              holdTimer.current = setTimeout(() => setPeeking(true), TOUCH_HOLD_MS);
            }
          : undefined
      }
      onTouchEnd={canPeek ? stopPeek : undefined}
      onContextMenu={canPeek ? (e) => e.preventDefault() : undefined}
    >
      {content}
    </span>
  );
};

export default MaskedAmount;
