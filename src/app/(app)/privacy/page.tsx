import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import Privacy from '@features/pages/Privacy';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.privacy');
  return {
    title: t('title'),
    description: t('metaDescription'),
  };
}

const PrivacyPage = () => (
  <>
    <Privacy />
  </>
);

export default PrivacyPage;
