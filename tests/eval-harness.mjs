import { evaluateReceipt, SPLIT_WINDOW_MS, TEMPORAL_CONFLICT_WINDOW_MS } from '../src/lib/engine/fraudRules.ts';

const BASE = new Date('2025-06-01T10:00:00Z');

function make(overrides = {}) {
  return {
    id: 'current',
    amount: 800,
    merchant: 'TestMart',
    timestamp: BASE,
    category: 'food',
    ...overrides
  };
}

function build(ctxOverrides) {
  return {
    employeeTierLimit: 1000,
    currentRating: 50,
    current: make(),
    recentExpenses: [],
    ...ctxOverrides
  };
}

const cases = [
  {
    name: 'VALID: in-limit single receipt',
    ctx: build(),
    expect: { status: 'APPROVED', riskScore: 0 }
  },
  {
    name: 'POLICY_VIOLATION: single amount over tier limit',
    ctx: build({ current: make({ amount: 1500 }) }),
    expect: { status: 'FLAGGED', riskScore: 20 }
  },
  {
    name: 'SPLIT_RECEIPT: same merchant sums beyond limit',
    ctx: build({
      current: make({ amount: 700 }),
      recentExpenses: [make({ id: 'r1', amount: 500, timestamp: new Date(BASE.getTime() - 2 * 60 * 60 * 1000) })]
    }),
    expect: { status: 'FLAGGED', riskScore: 50 }
  },
  {
    name: 'DENIED: policy + split compound to >= 60',
    ctx: build({
      current: make({ amount: 1500 }),
      recentExpenses: [make({ id: 'r1', amount: 300, timestamp: new Date(BASE.getTime() - 2 * 60 * 60 * 1000) })]
    }),
    expect: { status: 'DENIED', riskScore: 70 }
  },
  {
    name: 'TEMPORAL_CONFLICT: transport fares 5 minutes apart',
    ctx: build({
      current: make({ category: 'transport', amount: 200 }),
      recentExpenses: [make({ id: 'r1', category: 'transport', amount: 180, timestamp: new Date(BASE.getTime() + 5 * 60 * 1000) })]
    }),
    expect: { status: 'FLAGGED', riskScore: 30 }
  },
  {
    name: 'CLEAN: same merchant but outside split window',
    ctx: build({
      current: make({ amount: 700 }),
      recentExpenses: [make({ id: 'r1', amount: 600, timestamp: new Date(BASE.getTime() - 20 * 60 * 60 * 1000) })]
    }),
    expect: { status: 'APPROVED', riskScore: 0 }
  },
  {
    name: 'CLEAN: transport fares 45 minutes apart',
    ctx: build({
      current: make({ category: 'transport', amount: 200 }),
      recentExpenses: [make({ id: 'r1', category: 'transport', amount: 180, timestamp: new Date(BASE.getTime() + 45 * 60 * 1000) })]
    }),
    expect: { status: 'APPROVED', riskScore: 0 }
  },
  {
    name: 'RATING: approved receipt nudges rating by +1',
    ctx: build({ currentRating: 99 }),
    expect: { newRating: 100 }
  },
  {
    name: 'RATING: denied case floors rating at 0',
    ctx: build({
      currentRating: 5,
      current: make({ amount: 1500 }),
      recentExpenses: [make({ id: 'r1', amount: 300, timestamp: new Date(BASE.getTime() - 2 * 60 * 60 * 1000) })]
    }),
    expect: { newRating: 0 }
  },
  {
    name: 'EDGE: window constant sanity checks',
    ctx: null,
    expect: { SPLIT_WINDOW_MS: 3 * 60 * 60 * 1000, TEMPORAL_CONFLICT_WINDOW_MS: 15 * 60 * 1000 }
  }
];

let passed = 0;
let failed = 0;

const pad = (s, n) => String(s).padEnd(n);

console.log('Sector Guard Fraud Engine — Evaluation Report');
console.log('='.repeat(86));
console.log(pad('SCENARIO', 55) + pad('EXPECTED', 14) + pad('GOT', 12) + 'RESULT');
console.log('-'.repeat(86));

for (const c of cases) {
  let ok = true;
  let got = {};
  try {
    if (c.expect.SPLIT_WINDOW_MS !== undefined) {
      got = { SPLIT_WINDOW_MS, TEMPORAL_CONFLICT_WINDOW_MS };
      ok = got.SPLIT_WINDOW_MS === c.expect.SPLIT_WINDOW_MS && got.TEMPORAL_CONFLICT_WINDOW_MS === c.expect.TEMPORAL_CONFLICT_WINDOW_MS;
    } else if (c.expect.newRating !== undefined) {
      const d = evaluateReceipt(c.ctx);
      got = { newRating: d.newRating };
      ok = d.newRating === c.expect.newRating;
    } else {
      const d = evaluateReceipt(c.ctx);
      got = { status: d.status, riskScore: d.riskScore };
      ok = d.status === c.expect.status && d.riskScore === c.expect.riskScore;
    }
  } catch (err) {
    got = { error: err.message };
    ok = false;
  }

  const expectedLabel = c.expect.status !== undefined
    ? `${c.expect.status}/${c.expect.riskScore}`
    : (c.expect.newRating !== undefined ? `rating=${c.expect.newRating}` : 'constants');
  const gotLabel = got.status !== undefined
    ? `${got.status}/${got.riskScore}`
    : (got.newRating !== undefined ? `rating=${got.newRating}` : JSON.stringify(got));

  console.log(pad(c.name, 55) + pad(expectedLabel, 14) + pad(gotLabel, 12) + (ok ? 'PASS' : 'FAIL'));
  if (ok) passed++; else failed++;
}

console.log('-'.repeat(86));
console.log(`Summary: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('='.repeat(86));

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All scenarios passed.');
}