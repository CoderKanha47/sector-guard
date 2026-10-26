import { 
  SUPPORTED_CURRENCIES, 
  isSupportedCurrency,
  getFixedRate,
  getRateMetadata,
  FIXED_RATE_REFERENCE_DATE,
  FIXED_RATE_VERSION
} from './fixedRates.js';

interface ConversionResult {
  amountUsd: number;
  fxRate: number;
  fxRateDate: Date;
  fxProvider: string;
  conversionStatus: 'CONVERTED' | 'PENDING_REVIEW' | 'FAILED' | 'NOT_NEEDED';
  sourceCurrency: string;
}

const RATE_REFERENCE_DATE = new Date(FIXED_RATE_REFERENCE_DATE + 'T00:00:00Z');

export function convertToUsd(
  amount: number,
  sourceCurrency: string,
  transactionDate: Date
): ConversionResult {
  const currency = sourceCurrency.toUpperCase();

  if (currency === 'USD') {
    return {
      amountUsd: amount,
      fxRate: 1,
      fxRateDate: transactionDate,
      fxProvider: 'FIXED_RATES',
      conversionStatus: 'NOT_NEEDED',
      sourceCurrency: 'USD'
    };
  }

  if (!isSupportedCurrency(currency)) {
    console.warn(`[FX] Unsupported currency: ${currency}`);
    return {
      amountUsd: 0,
      fxRate: 0,
      fxRateDate: transactionDate,
      fxProvider: 'FIXED_RATES',
      conversionStatus: 'PENDING_REVIEW',
      sourceCurrency: currency
    };
  }

  const rate = getFixedRate(currency);
  if (rate === null || !isFinite(rate) || rate <= 0) {
    console.error(`[FX] Invalid fixed rate for ${currency}: ${rate}`);
    return {
      amountUsd: 0,
      fxRate: 0,
      fxRateDate: transactionDate,
      fxProvider: 'FIXED_RATES',
      conversionStatus: 'FAILED',
      sourceCurrency: currency
    };
  }

  // Use the fixed reference date for the rate date (not transaction date)
  // because we're using fixed historical rates from 2026-10-21
  const amountUsd = Math.round(amount * rate * 100) / 100;

  return {
    amountUsd,
    fxRate: rate,
    fxRateDate: RATE_REFERENCE_DATE,
    fxProvider: `FIXED_RATES_${FIXED_RATE_VERSION}`,
    conversionStatus: 'CONVERTED',
    sourceCurrency: currency
  };
}

export function convertPolicyLimitToUsd(
  tierLimit: number,
  tierLimitCurrency: string,
  referenceDate: Date
): { limitUsd: number; fxRate: number; fxRateDate: Date; fxProvider: string; status: 'CONVERTED' | 'PENDING_REVIEW' | 'FAILED' | 'NOT_NEEDED' } {
  const currency = tierLimitCurrency.toUpperCase();

  if (currency === 'USD') {
    return { limitUsd: tierLimit, fxRate: 1, fxRateDate: referenceDate, fxProvider: 'FIXED_RATES', status: 'NOT_NEEDED' };
  }

  const result = convertToUsd(tierLimit, currency, referenceDate);
  return {
    limitUsd: result.amountUsd,
    fxRate: result.fxRate,
    fxRateDate: result.fxRateDate,
    fxProvider: result.fxProvider,
    status: result.conversionStatus === 'CONVERTED' ? 'CONVERTED' : result.conversionStatus === 'FAILED' ? 'FAILED' : 'PENDING_REVIEW'
  };
}

export function getSupportedCurrencies(): string[] {
  return SUPPORTED_CURRENCIES;
}

export function getConversionMetadata() {
  return getRateMetadata();
}

export type { ConversionResult };