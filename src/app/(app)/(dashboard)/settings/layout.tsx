import type { PropsWithChildren } from 'react';

import { getTranslations } from 'next-intl/server';

import SettingsNav from '@features/pages/Settings/components/SettingsNav';

import PageHeader from '@components/PageHeader';

/**
 * Settings shell: one `<h1>` for the whole area, a grouped rail on desktop, and
 * a single content pane. Each section owns its own `<h2>`, so the heading
 * outline stays correct without the pane repeating the title.
 *
 * The rail is hidden below `lg`, where `/settings` itself is the navigation
 * (see SettingsIndex) and section pages get a back link instead.
 */
const SettingsLayout = async ({ children }: PropsWithChildren) => {
  const t = await getTranslations('settings');

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        {/* Sized in rem, not a fixed px width: Persian labels run appreciably
            longer than their English counterparts and must not wrap. */}
        <aside className="hidden lg:sticky lg:top-8 lg:block">
          <SettingsNav />
        </aside>

        {/* Capped so a three-toggle section doesn't stretch controls across
            1,300px of empty card. */}
        <div className="max-w-3xl min-w-0">{children}</div>
      </div>
    </div>
  );
};

export default SettingsLayout;
