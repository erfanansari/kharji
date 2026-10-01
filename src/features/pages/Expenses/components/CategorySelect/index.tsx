import { useTranslations } from 'next-intl';

import type { GroupBase, MultiValue, StylesConfig } from 'react-select';
import Select2 from 'react-select';

import type { Category } from '@types';

import CategoryTile from '@components/CategoryTile';

interface CategoryOption {
  value: number;
  label: string;
  category: Category;
}

interface CategoryFilterSelectProps {
  options: Category[];
  value: Category[];
  onChange: (categories: Category[]) => void;
  styles: StylesConfig<CategoryOption, true, GroupBase<CategoryOption>>;
}

export function CategoryFilterSelect({ options: categories, value, onChange, styles }: CategoryFilterSelectProps) {
  const t = useTranslations('pages.expenses');

  const options: CategoryOption[] = categories.map((category) => ({
    value: category.id,
    label: category.name,
    category,
  }));
  const selected: CategoryOption[] = value.map((category) => ({
    value: category.id,
    label: category.name,
    category,
  }));

  const handleChange = (next: MultiValue<CategoryOption>) => {
    onChange(next.map((option) => option.category));
  };

  return (
    <Select2<CategoryOption, true>
      isMulti
      classNamePrefix="cf"
      value={selected}
      onChange={handleChange}
      options={options}
      placeholder={t('allCategories')}
      isSearchable
      closeMenuOnSelect={false}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      menuPosition="fixed"
      unstyled
      styles={styles}
      formatOptionLabel={(option) => <CategoryTile category={option.category} />}
      components={{
        DropdownIndicator: () => null,
        IndicatorSeparator: () => null,
        ClearIndicator: () => null,
      }}
      classNames={{
        control: ({ isFocused }) =>
          `border rounded-lg px-3 py-2 text-sm transition-all cursor-pointer flex items-center bg-background ${
            isFocused ? 'border-blue ring-2 ring-blue/15' : 'border-border-subtle hover:border-border-default'
          }`,
        valueContainer: () => 'gap-1',
        placeholder: () => 'text-text-muted text-sm whitespace-nowrap',
        input: () => 'text-text-primary text-sm shrink-0 min-w-0',
        menu: () =>
          'border-border-subtle bg-background mt-1.5 rounded-xl border p-1 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18),0_4px_8px_-4px_rgba(0,0,0,0.08)] animate-dropdown-pop overflow-hidden min-w-[200px]',
        menuList: () => 'flex flex-col gap-0.5 max-h-80 overflow-y-auto',
        option: ({ isFocused }) =>
          `rounded-md px-2.5 py-1.5 cursor-pointer transition-colors duration-100 ${
            isFocused ? 'bg-background-elevated' : ''
          }`,
        multiValue: () =>
          'border-border-subtle bg-background-elevated text-text-secondary flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium',
        multiValueLabel: () => 'flex items-center gap-1',
        multiValueRemove: () =>
          'text-text-muted hover:text-text-primary ms-0.5 rounded p-0.5 transition-colors cursor-pointer',
        noOptionsMessage: () => 'text-text-muted px-3 py-3 text-[13px]',
      }}
    />
  );
}
