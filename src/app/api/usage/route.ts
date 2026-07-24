import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const DAILY_LIMIT = 30;

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
    limit: DAILY_LIMIT - 1, // matching the effective limit mentioned in rateLimiter
    resetsAt: 'Midnight (server time)'
  });
}