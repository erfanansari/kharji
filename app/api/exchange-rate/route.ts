import { NextResponse } from 'next/server';

let cachedResponse: { usd: { value: string; change: number; timestamp: number; date: string } } | null = null;
let cachedTimestamp = 0;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  try {
    // Return cached response if still valid (24 hours)
    if (cachedResponse && cachedTimestamp > 0 && Date.now() - cachedTimestamp < CACHE_DURATION_MS) {
      return NextResponse.json(cachedResponse);
    }

    // Fetch from Navasan API
    const apiKey = process.env.NAVASAN_API_KEY || 'free';
    const response = await fetch(`https://api.navasan.tech/latest/?item=usd&api_key=${apiKey}`);

    if (response.ok) {
      cachedResponse = await response.json();
      cachedTimestamp = Date.now();
      return NextResponse.json(cachedResponse);
    }

    // API failed - return error
    return NextResponse.json({ error: 'Failed to fetch from Navasan API' }, { status: 500 });

  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    return NextResponse.json({ error: 'Failed to fetch exchange rate' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
