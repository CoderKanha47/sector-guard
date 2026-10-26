const FX_PROVIDER = process.env.FX_PROVIDER || 'exchangerate-api';
const FX_API_KEY = process.env.FX_API_KEY;
const FX_BASE_URL = process.env.FX_BASE_URL || 'https://api.exchangerate-api.com/v4';
const FX_USE_HISTORICAL = process.env.FX_USE_HISTORICAL === 'true';

const SUPPORTED_CURRENCIES = new Set([
  'USD', 'INR', 'MYR', 'JPY', 'EUR', 'GBP', 'CNY', 'SGD', 'AUD', 'CAD', 'HKD', 'CHF'
]);

const RATE_CACHE = new Map<string, { rate: number; fetchedAt: number; isHistorical: boolean }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

interface FxRateResult {
  rate: number;
  provider: string;
  effectiveDate: Date;
  sourceCurrency: string;
  targetCurrency: string;
  isHistorical: boolean;
}

interface ConversionResult {
  amountUsd: number;
  fxRate: number;
  fxRateDate: Date;
  fxProvider: string;
  conversionStatus: 'CONVERTED' | 'PENDING_REVIEW' | 'FAILED' | 'NOT_NEEDED';
  sourceCurrency: string;
}

interface FxDiagnosticInfo {
  provider: string;
  httpStatus: number | null;
  providerErrorCode: string | null;
  currencyPair: string;
  failureCategory: 'missing_key' | 'unsupported_currency' | 'provider_error' | 'quota_exceeded' | 'timeout' | 'malformed_response' | 'invalid_rate' | 'historical_unavailable' | 'unknown';
  endpoint: string;
  timestamp: string;
}

function cacheKey(sourceCurrency: string, targetCurrency: string, date: string, isHistorical: boolean): string {
  return `${sourceCurrency}-${targetCurrency}-${date}-${isHistorical ? 'hist' : 'current'}`;
}

