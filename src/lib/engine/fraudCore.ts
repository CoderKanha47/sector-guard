import { type Prisma } from '@prisma/client';
import { evaluateReceipt, type ReceiptData } from './fraudRules';
import { convertPolicyLimitToUsd } from '@/lib/currency/converter';

export interface AuditResult {
  calculatedReimbursement: number;
  calculatedReimbursementUsd: number | null;
  policyLimitUsd: number | null;
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
  const currentCurrency = parsedData.currency;
  const currentAmountUsd = (parsedData as any).amountUsd ?? null;

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

  const policyLimitConversion = await convertPolicyLimitToUsd(
    Number(employee.tierLimit),
    employee.tierLimitCurrency,
    currentTimestamp
  );

  const decision = evaluateReceipt({
    employeeTierLimit: policyLimitConversion.limitUsd > 0 ? policyLimitConversion.limitUsd : Number(employee.tierLimit),
    employeeTierLimitOriginal: Number(employee.tierLimit),
    employeeTierLimitCurrency: employee.tierLimitCurrency,
    currentRating: Number(employee.rating),
    current: {
      id: currentExpenseId ?? '',
      amount: currentAmountUsd ?? currentAmount,
      amountOriginal: currentAmount,
      currency: currentCurrency,
      conversionStatus: parsedData.conversionStatus as 'CONVERTED' | 'PENDING_REVIEW' | 'FAILED' | 'NOT_NEEDED' | undefined,
      fxRateDate: parsedData.fxRateDate ?? undefined,
      merchant: parsedData.merchant,
      timestamp: currentTimestamp,
      category: parsedData.category
    },
    recentExpenses: recentExpenses.map(exp => ({
      id: exp.id,
      amount: exp.amountUsd ?? exp.amount,
      amountOriginal: exp.amount,
      currency: exp.currency,
      conversionStatus: exp.conversionStatus as 'CONVERTED' | 'PENDING_REVIEW' | 'FAILED' | 'NOT_NEEDED' | undefined,
      fxRateDate: exp.fxRateDate ?? undefined,
      merchant: exp.merchant,
      timestamp: exp.timestamp,
      category: exp.category
    })),
    policyLimitConversion
  });

  await tx.employee.update({
    where: { id: employeeId },
    data: { rating: decision.newRating }
  });

  return {
    calculatedReimbursement: decision.calculatedReimbursement,
    calculatedReimbursementUsd: decision.calculatedReimbursementUsd,
    policyLimitUsd: policyLimitConversion.limitUsd > 0 ? policyLimitConversion.limitUsd : null,
    riskScore: decision.riskScore,
    status: decision.status,
    anomalies: decision.anomalies,
    newRating: decision.newRating
  };
}