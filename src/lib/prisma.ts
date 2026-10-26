import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set');
}

// Prevent multiple PrismaClient instances during Next.js dev hot-reload
const globalForPrisma = global as unknown as { prisma?: PrismaClient; adapter?: PrismaPg };

const adapter = globalForPrisma.adapter ?? new PrismaPg({ connectionString: databaseUrl });
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.adapter = adapter;
  globalForPrisma.prisma = prisma;
}

export { prisma };