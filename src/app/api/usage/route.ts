import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { DAILY_LIMIT } from '@/lib/rateLimiter';

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const today = getTodayKey();
  const usage = await prisma.apiUsage.findUnique({ where: { date: today } });

  return NextResponse.json({
    success: true,
    used: usage?.count || 0,
    limit: DAILY_LIMIT,
    resetsAt: 'Midnight (server time)'
  });
}