function logFxDiagnostic(info: FxDiagnosticInfo): void {
  const logEntry = {
    ...info,
    timestamp: new Date().toISOString(),
    // Redact API key from endpoint if present
    endpoint: info.endpoint.replace(/[?&]apikey=[^&]*/i, '[REDACTED]').replace(/\/v4\/[^\/]+\//i, '/v4/[REDACTED]/')
  };
  console.log('[FX-DIAG]', JSON.stringify(logEntry));
}

async function fetchRateFromProvider(
  sourceCurrency: string,
  targetCurrency: string,
  date: Date,
  useHistorical: boolean
): Promise<{ rate: number; provider: string; effectiveDate: Date; isHistorical: boolean } | null> {
  if (!FX_API_KEY) {
    logFxDiagnostic({
      provider: FX_PROVIDER,
      httpStatus: null,
      providerErrorCode: 'MISSING_API_KEY',
      currencyPair: `${sourceCurrency}/${targetCurrency}`,
      failureCategory: 'missing_key',
      endpoint: `${FX_BASE_URL}/[REDACTED]/${useHistorical ? 'history' : 'latest'}/${sourceCurrency}`,
      timestamp: new Date().toISOString()
    });
    return null;
  }

  const dateStr = date.toISOString().split('T')[0];
  const endpointType = useHistorical ? 'history' : 'latest';
  const url = `${FX_BASE_URL}/${FX_API_KEY}/${endpointType}/${sourceCurrency}${useHistorical ? `/${dateStr}` : ''}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let providerErrorCode = 'HTTP_ERROR';
      if (response.status === 401) providerErrorCode = 'INVALID_API_KEY';
      else if (response.status === 403) providerErrorCode = 'PLAN_RESTRICTION';
      else if (response.status === 429) providerErrorCode = 'QUOTA_EXCEEDED';
      else if (response.status === 404) providerErrorCode = 'ENDPOINT_NOT_FOUND';
      else if (response.status >= 500) providerErrorCode = 'PROVIDER_SERVER_ERROR';

      logFxDiagnostic({
        provider: FX_PROVIDER,
        httpStatus: response.status,
        providerErrorCode,
        currencyPair: `${sourceCurrency}/${targetCurrency}`,
        failureCategory: response.status === 403 ? 'quota_exceeded' : 
                         response.status === 429 ? 'quota_exceeded' :
                         response.status === 401 ? 'provider_error' : 'provider_error',
        endpoint: url,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    const data = await response.json();
    const rate = data.rates?.[targetCurrency];

    if (typeof rate !== 'number' || !isFinite(rate) || rate <= 0) {
      logFxDiagnostic({
        provider: FX_PROVIDER,
        httpStatus: response.status,
        providerErrorCode: 'INVALID_RATE',
        currencyPair: `${sourceCurrency}/${targetCurrency}`,
        failureCategory: 'invalid_rate',
        endpoint: url,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    // For current rates, the effective date is today; for historical, it's the requested date
    const effectiveDate = useHistorical ? new Date(dateStr) : new Date();

    logFxDiagnostic({
      provider: FX_PROVIDER,
      httpStatus: response.status,
      providerErrorCode: null,
      currencyPair: `${sourceCurrency}/${targetCurrency}`,
      failureCategory: 'unknown', // Success
      endpoint: url,
      timestamp: new Date().toISOString()
    });

    return {
      rate,
      provider: FX_PROVIDER,
      effectiveDate,
      isHistorical: useHistorical
    };
  } catch (error) {
    let failureCategory: FxDiagnosticInfo['failureCategory'] = 'unknown';
    if (error instanceof DOMException && error.name === 'AbortError') {
      failureCategory = 'timeout';
    } else if (error instanceof SyntaxError) {
      failureCategory = 'malformed_response';
    } else if (error instanceof TypeError && error.message.includes('fetch')) {
      failureCategory = 'provider_error';
    }

    logFxDiagnostic({
      provider: FX_PROVIDER,
      httpStatus: null,
      providerErrorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      currencyPair: `${sourceCurrency}/${targetCurrency}`,
      failureCategory,
      endpoint: url,
      timestamp: new Date().toISOString()
    });

    return null;
  }
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
    logFxDiagnostic({
      provider: FX_PROVIDER,
      httpStatus: null,
      providerErrorCode: 'UNSUPPORTED_CURRENCY',
      currencyPair: `${currency}/USD`,
      failureCategory: 'unsupported_currency',
      endpoint: 'N/A',
      timestamp: new Date().toISOString()
    });
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
  const useHistorical = FX_USE_HISTORICAL;
  const key = cacheKey(currency, 'USD', dateStr, useHistorical);

  const cached = RATE_CACHE.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return {
      amountUsd: Math.round(amount * cached.rate * 100) / 100,
      fxRate: cached.rate,
      fxRateDate: useHistorical ? transactionDate : new Date(),
      fxProvider: FX_PROVIDER,
      conversionStatus: 'CONVERTED',
      sourceCurrency: currency
    };
  }

  // Try historical first if enabled, then fall back to current rate
  let rateResult = await fetchRateFromProvider(currency, 'USD', transactionDate, useHistorical);
  
  // If historical unavailable and we tried historical, try current rate as fallback
  if (!rateResult && useHistorical) {
    logFxDiagnostic({
      provider: FX_PROVIDER,
      httpStatus: null,
      providerErrorCode: 'HISTORICAL_UNAVAILABLE_FALLBACK_CURRENT',
      currencyPair: `${currency}/USD`,
      failureCategory: 'historical_unavailable',
      endpoint: `${FX_BASE_URL}/[REDACTED]/history/${currency}`,
      timestamp: new Date().toISOString()
    });
    rateResult = await fetchRateFromProvider(currency, 'USD', transactionDate, false);
  }

  if (!rateResult) {
    logFxDiagnostic({
      provider: FX_PROVIDER,
      httpStatus: null,
      providerErrorCode: 'NO_RATE_AVAILABLE',
      currencyPair: `${currency}/USD`,
      failureCategory: useHistorical ? 'historical_unavailable' : 'provider_error',
      endpoint: useHistorical ? 'history' : 'latest',
      timestamp: new Date().toISOString()
    });
    return {
      amountUsd: 0,
      fxRate: 0,
      fxRateDate: transactionDate,
      fxProvider: 'NONE',
      conversionStatus: 'PENDING_REVIEW',
      sourceCurrency: currency
    };
  }

  RATE_CACHE.set(key, { rate: rateResult.rate, fetchedAt: Date.now(), isHistorical: rateResult.isHistorical });

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
): Promise<{ limitUsd: number; fxRate: number; fxRateDate: Date; fxProvider: string; status: 'CONVERTED' | 'PENDING_REVIEW' | 'FAILED' | 'NOT_NEEDED' }> {
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
    status: result.conversionStatus === 'CONVERTED' ? 'CONVERTED' : result.conversionStatus === 'FAILED' ? 'FAILED' : 'PENDING_REVIEW'
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

export type { ConversionResult, FxRateResult, FxDiagnosticInfo };