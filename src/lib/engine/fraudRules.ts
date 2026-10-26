export const SPLIT_WINDOW_MS = 3 * 60 * 60 * 1000;
export const TEMPORAL_CONFLICT_WINDOW_MS = 15 * 60 * 1000;

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type AuditStatus = 'APPROVED' | 'FLAGGED' | 'DENIED';

export interface Anomaly {
  type: string;
  description: string;
  severity: AnomalySeverity;
}

export interface ExpenseInput {
  id: string;
  amount: number;
  merchant: string;
  timestamp: Date;
  category: string;
}

export interface EvaluateContext {
  employeeTierLimit: number;
  currentRating: number;
  current: ExpenseInput;
  recentExpenses: ExpenseInput[];
}

export interface Decision {
  riskScore: number;
  status: AuditStatus;
  calculatedReimbursement: number;
  anomalies: Anomaly[];
  ratingDelta: number;
  newRating: number;
}

export interface ReceiptLineItem {
  description?: string | null;
  quantity?: number | null;
  price?: number | null;
}

export interface ReceiptData {
  merchant: string;
  dateTime: Date;
  amount: number;
  currency: string;
  category: string;
  lineItems: ReceiptLineItem[];
}

export function evaluateReceipt(ctx: EvaluateContext): Decision {
  const anomalies: Anomaly[] = [];
  let riskScore = 0;

  const currentAmount = Number(ctx.current.amount);
  const currentTimestamp = ctx.current.timestamp;
  const currentCategory = ctx.current.category;
  const currentMerchant = ctx.current.merchant;
  const employeeTierLimit = Number(ctx.employeeTierLimit);

  if (currentAmount > employeeTierLimit) {
    anomalies.push({
      type: 'POLICY_VIOLATION',
      description: `Transaction amount (${currentAmount}) exceeds employee tier allowance limit of ${employeeTierLimit}.`,
      severity: 'LOW'
    });
    riskScore += 20;
  }

  const suspectedSplits = ctx.recentExpenses.filter(exp =>
    exp.merchant.toLowerCase() === currentMerchant.toLowerCase() &&
    Math.abs(exp.timestamp.getTime() - currentTimestamp.getTime()) <= SPLIT_WINDOW_MS
  );

  if (suspectedSplits.length > 0) {
    const totalSplitAmount = currentAmount + suspectedSplits.reduce((sum, exp) => sum + Number(exp.amount), 0);

    if (totalSplitAmount > employeeTierLimit) {
      anomalies.push({
        type: 'SPLIT_RECEIPT',
        description: `Potential receipt splitting detected at ${currentMerchant}. Multiple transactions sum to ${totalSplitAmount}, bypassing the single limit threshold.`,
        severity: 'HIGH'
      });
      riskScore += 50;
    }
  }

  const transportConflicts = ctx.recentExpenses.filter(exp => {
    const timeDiffMinutes = Math.abs(exp.timestamp.getTime() - currentTimestamp.getTime()) / (1000 * 60);
    return currentCategory === 'transport' && exp.category === 'transport' && timeDiffMinutes > 0 && timeDiffMinutes < 15;
  });

  if (transportConflicts.length > 0) {
    anomalies.push({
      type: 'TEMPORAL_CONFLICT',
      description: `Simultaneous transit logs detected. Multiple transport fares cannot log realistically within 15 minutes of each other.`,
      severity: 'MEDIUM'
    });
    riskScore += 30;
  }

  riskScore = Math.min(riskScore, 100);
  let status: AuditStatus = 'APPROVED';
  if (riskScore >= 60) status = 'DENIED';
  else if (riskScore > 0) status = 'FLAGGED';

  const calculatedReimbursement = status === 'DENIED' ? 0 : Math.min(currentAmount, employeeTierLimit);

  let ratingDelta = 0;
  if (status === 'APPROVED') {
    ratingDelta = 1;
  } else if (status === 'FLAGGED') {
    ratingDelta = -(riskScore * 0.3);
  } else if (status === 'DENIED') {
    ratingDelta = -(riskScore * 0.5);
  }

  const newRating = Math.max(0, Math.min(100, Number(ctx.currentRating) + ratingDelta));

  return {
    riskScore,
    status,
    calculatedReimbursement,
    anomalies,
    ratingDelta,
    newRating
  };
}