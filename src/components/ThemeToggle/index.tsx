'use client';

import { useEffect, useState } from 'react';
import type { FC } from 'react';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { Moon, Sun, SunMoon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface ThemeToggleProps {
  /** Called after the theme flips — TopNav uses it to close the user menu,
   *  matching every other action inside that dropdown. */
  onSelect?: () => void;
  className?: string;
}

/**
 * One-tap light↔dark flip, rendered as a user-menu row (icon + label, full
 * width) — the same shape as the Feedback and Command Menu items either side
 * of it, so the menu reads as one list of actions rather than a control that
 * wandered in from elsewhere.
 *
 * Binary on purpose, off `resolvedTheme` — exactly like the command palette's
 * `toggle-theme` action. "System" stays a deliberate choice made in Settings
 * rather than a third state a one-tap control would have to cycle through.
 *
 * The icon shows the ACTION, not the state: a sun while dark ("go light"), a
 * moon while light. A control labelled with its current state reads as a
 * status indicator and invites a second tap to "confirm" it.
 */
const ThemeToggle: FC<ThemeToggleProps> = ({ onSelect, className }) => {
  const t = useTranslations();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes only knows the resolved theme after mount; gate the icon until
  // then to avoid a hydration mismatch. Same one-time flag AppearanceSection
  // uses — no cascading renders.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';
  // Neutral glyph before mount: rendering either Sun or Moon would be a coin
  // flip that visibly corrects itself on hydration.
  const Icon = !mounted ? SunMoon : isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => {
        setTheme(isDark ? 'light' : 'dark');
        onSelect?.();
      }}
      className={twMerge(
        'text-text-secondary hover:bg-background-elevated hover:text-text-primary flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
        className
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {t('nav.toggleTheme')}
    </button>
  );
};

export default ThemeToggle;
