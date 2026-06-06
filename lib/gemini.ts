const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export type AnalyzedWarranty = {
  productName: string;
  companyName: string;
  companyPhone: string;
  serialNumber: string;
  purchaseDate: string | null;
  expiryDate: string | null;
};

export function geminiConfigured(): boolean {
  return Boolean(API_KEY);
}

const SYSTEM_PROMPT = `You analyse a photograph of a product warranty card and return structured fields.

Return these fields. Use an empty string (or 0 for warrantyMonths) when the value is not present.
- productName: product model or SKU exactly as printed (e.g. "HOOD MOJITO IN HC SC FL BK 60"). Never the brand. Never warranty boilerplate.
- companyName: brand / manufacturer (e.g. "Faber", "Samsung"). Never generic headings like "WARRANTY CARD" or "CUSTOMER'S COPY".
- companyPhone: customer-care / helpline phone in its original format. Prefer toll-free numbers.
- serialNumber: unit serial (alphanumeric, usually near "Serial No", "S/N", "IMEI"). Exclude obvious model / SKU codes.
- purchaseDate: ISO yyyy-mm-dd ONLY if an explicit purchase / invoice / billed date is filled in. Empty string if blank.
- expiryDate: ISO yyyy-mm-dd ONLY if an explicit "valid until" / "expires" date is printed. Empty string otherwise — never compute from a duration here.
- warrantyMonths: total warranty duration in MONTHS as an integer.
  Examples: "2 years" -> 24, "1 year" -> 12, "6 months" -> 6, "2 Years on product and 12 years on motor" -> 24 (use the main product warranty, not the motor / battery sub-warranty).
  If no duration is mentioned, return 0.

Output only the JSON object. No prose, no markdown.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    productName: { type: "string" },
    companyName: { type: "string" },
    companyPhone: { type: "string" },
    serialNumber: { type: "string" },
    purchaseDate: { type: "string" },
    expiryDate: { type: "string" },
    warrantyMonths: { type: "integer" },
  },
  required: [
    "productName",
    "companyName",
    "companyPhone",
    "serialNumber",
    "purchaseDate",
    "expiryDate",
    "warrantyMonths",
  ],
};

function addMonthsISO(fromISO: string, months: number): string {
  const [y, m, d] = fromISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setMonth(date.getMonth() + months);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function analyzeImageWithGemini(
  imageBase64: string,
  mimeType: string
): Promise<AnalyzedWarranty | null> {
  if (!API_KEY) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [{ inline_data: { mime_type: mimeType, data: imageBase64 } }],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    console.error("Gemini fetch failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    console.error("Gemini error:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const payload = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return null;

  let parsed: {
    productName?: string;
    companyName?: string;
    companyPhone?: string;
    serialNumber?: string;
    purchaseDate?: string;
    expiryDate?: string;
    warrantyMonths?: number;
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("Gemini returned non-JSON:", raw.slice(0, 200));
    return null;
  }

  const purchaseDate = parsed.purchaseDate || null;
  let expiryDate = parsed.expiryDate || null;
  const months = parsed.warrantyMonths || 0;

  if (!expiryDate && months > 0) {
    const start = purchaseDate || todayISO();
    expiryDate = addMonthsISO(start, months);
  }

  return {
    productName: parsed.productName || "",
    companyName: parsed.companyName || "",
    companyPhone: parsed.companyPhone || "",
    serialNumber: parsed.serialNumber || "",
    purchaseDate,
    expiryDate,
  };
}
