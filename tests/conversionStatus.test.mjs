import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateReceipt, SPLIT_WINDOW_MS } from '../src/lib/engine/fraudRules.ts';

function receipt(overrides = {}) {
  return {
    id: 'current',
    amount: 800,
    amountOriginal: 800,
    currency: 'INR',
    merchant: 'TestMart',
    timestamp: new Date('2025-06-01T10:00:00Z'),
    category: 'food',
    conversionStatus: 'CONVERTED',
    ...overrides
  };
}

function ctx(overrides = {}) {
  return {
    employeeTierLimit: 1000,
    employeeTierLimitOriginal: 1000,
    employeeTierLimitCurrency: 'INR',
    currentRating: 50,
    current: receipt(),
    recentExpenses: [],
    policyLimitConversion: { limitUsd: 1000, fxRate: 1, fxRateDate: new Date(), fxProvider: 'test', status: 'CONVERTED' },
    ...overrides
  };
}

test('denies expense with PENDING_REVIEW conversion status', () => {
  const decision = evaluateReceipt(ctx({ 
    current: receipt({ conversionStatus: 'PENDING_REVIEW' }) 
  }));
  assert.equal(decision.status, 'DENIED');
  assert.equal(decision.riskScore, 100);
  assert.ok(decision.anomalies.some(a => a.type === 'CURRENCY_CONVERSION_FAILED'));
});

test('denies expense with FAILED conversion status', () => {
  const decision = evaluateReceipt(ctx({ 
    current: receipt({ conversionStatus: 'FAILED' }) 
  }));
  assert.equal(decision.status, 'DENIED');
  assert.equal(decision.riskScore, 100);
  assert.ok(decision.anomalies.some(a => a.type === 'CURRENCY_CONVERSION_FAILED'));
});

test('denies expense with PENDING_REVIEW policy limit conversion', () => {
  const decision = evaluateReceipt(ctx({ 
    policyLimitConversion: { limitUsd: 1000, fxRate: 1, fxRateDate: new Date(), fxProvider: 'test', status: 'PENDING_REVIEW' }
  }));
  assert.equal(decision.status, 'DENIED');
  assert.equal(decision.riskScore, 100);
  assert.ok(decision.anomalies.some(a => a.type === 'POLICY_LIMIT_CONVERSION_FAILED'));
});

test('denies expense with FAILED policy limit conversion', () => {
  const decision = evaluateReceipt(ctx({ 
    policyLimitConversion: { limitUsd: 0, fxRate: 0, fxRateDate: new Date(), fxProvider: 'test', status: 'FAILED' }
  }));
  assert.equal(decision.status, 'DENIED');
  assert.equal(decision.riskScore, 100);
  assert.ok(decision.anomalies.some(a => a.type === 'POLICY_LIMIT_CONVERSION_FAILED'));
});

test('approves normal receipt with CONVERTED status', () => {
  const decision = evaluateReceipt(ctx({ 
    current: receipt({ conversionStatus: 'CONVERTED', amount: 800, amountOriginal: 800 }),
    policyLimitConversion: { limitUsd: 1000, fxRate: 1, fxRateDate: new Date(), fxProvider: 'test', status: 'CONVERTED' }
  }));
  assert.equal(decision.status, 'APPROVED');
  assert.equal(decision.riskScore, 0);
});

test('approves normal receipt with NOT_NEEDED status (USD)', () => {
  const decision = evaluateReceipt(ctx({ 
    current: receipt({ conversionStatus: 'NOT_NEEDED', currency: 'USD', amount: 800, amountOriginal: 800 }),
    policyLimitConversion: { limitUsd: 1000, fxRate: 1, fxRateDate: new Date(), fxProvider: 'test', status: 'NOT_NEEDED' }
  }));
  assert.equal(decision.status, 'APPROVED');
  assert.equal(decision.riskScore, 0);
});