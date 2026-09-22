'use client';

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject, ReactNode } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { usePathname, useRouter } from 'next/navigation';

import {
  type Action,
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  useKBar,
  useMatches,
  useRegisterActions,
} from 'kbar';
import {
  ArrowLeftRight,
  DollarSign,
  HandCoins,
  Languages,
  LayoutDashboard,
  MessageSquare,
  PieChart,
  Plus,
  Receipt,
  Search,
  Settings,
  SunMoon,
  TrendingUp,
} from 'lucide-react';

import { useAuth } from '@hooks/use-auth';
import { useCurrencyPreferences } from '@hooks/use-currency-preferences';
import { useLocalePreferences } from '@hooks/use-locale-preferences';

import { useDrawerStore } from '@stores/drawer';

import type { AppLocale } from '@/i18n/config';

interface CommandPaletteContextType {
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextType | undefined>(undefined);

export const useCommandPalette = () => {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return context;
};

type ToggleRef = MutableRefObject<(() => void) | null>;

/**
 * The kbar tree is mounted ONLY for signed-in users — kbar hardwires a global
 * ⌘K handler and body scroll-lock that can't be configured away, so on auth
 * pages the palette simply doesn't exist. Children render outside KBarProvider
 * (they don't need kbar context), which keeps auth changes from remounting the
 * app; the toggle ref is how the app (TopNav) reaches the palette while it's
 * mounted.
 */
export const CommandPaletteProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const toggleRef: ToggleRef = useRef(null);

  const contextValue = useMemo<CommandPaletteContextType>(() => ({ toggle: () => toggleRef.current?.() }), []);

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      {user && <CommandPalette toggleRef={toggleRef} />}
    </CommandPaletteContext.Provider>
  );
};

