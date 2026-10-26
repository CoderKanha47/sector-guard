import { type Prisma } from '@prisma/client';
import { evaluateReceipt, type ReceiptData } from './fraudRules';

export interface AuditResult {
  calculatedReimbursement: number;
  riskScore: number;
  status: 'APPROVED' | 'FLAGGED' | 'DENIED';
  anomalies: Array<{ type: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }>;
  newRating: number;
}

export async function executeFraudAudit(
  tx: Prisma.TransactionClient,
  employeeId: string,
  parsedData: ReceiptData,
  currentExpenseId?: string
): Promise<AuditResult> {
  const employee = await tx.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new Error("Employee footprint not found in Sector Guard database.");

  const currentAmount = Number(parsedData.amount);
  const currentTimestamp = new Date(parsedData.dateTime);

  const recentExpenses = await tx.expense.findMany({
    where: {
      employeeId,
      id: currentExpenseId ? { not: currentExpenseId } : undefined,
      timestamp: {
        gte: new Date(currentTimestamp.getTime() - 24 * 60 * 60 * 1000),
        lte: new Date(currentTimestamp.getTime() + 24 * 60 * 60 * 1000)
      }
    }
  });

  const decision = evaluateReceipt({
    employeeTierLimit: Number(employee.tierLimit),
    currentRating: Number(employee.rating),
    current: {
      id: currentExpenseId ?? '',
      amount: currentAmount,
      merchant: parsedData.merchant,
      timestamp: currentTimestamp,
      category: parsedData.category
    },
    recentExpenses
  });

  await tx.employee.update({
    where: { id: employeeId },
    data: { rating: decision.newRating }
  });

  return {
    calculatedReimbursement: decision.calculatedReimbursement,
    riskScore: decision.riskScore,
    status: decision.status,
    anomalies: decision.anomalies,
    newRating: decision.newRating
  };
}