'use client';

import { useTranslations } from 'next-intl';

import { AlertTriangle, RefreshCw } from 'lucide-react';

import Button from '@components/Button';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ reset }: DashboardErrorProps) {
  const t = useTranslations('errors.generic');

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1600px] px-6 py-12">
        <div className="border-border-subtle bg-background flex flex-col items-center gap-4 rounded-xl border p-12 text-center shadow-sm">
          <div className="border-border-subtle bg-background-secondary rounded-full border p-3">
            <AlertTriangle className="text-danger h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-text-primary text-base font-semibold">{t('title')}</p>
            <p className="text-text-muted max-w-md text-sm">{t('description')}</p>
          </div>
          <Button variant="primary" onClick={reset} className="mt-2">
            <RefreshCw className="h-4 w-4" />
            {t('retry')}
          </Button>
        </div>
      </div>
    </div>
  );
}
