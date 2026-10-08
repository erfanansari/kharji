import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import Overview from '@features/pages/Overview';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return { title: t('overview') };
}

const OverviewPage = () => {
  return (
    <>
      <Overview />
    </>
  );
};

export default OverviewPage;
