import type { useTranslations } from 'next-intl';

import { type ColumnDef } from '@tanstack/react-table';
import { Banknote, Bitcoin, Building2, Edit2, Gem, Landmark, Trash2, TrendingUp, Wallet } from 'lucide-react';

import type { Asset, AssetCategory } from '@types';

import ActionButtons from '@components/ActionButtons';
import Money from '@components/Money';
import type { RowAction } from '@components/RowActionSheet';

export const CATEGORY_ICONS: Record<AssetCategory, typeof Wallet> = {
  cash: Banknote,
  crypto: Bitcoin,
  commodity: Gem,
  vehicle: Wallet,
  property: Building2,
  bank: Landmark,
  investment: TrendingUp,
};

// ─── Table layout config ──────────────────────────────────────────────────────
// Centralized so column widths can be tuned in one place. Percentages must sum
// to 100; `ASSETS_TABLE_MIN_WIDTH` is the smallest width the table is allowed
// to shrink to before triggering horizontal scroll on narrow viewports.

export const ASSETS_TABLE_MIN_WIDTH = 'min-w-[680px]';

export const ASSETS_COLUMN_WIDTHS = {
  name: 'w-[35%]',
  quantity: 'w-[18%]',
  value: 'w-[32%]',
  actions: 'w-[15%]',
} as const;

// ─── Mobile card ──────────────────────────────────────────────────────────────
// Assets tables are already split into one table per category with the category
// as its heading, so the card drops the category caption the name column carries
// and gives the row to name / value / quantity.

export function buildAssetMobileCard(t: ReturnType<typeof useTranslations<'tables'>>) {
  return function AssetMobileCard(asset: Asset) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <span className="text-text-primary truncate text-sm font-medium">{asset.name}</span>
          <Money
            amount={asset.amount}
            currency={asset.currency}
            date={asset.lastValuedAt?.slice(0, 10)}
            entryRate={asset.entryRate}
            className="shrink-0 items-end"
            primaryClassName="text-text-primary text-sm font-semibold tabular-nums whitespace-nowrap"
            secondaryClassName="text-text-muted text-xs tabular-nums whitespace-nowrap"
          />
        </div>
        <span className="text-text-secondary text-xs">
          {asset.quantity} {asset.unit || t('unit')}
        </span>
      </div>
    );
  };
}

// Assets call editing "update value", not "edit" — the same distinction the
// table's ActionButtons already makes via editTitle.
export function buildAssetRowActions(
  t: ReturnType<typeof useTranslations<'tables'>>,
  handleEdit: (asset: Asset) => void,
  openDeleteModal: (asset: Asset) => void,
  deletingId: number | null
) {
  return (asset: Asset): RowAction[] => [
    { id: 'edit', icon: Edit2, label: t('updateValue'), onSelect: () => handleEdit(asset) },
    {
      id: 'delete',
      icon: Trash2,
      label: t('delete'),
      danger: true,
      busy: deletingId === asset.id,
      onSelect: () => openDeleteModal(asset),
    },
  ];
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function buildAssetColumns(
  t: ReturnType<typeof useTranslations<'tables'>>,
  categoryLabel: (value: string) => string,
  handleEdit: (asset: Asset) => void,
  openDeleteModal: (asset: Asset) => void,
  deletingId: number | null
): ColumnDef<Asset, unknown>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: t('assets.asset'),
      meta: { widthClass: ASSETS_COLUMN_WIDTHS.name },
      cell: ({ row }) => {
        const asset = row.original;
        return (
          <div className="flex min-w-0 flex-col">
            <span className="text-text-primary truncate text-sm font-medium">{asset.name}</span>
            <span className="text-text-muted truncate text-xs">{categoryLabel(asset.category)}</span>
          </div>
        );
      },
    },
    {
      id: 'quantity',
      accessorKey: 'quantity',
      header: t('assets.quantity'),
      meta: { widthClass: ASSETS_COLUMN_WIDTHS.quantity },
      cell: ({ row }) => {
        const asset = row.original;
        return (
          <span className="text-text-secondary block truncate text-sm whitespace-nowrap">
            {asset.quantity} {asset.unit || t('unit')}
          </span>
        );
      },
    },
    {
      id: 'value',
      accessorKey: 'amount',
      header: t('assets.value'),
      meta: { widthClass: ASSETS_COLUMN_WIDTHS.value, align: 'end' as const },
      cell: ({ row }) => {
        const asset = row.original;
        return (
          <Money
            amount={asset.amount}
            currency={asset.currency}
            date={asset.lastValuedAt?.slice(0, 10)}
            entryRate={asset.entryRate}
            className="items-end"
            primaryClassName="text-text-primary text-sm font-semibold whitespace-nowrap"
            secondaryClassName="text-text-muted text-xs whitespace-nowrap"
          />
        );
      },
    },
    {
      id: 'actions',
      header: t('actions'),
      meta: { widthClass: ASSETS_COLUMN_WIDTHS.actions, align: 'center' as const },
      cell: ({ row }) => {
        const asset = row.original;
        return (
          <ActionButtons
            onEdit={() => handleEdit(asset)}
            onDelete={() => openDeleteModal(asset)}
            isDeleting={deletingId === asset.id}
            editTitle={t('updateValue')}
          />
        );
      },
    },
  ];
}
