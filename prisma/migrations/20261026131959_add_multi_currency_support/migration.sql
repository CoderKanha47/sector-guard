-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "calculatedReimbursementUsd" DOUBLE PRECISION,
ADD COLUMN     "policyLimitUsd" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "tierLimitCurrency" TEXT NOT NULL DEFAULT 'INR';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "amountUsd" DOUBLE PRECISION,
ADD COLUMN     "conversionStatus" TEXT NOT NULL DEFAULT 'NOT_NEEDED',
ADD COLUMN     "fxProvider" TEXT,
ADD COLUMN     "fxRate" DOUBLE PRECISION,
ADD COLUMN     "fxRateDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MonthlyPayout" ADD COLUMN     "categoryBreakdownUsd" JSONB,
ADD COLUMN     "totalClaimedUsd" DOUBLE PRECISION,
ADD COLUMN     "totalReimbursementUsd" DOUBLE PRECISION;
