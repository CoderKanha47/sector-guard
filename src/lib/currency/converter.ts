const FX_PROVIDER = process.env.FX_PROVIDER || 'exchangerate-api';
const FX_API_KEY = process.env.FX_API_KEY;
const FX_BASE_URL = process.env.FX_BASE_URL || 'https://api.exchangerate-api.com/v4';

const SUPPORTED_CURRENCIES = new Set([
  'USD', 'INR', 'MYR', 'JPY', 'EUR', 'GBP', 'CNY', 'SGD', 'AUD', 'CAD', 'HKD', 'CHF'
]);

const RATE_CACHE = new Map<string, { rate: number; fetchedAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

interface FxRateResult {
  rate: number;
  provider: string;
  effectiveDate: Date;
  sourceCurrency: string;
  targetCurrency: string;
}

interface ConversionResult {
  amountUsd: number;
  fxRate: number;
  fxRateDate: Date;
  fxProvider: string;
  conversionStatus: 'CONVERTED' | 'PENDING_REVIEW' | 'FAILED' | 'NOT_NEEDED';
  sourceCurrency: string;
}

function cacheKey(sourceCurrency: string, targetCurrency: string, date: string): string {
  return `${sourceCurrency}-${targetCurrency}-${date}`;
}

async function fetchRateFromProvider(
  sourceCurrency: string,
  targetCurrency: string,
  date: Date
): Promise<{ rate: number; provider: string; effectiveDate: Date } | null> {
  if (!FX_API_KEY) {
    console.warn('[FX] No API key configured, skipping live rate fetch');
    return null;
  }

  const dateStr = date.toISOString().split('T')[0];
  const url = `${FX_BASE_URL}/${FX_API_KEY}/history/${sourceCurrency}/${dateStr}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      console.warn(`[FX] Provider returned ${response.status} for ${sourceCurrency} on ${dateStr}`);
      return null;
    }
    const data = await response.json();
    const rate = data.rates?.[targetCurrency];
    if (typeof rate !== 'number' || !isFinite(rate) || rate <= 0) {
      console.warn(`[FX] Invalid rate for ${sourceCurrency} -> ${targetCurrency}: ${rate}`);
      return null;
    }
    return {
      rate,
      provider: FX_PROVIDER,
      effectiveDate: new Date(dateStr)
    };
  } catch (error) {
    console.error(`[FX] Fetch failed for ${sourceCurrency} on ${dateStr}:`, error);
    return null;
  }
}

async function getFallbackRate(sourceCurrency: string, targetCurrency: string): Promise<number | null> {
  const fallbackRates: Record<string, Record<string, number>> = {
    USD: { INR: 83.12, MYR: 4.71, JPY: 149.50, EUR: 0.92, GBP: 0.79, CNY: 7.24, SGD: 1.34, AUD: 1.52, CAD: 1.36, HKD: 7.81, CHF: 0.88 },
    INR: { USD: 0.01203 },
    MYR: { USD: 0.2123 },
    JPY: { USD: 0.00669 },
    EUR: { USD: 1.087 },
    GBP: { USD: 1.266 },
    CNY: { USD: 0.1381 },
    SGD: { USD: 0.746 },
    AUD: { USD: 0.658 },
    CAD: { USD: 0.735 },
    HKD: { USD: 0.128 },
    CHF: { USD: 1.136 }
  };

  if (fallbackRates[sourceCurrency]?.[targetCurrency]) {
    return fallbackRates[sourceCurrency][targetCurrency];
  }
  if (fallbackRates[targetCurrency]?.[sourceCurrency]) {
    return 1 / fallbackRates[targetCurrency][sourceCurrency];
  }
  return null;
}

export async function convertToUsd(
  amount: number,
  sourceCurrency: string,
  transactionDate: Date
): Promise<ConversionResult> {
  const currency = sourceCurrency.toUpperCase();

  if (currency === 'USD') {
    return {
      amountUsd: amount,
      fxRate: 1,
      fxRateDate: transactionDate,
      fxProvider: 'NONE',
      conversionStatus: 'NOT_NEEDED',
      sourceCurrency: 'USD'
    };
  }

  if (!SUPPORTED_CURRENCIES.has(currency)) {
    console.warn(`[FX] Unsupported currency: ${currency}`);
    return {
      amountUsd: 0,
      fxRate: 0,
      fxRateDate: transactionDate,
      fxProvider: 'NONE',
      conversionStatus: 'PENDING_REVIEW',
      sourceCurrency: currency
    };
  }

  const dateStr = transactionDate.toISOString().split('T')[0];
  const key = cacheKey(currency, 'USD', dateStr);

  const cached = RATE_CACHE.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return {
      amountUsd: Math.round(amount * cached.rate * 100) / 100,
      fxRate: cached.rate,
      fxRateDate: new Date(dateStr),
      fxProvider: FX_PROVIDER,
      conversionStatus: 'CONVERTED',
      sourceCurrency: currency
    };
  }

  let rateResult = await fetchRateFromProvider(currency, 'USD', transactionDate);

  if (!rateResult) {
    const fallbackRate = await getFallbackRate(currency, 'USD');
    if (fallbackRate) {
      rateResult = {
        rate: fallbackRate,
        provider: `${FX_PROVIDER}-fallback`,
        effectiveDate: transactionDate
      };
      console.warn(`[FX] Using fallback rate for ${currency} -> USD: ${fallbackRate}`);
    }
  }

  if (!rateResult) {
    console.error(`[FX] No rate available for ${currency} -> USD on ${dateStr}`);
    return {
      amountUsd: 0,
      fxRate: 0,
      fxRateDate: transactionDate,
      fxProvider: 'NONE',
      conversionStatus: 'PENDING_REVIEW',
      sourceCurrency: currency
    };
  }

  RATE_CACHE.set(key, { rate: rateResult.rate, fetchedAt: Date.now() });

  return {
    amountUsd: Math.round(amount * rateResult.rate * 100) / 100,
    fxRate: rateResult.rate,
    fxRateDate: rateResult.effectiveDate,
    fxProvider: rateResult.provider,
    conversionStatus: 'CONVERTED',
    sourceCurrency: currency
  };
}

export async function convertPolicyLimitToUsd(
  tierLimit: number,
  tierLimitCurrency: string,
  referenceDate: Date
): Promise<{ limitUsd: number; fxRate: number; fxRateDate: Date; fxProvider: string; status: 'CONVERTED' | 'PENDING_REVIEW' | 'NOT_NEEDED' }> {
  const currency = tierLimitCurrency.toUpperCase();

  if (currency === 'USD') {
    return { limitUsd: tierLimit, fxRate: 1, fxRateDate: referenceDate, fxProvider: 'NONE', status: 'NOT_NEEDED' };
  }

  const result = await convertToUsd(tierLimit, currency, referenceDate);
  return {
    limitUsd: result.amountUsd,
    fxRate: result.fxRate,
    fxRateDate: result.fxRateDate,
    fxProvider: result.fxProvider,
    status: result.conversionStatus === 'CONVERTED' ? 'CONVERTED' : 'PENDING_REVIEW'
  };
}

export function isSupportedCurrency(currency: string): boolean {
  return SUPPORTED_CURRENCIES.has(currency.toUpperCase());
}

export function getSupportedCurrencies(): string[] {
  return Array.from(SUPPORTED_CURRENCIES);
}

export function clearRateCache(): void {
  RATE_CACHE.clear();
}

export type { ConversionResult, FxRateResult };