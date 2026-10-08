import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ensureFreshRates } from '@core/rates';

// Daily cron: ensure today's rates exist for all currencies. Goes through
// ensureFreshRates (not refreshRates directly) so it shares the once-per-day
// guard with the on-demand path — Navasan is hit at most once per day total.
export async function POST(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureFreshRates(process.env.NAVASAN_API_KEY);
  return NextResponse.json({ ok: true });
}

// Vercel Cron Jobs send GET requests — alias POST so both work
export const GET = POST;
