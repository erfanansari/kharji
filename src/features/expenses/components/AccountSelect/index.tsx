'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import { getAssetListKeyGenerator } from '@api/getAssetListQuery';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown } from 'lucide-react';
import ReactSelect, { components } from 'react-select';
import type {
  CSSObjectWithLabel,
  DropdownIndicatorProps,
  MenuListProps,
  OptionProps,
  SingleValueProps,
  StylesConfig,
} from 'react-select';
import { twMerge } from 'tailwind-merge';

import CategoryTile from '@components/CategoryTile';

import { useMoneyText } from '@hooks/use-money-text';

import type { Asset } from '@/@types/asset';
import { isSpendableAssetCategory, SPENDABLE_ASSET_TILE } from '@/constants/assets';

/**
 * Picks the account an expense is paid out of.
 *
 * Only cash and bank assets appear — see SPENDABLE_ASSET_CATEGORIES. Structure
 * is lifted from CategorySelect deliberately, down to the MenuList wheel/touch
 * handlers, which matter because this renders inside a vaul drawer that would
 * otherwise swallow the scroll.
 */

/** "Don't track" — a real option rather than a clearable empty value, so opting
 *  out is one click and reads as a choice. 0 is never a valid asset id. */
export const NO_ACCOUNT_VALUE = 0;

interface AccountOption {
  value: number;
  label: string;
  asset: Asset | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styles: StylesConfig<any, any, any> = {
  menuPortal: (base: CSSObjectWithLabel) => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
  menu: (base: CSSObjectWithLabel) => ({ ...base, width: 'max-content', minWidth: '100%' }),
  control: () => ({ minHeight: 'unset' }),
  valueContainer: () => ({ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden', padding: 0 }),
};

const MenuList = (props: MenuListProps<AccountOption, false>) => (
  <components.MenuList
    {...props}
    innerProps={{
      ...props.innerProps,
      onWheel: (e) => e.stopPropagation(),
      onTouchMove: (e) => e.stopPropagation(),
    }}
  />
);

const DropdownIndicator = (props: DropdownIndicatorProps<AccountOption, false>) => (
  <components.DropdownIndicator {...props}>
    <ChevronDown
      className={twMerge(
        'text-text-muted h-3.5 w-3.5 shrink-0 transition-transform duration-200',
        props.selectProps.menuIsOpen && 'rotate-180'
      )}
    />
  </components.DropdownIndicator>
);

const tileFor = (asset: Asset) => {
  const tile = SPENDABLE_ASSET_TILE[asset.category as keyof typeof SPENDABLE_ASSET_TILE];
  return { name: asset.name, icon: tile.icon, color: tile.color };
};

const Option = (props: OptionProps<AccountOption, false>) => {
  const { data, isFocused, isSelected, innerProps, innerRef } = props;
  // An account's balance is shown in the account's OWN currency, not the user's
  // display currency: that number is the balance, and converting it would show
  // a figure that doesn't match what the deduction is about to do to it.
  const { formatFull } = useMoneyText();

  return (
    <div
      {...innerProps}
      ref={innerRef}
      className={twMerge(
        'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 whitespace-nowrap transition-colors duration-100',
        isFocused && 'bg-background-elevated'
      )}
    >
      {data.asset ? (
        <CategoryTile
          category={tileFor(data.asset)}
          className="flex-1"
          emphasis={isFocused || isSelected}
          subtitle={formatFull(data.asset.amount, data.asset.currency)}
        />
      ) : (
        <span
          className={twMerge(
            'flex-1 text-[13px]',
            isFocused || isSelected ? 'text-text-primary font-medium' : 'text-text-secondary'
          )}
        >
          {data.label}
        </span>
      )}
      {isSelected && <Check className="text-blue h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
    </div>
  );
};

const SingleValue = (props: SingleValueProps<AccountOption, false>) => {
  const { data } = props;
  return (
    <components.SingleValue {...props}>
      {data.asset ? (
        <CategoryTile category={tileFor(data.asset)} emphasis />
      ) : (
        <span className="text-text-secondary text-[13px]">{data.label}</span>
      )}
    </components.SingleValue>
  );
};

interface AccountSelectProps {
  /** The selected asset id, or null for "don't track". */
  value: number | null;
  onChange: (assetId: number | null) => void;
  disabled?: boolean;
  /** Id for react-select's focusable input so an external <label> can target it. */
  inputId?: string;
}

const AccountSelect = ({ value, onChange, disabled, inputId }: AccountSelectProps) => {
  const t = useTranslations('forms.expense');
  const { data: assets = [] } = useQuery<Asset[]>({ queryKey: getAssetListKeyGenerator() });

  const accounts = useMemo(() => assets.filter((a) => isSpendableAssetCategory(a.category)), [assets]);

  const options: AccountOption[] = [
    { value: NO_ACCOUNT_VALUE, label: t('paidFromNone'), asset: null },
    ...accounts.map<AccountOption>((asset) => ({ value: asset.id, label: asset.name, asset })),
  ];

  const selected = options.find((o) => o.value === (value ?? NO_ACCOUNT_VALUE)) ?? options[0];

  return (
    <ReactSelect<AccountOption, false>
      value={selected}
      onChange={(opt) => onChange(!opt || opt.value === NO_ACCOUNT_VALUE ? null : opt.value)}
      options={options}
      placeholder={t('paidFromPlaceholder')}
      isDisabled={disabled}
      isSearchable={false}
      inputId={inputId}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      menuPosition="fixed"
      menuPlacement="auto"
      unstyled
      styles={styles}
      components={{ DropdownIndicator, MenuList, Option, SingleValue, IndicatorSeparator: () => null }}
      classNames={{
        control: ({ isFocused, isDisabled, menuIsOpen }) =>
          twMerge(
            'border-border-subtle bg-background flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all duration-150',
            'hover:border-border-default hover:bg-background-secondary',
            (isFocused || menuIsOpen) && 'border-blue hover:border-blue ring-2 ring-blue/15 bg-background',
            isDisabled &&
              'bg-background-secondary text-text-muted cursor-not-allowed opacity-60 hover:bg-background-secondary hover:border-border-subtle'
          ),
        menu: () =>
          'border-border-subtle bg-background mt-1.5 rounded-xl border p-1 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18),0_4px_8px_-4px_rgba(0,0,0,0.08)] animate-dropdown-pop overflow-hidden',
        menuList: () => 'flex flex-col gap-0.5 max-h-80 overflow-y-auto',
        placeholder: () => 'text-text-muted text-sm whitespace-nowrap',
        singleValue: () => 'flex-1 min-w-0',
        input: () => 'text-text-primary text-sm',
        valueContainer: () => 'py-0',
        dropdownIndicator: () => 'ms-1 text-text-muted',
        noOptionsMessage: () => 'text-text-muted px-3 py-3 text-sm',
      }}
    />
  );
};

export default AccountSelect;
