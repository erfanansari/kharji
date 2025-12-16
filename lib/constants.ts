// Default exchange rate: simplified format (130 means 130k toman per USD)
export const DEFAULT_USD_TO_TOMAN_RATE = 130;

// Helper function to convert Toman (in k) to USD with custom rate
// Both toman and rate are in simplified k format (e.g., 130 toman and 130 rate = 1 USD)
export function tomanToUsd(tomanK: number, rate: number = DEFAULT_USD_TO_TOMAN_RATE): number {
  return Math.round((tomanK / rate) * 100) / 100;
}

// Helper function to convert USD to Toman (in k) with custom rate
// Returns toman in k format (e.g., 1 USD and 130 rate = 130 toman)
export function usdToToman(usd: number, rate: number = DEFAULT_USD_TO_TOMAN_RATE): number {
  return Math.round(usd * rate * 100) / 100;
}
