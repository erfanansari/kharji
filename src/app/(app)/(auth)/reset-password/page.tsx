import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import ResetPassword from '@features/pages/ResetPassword';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return { title: t('resetPassword') };
}

const ResetPasswordPage = () => (
  <>
    <ResetPassword />
  </>
);

export default ResetPasswordPage;
