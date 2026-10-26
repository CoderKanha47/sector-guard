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
  amountOriginal?: number;
  currency?: string;
  conversionStatus?: 'CONVERTED' | 'PENDING_REVIEW' | 'FAILED' | 'NOT_NEEDED';
  fxRateDate?: Date;
  merchant: string;
  timestamp: Date;
  category: string;
}

export interface PolicyLimitConversion {
  limitUsd: number;
  fxRate: number;
  fxRateDate: Date;
  fxProvider: string;
  status: 'CONVERTED' | 'PENDING_REVIEW' | 'FAILED' | 'NOT_NEEDED';
}

export interface EvaluateContext {
  employeeTierLimit: number;
  employeeTierLimitOriginal?: number;
  employeeTierLimitCurrency?: string;
  currentRating: number;
  current: ExpenseInput;
  recentExpenses: ExpenseInput[];
  policyLimitConversion?: PolicyLimitConversion;
}

export interface Decision {
  riskScore: number;
  status: AuditStatus;
  calculatedReimbursement: number;
  calculatedReimbursementUsd: number | null;
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
  amountUsd?: number;
  fxRate?: number;
  fxRateDate?: Date;
  fxProvider?: string;
  conversionStatus?: 'CONVERTED' | 'PENDING_REVIEW' | 'FAILED' | 'NOT_NEEDED';
}

export function evaluateReceipt(ctx: EvaluateContext): Decision {
  const anomalies: Anomaly[] = [];
  let riskScore = 0;

  const currentAmount = Number(ctx.current.amount);
  const currentAmountOriginal = Number(ctx.current.amountOriginal ?? ctx.current.amount);
  const currentCurrency = ctx.current.currency || 'USD';
  const currentTimestamp = ctx.current.timestamp;
  const currentCategory = ctx.current.category;
  const currentMerchant = ctx.current.merchant;
  const employeeTierLimit = Number(ctx.employeeTierLimit);
  const policyLimitConversion = ctx.policyLimitConversion;

  // Block expenses with failed or pending currency conversion
  if (ctx.current.conversionStatus === 'PENDING_REVIEW' || ctx.current.conversionStatus === 'FAILED') {
    anomalies.push({
      type: 'CURRENCY_CONVERSION_FAILED',
      description: `Cannot audit expense: currency conversion failed or unavailable for ${currentCurrency}. Receipt requires manual review.`,
      severity: 'HIGH'
    });
    riskScore += 100; // Force DENIED
  }

  // Block if policy limit conversion failed
  if (policyLimitConversion?.status === 'PENDING_REVIEW' || policyLimitConversion?.status === 'FAILED') {
    anomalies.push({
      type: 'POLICY_LIMIT_CONVERSION_FAILED',
      description: `Cannot audit expense: policy limit conversion failed for ${ctx.employeeTierLimitCurrency}. Receipt requires manual review.`,
      severity: 'HIGH'
    });
    riskScore += 100; // Force DENIED
  }

  if (currentAmount > employeeTierLimit) {
    const limitDisplay = ctx.employeeTierLimitOriginal 
      ? `${ctx.employeeTierLimitOriginal} ${ctx.employeeTierLimitCurrency} (≈$${employeeTierLimit.toFixed(2)} USD)`
      : `${employeeTierLimit} USD`;
    anomalies.push({
      type: 'POLICY_VIOLATION',
      description: `Transaction amount (${currentAmountOriginal} ${currentCurrency}, ≈$${currentAmount.toFixed(2)} USD) exceeds employee tier allowance limit of ${limitDisplay}.`,
      severity: 'LOW'
    });
    riskScore += 20;
  }

  if (policyLimitConversion?.status === 'PENDING_REVIEW') {
    anomalies.push({
      type: 'FX_RATE_UNAVAILABLE',
      description: `Exchange rate for ${ctx.employeeTierLimitCurrency} -> USD unavailable on ${policyLimitConversion.fxRateDate.toISOString().split('T')[0]}. Monetary comparison used fallback or could not be completed.`,
      severity: 'MEDIUM'
    });
    riskScore += 10;
  }

  if (ctx.current.conversionStatus === 'PENDING_REVIEW') {
    anomalies.push({
      type: 'FX_RATE_UNAVAILABLE',
      description: `Exchange rate for ${currentCurrency} -> USD unavailable on ${ctx.current.fxRateDate?.toISOString().split('T')[0]}. Receipt amount converted using fallback rate or marked for review.`,
      severity: 'MEDIUM'
    });
    riskScore += 10;
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
        description: `Potential receipt splitting detected at ${currentMerchant}. Multiple transactions sum to ≈$${totalSplitAmount.toFixed(2)} USD, bypassing the single limit threshold of ≈$${employeeTierLimit.toFixed(2)} USD.`,
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

  const calculatedReimbursement = status === 'DENIED' ? 0 : Math.min(currentAmountOriginal, ctx.employeeTierLimitOriginal ?? currentAmountOriginal);
  const calculatedReimbursementUsd = status === 'DENIED' ? 0 : Math.min(currentAmount, employeeTierLimit);

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
    calculatedReimbursementUsd,
    anomalies,
    ratingDelta,
    newRating
  };
}