import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:sectorguard2026@db:5432/sector_guard_db?schema=public";

// Prevent multiple PrismaClient instances during Next.js dev hot-reload
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: databaseUrl });

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}