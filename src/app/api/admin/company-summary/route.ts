import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getConversionMetadata } from '@/lib/currency/converter';

interface CompanySummaryParams {
  year?: number;
  month?: number;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const yearParam = url.searchParams.get('year');
    const monthParam = url.searchParams.get('month');
    
    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    const month = monthParam ? parseInt(monthParam, 10) : undefined;

    // Validate month if provided
    if (month !== undefined && (month < 1 || month > 12)) {
      return NextResponse.json({ error: 'Invalid month. Must be between 1 and 12.' }, { status: 400 });
    }

    // Build date filters
    let dateFilter: { gte?: Date; lt?: Date } = {};
    if (year !== undefined && month !== undefined) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      dateFilter = { gte: startDate, lt: endDate };
    } else if (year !== undefined) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);
      dateFilter = { gte: startDate, lt: endDate };
    }

    // Fetch all data needed for company summary
    const [
      employees,
      allExpenses,
      allPayouts
    ] = await Promise.all([
      prisma.employee.findMany({
        include: {
          expenses: {
            include: { audit: true },
            where: dateFilter.gte || dateFilter.lt ? { timestamp: dateFilter } : undefined,
          },
          payouts: {
            where: year !== undefined ? { year } : undefined,
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
          }
        }
      }),
      prisma.expense.findMany({
        include: { audit: true },
        where: dateFilter.gte || dateFilter.lt ? { timestamp: dateFilter } : undefined,
      }),
      prisma.monthlyPayout.findMany({
        where: year !== undefined ? { year } : undefined,
        orderBy: [{ year: 'desc' }, { month: 'desc' }]
      })
    ]);

    // Company-wide financial summary
    let totalAmountClaimed = 0;
    let totalAmountClaimedUsd = 0;
    let totalAmountApproved = 0;
    let totalAmountApprovedUsd = 0;
    let totalAmountPaid = 0;
    let totalAmountPaidUsd = 0;
    let pendingReviewCount = 0;
    let pendingReviewAmountUsd = 0;
    let deniedCount = 0;
    let deniedAmountUsd = 0;

    const currencyBreakdown: Record<string, { claimed: number; claimedUsd: number; approved: number; approvedUsd: number }> = {};

    for (const exp of allExpenses) {
      const amount = exp.amount || 0;
      const amountUsd = exp.amountUsd ?? 0;
      const currency = exp.currency || 'UNKNOWN';
      const status = exp.audit?.status;
      const conversionStatus = exp.conversionStatus;

      // Track by currency
      if (!currencyBreakdown[currency]) {
        currencyBreakdown[currency] = { claimed: 0, claimedUsd: 0, approved: 0, approvedUsd: 0 };
      }
      currencyBreakdown[currency].claimed += amount;
      currencyBreakdown[currency].claimedUsd += amountUsd;

      totalAmountClaimed += amount;
      totalAmountClaimedUsd += amountUsd;

      if (status === 'APPROVED') {
        const approvedAmount = exp.audit?.calculatedReimbursement ?? 0;
        const approvedAmountUsd = exp.audit?.calculatedReimbursementUsd ?? 0;
        totalAmountApproved += approvedAmount;
        totalAmountApprovedUsd += approvedAmountUsd;
        currencyBreakdown[currency].approved += approvedAmount;
        currencyBreakdown[currency].approvedUsd += approvedAmountUsd;
      } else if (status === 'FLAGGED' || status === 'DENIED') {
        if (status === 'DENIED') {
          deniedCount++;
          deniedAmountUsd += exp.audit?.calculatedReimbursementUsd ?? 0;
        }
      }

      // Pending review: expenses with PENDING_REVIEW or FAILED conversion status
      if (conversionStatus === 'PENDING_REVIEW' || conversionStatus === 'FAILED') {
        pendingReviewCount++;
        pendingReviewAmountUsd += amountUsd;
      }

      // Actually paid: from payouts with PAID status
      // This will be calculated from payouts below
    }

    // Calculate paid amounts from payouts
    for (const payout of allPayouts) {
      if (payout.status === 'PAID' && payout.paidAt) {
        totalAmountPaid += payout.totalReimbursement;
        totalAmountPaidUsd += payout.totalReimbursementUsd ?? 0;
      }
    }

    // Employee ratings table data
    const employeeRatings = employees.map(emp => {
      const empExpenses = emp.expenses;
      let totalClaimed = 0;
      let totalClaimedUsd = 0;
      let totalApproved = 0;
      let totalApprovedUsd = 0;
      let pendingReviewCount = 0;
      let deniedCount = 0;

      for (const exp of empExpenses) {
        const amount = exp.amount || 0;
        const amountUsd = exp.amountUsd ?? 0;
        const status = exp.audit?.status;
        const conversionStatus = exp.conversionStatus;

        totalClaimed += exp.amount || 0;
        totalClaimedUsd += exp.amountUsd ?? 0;

        if (exp.audit?.status === 'APPROVED') {
          totalApproved += exp.audit?.calculatedReimbursement ?? 0;
          totalApprovedUsd += exp.audit?.calculatedReimbursementUsd ?? 0;
        } else if (exp.audit?.status === 'DENIED') {
          deniedCount++;
        }

        if (exp.conversionStatus === 'PENDING_REVIEW' || exp.conversionStatus === 'FAILED') {
          pendingReviewCount++;
        }
      }

      // Calculate paid from payouts
      let totalPaid = 0;
      let totalPaidUsd = 0;
      for (const payout of emp.payouts) {
        if (payout.status === 'PAID' && payout.paidAt) {
          totalPaid += payout.totalReimbursement;
          totalPaidUsd += payout.totalReimbursementUsd ?? 0;
        }
      }

      return {
        id: emp.id,
        name: emp.name,
        department: emp.department,
        designation: emp.designation,
        rating: emp.rating,
        totalClaimed,
        totalClaimedUsd,
        totalApproved,
        totalApprovedUsd,
        totalPaid,
        totalPaidUsd,
        pendingReviewCount,
        deniedCount
      };
    });

    // Monthly financial trends for graph
    const monthlyTrends: Record<string, { claimed: number; claimedUsd: number; approved: number; approvedUsd: number; paid: number; paidUsd: number }> = {};

    // Process expenses for monthly trends
    for (const exp of allExpenses) {
      const date = new Date(exp.timestamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyTrends[key]) {
        monthlyTrends[key] = { claimed: 0, claimedUsd: 0, approved: 0, approvedUsd: 0, paid: 0, paidUsd: 0 };
      }
      monthlyTrends[key].claimed += exp.amount || 0;
      monthlyTrends[key].claimedUsd += exp.amountUsd ?? 0;
      if (exp.audit?.status === 'APPROVED') {
        monthlyTrends[key].approved += exp.audit?.calculatedReimbursement ?? 0;
        monthlyTrends[key].approvedUsd += exp.audit?.calculatedReimbursementUsd ?? 0;
      }
    }

    // Process payouts for monthly paid amounts
    for (const payout of allPayouts) {
      if (payout.status === 'PAID' && payout.paidAt) {
        const key = `${payout.year}-${String(payout.month).padStart(2, '0')}`;
        if (!monthlyTrends[key]) {
          monthlyTrends[key] = { claimed: 0, claimedUsd: 0, approved: 0, approvedUsd: 0, paid: 0, paidUsd: 0 };
        }
        monthlyTrends[key].paid += payout.totalReimbursement;
        monthlyTrends[key].paidUsd += payout.totalReimbursementUsd ?? 0;
      }
    }

    const monthlyTrendsArray = Object.entries(monthlyTrends)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    const fxMetadata = getConversionMetadata();

    return NextResponse.json({
      success: true,
      summary: {
        totalAmountClaimed,
        totalAmountClaimedUsd,
        totalAmountApproved,
        totalAmountApprovedUsd,
        totalAmountPaid,
        totalAmountPaidUsd,
        pendingReviewCount,
        pendingReviewAmountUsd,
        deniedCount,
        deniedAmountUsd,
        employeeCount: employees.length,
        currencyBreakdown,
        monthlyTrends: monthlyTrendsArray,
        fxMetadata
      },
      employees: employeeRatings
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error("Failed to fetch company summary:", error);
    const errorBody = process.env.NODE_ENV === 'production'
      ? { error: "Failed to fetch company summary." }
      : { error: "Failed to fetch company summary.", details: error instanceof Error ? error.message : String(error) };
    return NextResponse.json(errorBody, { status: 500 });
  }
}