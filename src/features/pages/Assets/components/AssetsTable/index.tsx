import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import { ASSET_CATEGORY_COLOR_FALLBACK, ASSET_CATEGORY_COLORS } from '@constants/assets';
import { Wallet } from 'lucide-react';

import type { AssetCategory } from '@types';

import { ApiError } from '@core/errors';

import Button from '@components/Button';
import DataTable from '@components/DataTable';
import EmptyState from '@components/EmptyState';
import ErrorState from '@components/ErrorState';
import Pulse from '@components/Skeleton';

import { useAssetCategoryLabel } from '@hooks/use-constant-labels';

import { useDrawerStore } from '@stores/drawer';

import type { AssetsTableProps } from '../../@types';
import {
  ASSETS_TABLE_MIN_WIDTH,
  buildAssetColumns,
  buildAssetMobileCard,
  buildAssetRowActions,
  CATEGORY_ICONS,
} from '../../constants';

const CATEGORY_COLORS = ASSET_CATEGORY_COLORS as Record<AssetCategory, string>;

function AssetsTableSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="border-border-subtle bg-background rounded-xl border shadow-sm">
          <div className="bg-background-secondary border-border-subtle border-b px-6 py-4">
            <div className="flex justify-between">
              <Pulse className="h-3 w-16" />
              <Pulse className="h-3 w-16" />
              <Pulse className="h-3 w-16" />
            </div>
          </div>
          {[...Array(3)].map((_, j) => (
            <div key={j} className="border-border-subtle border-t px-6 py-4">
              <div className="flex justify-between">
                <Pulse className="h-4 w-28" />
                <Pulse className="h-4 w-16" />
                <Pulse className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const AssetsTable = ({
  assetsByCategory,
  isLoading,
  error,
  assetsCount,
  onEdit,
  onDelete,
  deletingId,
  onRetry,
}: AssetsTableProps) => {
  const tTables = useTranslations('tables');
  const tOnboarding = useTranslations('onboarding.emptyStates');
  const t = useTranslations('pages.assets');
  const categoryLabel = useAssetCategoryLabel();
  const openAssetDrawer = useDrawerStore((state) => state.openAssetDrawer);
  // Memos
  const assetColumns = useMemo(
    () => buildAssetColumns(tTables, categoryLabel, onEdit, onDelete, deletingId),
    [tTables, categoryLabel, onEdit, onDelete, deletingId]
  );

  const assetMobileCard = useMemo(() => buildAssetMobileCard(tTables), [tTables]);

  const assetRowActions = useMemo(
    () => buildAssetRowActions(tTables, onEdit, onDelete, deletingId),
    [tTables, onEdit, onDelete, deletingId]
  );

  if (isLoading) {
    return <AssetsTableSkeleton />;
  }

  if (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    return (
      <div className="border-border-subtle bg-background relative overflow-hidden rounded-xl border shadow-sm">
        <ErrorState title={t('loadError')} description={error.message} onRetry={onRetry} />
      </div>
    );
  }

  if (assetsCount === 0) {
    return (
      <div className="border-border-subtle bg-background relative rounded-xl border shadow-sm">
        <EmptyState
          icon={Wallet}
          title={tOnboarding('assetsTable.title')}
          description={tOnboarding('assetsTable.description')}
          className="py-16"
          action={
            <Button variant="outline" onClick={() => openAssetDrawer()}>
              {tOnboarding('addAsset')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(assetsByCategory)
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([category, data]) => {
          const Icon = CATEGORY_ICONS[category as AssetCategory] || Wallet;
          const color = CATEGORY_COLORS[category as AssetCategory] || ASSET_CATEGORY_COLOR_FALLBACK;

          return (
            <div key={category}>
              <div className="mb-4 flex items-center gap-2">
                <Icon className="h-5 w-5" style={{ color }} />
                <h2 className="text-text-primary text-lg font-semibold">{categoryLabel(category)}</h2>
              </div>
              <DataTable
                data={data.assets}
                columns={assetColumns}
                minWidth={ASSETS_TABLE_MIN_WIDTH}
                getRowId={(row) => String(row.id)}
                mobileCard={assetMobileCard}
                rowActions={assetRowActions}
                rowActionTitle={(row) => row.name}
              />
            </div>
          );
        })}
    </div>
  );
};

export default AssetsTable;
