import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import ForgotPassword from '@features/pages/ForgotPassword';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return { title: t('forgotPassword') };
}

const ForgotPasswordPage = () => (
  <>
    <ForgotPassword />
  </>
);

export default ForgotPasswordPage;
