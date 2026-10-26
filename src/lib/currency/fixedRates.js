// Re-export the fixed rates module for Node.js ESM compatibility
export { 
  SUPPORTED_CURRENCIES, 
  isSupportedCurrency,
  getFixedRate,
  getRateMetadata,
  FIXED_RATE_REFERENCE_DATE,
  FIXED_RATE_VERSION,
  FIXED_RATE_SOURCE,
  FIXED_USD_RATES
} from './fixedRates.ts';