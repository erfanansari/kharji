'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface ExchangeRateData {
  usd?: {
    value: string;
    change: number;
    timestamp: number;
    date: string;
  };
  _meta?: {
    fetchedAt: string;
  };
}

export function ExchangeRateIndicator() {
  const [rateData, setRateData] = useState<ExchangeRateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchRate = async () => {
      try {
        const response = await fetch('/api/exchange-rate');
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setRateData(data);
            setHasError(false);
          }
        } else {
          if (isMounted) {
            setHasError(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
        if (isMounted) {
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchRate();

    return () => {
      isMounted = false;
    };
  }, []);

  // Don't render if loading, error, or no data
  if (isLoading || hasError || !rateData?.usd) {
    return null;
  }

  const { value, change } = rateData.usd;
  const rate = parseInt(value, 10);
  const isPositive = change > 0;
  const isZero = change === 0;

  // Format last update time
  const lastUpdate = rateData._meta?.fetchedAt
    ? new Date(rateData._meta.fetchedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
      {/* Rate Display */}
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {formatNumber(rate)}
          </span>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Toman</span>
        </div>
      </div>

      {/* Change Indicator */}
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isZero
          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
          : isPositive
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      }`}>
        {isZero ? (
          <span>—</span>
        ) : isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span>{isZero ? 'No change' : `${isPositive ? '+' : ''}${formatNumber(Math.abs(change))}`}</span>
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-500">
          Updated {lastUpdate}
        </span>
      )}
    </div>
  );
}
