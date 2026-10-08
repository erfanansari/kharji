import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import Assets from '@features/pages/Assets';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return { title: t('assets') };
}

const AssetsPage = () => (
  <>
    <Assets />
  </>
);

export default AssetsPage;
