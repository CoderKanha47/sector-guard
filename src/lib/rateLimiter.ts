import { prisma } from '@/lib/prisma';

export const DAILY_LIMIT = 27;
export const WARNING_THRESHOLD = 25;

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export interface RateLimitCheck {
  allowed: boolean;
  currentCount: number;
  warning: boolean;
}

export async function checkAndIncrementUsage(): Promise<RateLimitCheck> {
  const today = getTodayKey();

  const usage = await prisma.apiUsage.upsert({
    where: { date: today },
    update: { count: { increment: 1 } },
    create: { date: today, count: 1 }
  });

  const currentCount = usage.count;
  return {
    allowed: currentCount <= DAILY_LIMIT,
    currentCount,
    warning: currentCount >= WARNING_THRESHOLD && currentCount <= DAILY_LIMIT
  };
}