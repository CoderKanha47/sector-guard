import { prisma } from '@/lib/prisma';

interface AuditResult {
  calculatedReimbursement: number;
  riskScore: number;
  status: 'APPROVED' | 'FLAGGED' | 'DENIED';
  anomalies: Array<{ type: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }>;
}



export async function executeFraudAudit(employeeId: string, parsedData: any): Promise<AuditResult> {
  const anomalies: AuditResult['anomalies'] = [];
  let riskScore = 0;

  const currentAmount = Number(parsedData.amount);
  const currentTimestamp = new Date(parsedData.dateTime);
  const currentCategory = parsedData.category;
  const currentMerchant = parsedData.merchant;

  // 1. Fetch Employee Profile for Policy Validation
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new Error("Employee footprint not found in Sector Guard database.");

  // Safely convert tierLimit to a JS number if it's stored as a Decimal
  const employeeTierLimit = Number(employee.tierLimit);

  // Rule A: Basic Single-Transaction Limit Check
  if (currentAmount > employeeTierLimit) {
    anomalies.push({
      type: 'POLICY_VIOLATION',
      description: `Transaction amount (${currentAmount}) exceeds employee tier allowance limit of ${employeeTierLimit}.`,
      severity: 'LOW'
    });
    riskScore += 20;
  }

  // 2. Look back at historical expenses within a window to catch behavioral patterns
  const recentExpenses = await prisma.expense.findMany({
    where: {
      employeeId,
      timestamp: {
        gte: new Date(currentTimestamp.getTime() - 24 * 60 * 60 * 1000), // 24-hour lookback window
        lte: new Date(currentTimestamp.getTime() + 24 * 60 * 60 * 1000)
      }
    }
  });

  const splitWindow = 3 * 60 * 60 * 1000;
  const suspectedSplits = recentExpenses.filter(exp =>
    exp.merchant.toLowerCase() === currentMerchant.toLowerCase() &&
    Math.abs(exp.timestamp.getTime() - currentTimestamp.getTime()) <= splitWindow
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

  const transportConflicts = recentExpenses.filter(exp => {
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
  let status: AuditResult['status'] = 'APPROVED';
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

  const newRating = Math.max(0, Math.min(100, employee.rating + ratingDelta));

  await prisma.employee.update({
    where: { id: employeeId },
    data: { rating: newRating }
  });

  return {
    calculatedReimbursement,
    riskScore,
    status,
    anomalies
  };
}