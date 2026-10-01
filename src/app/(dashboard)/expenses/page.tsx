import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import Expenses from '@features/pages/Expenses';
import { parseExpenseFilters } from '@features/pages/Expenses/utils';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return { title: t('expenses') };
}

interface ExpensesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const ExpensesPage = async ({ searchParams }: ExpensesPageProps) => {
  const initialFilters = parseExpenseFilters(await searchParams);
  return <Expenses initialFilters={initialFilters} />;
};

export default ExpensesPage;
