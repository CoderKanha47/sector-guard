import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  convertToUsd, 
  convertPolicyLimitToUsd, 
  getSupportedCurrencies,
  getConversionMetadata 
} from '../src/lib/currency/converter.ts';
import { FIXED_USD_RATES, FIXED_RATE_REFERENCE_DATE, FIXED_RATE_VERSION, FIXED_RATE_SOURCE } from '../src/lib/currency/fixedRates.js';

test('USD to USD conversion equals exactly 1:1', () => {
  const result = convertToUsd(100, 'USD', new Date('2024-01-15'));
  assert.equal(result.amountUsd, 100);
  assert.equal(result.fxRate, 1);
  assert.equal(result.conversionStatus, 'NOT_NEEDED');
  assert.equal(result.sourceCurrency, 'USD');
});

test('All 10 supported currencies convert using verified fixed rates', () => {
  const testCases = [
    { currency: 'INR', amount: 10000, expectedRate: 0.01203, expectedUsd: 120.30 },
    { currency: 'JPY', amount: 10000, expectedRate: 0.00669, expectedUsd: 66.90 },
    { currency: 'CNY', amount: 10000, expectedRate: 0.1381, expectedUsd: 1381.00 },
    { currency: 'SAR', amount: 10000, expectedRate: 0.2667, expectedUsd: 2667.00 },
    { currency: 'GBP', amount: 10000, expectedRate: 1.302, expectedUsd: 13020.00 },
    { currency: 'EUR', amount: 10000, expectedRate: 1.087, expectedUsd: 10870.00 },
    { currency: 'MYR', amount: 10000, expectedRate: 0.2123, expectedUsd: 2123.00 },
    { currency: 'SGD', amount: 10000, expectedRate: 0.746, expectedUsd: 7460.00 },
    { currency: 'AED', amount: 10000, expectedRate: 0.2723, expectedUsd: 2723.00 },
  ];

  for (const tc of testCases) {
    const result = convertToUsd(tc.amount, tc.currency, new Date('2025-01-15'));
    assert.equal(result.conversionStatus, 'CONVERTED', `${tc.currency} should convert successfully`);
    assert.equal(result.fxRate, tc.expectedRate, `${tc.currency} rate should match fixed rate`);
    assert.equal(result.amountUsd, tc.expectedUsd, `${tc.currency} USD amount should match expected`);
    assert.equal(result.fxProvider, 'FIXED_RATES_2026-10-21-v1');
    assert.equal(result.sourceCurrency, tc.currency);
    // Rate date should be the fixed reference date
    assert.equal(result.fxRateDate.toISOString().split('T')[0], '2026-10-21');
  }
});

test('USD to USD conversion equals exactly 1:1', () => {
  const result = convertToUsd(100, 'USD', new Date('2025-01-15'));
  assert.equal(result.amountUsd, 100);
  assert.equal(result.fxRate, 1);
  assert.equal(result.conversionStatus, 'NOT_NEEDED');
  assert.equal(result.sourceCurrency, 'USD');
});

test('Unsupported currency returns PENDING_REVIEW', () => {
  const result = convertToUsd(100, 'XYZ', new Date('2025-01-15'));
  assert.equal(result.conversionStatus, 'PENDING_REVIEW');
  assert.equal(result.amountUsd, 0);
  assert.equal(result.fxRate, 0);
});

test('Policy limit conversion USD to USD', () => {
  const result = convertPolicyLimitToUsd(5000, 'USD', new Date('2025-01-15'));
  assert.equal(result.limitUsd, 5000);
  assert.equal(result.status, 'NOT_NEEDED');
  assert.equal(result.fxRate, 1);
});

test('Policy limit conversion uses fixed rates for supported currencies', () => {
  // 5000 INR * 0.01203 = 60.15 USD
  const result = convertPolicyLimitToUsd(5000, 'INR', new Date('2025-01-15'));
  assert.equal(result.limitUsd, 60.15);
  assert.equal(result.status, 'CONVERTED');
  assert.equal(result.fxRate, 0.01203);
});

test('Policy limit conversion fails for unsupported currency', () => {
  const result = convertPolicyLimitToUsd(5000, 'XYZ', new Date('2025-01-15'));
  assert.equal(result.status, 'PENDING_REVIEW');
  assert.equal(result.limitUsd, 0);
});

test('getSupportedCurrencies returns all 10 currencies', () => {
  const currencies = getSupportedCurrencies();
  assert.equal(currencies.length, 10);
  const expected = ['USD', 'INR', 'JPY', 'CNY', 'SAR', 'GBP', 'EUR', 'MYR', 'SGD', 'AED'];
  for (const c of expected) {
    assert.ok(currencies.includes(c), `Should include ${c}`);
  }
});

test('getConversionMetadata returns correct metadata', () => {
  const meta = getConversionMetadata();
  assert.equal(meta.referenceDate, '2026-10-21');
  assert.equal(meta.version, '2026-10-21-v1');
  assert.equal(meta.source, 'ExchangeRate-API historical data');
  assert.equal(meta.supportedCurrencies.length, 10);
});

test('Fixed rates module exports correct rates', () => {
  // Verify the fixed rates module directly
  assert.equal(FIXED_USD_RATES.USD, 1.0);
  assert.equal(FIXED_USD_RATES.INR, 0.01203);
  assert.equal(FIXED_USD_RATES.JPY, 0.00669);
  assert.equal(FIXED_USD_RATES.CNY, 0.1381);
  assert.equal(FIXED_USD_RATES.SAR, 0.2667);
  assert.equal(FIXED_USD_RATES.GBP, 1.302);
  assert.equal(FIXED_USD_RATES.EUR, 1.087);
  assert.equal(FIXED_USD_RATES.MYR, 0.2123);
  assert.equal(FIXED_USD_RATES.SGD, 0.746);
  assert.equal(FIXED_USD_RATES.AED, 0.2723);
  assert.equal(FIXED_RATE_REFERENCE_DATE, '2026-10-21');
  assert.equal(FIXED_RATE_VERSION, '2026-10-21-v1');
  assert.equal(FIXED_RATE_SOURCE, 'ExchangeRate-API historical data');
});