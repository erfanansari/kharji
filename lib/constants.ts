// Default exchange rate: full Toman value (e.g., 1,301,020 Toman per USD)
// This is a fallback value. The actual rate is fetched from API daily.
export const DEFAULT_USD_TO_TOMAN_RATE = 1_301_020;
// Todo: Update this rate periodically based on real exchange rates.

// Helper function to convert Toman to USD with custom rate
// Both values use full Toman amounts (e.g., 60,000 toman / 1,301,020 rate = 0.046 USD)
export function tomanToUsd(toman: number, rate: number = DEFAULT_USD_TO_TOMAN_RATE): number {
  return Math.round((toman / rate) * 100) / 100;
}

// Helper function to convert USD to Toman with custom rate
// Returns full Toman value (e.g., 1 USD * 1,301,020 rate = 1,301,020 toman)
export function usdToToman(usd: number, rate: number = DEFAULT_USD_TO_TOMAN_RATE): number {
  return Math.round(usd * rate);
}
