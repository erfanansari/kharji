import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import Welcome from '@features/pages/Welcome';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return { title: t('welcome') };
}

const WelcomePage = () => (
  <>
    <Welcome />
  </>
);

export default WelcomePage;
