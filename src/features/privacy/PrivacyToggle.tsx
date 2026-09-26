'use client';

import { useTranslations } from 'next-intl';

import { Eye, EyeOff } from 'lucide-react';

import { usePrivacy } from './PrivacyProvider';

/**
 * Flips every amount in the app between digits and dots.
 *
 * The icon shows the CURRENT state (crossed-out eye while hidden), following
 * the password fields rather than ThemeToggle's show-the-next-action rule —
 * this icon is the only thing on screen telling you privacy mode is on.
 */
const PrivacyToggle = ({ className }: { className?: string }) => {
  const t = useTranslations('common');
  const { hidden, toggle } = usePrivacy();
  const Icon = hidden ? EyeOff : Eye;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? t('showAmounts') : t('hideAmounts')}
      title={hidden ? t('showAmounts') : t('hideAmounts')}
      // Border, radius, padding and hover deliberately copied from the avatar
      // button beside it: p-3.5 around a 16px icon lands on the same 46px box
      // as the avatar's 28px tile plus its py-2. Left unbordered, the icon has
      // nothing to line up against and reads as stuck on after the fact.
      className={`border-border-subtle text-text-muted hover:bg-background-elevated hover:text-text-primary flex items-center justify-center rounded-lg border p-3.5 transition-colors ${className ?? ''}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
};

export default PrivacyToggle;
