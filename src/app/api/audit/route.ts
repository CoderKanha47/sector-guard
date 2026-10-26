import { NextResponse } from 'next/server';
import { type Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { executeFraudAudit } from '@/lib/engine/fraudCore';
import { getSession } from '@/lib/auth';
import { checkAndIncrementUsage, DAILY_LIMIT } from '@/lib/rateLimiter';
import { parseAndValidateReceipt, ReceiptValidationError } from '@/lib/ai/validateReceipt';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (session.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only the admin can process receipts. Please submit receipts to your administrator.' },
      { status: 403 }
    );
  }

  const usage = await checkAndIncrementUsage();
  if (!usage.allowed) {
    return NextResponse.json(
      { error: `Daily AI processing limit reached (${usage.currentCount}/${DAILY_LIMIT}). Please try again tomorrow.` },
      { status: 429 }
    );
  }

  let formData: FormData;
  let file: File | null;
  let submittedEmployeeId: string | null;
  try {
    formData = await request.formData();
    file = formData.get('file') as File | null;
    submittedEmployeeId = formData.get('employeeId') as string | null;
  } catch {
    return NextResponse.json({ error: 'Malformed multipart request.' }, { status: 400 });
  }

  if (!submittedEmployeeId) {
    return NextResponse.json({ error: 'employeeId is required for submissions.' }, { status: 400 });
  }
  const employeeId = submittedEmployeeId;

  const targetEmployee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true }
  });
  if (!targetEmployee) {
    return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
  }

  if (!file) {
    return NextResponse.json({ error: 'Missing required file attachment.' }, { status: 400 });
  }

  const mimeType = file.type || 'image/jpeg';
  if (!/^image\//.test(mimeType)) {
    return NextResponse.json({ error: 'Only image uploads are supported.' }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: 'Uploaded file is empty.' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Uploaded file exceeds the 10MB limit.' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    const parsedReceiptData = await parseAndValidateReceipt(buffer, mimeType);

    const result = await prisma.$transaction(async (tx) => {
      const savedExpense = await tx.expense.create({
        data: {
          employeeId,
          merchant: parsedReceiptData.merchant,
          amount: parsedReceiptData.amount,
          currency: parsedReceiptData.currency,
          timestamp: parsedReceiptData.dateTime,
          category: parsedReceiptData.category,
          lineItems: parsedReceiptData.lineItems as unknown as Prisma.InputJsonValue
        }
      });

      const auditMetrics = await executeFraudAudit(tx, employeeId, parsedReceiptData, savedExpense.id);

      const finalAuditRecord = await tx.audit.create({
        data: {
          expenseId: savedExpense.id,
          calculatedReimbursement: auditMetrics.calculatedReimbursement,
          riskScore: auditMetrics.riskScore,
          status: auditMetrics.status,
          anomalies: {
            create: auditMetrics.anomalies
          }
        },
        include: {
          anomalies: true
        }
      });

      return { savedExpense, auditMetrics, finalAuditRecord };
    });

    return NextResponse.json({
      success: true,
      expense: result.savedExpense,
      audit: result.finalAuditRecord,
      newRating: result.auditMetrics.newRating
    });
  } catch (error) {
    if (error instanceof ReceiptValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("Sector Guard Pipeline execution failure:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      process.env.NODE_ENV === 'production'
        ? { error: 'Internal processing crash inside Sector Guard pipeline.' }
        : { error: 'Internal processing crash inside Sector Guard pipeline.', details: message },
      { status: 500 }
    );
  }
}