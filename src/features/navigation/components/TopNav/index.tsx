'use client';

import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ChevronDown, CommandIcon, LayoutDashboard, LogOut, MessageSquare, Settings } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import { NAV_ITEMS, ROUTES } from '@constants';

import { useCommandPalette } from '@components/CommandPalette/CommandPaletteProvider';
import Logo from '@components/Logo';
import ThemeToggle from '@components/ThemeToggle';

import { useAuth } from '@hooks/use-auth';

import { useDrawerStore } from '@stores/drawer';

const TopNav: FC = () => {
  // Customs
  const t = useTranslations();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { toggle: toggleCommandPalette } = useCommandPalette();
  const openFeedbackModal = useDrawerStore((state) => state.openFeedbackModal);

  // States
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // References
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);

  // Effects
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="border-border-subtle bg-background sticky top-0 z-50 border-b">
      <div className="mx-auto max-w-[1600px]">
        {/* Top row - Logo and actions */}
        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <Link href={ROUTES.OVERVIEW}>
            <Logo size="sm" wordmark={t('common.appName')} className="gap-2.5" />
          </Link>

          {/* Right side - user menu */}
          <div className="flex items-center gap-3">
            {/* User Menu */}
            <div ref={menuRef} className="relative z-50">
              <button
                ref={avatarButtonRef}
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="border-border-subtle hover:bg-background-elevated flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors"
              >
                <div className="relative">
                  <div className="bg-button-primary-bg text-primary-foreground flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold">
                    {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="bg-success border-background absolute -end-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2" />
                </div>
                <ChevronDown
                  className={twMerge(
                    'text-text-muted h-4 w-4 transition-transform duration-200',
                    isUserMenuOpen && 'rotate-180'
                  )}
                />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="border-border-subtle bg-background absolute end-0 top-full mt-2 w-56 overflow-hidden rounded-lg border shadow-lg">
                  <div className="border-border-subtle border-b p-3">
                    <p className="text-text-primary text-sm font-semibold">
                      {user?.name || user?.email?.split('@')[0] || t('common.user')}
                    </p>
                    <p className="text-text-muted truncate text-xs">{user?.email || ''}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/overview"
                      className="text-text-secondary hover:bg-background-elevated hover:text-text-primary flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      {t('nav.overview')}
                    </Link>
                    <Link
                      href="/settings"
                      className="text-text-secondary hover:bg-background-elevated hover:text-text-primary flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      {t('nav.settings')}
                    </Link>
                    <ThemeToggle onSelect={() => setIsUserMenuOpen(false)} />
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        // Park focus on the (persistent) avatar button before the
                        // menu item unmounts, so the modal's focus-restore has a
                        // still-connected element to return to on close.
                        avatarButtonRef.current?.focus();
                        openFeedbackModal();
                      }}
                      className="text-text-secondary hover:bg-background-elevated hover:text-text-primary flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {t('feedback.menuItem')}
                    </button>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        toggleCommandPalette();
                      }}
                      className="text-text-secondary hover:bg-background-elevated hover:text-text-primary flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CommandIcon className="h-4 w-4" />
                        {t('nav.commandMenu')}
                      </div>
                      <kbd className="border-border-subtle text-text-muted rounded border px-1.5 py-0.5 font-mono text-xs">
                        ⌘ K
                      </kbd>
                    </button>
                  </div>
                  <div className="border-border-subtle border-t">
                    <button
                      className="text-text-secondary hover:bg-background-elevated hover:text-text-primary flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      {t('nav.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs - scrollable on mobile */}
        <nav className="scrollbar-hide flex items-center gap-1 overflow-x-auto px-6">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={twMerge(
                  'relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
                )}
              >
                {t(`nav.${item.key}`)}
                {isActive && <div className="bg-primary absolute inset-x-0 bottom-0 h-0.5" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default TopNav;
