import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import SettingsIndex from '@features/pages/Settings/components/SettingsIndex';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return { title: t('settings') };
}

const SettingsPage = () => (
  <>
    <SettingsIndex />
  </>
);

export default SettingsPage;
