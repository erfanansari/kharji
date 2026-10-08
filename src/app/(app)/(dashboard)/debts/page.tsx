import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import Debts from '@features/pages/Debts';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return { title: t('debts') };
}

const DebtsPage = () => (
  <>
    <Debts />
  </>
);

export default DebtsPage;
