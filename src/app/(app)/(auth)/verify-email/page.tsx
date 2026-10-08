import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import VerifyEmail from '@features/pages/VerifyEmail';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return { title: t('verifyEmail') };
}

const VerifyEmailPage = () => (
  <>
    <VerifyEmail />
  </>
);

export default VerifyEmailPage;
