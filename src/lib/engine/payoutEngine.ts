import { prisma } from '@/lib/prisma';

const CATEGORY_MAP: Record<string, string> = {
  transport: 'TRAVEL',
  food: 'FOOD',
  lodging: 'STAY',
};

function mapToBucket(rawCategory: string): string {
  return CATEGORY_MAP[rawCategory?.toLowerCase()] || 'OTHER';
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

  // Raw total claimed, before any capping
  const totalClaimed = approvedExpenses.reduce(
    (sum, exp) => sum + (exp.audit?.calculatedReimbursement || 0),
    0
  );

  // Actual payout, capped at the employee's monthly tier limit
  const totalReimbursement = Math.min(totalClaimed, employee.tierLimit);

  // Category breakdown, based on raw claimed amounts (not capped) — shows real spending pattern
  const categoryBreakdown: Record<string, number> = {
    TRAVEL: 0,
    FOOD: 0,
    STAY: 0,
    OTHER: 0
  };

  for (const exp of approvedExpenses) {
    const bucket = mapToBucket(exp.category);
    categoryBreakdown[bucket] += exp.audit?.calculatedReimbursement || 0;
  }

  const payout = await prisma.monthlyPayout.create({
    data: {
      employeeId,
      year,
      month,
      totalClaimed,
      totalReimbursement,
      categoryBreakdown,
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