// The actual palette — only ever mounted with a signed-in user.
function CommandPalette({ toggleRef }: { toggleRef: ToggleRef }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as AppLocale;
  const { mutate: mutateLocale } = useLocalePreferences();
  const { resolvedTheme, setTheme } = useTheme();
  const { prefs: currencyPrefs, mutate: mutateCurrency } = useCurrencyPreferences();
  const openExpenseDrawer = useDrawerStore((state) => state.openExpenseDrawer);
  const openIncomeDrawer = useDrawerStore((state) => state.openIncomeDrawer);
  const openAssetDrawer = useDrawerStore((state) => state.openAssetDrawer);
  const openDebtDrawer = useDrawerStore((state) => state.openDebtDrawer);
  const openFeedbackModal = useDrawerStore((state) => state.openFeedbackModal);

  const actions = useMemo<Action[]>(() => {
    const goTo = (name: string) => t('common.commandPalette.goTo', { name });
    const navActions = [
      {
        id: 'nav-overview',
        name: goTo(t('nav.overview')),
        path: '/overview',
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        id: 'nav-expenses',
        name: goTo(t('nav.expenses')),
        path: '/expenses',
        icon: <Receipt className="h-4 w-4" />,
      },
      { id: 'nav-income', name: goTo(t('nav.income')), path: '/income', icon: <DollarSign className="h-4 w-4" /> },
      { id: 'nav-assets', name: goTo(t('nav.assets')), path: '/assets', icon: <TrendingUp className="h-4 w-4" /> },
      { id: 'nav-debts', name: goTo(t('nav.debts')), path: '/debts', icon: <HandCoins className="h-4 w-4" /> },
      { id: 'nav-reports', name: goTo(t('nav.reports')), path: '/reports', icon: <PieChart className="h-4 w-4" /> },
      {
        id: 'nav-settings',
        name: goTo(t('nav.settings')),
        path: '/settings',
        icon: <Settings className="h-4 w-4" />,
      },
    ]
      .filter((a) => pathname !== a.path)
      .map((a) => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        section: t('common.commandPalette.sectionNavigation'),
        perform: () => router.push(a.path),
      }));

    // Keywords carry both languages so search works regardless of UI locale.
    const createActions: Action[] = [
      {
        id: 'create-expense',
        name: t('common.addExpense'),
        section: t('common.commandPalette.sectionCreate'),
        icon: <Plus className="h-4 w-4" />,
        // Bound by physical key (event.code), not the character it produces —
        // works under any keyboard layout, including a Farsi one, where 'e'
        // as a literal character would never match.
        shortcut: ['KeyE'],
        keywords: 'add new expense spend افزودن هزینه خرج',
        perform: () => openExpenseDrawer(),
      },
      {
        id: 'create-income',
        name: t('common.addIncome'),
        section: t('common.commandPalette.sectionCreate'),
        icon: <Plus className="h-4 w-4" />,
        shortcut: ['KeyI'],
        keywords: 'add new income earn salary افزودن درآمد حقوق',
        perform: () => openIncomeDrawer(),
      },
      {
        id: 'create-asset',
        name: t('common.addAsset'),
        section: t('common.commandPalette.sectionCreate'),
        icon: <Plus className="h-4 w-4" />,
        shortcut: ['KeyA'],
        keywords: 'add new asset wealth investment افزودن دارایی سرمایه',
        perform: () => openAssetDrawer(),
      },
      {
        id: 'create-debt',
        name: t('common.addDebt'),
        section: t('common.commandPalette.sectionCreate'),
        icon: <Plus className="h-4 w-4" />,
        // D is free: E, I, A and the palette's own $mod+K are the taken ones.
        shortcut: ['KeyD'],
        keywords: 'add new debt loan owe lend borrow credit افزودن بدهی طلب قرض وام دین',
        perform: () => openDebtDrawer(),
      },
    ];

    const secondaryCurrency = currencyPrefs.secondaryCurrency;
    const settingsActions: Action[] = [
      {
        id: 'change-language',
        name: t('common.commandPalette.changeLanguage'),
        section: t('common.commandPalette.sectionSettings'),
        icon: <Languages className="h-4 w-4" />,
        keywords: 'language locale english farsi persian فارسی انگلیسی زبان',
        perform: () => {
          const next: AppLocale = locale === 'fa' ? 'en' : 'fa';
          mutateLocale({ locale: next }, { onSuccess: () => router.refresh() });
        },
      },
      // Swapping into an empty secondary is meaningless, so this action only
      // exists when one is actually set.
      ...(secondaryCurrency
        ? [
            {
              id: 'swap-currencies',
              name: t('common.commandPalette.swapCurrencies'),
              section: t('common.commandPalette.sectionSettings'),
              icon: <ArrowLeftRight className="h-4 w-4" />,
              keywords: 'swap flip switch currency primary secondary جابجایی ارز واحد پول',
              perform: () => {
                mutateCurrency({
                  primaryCurrency: secondaryCurrency,
                  secondaryCurrency: currencyPrefs.primaryCurrency,
                });
              },
            },
          ]
        : []),
      {
        id: 'toggle-theme',
        name: t('common.commandPalette.toggleTheme'),
        section: t('common.commandPalette.sectionSettings'),
        icon: <SunMoon className="h-4 w-4" />,
        keywords: 'dark light theme mode appearance تاریک روشن پوسته تم',
        // A quick toggle implies a binary flip; "system" stays a deliberate
        // choice made in Settings, not something this cycles through.
        perform: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'send-feedback',
        name: t('feedback.menuItem'),
        section: t('common.commandPalette.sectionSettings'),
        icon: <MessageSquare className="h-4 w-4" />,
        keywords: 'feedback bug idea report suggestion بازخورد اشکال ایده پیشنهاد',
        perform: () => openFeedbackModal(),
      },
    ];

    return [...createActions, ...navActions, ...settingsActions];
  }, [
    t,
    pathname,
    router,
    locale,
    mutateLocale,
    resolvedTheme,
    setTheme,
    currencyPrefs,
    mutateCurrency,
    openExpenseDrawer,
    openIncomeDrawer,
    openAssetDrawer,
    openDebtDrawer,
    openFeedbackModal,
  ]);

  return (
    // The palette must NOT lock body scroll — not kbar's lock, not ours.
    // Locks around the palette race with Radix's lock (inside vaul drawers)
    // in both orders and shift the layout by a scrollbar width:
    //  - drawer→⌘K: kbar's lock stacks inline margin-right on top of Radix's
    //    stylesheet compensation;
    //  - ⌘K→"Add expense": the drawer mounts while a palette lock holds the
    //    scrollbar hidden, so Radix measures a 0 gap and under-compensates
    //    when the palette lock releases.
    // A transient keyboard overlay doesn't need scroll-locking; the backdrop
    // already swallows pointer interaction.
    <KBarProvider
      options={{
        disableDocumentLock: true,
        // Bound by physical key (event.code) rather than the produced
        // character — 'k' would never fire under a Farsi keyboard layout.
        toggleShortcut: '$mod+KeyK',
      }}
    >
      <KBarConnector toggleRef={toggleRef} actions={actions} />
      <CommandPaletteUI />
    </KBarProvider>
  );
}

