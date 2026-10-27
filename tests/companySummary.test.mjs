import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { NextResponse } from 'next/server.js';

// Mock Prisma
const mockPrisma = {
  employee: {
    findMany: mock.fn(),
  },
  expense: {
    findMany: mock.fn(),
  },
  monthlyPayout: {
    findMany: mock.fn(),
  },
};

mock.module('../src/lib/prisma.ts', {
  namedExports: {
    prisma: mockPrisma,
  },
});

mock.module('../src/lib/auth.ts', {
  namedExports: {
    getSession: mock.fn(),
  },
});

mock.module('../src/lib/currency/converter.ts', {
  namedExports: {
    getConversionMetadata: mock.fn(),
  },
});

// Import after mocking
const { GET } = await import('../src/app/api/admin/company-summary/route.ts');

function createMockEmployee(overrides = {}) {
  return {
    id: 'emp-1',
    name: 'Test Employee',
    department: 'Engineering',
    designation: 'Engineer',
    rating: 85,
    expenses: [],
    payouts: [],
    ...overrides,
  };
}

function createMockExpense(overrides = {}) {
  return {
    id: 'exp-1',
    employeeId: 'emp-1',
    merchant: 'TestMart',
    amount: 1000,
    currency: 'INR',
    amountUsd: 12.03,
    conversionStatus: 'CONVERTED',
    timestamp: new Date('2025-06-15T10:00:00Z'),
    category: 'food',
    audit: {
      id: 'audit-1',
      expenseId: 'exp-1',
      calculatedReimbursement: 1000,
      calculatedReimbursementUsd: 12.03,
      status: 'APPROVED',
      riskScore: 0,
      anomalies: [],
    },
    ...overrides,
  };
}

function createMockPayout(overrides = {}) {
  return {
    id: 'payout-1',
    employeeId: 'emp-1',
    year: 2025,
    month: 6,
    totalReimbursement: 1000,
    totalReimbursementUsd: 12.03,
    totalClaimed: 1000,
    totalClaimedUsd: 12.03,
    expenseCount: 1,
    status: 'PENDING',
    closedAt: new Date(),
    paidAt: null,
    categoryBreakdown: { FOOD: 1000, TRAVEL: 0, STAY: 0, OTHER: 0 },
    categoryBreakdownUsd: { FOOD: 12.03, TRAVEL: 0, STAY: 0, OTHER: 0 },
    employee: null,
    ...overrides,
  };
}

test.beforeEach(() => {
  Object.values(mockPrisma).forEach(obj => {
    if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(fn => {
        if (typeof fn === 'function' && fn.mock) fn.mock.resetCalls();
      });
    }
  });
});

test('Company Summary API - requires admin authentication', async () => {
  const { getSession } = await import('../src/lib/auth.ts');
  getSession.mock.mockImplementation(async () => null);

  const request = new Request('http://localhost:3000/api/admin/company-summary');
  const response = await GET(request);
  
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error, 'Admins only.');
});

test('Company Summary API - denies employee access', async () => {
  const { getSession } = await import('../src/lib/auth.ts');
  getSession.mock.mockImplementation(async () => ({ role: 'employee', employeeId: 'emp-1' }));

  const request = new Request('http://localhost:3000/api/admin/company-summary');
  const response = await GET(request);
  
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.error, 'Admins only.');
});

test('Company Summary API - returns data for admin', async () => {
  const { getSession } = await import('../src/lib/auth.ts');
  const { getConversionMetadata } = await import('../src/lib/currency/converter.ts');
  
  getSession.mock.mockImplementation(async () => ({ role: 'admin' }));
  getConversionMetadata.mock.mockImplementation(() => ({
    referenceDate: '2026-10-21',
    version: '2026-10-21-v1',
    source: 'ExchangeRate-API historical data',
    supportedCurrencies: ['USD', 'INR', 'MYR']
  }));

  const mockEmployee = createMockEmployee({
    expenses: [
      createMockExpense({ id: 'exp-1', amount: 1000, currency: 'INR', amountUsd: 12.03, conversionStatus: 'CONVERTED' }),
      createMockExpense({ id: 'exp-2', amount: 500, currency: 'MYR', amountUsd: 106.15, conversionStatus: 'CONVERTED' }),
    ],
    payouts: [createMockPayout({ status: 'PAID', paidAt: new Date() })],
  });

  mockPrisma.employee.findMany.mock.mockImplementation(async () => [mockEmployee]);
  mockPrisma.expense.findMany.mock.mockImplementation(async () => mockEmployee.expenses);
  mockPrisma.monthlyPayout.findMany.mock.mockImplementation(async () => [createMockPayout({ status: 'PAID', paidAt: new Date() })]);

  const request = new Request('http://localhost:3000/api/admin/company-summary');
  const response = await GET(request);
  
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.ok(body.summary);
  assert.ok(body.employees);
  assert.equal(body.summary.totalAmountClaimedUsd, 118.18); // 12.03 + 106.15
  assert.equal(body.summary.totalAmountApprovedUsd, 118.18);
  assert.equal(body.summary.totalAmountPaidUsd, 12.03);
  assert.equal(body.summary.employeeCount, 1);
});

