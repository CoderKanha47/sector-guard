import { NextResponse } from 'next/server';
import { closeMonthlyPayout } from '@/lib/engine/payoutEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, year, month } = body;

    if (!employeeId || !year || !month) {
      return NextResponse.json(
        { error: "employeeId, year, and month are all required." },
        { status: 400 }
      );
    }

    const payout = await closeMonthlyPayout(employeeId, Number(year), Number(month));

    return NextResponse.json({ success: true, payout });
  } catch (error: any) {
    console.error("Failed to close monthly payout:", error);
    return NextResponse.json(
      { error: "Failed to close monthly payout.", details: error.message },
      { status: 500 }
    );
  }
}