// Registers the (pathname-dependent) actions and exposes kbar's toggle to the
// provider's ref for the lifetime of the palette.
function KBarConnector({ toggleRef, actions }: { toggleRef: ToggleRef; actions: Action[] }) {
  const { query } = useKBar();

  useRegisterActions(actions, [actions]);

  useEffect(() => {
    toggleRef.current = () => query.toggle();
    return () => {
      toggleRef.current = null;
    };
  }, [query, toggleRef]);

  return null;
}

// Custom UI component using kbar primitives
function CommandPaletteUI() {
  const t = useTranslations('common.commandPalette');
  return (
    <KBarPortal>
      <KBarPositioner className="fixed inset-0 z-(--z-command-palette) flex items-start justify-center bg-black/30 px-4 pt-[20vh] backdrop-blur-[2px]">
        <KBarAnimator className="border-border-subtle bg-background w-full max-w-xl overflow-hidden rounded-xl border shadow-[0_24px_60px_-12px_rgba(0,0,0,0.28),0_8px_24px_-8px_rgba(0,0,0,0.12)]">
          {/* Search input */}
          <div className="border-border-subtle flex items-center gap-3 border-b px-4 py-3">
            <Search className="text-text-muted h-4 w-4 shrink-0" />
            <KBarSearch
              className="text-text-primary placeholder:text-text-muted flex-1 bg-transparent text-sm outline-none"
              placeholder={t('placeholder')}
              dir="auto"
            />
            <kbd className="bg-background-elevated text-text-muted hidden rounded px-2 py-1 text-[11px] font-medium sm:inline-block">
              ESC
            </kbd>
          </div>

          {/* Results list */}
          <RenderResults />

          {/* Footer hints */}
          <div className="border-border-subtle text-text-muted flex items-center justify-center gap-4 border-t px-4 py-2 text-[11px]">
            <span className="flex items-center gap-1.5">
              <kbd className="bg-background-elevated rounded px-1.5 py-0.5 font-medium">↑↓</kbd>
              {t('navigate')}
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-background-elevated rounded px-1.5 py-0.5 font-medium">↵</kbd>
              {t('select')}
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-background-elevated rounded px-1.5 py-0.5 font-medium">ESC</kbd>
              {t('close')}
            </span>
          </div>
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
}

// Shortcuts are bound by physical key (e.g. 'KeyE') so they work under any
// keyboard layout — strip the "Key" prefix for display so the hint still
// reads "E", not "KeyE".
const prettyShortcut = (keys: string[]) => keys.map((key) => key.replace(/^Key/, '')).join(' ');

// Results renderer
function RenderResults() {
  const t = useTranslations('common.commandPalette');
  const { results } = useMatches();

  return (
    <div className="flex max-h-96 flex-col gap-0.5 overflow-y-auto overscroll-contain p-1">
      {results.length === 0 ? (
        <div className="text-text-muted px-4 py-8 text-center text-sm">{t('noResults')}</div>
      ) : (
        <KBarResults
          items={results}
          onRender={({ item, active }) =>
            typeof item === 'string' ? (
              // Section header (e.g., "Create", "Navigation")
              <div className="text-text-muted px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wide uppercase">
                {item}
              </div>
            ) : (
              // Command item
              <div
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-start text-[13px] transition-colors duration-100 ${
                  active ? 'bg-background-elevated text-text-primary' : 'text-text-secondary'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon && <span className="text-text-muted">{item.icon}</span>}
                  <span className="font-medium">{item.name}</span>
                </div>
                {item.shortcut && item.shortcut.length > 0 && (
                  <kbd className="bg-background-secondary text-text-muted hidden rounded px-1.5 py-0.5 text-[11px] font-medium sm:inline-block">
                    {prettyShortcut(item.shortcut)}
                  </kbd>
                )}
              </div>
            )
          }
        />
      )}
    </div>
  );
}
