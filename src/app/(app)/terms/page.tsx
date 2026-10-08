import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import Terms from '@features/pages/Terms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.terms');
  return {
    title: t('title'),
    description: t('metaDescription'),
  };
}

const TermsPage = () => (
  <>
    <Terms />
  </>
);

export default TermsPage;
