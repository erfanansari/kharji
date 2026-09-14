'use client';

import { useTranslations } from 'next-intl';

import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Drawer } from 'vaul';

export interface RowAction {
  /** Stable key — also used as the test id suffix. */
  id: string;
  icon: LucideIcon;
  label: string;
  onSelect: () => void;
  /** Renders in the danger colour. Destructive actions sort last by convention. */
  danger?: boolean;
  /** Swaps the icon for a spinner and blocks re-selection. */
  busy?: boolean;
}

interface RowActionSheetProps {
  /** The row label shown as the sheet's title, e.g. an expense description. */
  title?: string;
  actions: RowAction[];
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The bottom sheet behind a card's ⋮ button.
 *
 * Deliberately generic — it knows nothing about expenses, income or assets, so
 * every table gets the same gesture. `DataTable` renders exactly one of these
 * per table and swaps its actions as rows are selected; one instance per card
 * would mean fifty mounted sheets on a full expenses page.
 *
 * Mobile-only by construction: it's rendered inside `DataTable`'s card tree,
 * which is `sm:hidden`. That's why the direction is hard-coded to `bottom`
 * rather than mirrored for RTL the way `ExpenseDetailsDrawer` has to be.
 */
const RowActionSheet = ({ title, actions, isOpen, onClose }: RowActionSheetProps) => {
  const t = useTranslations('tables');

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      direction="bottom"
      shouldScaleBackground={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="bg-background fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none"
        >
          <Drawer.Title className="sr-only">{title ?? t('actions')}</Drawer.Title>

          {/* Drag handle */}
          <div className="flex justify-center py-3">
            <div className="bg-border-strong h-1 w-10 rounded-full" />
          </div>

          {title && <p className="text-text-muted border-border-subtle truncate border-b px-5 pb-3 text-xs">{title}</p>}

          <div className="flex flex-col gap-0.5 p-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  data-testid={`row-action-${action.id}`}
                  disabled={action.busy}
                  onClick={() => {
                    // Close first, then act. A delete hands off to
                    // DeleteConfirmModal, and two stacked overlays trap focus
                    // and leave the body scroll-locked twice over.
                    onClose();
                    action.onSelect();
                  }}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3.5 text-start text-sm font-medium transition-colors disabled:opacity-50 ${
                    action.danger ? 'text-danger hover:bg-danger/10' : 'text-text-primary hover:bg-background-elevated'
                  }`}
                >
                  {action.busy ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                  ) : (
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default RowActionSheet;
