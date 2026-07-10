import { prisma } from '@/lib/prisma';

export async function closeMonthlyPayout(employeeId: string, year: number, month: number) {
  // Check if this employee/month is already closed
  const existing = await prisma.monthlyPayout.findUnique({
    where: {
      employeeId_year_month: { employeeId, year, month }
    }
  });

  if (existing) {
    throw new Error(`Payout for ${year}-${month} already closed for this employee.`);
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

  const totalReimbursement = approvedExpenses.reduce(
    (sum, exp) => sum + (exp.audit?.calculatedReimbursement || 0),
    0
  );

  const payout = await prisma.monthlyPayout.create({
    data: {
      employeeId,
      year,
      month,
      totalReimbursement,
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