import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDocumentWithGroq } from '@/lib/ai/promptEngine';
import { executeFraudAudit } from '@/lib/engine/fraudCore';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const employeeId = formData.get('employeeId') as string;

    if (!file || !employeeId) {
      return NextResponse.json(
        { error: "Missing required file attachment or employee footprint credentials." },
        { status: 400 }
      );
    }

    // Convert file object to accessible Buffer for the vision model
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'image/jpeg';

    // Pipeline Execution Step A: Run through Groq-hosted Vision LLM
    const parsedReceiptData = await parseDocumentWithGroq(buffer, mimeType);

    // Pipeline Execution Step B: Commit raw transaction record to database
    const savedExpense = await prisma.expense.create({
      data: {
        employeeId: String(employeeId),
        merchant: parsedReceiptData.merchant,
        amount: parsedReceiptData.amount,
        currency: parsedReceiptData.currency || "INR",
        timestamp: new Date(parsedReceiptData.dateTime),
        category: parsedReceiptData.category || "miscellaneous",
        lineItems: parsedReceiptData.lineItems || []
      }
    });

    // Pipeline Execution Step C: Pass record to behavioral evaluation framework
    const auditMetrics = await executeFraudAudit(String(employeeId), parsedReceiptData, savedExpense.id);

    // Pipeline Execution Step D: Save audit findings and individual anomaly indicators
    const finalAuditRecord = await prisma.audit.create({
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

    // Return the aggregated analysis directly to update our Glassmorphic view UI
    return NextResponse.json({
      success: true,
      expense: savedExpense,
      audit: finalAuditRecord
    });

  } catch (error: any) {
    console.error("Sector Guard Pipeline execution failure:", error);
    return NextResponse.json(
      { error: "Internal processing crash inside Sector Guard pipeline.", details: error.message },
      { status: 500 }
    );
  }
}
