import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import Signup from '@features/pages/Signup';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return { title: t('signup') };
}

const SignupPage = () => (
  <>
    <Signup />
  </>
);

export default SignupPage;
