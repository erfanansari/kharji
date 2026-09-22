import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Bike,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Coffee,
  CreditCard,
  Cross,
  Dumbbell,
  Film,
  Folder,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Hammer,
  Heart,
  HeartHandshake,
  Home,
  Laptop,
  type LucideIcon,
  Music,
  Package,
  PawPrint,
  Phone,
  PiggyBank,
  Pizza,
  Plane,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Utensils,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react';

// ─── Icon palette ───────────────────────────────────────────────────────────
// Curated lucide-react icons for the category icon picker. Stored on the
// category row by `value` string. Adding a new icon: append here.

export interface CategoryIconOption {
  value: string;
  Icon: LucideIcon;
}

export const CATEGORY_ICONS: ReadonlyArray<CategoryIconOption> = [
  { value: 'Home', Icon: Home },
  { value: 'Zap', Icon: Zap },
  { value: 'ShoppingCart', Icon: ShoppingCart },
  { value: 'ShoppingBag', Icon: ShoppingBag },
  { value: 'Coffee', Icon: Coffee },
  { value: 'Utensils', Icon: Utensils },
  { value: 'Pizza', Icon: Pizza },
  { value: 'Car', Icon: Car },
  { value: 'Bus', Icon: Bus },
  { value: 'Bike', Icon: Bike },
  { value: 'Fuel', Icon: Fuel },
  { value: 'Plane', Icon: Plane },
  { value: 'Heart', Icon: Heart },
  { value: 'Cross', Icon: Cross },
  { value: 'Dumbbell', Icon: Dumbbell },
  { value: 'Shirt', Icon: Shirt },
  { value: 'Film', Icon: Film },
  { value: 'Music', Icon: Music },
  { value: 'Gamepad2', Icon: Gamepad2 },
  { value: 'BookOpen', Icon: BookOpen },
  { value: 'GraduationCap', Icon: GraduationCap },
  { value: 'Briefcase', Icon: Briefcase },
  { value: 'Laptop', Icon: Laptop },
  { value: 'Phone', Icon: Phone },
  { value: 'TrendingUp', Icon: TrendingUp },
  { value: 'PiggyBank', Icon: PiggyBank },
  { value: 'Wallet', Icon: Wallet },
  { value: 'Banknote', Icon: Banknote },
  { value: 'CreditCard', Icon: CreditCard },
  { value: 'Gift', Icon: Gift },
  { value: 'HeartHandshake', Icon: HeartHandshake },
  { value: 'PawPrint', Icon: PawPrint },
  { value: 'Wrench', Icon: Wrench },
  { value: 'Hammer', Icon: Hammer },
  { value: 'Sparkles', Icon: Sparkles },
  { value: 'Package', Icon: Package },
  { value: 'Folder', Icon: Folder },
  // Debt directions (src/constants/debts.ts) resolve through this registry.
  { value: 'ArrowUpRight', Icon: ArrowUpRight },
  { value: 'ArrowDownLeft', Icon: ArrowDownLeft },
];

export const DEFAULT_CATEGORY_ICON = 'Folder';

export function getCategoryIcon(value: string): LucideIcon {
  const found = CATEGORY_ICONS.find((i) => i.value === value);
  return found ? found.Icon : Folder;
}

// ─── Color palette ──────────────────────────────────────────────────────────
// Each color resolves to a theme token defined in `src/styles/globals.css`
// (--color-cat-*). The `pill` class is used for badges (10% alpha bg + colored
// text + border). The `swatch` class fills the picker dots.
//
// Why pre-baked strings instead of dynamic class names: Tailwind v4's JIT
// scans source files for literal class strings, so dynamic `bg-cat-${color}`
// would not be emitted. Listing each combination here guarantees they ship.

export interface CategoryColorOption {
  value: string;
  pill: string; // background + text + border (used by CategoryBadge)
  swatch: string; // solid fill (used by ColorPicker dots)
  text: string; // foreground only
  fill: string; // raw CSS color reference (charts / inline styles)
}

