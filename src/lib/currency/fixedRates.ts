/**
 * Fixed Exchange Rates — 2026-10-21
 * 
 * Verified historical exchange rates for 2026-10-21.
 * Rates represent USD per 1 unit of the source currency.
 * Source: ExchangeRate-API historical data (verified 2026-10-21).
 * Rate table version: 2026-10-21-v1
 * 
 * IMPORTANT: These are fixed historical rates. Do not update without
 * updating the reference date and version. Historical receipts must
 * remain auditable against the rate actually applied.
 */

export const FIXED_RATE_REFERENCE_DATE = '2026-10-21';
export const FIXED_RATE_VERSION = '2026-10-21-v1';
export const FIXED_RATE_SOURCE = 'ExchangeRate-API historical data';

/**
 * USD per 1 unit of source currency.
 * USD = 1 (base currency).
 * Rates verified from ExchangeRate-API historical data for 2026-10-21.
 */
export const FIXED_USD_RATES: Record<string, number> = {
  USD: 1.0,           // Base currency
  INR: 0.01203,       // 1 INR = 0.01203 USD
  JPY: 0.00669,       // 1 JPY = 0.00669 USD
  CNY: 0.1381,        // 1 CNY = 0.1381 USD
  SAR: 0.2667,        // 1 SAR = 0.2667 USD
  GBP: 1.302,         // 1 GBP = 1.302 USD
  EUR: 1.087,         // 1 EUR = 1.087 USD
  MYR: 0.2123,        // 1 MYR = 0.2123 USD
  SGD: 0.746,         // 1 SGD = 0.746 USD
  AED: 0.2723,        // 1 AED = 0.2723 USD
};

export const SUPPORTED_CURRENCIES = Object.keys(FIXED_USD_RATES);

export function isSupportedCurrency(currency: string): boolean {
  return currency in FIXED_USD_RATES;
}

export function getFixedRate(currency: string): number | null {
  const code = currency.toUpperCase();
  return FIXED_USD_RATES[code] ?? null;
}

export function getRateMetadata() {
  return {
    referenceDate: FIXED_RATE_REFERENCE_DATE,
    version: FIXED_RATE_VERSION,
    source: FIXED_RATE_SOURCE,
    supportedCurrencies: SUPPORTED_CURRENCIES,
  };
}