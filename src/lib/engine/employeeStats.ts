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
  let reimbursementsPaid = 0;

  for (const exp of employee.expenses) {
    const status = exp.audit?.status;
    if (status === 'APPROVED') {
      approvedCount++;
      reimbursementsPaid += exp.audit?.calculatedReimbursement ?? 0;
    } else if (status === 'FLAGGED') {
      flaggedCount++;
    } else if (status === 'DENIED') {
      deniedCount++;
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
    rating: employee.rating,
    billsUploaded,
    reimbursementsPaid,
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
      totalReimbursement: p.totalReimbursement,
      expenseCount: p.expenseCount,
      closedAt: p.closedAt,
      paidAt: p.paidAt
    })),
    history: employee.expenses
  };
}

export async function getMonthlyReimbursement(employeeId: string, year: number, month: number) {
  // month is 1-12
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

  return {
    year,
    month,
    totalReimbursement,
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

    return {
      id: emp.id,
      name: emp.name,
      department: emp.department,
      designation: emp.designation,
      rating: emp.rating,
      billsUploaded,
      reimbursementsPaid
    };
  });
}