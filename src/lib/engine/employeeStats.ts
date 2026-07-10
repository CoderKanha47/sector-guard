import { prisma } from '@/lib/prisma';

export async function getEmployeeProfile(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      expenses: {
        include: { audit: { include: { anomalies: true } } },
        orderBy: { timestamp: 'desc' }
      }
    }
  });

  if (!employee) return null;

  const billsUploaded = employee.expenses.length;

  const reimbursementsPaid = employee.expenses.reduce((sum, exp) => {
    if (exp.audit?.status === 'APPROVED') {
      return sum + exp.audit.calculatedReimbursement;
    }
    return sum;
  }, 0);

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