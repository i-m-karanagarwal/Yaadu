import type {
  IntentType,
  ParsedBill,
  ParsedReminder,
  ParsedShopping,
  ParsedShoppingItem,
  Recurrence,
  ReminderKind,
  ShoppingCategory,
} from "./types";

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
const VALID_INTENTS: IntentType[] = ["bill", "shopping", "reminder"];
const VALID_SHOPPING_CATEGORIES: ShoppingCategory[] = [
  "ration",
  "fresh",
  "household",
  "other",
];
const VALID_REMINDER_KINDS: ReminderKind[] = ["birthday", "task", "event", "other"];

async function callNim(systemPrompt: string, userText: string): Promise<string> {
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
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `User input:\n${userText}` },
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

  return stripFences(text);
}

const CLASSIFY_PROMPT = `You classify Indian household voice/text commands into one intent.
User may write Hindi, English, or Hinglish.

Respond with ONLY JSON:
{ "intent": "bill" | "shopping" | "reminder" }

Rules:
- "bill" — recurring payments, utilities, rent, subscriptions, LPG booking, insurance premiums
- "shopping" — buy groceries, ration, milk, vegetables, household supplies, "lena hai", "khatam ho gaya", shopping lists
- "reminder" — birthdays, festivals, tasks, events, "yaad dila dena" for non-bill things, appointments, gift reminders
- If both bill and reminder, prefer "bill" when money/payment is central
- No markdown fences`;

const SHOPPING_PROMPT = `Extract shopping list items from Indian household grocery commands.
User may write Hindi, English, or Hinglish.

Respond with ONLY JSON:
{
  "items": [
    { "name": string, "category": "ration" | "fresh" | "household" | "other", "quantity": string | null }
  ],
  "listName": string | null
}

Categories:
- ration: atta, rice, dal, oil, sugar, salt, spices
- fresh: milk, vegetables, fruits, bread, eggs, doodh
- household: detergent, dishwash, cleaners, tissues, soap
- other: anything else

Rules:
- Split multiple items into separate entries
- quantity as spoken ("2 kg", "1 packet") or null
- listName only if a specific list is named; otherwise null
- No markdown fences`;

const REMINDER_PROMPT = `Extract reminder/event data from Indian household commands.
User may write Hindi, English, or Hinglish.

Respond with ONLY JSON:
{
  "kind": "birthday" | "task" | "event" | "other",
  "title": string,
  "person": string | null,
  "dueDate": string | null,
  "recurrence": "one-time" | "monthly" | "weekly" | "yearly" | null,
  "reminderDaysBefore": number | null,
  "assignedRole": string | null
}

Rules:
- title: short English summary
- person: named person if mentioned (Mummy, Papa, Karan)
- dueDate: YYYY-MM-DD when a date is clearly stated
- assignedRole: household role to remind (Papa, Mummy) if mentioned
- birthday → kind "birthday", recurrence "yearly", reminderDaysBefore 7 if not stated
- Default reminderDaysBefore to 2 for tasks, 7 for birthdays
- No markdown fences`;

export async function classifyIntent(rawText: string): Promise<IntentType> {
  const text = await callNim(CLASSIFY_PROMPT, rawText);
  const raw = JSON.parse(text) as { intent?: string };
  if (VALID_INTENTS.includes(raw.intent as IntentType)) {
    return raw.intent as IntentType;
  }
  return "bill";
}

export async function parseShoppingText(rawText: string): Promise<ParsedShopping> {
  const text = await callNim(SHOPPING_PROMPT, rawText);
  return normalizeShopping(JSON.parse(text));
}

export async function parseReminderText(rawText: string): Promise<ParsedReminder> {
  const text = await callNim(REMINDER_PROMPT, rawText);
  return normalizeReminder(JSON.parse(text));
}

export async function parseBillText(rawText: string): Promise<ParsedBill> {
  const text = await callNim(SYSTEM_PROMPT, rawText);
  return normalizeParsed(JSON.parse(text));
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

function normalizeShopping(raw: Record<string, unknown>): ParsedShopping {
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items: ParsedShoppingItem[] = itemsRaw
    .map((entry) => {
      const e = entry as Record<string, unknown>;
      const category = VALID_SHOPPING_CATEGORIES.includes(
        e.category as ShoppingCategory
      )
        ? (e.category as ShoppingCategory)
        : "other";
      return {
        name: String(e.name || "").trim(),
        category,
        quantity:
          typeof e.quantity === "string" && e.quantity.trim()
            ? e.quantity.trim()
            : null,
      };
    })
    .filter((i) => i.name.length > 0);

  if (items.length === 0) {
    items.push({ name: "Item", category: "other", quantity: null });
  }

  return {
    items,
    listName:
      typeof raw.listName === "string" && raw.listName.trim()
        ? raw.listName.trim()
        : null,
  };
}

function normalizeReminder(raw: Record<string, unknown>): ParsedReminder {
  const kind = VALID_REMINDER_KINDS.includes(raw.kind as ReminderKind)
    ? (raw.kind as ReminderKind)
    : "other";

  let recurrence: Recurrence | null = null;
  if (VALID_RECURRENCE.includes(raw.recurrence as Recurrence)) {
    recurrence = raw.recurrence as Recurrence;
  } else if (kind === "birthday") {
    recurrence = "yearly";
  }

  let dueDate: string | null = null;
  if (typeof raw.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dueDate)) {
    dueDate = raw.dueDate;
  }

  let reminderDaysBefore: number | null = null;
  if (
    typeof raw.reminderDaysBefore === "number" &&
    Number.isFinite(raw.reminderDaysBefore)
  ) {
    reminderDaysBefore = Math.max(0, Math.floor(raw.reminderDaysBefore));
  } else if (kind === "birthday") {
    reminderDaysBefore = 7;
  } else {
    reminderDaysBefore = 2;
  }

  const person =
    typeof raw.person === "string" && raw.person.trim() ? raw.person.trim() : null;
  const assignedRole =
    typeof raw.assignedRole === "string" && raw.assignedRole.trim()
      ? raw.assignedRole.trim()
      : null;

  const titleBase = String(raw.title || "").trim();
  const title =
    titleBase ||
    (kind === "birthday" && person ? `${person}'s birthday` : "Reminder");

  return {
    kind,
    title,
    person,
    dueDate,
    recurrence,
    reminderDaysBefore,
    assignedRole,
  };
}
