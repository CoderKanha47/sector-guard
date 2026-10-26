import { prisma } from '@/lib/prisma';
import { convertPolicyLimitToUsd } from '@/lib/currency/converter';

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

  // Exclude expenses with failed/pending currency conversion from payout
  const approvedExpenses = expenses.filter(exp => 
    exp.audit?.status === 'APPROVED' && 
    exp.conversionStatus !== 'PENDING_REVIEW' && 
    exp.conversionStatus !== 'FAILED'
  );

  // USD-normalized total claimed (authoritative for cross-currency aggregation)
  const totalClaimedUsd = approvedExpenses.reduce(
    (sum, exp) => sum + (exp.audit?.calculatedReimbursementUsd || 0),
    0
  );

  // Also track original currency totals for reference (grouped by currency)
  const totalClaimedByCurrency: Record<string, number> = {};
  for (const exp of approvedExpenses) {
    const curr = exp.currency || 'UNKNOWN';
    totalClaimedByCurrency[curr] = (totalClaimedByCurrency[curr] || 0) + (exp.audit?.calculatedReimbursement || 0);
  }

  // Policy limit in USD for this month (using the first day of the month as reference)
  const policyLimitResult = await convertPolicyLimitToUsd(
    Number(employee.tierLimit),
    employee.tierLimitCurrency,
    new Date(year, month - 1, 1)
  );
  const policyLimitUsd = policyLimitResult.limitUsd;

  // If policy limit conversion failed, block payout and require review
  if (policyLimitResult.status === 'PENDING_REVIEW' || policyLimitResult.status === 'FAILED') {
    throw new Error(`Cannot calculate payout: policy limit conversion failed for ${employee.tierLimitCurrency}. Requires manual review.`);
  }

  // Single authoritative calculation: USD-normalized cap
  const totalReimbursementUsd = Math.min(totalClaimedUsd, policyLimitUsd || totalClaimedUsd);

  // For backward compatibility, also compute original-currency reimbursement
  // using the employee's tier limit in original currency (only meaningful if all receipts are same currency)
  const totalClaimed = approvedExpenses.reduce(
    (sum, exp) => sum + (exp.audit?.calculatedReimbursement || 0),
    0
  );
  const totalReimbursement = Math.min(totalClaimed, employee.tierLimit);

  // Category breakdown in original currency (grouped by currency for reference)
  const categoryBreakdown: Record<string, number> = initCategoryBreakdown();

  // Category breakdown in USD (authoritative)
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