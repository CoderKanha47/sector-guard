/*
  Warnings:

  - Added the required column `categoryBreakdown` to the `MonthlyPayout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalClaimed` to the `MonthlyPayout` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MonthlyPayout" ADD COLUMN     "categoryBreakdown" JSONB NOT NULL,
ADD COLUMN     "totalClaimed" DOUBLE PRECISION NOT NULL;
