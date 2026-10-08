import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import Changelog from '@features/pages/Changelog';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metaTitles');
  return {
    title: t('changelog'),
    description: t('changelogDescription'),
  };
}

// Next 16: `searchParams` is a Promise and must be awaited.
const ChangelogPage = async ({ searchParams }: { searchParams: Promise<{ page?: string }> }) => {
  const { page } = await searchParams;

  return <Changelog page={page} />;
};

export default ChangelogPage;
