import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import Button from '@components/Button';
import TryDemoButton from '@components/LandingPage/TryDemoButton';

const Hero = () => {
  const t = useTranslations('landing.hero');
  return (
    <section className="mx-auto max-w-3xl px-4 pt-20 pb-20 text-center sm:px-6 sm:pt-32 sm:pb-28 lg:pt-40 lg:pb-32">
      <span className="border-border-subtle text-text-secondary inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
        {t('badge')}
      </span>

      <h1 className="text-text-primary mt-6 text-4xl leading-[1.05] font-bold tracking-tight sm:mt-8 sm:text-6xl lg:text-7xl">
        {t('titleLine1')}
        <br />
        <span className="text-text-muted font-normal">{t('titleLine2')}</span>
      </h1>

      <p className="text-text-secondary mx-auto mt-6 max-w-xl text-base leading-relaxed sm:mt-8 sm:text-lg">
        {t('subtitle')}
      </p>

      {/* sm:rtl:flex-row-reverse: Get Started is coded first; under RTL this
          swaps it to the left and Try Demo to the right (mirrors LTR's
          reading order, not its physical layout — only matters once
          flex-row kicks in at sm:). */}
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:mt-12 sm:flex-row sm:rtl:flex-row-reverse">
        <Link href="/signup" className="w-full sm:w-auto">
          <Button variant="primary" className="w-full px-6 py-3 sm:w-auto">
            <span className="flex items-center gap-2">
              {t('getStarted')}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </span>
          </Button>
        </Link>
        <div className="w-full sm:w-auto">
          <TryDemoButton />
        </div>
      </div>
    </section>
  );
};

export default Hero;
