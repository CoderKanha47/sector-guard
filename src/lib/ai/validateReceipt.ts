import { z } from 'zod';
import { parseDocumentWithGroq, RECEIPT_CATEGORIES } from './promptEngine';
import type { ReceiptData, ReceiptLineItem } from '@/lib/engine/fraudRules';

export class ReceiptValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReceiptValidationError';
  }
}

const lineItemSchema = z.object({
  description: z.string().nullish(),
  quantity: z.coerce.number().finite().nonnegative().nullish(),
  price: z.coerce.number().finite().nonnegative().nullish()
});

const receiptDataSchema = z.object({
  merchant: z.string().nullish(),
  dateTime: z.string().nullish(),
  amount: z.coerce.number().finite().nonnegative().nullish(),
  currency: z.string().nullish(),
  category: z.string().nullish(),
  lineItems: z.array(lineItemSchema).nullish()
}).superRefine((data, ctx) => {
  if (!data.merchant || !data.merchant.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['merchant'], message: 'merchant is required' });
  }
  const ts = data.dateTime ? new Date(data.dateTime) : null;
  if (data.dateTime === null || data.dateTime === undefined || ts === null || isNaN(ts.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dateTime'], message: 'dateTime must be a valid date string' });
  }
  if (data.amount === null || data.amount === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amount'], message: 'amount is required' });
  }
});

function normalizeCategory(raw: unknown): string {
  const value = String(raw ?? '').trim().toLowerCase();
  return (RECEIPT_CATEGORIES as readonly string[]).includes(value) ? value : 'miscellaneous';
}

function describeValidationError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map(issue => `${issue.path.join('.') || 'payload'}: ${issue.message}`).join('; ');
  }
  return error instanceof Error ? error.message : String(error);
}

export async function parseAndValidateReceipt(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg',
  attempts: number = 2
): Promise<ReceiptData> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const raw = await parseDocumentWithGroq(imageBuffer, mimeType);
      const validated = receiptDataSchema.parse(raw);
      return {
        merchant: String(validated.merchant).trim(),
        dateTime: new Date(validated.dateTime as string),
        amount: Number(validated.amount),
        currency: String(validated.currency || 'INR').toUpperCase(),
        category: normalizeCategory(validated.category),
        lineItems: (validated.lineItems || []) as ReceiptLineItem[]
      };
    } catch (error) {
      lastError = error;
      console.error(`Sector Guard receipt validation attempt ${attempt}/${attempts} failed.`, error);
    }
  }
  if ((lastError as { status?: number } | undefined)?.status === 429) {
    throw new ReceiptValidationError(
      'AI engine rate limit reached (429): output token quota for this minute is exhausted. Wait about a minute and retry, or raise your Groq tier limit.'
    );
  }
  throw new ReceiptValidationError(
    `Receipt could not be parsed as valid expense data: ${describeValidationError(lastError)}`
  );
}