export const ROUTES = {
  HOME: '/',
  CHANGELOG: '/changelog',
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  OVERVIEW: '/overview',
  EXPENSES: '/expenses',
  INCOME: '/income',
  REPORTS: '/reports',
  ASSETS: '/assets',
  DEBTS: '/debts',
  SETTINGS: '/settings',
} as const;

export const NAV_ITEMS = [
  { key: 'overview', href: ROUTES.OVERVIEW },
  { key: 'expenses', href: ROUTES.EXPENSES },
  { key: 'assets', href: ROUTES.ASSETS },
  { key: 'reports', href: ROUTES.REPORTS },
  { key: 'income', href: ROUTES.INCOME },
  { key: 'debts', href: ROUTES.DEBTS },
  { key: 'settings', href: ROUTES.SETTINGS },
] as const;
