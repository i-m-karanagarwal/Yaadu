import type { ParsedBill, Recurrence } from "./types";

/**
 * NVIDIA NIM (hosted) — OpenAI-compatible Chat Completions.
 * Free developer tier: https://build.nvidia.com (API key: nvapi-...)
 * Base URL: https://integrate.api.nvidia.com/v1
 *
 * Good free defaults for Hinglish → JSON extraction:
 * - meta/llama-3.1-8b-instruct          (fast, low credit use)
 * - meta/llama-3.3-70b-instruct         (better Hinglish accuracy)
 * - nvidia/nvidia-nemotron-nano-9b-v2   (NVIDIA nano instruct)
 * - google/gemma-3-4b-it                (small / cheap)
 */
const NIM_BASE_URL =
  process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";

const DEFAULT_MODEL =
  process.env.NVIDIA_NIM_MODEL || "meta/llama-3.1-8b-instruct";

export const SYSTEM_PROMPT = `You extract structured bill reminder data from free-text input.
The user may write in Hindi (Devanagari), English, or Hinglish (Roman-script Hindi).

Respond with ONLY a single JSON object. No prose, no markdown fences, no explanation.

Schema:
{
  "item": string,              // short English name, e.g. "Electricity", "Internet", "LPG Cylinder", "Rent"
  "category": string,          // e.g. "Utilities", "Rent", "Subscription", "Insurance", "Other"
  "amount": number | null,     // INR amount if clearly stated; MUST be null if not mentioned — never guess
  "recurrence": "one-time" | "monthly" | "weekly" | "yearly",
  "dayOfMonth": number | null, // 1-31 when a day of month is mentioned (e.g. "10 tareekh" → 10)
  "dueDate": string | null     // "YYYY-MM-DD" only if a specific calendar date is clearly stated
}

Rules:
- If amount is approximate ("₹2000 ke aas paas"), still use that number.
- If no amount is mentioned, amount must be null.
- Default recurrence to "monthly" when the user implies a recurring household bill without saying so.
- "har mahine" / "every month" → monthly. "har hafte" → weekly. "saal mein ek baar" → yearly.
- Do not invent fields. Do not wrap the JSON in markdown.`;

const VALID_RECURRENCE: Recurrence[] = ["one-time", "monthly", "weekly", "yearly"];

export async function parseBillText(rawText: string): Promise<ParsedBill> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not set");
  }

  const model = DEFAULT_MODEL;
  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 512,
      // Some free NIM models reject response_format; prompt already requires raw JSON.
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `User input:\n${rawText}` },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `NVIDIA NIM error ${res.status}${detail ? `: ${detail.slice(0, 400)}` : ""}`
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("NVIDIA NIM returned an empty response");
  }

  return normalizeParsed(JSON.parse(stripFences(text)));
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function normalizeParsed(raw: Record<string, unknown>): ParsedBill {
  const recurrence = VALID_RECURRENCE.includes(raw.recurrence as Recurrence)
    ? (raw.recurrence as Recurrence)
    : "monthly";

  let amount: number | null = null;
  if (typeof raw.amount === "number" && Number.isFinite(raw.amount)) {
    amount = raw.amount;
  } else if (typeof raw.amount === "string" && raw.amount.trim() !== "") {
    const n = Number(String(raw.amount).replace(/[₹,\s]/g, ""));
    amount = Number.isFinite(n) ? n : null;
  }

  let dayOfMonth: number | null = null;
  if (typeof raw.dayOfMonth === "number" && raw.dayOfMonth >= 1 && raw.dayOfMonth <= 31) {
    dayOfMonth = Math.floor(raw.dayOfMonth);
  }

  let dueDate: string | null = null;
  if (typeof raw.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dueDate)) {
    dueDate = raw.dueDate;
  }

  return {
    item: String(raw.item || "Bill").trim() || "Bill",
    category: String(raw.category || "Other").trim() || "Other",
    amount,
    recurrence,
    dayOfMonth,
    dueDate,
  };
}
