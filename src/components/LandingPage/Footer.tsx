import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { ROUTES } from '@constants';

import LocaleToggle from '@components/LocaleToggle';

import pkg from '../../../package.json';

const LandingFooter = () => {
  const t = useTranslations('landing.footer');
  const year = new Date().getFullYear();
  const commitSha = process.env.NEXT_PUBLIC_COMMIT_SHA || 'dev';

  return (
    <footer className="border-border-subtle border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm sm:flex-row sm:px-6 lg:px-8">
        <span className="text-text-muted">{t('copyright', { year })}</span>

        <div className="flex items-center gap-4">
          <Link href="/privacy" className="text-text-muted hover:text-text-primary text-xs transition-colors">
            {t('privacy')}
          </Link>
          <Link href="/terms" className="text-text-muted hover:text-text-primary text-xs transition-colors">
            {t('terms')}
          </Link>
          <Link href="/contact" className="text-text-muted hover:text-text-primary text-xs transition-colors">
            {t('contact')}
          </Link>
          <Link href={ROUTES.CHANGELOG} className="text-text-muted hover:text-text-primary text-xs transition-colors">
            {t('changelog')}
          </Link>
          <LocaleToggle hardReload />
        </div>

        <Link
          href={ROUTES.CHANGELOG}
          className="text-text-muted hover:text-text-primary font-mono text-xs transition-colors"
          dir="ltr"
        >
          v{pkg.version} · {commitSha}
        </Link>
      </div>
    </footer>
  );
};

export default LandingFooter;
