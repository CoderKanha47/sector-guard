import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface MonthAccumulator {
  count: number;
  totalAmount: number;
  approvedCount: number;
  flaggedCount: number;
  deniedCount: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }

  const { id } = await params;

  if (session.role !== 'admin' && session.employeeId !== id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const yearParam = url.searchParams.get('year');
  const monthParam = url.searchParams.get('month');

  try {
    if (yearParam !== null && monthParam !== null) {
      const year = Number(yearParam);
      const month = Number(monthParam);
      if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        return NextResponse.json({ error: 'Invalid year or month.' }, { status: 400 });
      }

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      const expenses = await prisma.expense.findMany({
        where: {
          employeeId: id,
          timestamp: { gte: startDate, lt: endDate }
        },
        include: { audit: { include: { anomalies: true } } },
        orderBy: { timestamp: 'desc' }
      });

      const receipts = expenses.map(exp => ({
        id: exp.id,
        merchant: exp.merchant,
        amount: exp.amount,
        currency: exp.currency,
        timestamp: exp.timestamp,
        category: exp.category,
        status: exp.audit?.status ?? null,
        riskScore: exp.audit?.riskScore ?? null,
        calculatedReimbursement: exp.audit?.calculatedReimbursement ?? null,
        anomalies: exp.audit?.anomalies.map(a => ({
          type: a.type,
          description: a.description,
          severity: a.severity
        })) ?? []
      }));

      return NextResponse.json({
        success: true,
        year,
        month,
        monthName: MONTH_NAMES[month - 1],
        receipts
      });
    }

    // Folder tree: years -> months
    const [expenses, payouts] = await Promise.all([
      prisma.expense.findMany({
        where: { employeeId: id },
        include: { audit: true },
        orderBy: { timestamp: 'asc' }
      }),
      prisma.monthlyPayout.findMany({ where: { employeeId: id } })
    ]);

    const yearsMap = new Map<number, Map<number, MonthAccumulator>>();

    for (const exp of expenses) {
      const year = exp.timestamp.getFullYear();
      const month = exp.timestamp.getMonth() + 1;

      if (!yearsMap.has(year)) yearsMap.set(year, new Map());
      const monthsMap = yearsMap.get(year)!;

      if (!monthsMap.has(month)) {
        monthsMap.set(month, {
          count: 0,
          totalAmount: 0,
          approvedCount: 0,
          flaggedCount: 0,
          deniedCount: 0
        });
      }
      const acc = monthsMap.get(month)!;
      acc.count++;
      acc.totalAmount += exp.amount;

      if (exp.audit?.status === 'APPROVED') acc.approvedCount++;
      else if (exp.audit?.status === 'FLAGGED') acc.flaggedCount++;
      else if (exp.audit?.status === 'DENIED') acc.deniedCount++;
    }

    const payoutByMonth = new Map(
      payouts.map(p => [`${p.year}-${p.month}`, p] as const)
    );

    const folders = Array.from(yearsMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, monthsMap]) => ({
        year,
        totalReceipts: Array.from(monthsMap.values()).reduce((sum, m) => sum + m.count, 0),
        months: Array.from(monthsMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([month, acc]) => {
            const payout = payoutByMonth.get(`${year}-${month}`);
            return {
              month,
              monthName: MONTH_NAMES[month - 1],
              ...acc,
              payout: payout
                ? {
                    status: payout.status,
                    totalClaimed: payout.totalClaimed,
                    totalReimbursement: payout.totalReimbursement,
                    paidAt: payout.paidAt
                  }
                : null
            };
          })
      }));

    return NextResponse.json({ success: true, folders });
  } catch (error) {
    console.error('Failed to fetch receipt folders:', error);
    return NextResponse.json(
      process.env.NODE_ENV === 'production'
        ? { error: 'Failed to fetch receipt folders.' }
        : { error: 'Failed to fetch receipt folders.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
