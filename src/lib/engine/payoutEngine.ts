import { prisma } from '@/lib/prisma';

const CATEGORY_MAP: Record<string, string> = {
  transport: 'TRAVEL',
  food: 'FOOD',
  lodging: 'STAY',
};

function mapToBucket(rawCategory: string): string {
  return CATEGORY_MAP[rawCategory?.toLowerCase()] || 'OTHER';
}

function initCategoryBreakdown(): Record<string, number> {
  return { TRAVEL: 0, FOOD: 0, STAY: 0, OTHER: 0 };
}

export async function closeMonthlyPayout(employeeId: string, year: number, month: number) {
  const existing = await prisma.monthlyPayout.findUnique({
    where: {
      employeeId_year_month: { employeeId, year, month }
    }
  });

  if (existing) {
    throw new Error(`Payout for ${year}-${month} already closed for this employee.`);
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    throw new Error("Employee not found.");
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const expenses = await prisma.expense.findMany({
    where: {
      employeeId,
      timestamp: { gte: startDate, lt: endDate }
    },
    include: { audit: true }
  });

  const approvedExpenses = expenses.filter(exp => exp.audit?.status === 'APPROVED');

  // Raw total claimed in original currency (for reference)
  const totalClaimed = approvedExpenses.reduce(
    (sum, exp) => sum + (exp.audit?.calculatedReimbursement || 0),
    0
  );

  // USD-normalized total claimed (for cross-currency aggregation)
  const totalClaimedUsd = approvedExpenses.reduce(
    (sum, exp) => sum + (exp.audit?.calculatedReimbursementUsd || 0),
    0
  );

  // Policy limit in USD for this month (approximate using current rate)
  const policyLimitUsd = (await import('@/lib/currency/converter')).convertPolicyLimitToUsd(
    Number(employee.tierLimit),
    employee.tierLimitCurrency,
    new Date(year, month - 1, 1)
  ).then(r => r.limitUsd);

  // We'll use the employee's tier limit in original currency for the cap
  // Actual payout, capped at the employee's monthly tier limit (original currency)
  const totalReimbursement = Math.min(totalClaimed, employee.tierLimit);

  // USD-equivalent payout, capped at USD-equivalent tier limit
  const totalReimbursementUsd = Math.min(totalClaimedUsd, (await policyLimitUsd) || totalClaimedUsd);

  // Category breakdown in original currency
  const categoryBreakdown: Record<string, number> = initCategoryBreakdown();

  // Category breakdown in USD
  const categoryBreakdownUsd: Record<string, number> = initCategoryBreakdown();

  for (const exp of approvedExpenses) {
    const bucket = mapToBucket(exp.category);
    categoryBreakdown[bucket] += exp.audit?.calculatedReimbursement || 0;
    categoryBreakdownUsd[bucket] += exp.audit?.calculatedReimbursementUsd || 0;
  }

  const payout = await prisma.monthlyPayout.create({
    data: {
      employeeId,
      year,
      month,
      totalClaimed,
      totalClaimedUsd,
      totalReimbursement,
      totalReimbursementUsd,
      categoryBreakdown,
      categoryBreakdownUsd,
      expenseCount: approvedExpenses.length,
      status: 'PENDING'
    }
  });

  return payout;
}

export async function markPayoutAsPaid(payoutId: string) {
  return prisma.monthlyPayout.update({
    where: { id: payoutId },
    data: {
      status: 'PAID',
      paidAt: new Date()
    }
  });
}

export async function getEmployeePayoutHistory(employeeId: string) {
  return prisma.monthlyPayout.findMany({
    where: { employeeId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }]
  });
}