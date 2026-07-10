-- CreateTable
CREATE TABLE "MonthlyPayout" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalReimbursement" DOUBLE PRECISION NOT NULL,
    "expenseCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "MonthlyPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPayout_employeeId_year_month_key" ON "MonthlyPayout"("employeeId", "year", "month");

-- AddForeignKey
ALTER TABLE "MonthlyPayout" ADD CONSTRAINT "MonthlyPayout_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