export const CATEGORY_COLORS: ReadonlyArray<CategoryColorOption> = [
  {
    value: 'blue',
    pill: 'bg-cat-blue/10 text-cat-blue border-cat-blue/20',
    swatch: 'bg-cat-blue',
    text: 'text-cat-blue',
    fill: 'var(--color-cat-blue)',
  },
  {
    value: 'green',
    pill: 'bg-cat-green/10 text-cat-green border-cat-green/20',
    swatch: 'bg-cat-green',
    text: 'text-cat-green',
    fill: 'var(--color-cat-green)',
  },
  {
    value: 'amber',
    pill: 'bg-cat-amber/10 text-cat-amber border-cat-amber/20',
    swatch: 'bg-cat-amber',
    text: 'text-cat-amber',
    fill: 'var(--color-cat-amber)',
  },
  {
    value: 'sky',
    pill: 'bg-cat-sky/10 text-cat-sky border-cat-sky/20',
    swatch: 'bg-cat-sky',
    text: 'text-cat-sky',
    fill: 'var(--color-cat-sky)',
  },
  {
    value: 'rose',
    pill: 'bg-cat-rose/10 text-cat-rose border-cat-rose/20',
    swatch: 'bg-cat-rose',
    text: 'text-cat-rose',
    fill: 'var(--color-cat-rose)',
  },
  {
    value: 'violet',
    pill: 'bg-cat-violet/10 text-cat-violet border-cat-violet/20',
    swatch: 'bg-cat-violet',
    text: 'text-cat-violet',
    fill: 'var(--color-cat-violet)',
  },
  {
    value: 'orange',
    pill: 'bg-cat-orange/10 text-cat-orange border-cat-orange/20',
    swatch: 'bg-cat-orange',
    text: 'text-cat-orange',
    fill: 'var(--color-cat-orange)',
  },
  {
    value: 'pink',
    pill: 'bg-cat-pink/10 text-cat-pink border-cat-pink/20',
    swatch: 'bg-cat-pink',
    text: 'text-cat-pink',
    fill: 'var(--color-cat-pink)',
  },
  {
    value: 'cyan',
    pill: 'bg-cat-cyan/10 text-cat-cyan border-cat-cyan/20',
    swatch: 'bg-cat-cyan',
    text: 'text-cat-cyan',
    fill: 'var(--color-cat-cyan)',
  },
  {
    value: 'emerald',
    pill: 'bg-cat-emerald/10 text-cat-emerald border-cat-emerald/20',
    swatch: 'bg-cat-emerald',
    text: 'text-cat-emerald',
    fill: 'var(--color-cat-emerald)',
  },
  {
    value: 'slate',
    pill: 'bg-cat-slate/10 text-cat-slate border-cat-slate/20',
    swatch: 'bg-cat-slate',
    text: 'text-cat-slate',
    fill: 'var(--color-cat-slate)',
  },
  {
    value: 'red',
    pill: 'bg-cat-red/10 text-cat-red border-cat-red/20',
    swatch: 'bg-cat-red',
    text: 'text-cat-red',
    fill: 'var(--color-cat-red)',
  },
  {
    value: 'indigo',
    pill: 'bg-cat-indigo/10 text-cat-indigo border-cat-indigo/20',
    swatch: 'bg-cat-indigo',
    text: 'text-cat-indigo',
    fill: 'var(--color-cat-indigo)',
  },
  {
    value: 'lime',
    pill: 'bg-cat-lime/10 text-cat-lime border-cat-lime/20',
    swatch: 'bg-cat-lime',
    text: 'text-cat-lime',
    fill: 'var(--color-cat-lime)',
  },
  {
    value: 'teal',
    pill: 'bg-cat-teal/10 text-cat-teal border-cat-teal/20',
    swatch: 'bg-cat-teal',
    text: 'text-cat-teal',
    fill: 'var(--color-cat-teal)',
  },
  {
    value: 'gray',
    pill: 'bg-cat-gray/10 text-cat-gray border-cat-gray/20',
    swatch: 'bg-cat-gray',
    text: 'text-cat-gray',
    fill: 'var(--color-cat-gray)',
  },
];

export const DEFAULT_CATEGORY_COLOR = 'gray';

export function getCategoryColor(value: string): CategoryColorOption {
  const found = CATEGORY_COLORS.find((c) => c.value === value);
  return found ?? CATEGORY_COLORS[CATEGORY_COLORS.length - 1];
}
