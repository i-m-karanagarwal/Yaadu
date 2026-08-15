import {
  parseBillText,
  parseReminderText,
  parseShoppingText,
  classifyIntent,
} from "./nim";
import type { IntentResult } from "./types";

export async function routeIntent(rawText: string): Promise<IntentResult> {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error("text is required");
  }

  const intent = await classifyIntent(trimmed);

  if (intent === "shopping") {
    const parsed = await parseShoppingText(trimmed);
    return { intent: "shopping", rawText: trimmed, parsed };
  }

  if (intent === "reminder") {
    const parsed = await parseReminderText(trimmed);
    return { intent: "reminder", rawText: trimmed, parsed };
  }

  const parsed = await parseBillText(trimmed);
  return { intent: "bill", rawText: trimmed, parsed };
}
