import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateReceipt, SPLIT_WINDOW_MS } from '../src/lib/engine/fraudRules.ts';

function receipt(overrides = {}) {
  return {
    id: 'current',
    amount: 800,
    merchant: 'TestMart',
    timestamp: new Date('2025-06-01T10:00:00Z'),
    category: 'food',
    ...overrides
  };
}

function ctx(overrides = {}) {
  return {
    employeeTierLimit: 1000,
    currentRating: 50,
    current: receipt(),
    recentExpenses: [],
    ...overrides
  };
}

test('approves a normal in-limit receipt', () => {
  const decision = evaluateReceipt(ctx());
  assert.equal(decision.status, 'APPROVED');
  assert.equal(decision.riskScore, 0);
  assert.equal(decision.calculatedReimbursement, 800);
  assert.equal(decision.ratingDelta, 1);
  assert.deepEqual(decision.anomalies, []);
});

test('flags an over-limit single transaction', () => {
  const decision = evaluateReceipt(ctx({ current: receipt({ amount: 1500 }) }));
  assert.equal(decision.status, 'FLAGGED');
  assert.equal(decision.riskScore, 20);
  assert.equal(decision.calculatedReimbursement, 1000);
  assert.equal(decision.anomalies[0].type, 'POLICY_VIOLATION');
  assert.equal(decision.anomalies[0].severity, 'LOW');
});

test('treats an exact tier-limit transaction as within policy', () => {
  const decision = evaluateReceipt(ctx({ current: receipt({ amount: 1000 }) }));
  assert.equal(decision.status, 'APPROVED');
  assert.equal(decision.riskScore, 0);
  assert.equal(decision.calculatedReimbursement, 1000);
});

test('detects split receipts across same merchant within the window', () => {
  const recent = [receipt({ id: 'r1', amount: 500, timestamp: new Date('2025-06-01T08:00:00Z') })];
  const decision = evaluateReceipt(ctx({ current: receipt({ amount: 700 }), recentExpenses: recent }));
  assert.equal(decision.status, 'FLAGGED');
  assert.equal(decision.riskScore, 50);
  assert.equal(decision.anomalies[0].type, 'SPLIT_RECEIPT');
  assert.equal(decision.anomalies[0].severity, 'HIGH');
});

test('ignores same-merchant transactions outside the split window', () => {
  const old = new Date('2025-05-31T14:00:00Z');
  const recent = [receipt({ id: 'r1', amount: 600, timestamp: old })];
  assert.ok(Math.abs(old - new Date('2025-06-01T10:00:00Z')) > SPLIT_WINDOW_MS);
  const decision = evaluateReceipt(ctx({ current: receipt({ amount: 700 }), recentExpenses: recent }));
  assert.equal(decision.status, 'APPROVED');
  assert.equal(decision.riskScore, 0);
});

test('denies when multiple risk rules compound past the threshold', () => {
  const recent = [receipt({ id: 'r1', amount: 300, timestamp: new Date('2025-06-01T08:00:00Z') })];
  const decision = evaluateReceipt(ctx({ current: receipt({ amount: 1500 }), recentExpenses: recent }));
  assert.equal(decision.riskScore, 70);
  assert.equal(decision.status, 'DENIED');
  assert.equal(decision.calculatedReimbursement, 0);
});

test('detects temporal conflicts for close transport fares', () => {
  const recent = [receipt({ id: 'r1', category: 'transport', amount: 180, timestamp: new Date('2025-06-01T10:05:00Z') })];
  const decision = evaluateReceipt(ctx({ current: receipt({ category: 'transport', amount: 200 }) }));
  const withConflict = evaluateReceipt({ ...ctx({ current: receipt({ category: 'transport', amount: 200 }) }), recentExpenses: recent });
  assert.equal(withConflict.status, 'FLAGGED');
  assert.equal(withConflict.riskScore, 30);
  assert.equal(withConflict.anomalies[0].type, 'TEMPORAL_CONFLICT');
  assert.equal(decision.status, 'APPROVED');
});

test('does not flag transport fares more than 15 minutes apart', () => {
  const recent = [receipt({ id: 'r1', category: 'transport', amount: 180, timestamp: new Date('2025-06-01T10:20:00Z') })];
  const decision = evaluateReceipt(ctx({ current: receipt({ category: 'transport', amount: 200 }), recentExpenses: recent }));
  assert.equal(decision.status, 'APPROVED');
  assert.equal(decision.riskScore, 0);
});

test('clamps rating at 100 and 0', () => {
  const approved = evaluateReceipt(ctx({ currentRating: 99 }));
  assert.equal(approved.newRating, 100);

  const deniedRecent = [receipt({ id: 'r1', amount: 300, timestamp: new Date('2025-06-01T08:00:00Z') })];
  const denied = evaluateReceipt(ctx({ currentRating: 5, current: receipt({ amount: 1500 }), recentExpenses: deniedRecent }));
  assert.equal(denied.status, 'DENIED');
  assert.equal(denied.riskScore, 70);
  assert.equal(denied.newRating, 0);
});

test('returns risk-score based rating deltas', () => {
  const flagged = evaluateReceipt(ctx({ current: receipt({ amount: 1500 }) }));
  assert.equal(flagged.ratingDelta, -(20 * 0.3));

  const deniedRecent = [receipt({ id: 'r1', amount: 300, timestamp: new Date('2025-06-01T08:00:00Z') })];
  const denied = evaluateReceipt(ctx({ current: receipt({ amount: 1500 }), recentExpenses: deniedRecent }));
  assert.equal(denied.ratingDelta, -(70 * 0.5));
});