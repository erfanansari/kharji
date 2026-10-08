import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import Income from '@features/pages/Income';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return { title: t('income') };
}

const IncomePage = () => (
  <>
    <Income />
  </>
);

export default IncomePage;
