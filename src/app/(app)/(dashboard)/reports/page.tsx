import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import Reports from '@features/pages/Reports';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return { title: t('reports') };
}

const ReportsPage = () => (
  <>
    <Reports />
  </>
);

export default ReportsPage;