test('Company Summary API - filters by year and month', async () => {
  const { getSession } = await import('../src/lib/auth.ts');
  const { getConversionMetadata } = await import('../src/lib/currency/converter.ts');
  
  getSession.mock.mockImplementation(async () => ({ role: 'admin' }));
  getConversionMetadata.mock.mockImplementation(() => ({
    referenceDate: '2026-10-21',
    version: '2026-10-21-v1',
    source: 'ExchangeRate-API historical data',
    supportedCurrencies: ['USD', 'INR', 'MYR']
  }));

  const mockEmployee = createMockEmployee({
    expenses: [
      createMockExpense({ 
        id: 'exp-1', 
        amount: 1000, 
        currency: 'INR', 
        amountUsd: 12.03, 
        conversionStatus: 'CONVERTED',
        timestamp: new Date('2025-06-15T10:00:00Z')
      }),
    ],
    payouts: [],
  });

  mockPrisma.employee.findMany.mock.mockImplementation(async () => [mockEmployee]);
  mockPrisma.expense.findMany.mock.mockImplementation(async () => mockEmployee.expenses);
  mockPrisma.monthlyPayout.findMany.mock.mockImplementation(async () => []);

  const request = new Request('http://localhost:3000/api/admin/company-summary?year=2025&month=6');
  const response = await GET(request);
  
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.ok(mockPrisma.expense.findMany.mock.calls.length > 0);
});

test('Company Summary API - validates month parameter', async () => {
  const { getSession } = await import('../src/lib/auth.ts');
  getSession.mock.mockImplementation(async () => ({ role: 'admin' }));

  const request = new Request('http://localhost:3000/api/admin/company-summary?year=2025&month=13');
  const response = await GET(request);
  
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.ok(body.error.includes('Invalid month'));
});

test('Company Summary - calculates totals correctly with mixed currencies', async () => {
  const { getSession } = await import('../src/lib/auth.ts');
  const { getConversionMetadata } = await import('../src/lib/currency/converter.ts');
  
  getSession.mock.mockImplementation(async () => ({ role: 'admin' }));
getConversionMetadata.mock.mockImplementation(() => ({
    referenceDate: '2026-10-21',
    version: '2026-10-21-v1',
    source: 'ExchangeRate-API historical data',
    supportedCurrencies: ['USD', 'INR', 'MYR']
  }));

  const mockEmployee = createMockEmployee({
    expenses: [
      createMockExpense({ id: 'exp-1', amount: 10000, currency: 'INR', amountUsd: 120.30, conversionStatus: 'CONVERTED' }),
      createMockExpense({ id: 'exp-2', amount: 5000, currency: 'MYR', amountUsd: 1061.50, conversionStatus: 'CONVERTED' }),
      createMockExpense({ id: 'exp-3', amount: 500, currency: 'USD', amountUsd: 500, conversionStatus: 'NOT_NEEDED' }),
    ],
    payouts: [createMockPayout({ 
      status: 'PAID', 
      paidAt: new Date(),
      totalReimbursement: 15500,
      totalReimbursementUsd: 1681.80
    })],
  });

  mockPrisma.employee.findMany.mock.mockImplementation(async () => [mockEmployee]);
  mockPrisma.expense.findMany.mock.mockImplementation(async () => mockEmployee.expenses);
  mockPrisma.monthlyPayout.findMany.mock.mockImplementation(async () => [createMockPayout({ 
    status: 'PAID', 
    paidAt: new Date(),
    totalReimbursement: 15500,
    totalReimbursementUsd: 1681.80
  })]);

  const request = new Request('http://localhost:3000/api/admin/company-summary');
  const response = await GET(request);
  
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  
  // Total claimed USD = 120.30 + 1061.50 + 500 = 1681.80
  assert.equal(body.summary.totalAmountClaimedUsd, 1681.80);
  
  // Total approved USD = same (all approved)
  assert.equal(body.summary.totalAmountApprovedUsd, 1681.80);
  
  // Total paid USD = 1681.80
  assert.equal(body.summary.totalAmountPaidUsd, 1681.80);
  
  // Currency breakdown
  assert.ok(body.summary.currencyBreakdown.INR);
  assert.ok(body.summary.currencyBreakdown.MYR);
  assert.ok(body.summary.currencyBreakdown.USD);
});

test('Company Summary - excludes PENDING_REVIEW and FAILED conversions from totals', async () => {
  const { getSession } = await import('../src/lib/auth.ts');
  const { getConversionMetadata } = await import('../src/lib/currency/converter.ts');
  
  getSession.mock.mockImplementation(async () => ({ role: 'admin' }));
  getConversionMetadata.mock.mockImplementation(() => ({
    referenceDate: '2026-10-21',
    version: '2026-10-21-v1',
    source: 'ExchangeRate-API historical data',
    supportedCurrencies: ['USD', 'INR', 'MYR']
  }));

  const mockEmployee = createMockEmployee({
    expenses: [
      createMockExpense({ id: 'exp-1', amount: 1000, currency: 'INR', amountUsd: 12.03, conversionStatus: 'CONVERTED' }),
      createMockExpense({ id: 'exp-2', amount: 500, currency: 'MYR', amountUsd: 0, conversionStatus: 'PENDING_REVIEW' }),
      createMockExpense({ id: 'exp-3', amount: 300, currency: 'USD', amountUsd: 0, conversionStatus: 'FAILED' }),
    ],
    payouts: [],
  });

  mockPrisma.employee.findMany.mock.mockImplementation(async () => [mockEmployee]);
  mockPrisma.expense.findMany.mock.mockImplementation(async () => mockEmployee.expenses);
  mockPrisma.monthlyPayout.findMany.mock.mockImplementation(async () => []);

  const request = new Request('http://localhost:3000/api/admin/company-summary');
  const response = await GET(request);
  
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  
  // Only the CONVERTED expense should be in totals
  assert.equal(body.summary.totalAmountClaimedUsd, 12.03);
  assert.equal(body.summary.pendingReviewCount, 2);
  assert.equal(body.summary.deniedCount, 0);
});