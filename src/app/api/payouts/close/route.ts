import { NextResponse } from 'next/server';
import { closeMonthlyPayout } from '@/lib/engine/payoutEngine';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }
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