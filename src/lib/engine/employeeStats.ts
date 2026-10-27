import { prisma } from '@/lib/prisma';

export async function getEmployeeProfile(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      expenses: {
        include: { audit: { include: { anomalies: true } } },
        orderBy: { timestamp: 'desc' }
      },
      payouts: {
        orderBy: [{ year: 'desc' }, { month: 'desc' }]
      }
    }
  });

  if (!employee) return null;

  const billsUploaded = employee.expenses.length;

  let approvedCount = 0;
  let flaggedCount = 0;
  let deniedCount = 0;
  let totalClaimed = 0;
  let totalClaimedUsd = 0;
  let totalApproved = 0;
  let totalApprovedUsd = 0;
  let reimbursementsPaid = 0;
  let reimbursementsPaidUsd = 0;

  for (const exp of employee.expenses) {
    const status = exp.audit?.status;
    const amount = exp.amount || 0;
    const amountUsd = exp.amountUsd ?? 0;

    totalClaimed += amount;
    totalClaimedUsd += amountUsd;

    if (status === 'APPROVED') {
      approvedCount++;
      totalApproved += exp.audit?.calculatedReimbursement ?? 0;
      totalApprovedUsd += exp.audit?.calculatedReimbursementUsd ?? 0;
      reimbursementsPaid += exp.audit?.calculatedReimbursement ?? 0;
      reimbursementsPaidUsd += exp.audit?.calculatedReimbursementUsd ?? 0;
    } else if (status === 'FLAGGED') {
      flaggedCount++;
    } else if (status === 'DENIED') {
      deniedCount++;
    }
  }

  // Calculate actual paid amounts from payouts with PAID status
  let totalPaid = 0;
  let totalPaidUsd = 0;
  for (const payout of employee.payouts) {
    if (payout.status === 'PAID' && payout.paidAt) {
      totalPaid += payout.totalReimbursement;
      totalPaidUsd += payout.totalReimbursementUsd ?? 0;
    }
  }

  const monthsReimbursed = employee.payouts.filter(p => p.totalReimbursement > 0).length;

  return {
    id: employee.id,
    name: employee.name,
    department: employee.department,
    designation: employee.designation,
    address: employee.address,
    tierLimit: employee.tierLimit,
    tierLimitCurrency: (employee as any).tierLimitCurrency ?? 'INR',
    rating: employee.rating,
    billsUploaded,
    totalClaimed,
    totalClaimedUsd,
    totalApproved,
    totalApprovedUsd,
    totalPaid,
    totalPaidUsd,
    reimbursementsPaid,
    reimbursementsPaidUsd,
    approvedCount,
    flaggedCount,
    deniedCount,
    monthsReimbursed,
    payouts: employee.payouts.map(p => ({
      id: p.id,
      year: p.year,
      month: p.month,
      status: p.status,
      totalClaimed: p.totalClaimed,
      totalClaimedUsd: (p as any).totalClaimedUsd ?? null,
      totalReimbursement: p.totalReimbursement,
      totalReimbursementUsd: (p as any).totalReimbursementUsd ?? null,
      expenseCount: p.expenseCount,
      closedAt: p.closedAt,
      paidAt: p.paidAt
    })),
    history: employee.expenses
  };
}

export async function getMonthlyReimbursement(employeeId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const result = await prisma.expense.findMany({
    where: {
      employeeId,
      timestamp: { gte: startDate, lt: endDate }
    },
    include: { audit: true }
  });

  const totalReimbursement = result.reduce((sum, exp) => {
    if (exp.audit?.status === 'APPROVED') {
      return sum + exp.audit.calculatedReimbursement;
    }
    return sum;
  }, 0);

  const totalReimbursementUsd = result.reduce((sum, exp) => {
    if (exp.audit?.status === 'APPROVED') {
      return sum + (exp.audit.calculatedReimbursementUsd ?? 0);
    }
    return sum;
  }, 0);

  return {
    year,
    month,
    totalReimbursement,
    totalReimbursementUsd,
    expenseCount: result.length
  };
}

export async function getAllEmployeesSummary() {
  const employees = await prisma.employee.findMany({
    include: {
      expenses: { include: { audit: true } }
    }
  });

  return employees.map(emp => {
    const billsUploaded = emp.expenses.length;
    const reimbursementsPaid = emp.expenses.reduce((sum, exp) => {
      if (exp.audit?.status === 'APPROVED') {
        return sum + exp.audit.calculatedReimbursement;
      }
      return sum;
    }, 0);

    const reimbursementsPaidUsd = emp.expenses.reduce((sum, exp) => {
      if (exp.audit?.status === 'APPROVED') {
        return sum + (exp.audit.calculatedReimbursementUsd ?? 0);
      }
      return sum;
    }, 0);

    return {
      id: emp.id,
      name: emp.name,
      department: emp.department,
      designation: emp.designation,
      rating: emp.rating,
      billsUploaded,
      reimbursementsPaid,
      reimbursementsPaidUsd
    };
  });
}