import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import Login from '@features/pages/Login';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return { title: t('login') };
}

const LoginPage = () => (
  <>
    <Login />
  </>
);

export default LoginPage;
