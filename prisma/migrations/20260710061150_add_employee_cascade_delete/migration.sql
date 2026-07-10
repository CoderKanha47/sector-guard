-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "MonthlyPayout" DROP CONSTRAINT "MonthlyPayout_employeeId_fkey";

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPayout" ADD CONSTRAINT "MonthlyPayout_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
