import type { ComponentType } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ChevronRight } from 'lucide-react';

import AppearanceSection from '@features/pages/Settings/components/AppearanceSection';
import CategoryManagement from '@features/pages/Settings/components/CategoryManagement';
import CurrencySection from '@features/pages/Settings/components/CurrencySection';
import DataManagement from '@features/pages/Settings/components/DataManagement';
import HelpSection from '@features/pages/Settings/components/HelpSection';
import LanguageSection from '@features/pages/Settings/components/LanguageSection';
import NotificationsSection from '@features/pages/Settings/components/NotificationsSection';
import ProfileCard from '@features/pages/Settings/components/ProfileCard';
import SecuritySection from '@features/pages/Settings/components/SecuritySection';
import TagManagement from '@features/pages/Settings/components/TagManagement';
import { getSettingsSection, SETTINGS_SLUGS } from '@features/pages/Settings/constants';

/**
 * Slug → section component. Imported explicitly rather than resolved
 * dynamically so the bundler can trace each one, matching how the release
 * notes barrel is written.
 */
const SECTION_COMPONENTS: Record<string, ComponentType> = {
  profile: ProfileCard,
  security: SecuritySection,
  notifications: NotificationsSection,
  currency: CurrencySection,
  language: LanguageSection,
  appearance: AppearanceSection,
  categories: CategoryManagement,
  tags: TagManagement,
  data: DataManagement,
  help: HelpSection,
};

export const generateStaticParams = () => SETTINGS_SLUGS.map((section) => ({ section }));

interface SettingsSectionPageProps {
  params: Promise<{ section: string }>;
}

export async function generateMetadata({ params }: SettingsSectionPageProps): Promise<Metadata> {
  const { section } = await params;
  const meta = getSettingsSection(section);
  if (!meta) return {};

  const [t, tMeta] = await Promise.all([getTranslations('settings'), getTranslations('metaTitles')]);
  return { title: `${t(`${meta.titleKey}.title`)} · ${tMeta('settings')}` };
}

const SettingsSectionPage = async ({ params }: SettingsSectionPageProps) => {
  const { section } = await params;

  const meta = getSettingsSection(section);
  const Section = SECTION_COMPONENTS[section];
  if (!meta || !Section) notFound();

  const t = await getTranslations('settings');

  return (
    <>
      {/* Below `lg` the rail is hidden and `/settings` is the menu, so a section
          page needs its own way back up. */}
      <Link
        href="/settings"
        className="text-text-secondary hover:text-text-primary focus-visible:ring-accent mb-4 inline-flex items-center gap-1.5 rounded-lg text-sm focus-visible:ring-2 focus-visible:outline-none lg:hidden"
      >
        <ChevronRight className="h-4 w-4 scale-x-[-1] rtl:scale-x-100" aria-hidden="true" />
        {t('backToSettings')}
      </Link>

      <Section />
    </>
  );
};

export default SettingsSectionPage;
