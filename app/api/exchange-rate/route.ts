import { NextResponse } from 'next/server';

const CACHE_DURATION_SECONDS = 24 * 60 * 60; // 24 hours

export async function GET() {
  try {
    const apiKey = process.env.NAVASAN_API_KEY;

    if (!apiKey) {
      console.error('[Exchange Rate] No API key configured');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    console.log(`[Exchange Rate] Fetching data from Navasan API...`);

    const response = await fetch(`https://api.navasan.tech/latest/?item=usd&api_key=${apiKey}`, {
      next: { revalidate: CACHE_DURATION_SECONDS } // Next.js will cache this fetch for 24 hours
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Exchange Rate] API returned error:', response.status, errorText);
      return NextResponse.json({ error: 'Failed to fetch from Navasan API' }, { status: 500 });
    }

    const data = await response.json();
    const now = new Date().toISOString();

    // Optionally fetch usage stats for logging
    try {
      const usageResponse = await fetch(`https://api.navasan.tech/usage/?api_key=${apiKey}`);
      if (usageResponse.ok) {
        const usage = await usageResponse.json();
        console.log(`[Exchange Rate] API Usage - Monthly: ${usage.monthly_usage}, Daily: ${usage.daily_usage}, Hourly: ${usage.hourly_usage}`);
      }
    } catch (usageError) {
      console.warn('[Exchange Rate] Failed to fetch usage stats:', usageError);
    }

    console.log(`[Exchange Rate] Data fetched successfully at ${now}`);

    // Return with cache headers
    return NextResponse.json(
      {
        ...data,
        _meta: {
          fetchedAt: now,
          cachedUntil: new Date(Date.now() + CACHE_DURATION_SECONDS * 1000).toISOString(),
        }
      },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_DURATION_SECONDS}, stale-while-revalidate=${CACHE_DURATION_SECONDS}`,
        }
      }
    );

  } catch (error) {
    console.error('[Exchange Rate] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch exchange rate' }, { status: 500 });
  }
}
