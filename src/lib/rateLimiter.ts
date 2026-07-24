import { prisma } from '@/lib/prisma';

const DAILY_LIMIT = 30;
const WARNING_THRESHOLD = 25;

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
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
    update: {},
    create: { date: today, count: 0 }
  });

  if (usage.count >= DAILY_LIMIT - 1) {
    return { allowed: false, currentCount: usage.count, warning: true };
  }

  const updated = await prisma.apiUsage.update({
    where: { date: today },
    data: { count: { increment: 1 } }
  });

  return {
    allowed: true,
    currentCount: updated.count,
    warning: updated.count >= WARNING_THRESHOLD
  };
}