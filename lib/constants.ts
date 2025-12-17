// Default exchange rate: only used as fallback when API fails to fetch live rate
// The actual rate is fetched from Navasan API daily.
// Charts and displays use stored price_toman and price_usd directly (no conversion needed).
export const DEFAULT_USD_TO_TOMAN_RATE = 130_000;

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
