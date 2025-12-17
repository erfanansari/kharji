// Conversion functions for form bidirectional input
// Note: Charts and displays use stored price_toman and price_usd directly (no conversion needed)

export function tomanToUsd(toman: number, rate: number): number {
  return Math.round((toman / rate) * 100) / 100;
}

export function usdToToman(usd: number, rate: number): number {
  return Math.round(usd * rate);
}
