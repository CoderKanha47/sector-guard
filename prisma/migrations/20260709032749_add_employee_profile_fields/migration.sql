-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "address" TEXT NOT NULL DEFAULT 'Not Provided',
ADD COLUMN     "designation" TEXT NOT NULL DEFAULT 'Not Specified',
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 100;
