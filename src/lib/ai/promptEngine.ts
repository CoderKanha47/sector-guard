import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const RECEIPT_CATEGORIES = ['food', 'transport', 'lodging', 'entertainment', 'software', 'utilities', 'miscellaneous'] as const;

export const SECTOR_GUARD_SYSTEM_PROMPT = `
You are the primary text extraction engine for Sector Guard, an enterprise expense auditing platform.
Your task is to analyze the provided receipt, invoice, or ticket image and extract specific data points into raw, valid JSON.

CRITICAL RULES:
1. Return ONLY a valid JSON object. Do NOT wrap the JSON in markdown blocks (like \`\`\`json), do not include trailing explanations, and do not include introductions.
2. If a specific field cannot be found or deduced from the document, set its value to null.
3. Normalize all amounts to numeric floats.
4. Ensure the date field conforms strictly to standard format (YYYY-MM-DD) or (YYYY-MM-DDTHH:mm:ss) if time is available.
5. Keep the response compact: use short line-item descriptions, omit optional fields with no value, and never repeat the document's header/footer text.

You must extract the data to match this exact schema:
{
  "merchant": "Name of the vendor/store",
  "dateTime": "ISO timestamp or YYYY-MM-DD",
  "amount": 0.00,
  "currency": "3-letter ISO code (e.g., USD, INR, JPY)",
  "category": "One of: ${RECEIPT_CATEGORIES.join(', ')}",
  "lineItems": [
    {
      "description": "Item or service description",
      "quantity": 1,
      "price": 0.00
    }
  ]
}
`;

export async function parseDocumentWithGroq(imageBuffer: Buffer, mimeType: string = 'image/jpeg') {
  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [
        {
          role: 'system',
          content: SECTOR_GUARD_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this document image and return the data as specified.' },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.0,
      max_completion_tokens: 900
    });

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent) {
      throw new Error("Groq returned an empty response during document parsing.");
    }

    const cleanJson = JSON.parse(rawContent.trim());
    return cleanJson;

  } catch (error) {
    console.error("Sector Guard AI Engine parsing error:", error);
    throw error;
  }
}