import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ensureFreshRates, getLatestRates, getRatesSeries } from '@core/rates';

// GET /api/rates              → { latest: { USD: 600000, ... } }
// GET /api/rates?history=1    → { latest, series: { USD: [{ rateDate, rate }], ... } }
//   optional &from=YYYY-MM-DD &to=YYYY-MM-DD bounds the series.
// Rates move once a day (the 08:00 UTC cron), so the CDN can answer for half an
// hour and serve the previous copy while it refreshes. At five minutes this
// route re-ran its queries up to 288 times a day for data that changes once;
// the ceiling is deliberately not longer, so a fresh daily rate still reaches
// every client within the hour.
const CACHE_CONTROL = 'public, s-maxage=1800, stale-while-revalidate=3600';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const wantsHistory = params.get('history') === '1' || params.get('history') === 'true';

    // Populate all currencies on-demand if today's data is missing (budget-guarded);
    // this is the fallback for when the daily cron hasn't run yet.
    await ensureFreshRates(process.env.NAVASAN_API_KEY);

    const latest = await getLatestRates();
    if (!wantsHistory) {
      return NextResponse.json({ latest }, { headers: { 'Cache-Control': CACHE_CONTROL } });
    }

    const series = await getRatesSeries(params.get('from') ?? undefined, params.get('to') ?? undefined);
    return NextResponse.json({ latest, series }, { headers: { 'Cache-Control': CACHE_CONTROL } });
  } catch (error) {
    console.error('[rates] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load rates' }, { status: 500 });
  }
}
