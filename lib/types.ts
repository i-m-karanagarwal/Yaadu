export type Recurrence = "one-time" | "monthly" | "weekly" | "yearly";
export type BillStatus = "upcoming" | "paid" | "overdue";

export interface BillHistoryEntry {
  dueDate: string;
  paidOn?: string;
  amountPaid?: number;
}

export interface Bill {
  _id?: string;
  rawText: string;
  item: string;
  category: string;
  amount: number | null;
  currency: "INR";
  recurrence: Recurrence;
  dayOfMonth?: number;
  nextDueDate: string;
  reminderDaysBefore: number;
  status: BillStatus;
  history: BillHistoryEntry[];
  createdAt: string;
}

/** Structured fields returned by Gemini before the user confirms. */
export interface ParsedBill {
  item: string;
  category: string;
  amount: number | null;
  recurrence: Recurrence;
  dayOfMonth: number | null;
  /** ISO date (YYYY-MM-DD) when the user named a specific date. */
  dueDate: string | null;
}

export interface ConfirmBillInput extends ParsedBill {
  rawText: string;
  reminderDaysBefore?: number;
}

/** Household V1 — intent router */
export type IntentType = "bill" | "shopping" | "reminder";

export type ShoppingCategory = "ration" | "fresh" | "household" | "other";

export interface ParsedShoppingItem {
  name: string;
  category: ShoppingCategory;
  quantity: string | null;
}

export interface ParsedShopping {
  items: ParsedShoppingItem[];
  listName: string | null;
}

export type ReminderKind = "birthday" | "task" | "event" | "other";

export interface ParsedReminder {
  kind: ReminderKind;
  title: string;
  person: string | null;
  dueDate: string | null;
  recurrence: Recurrence | null;
  reminderDaysBefore: number | null;
  assignedRole: string | null;
}

export interface IntentResult {
  intent: IntentType;
  rawText: string;
  parsed: ParsedBill | ParsedShopping | ParsedReminder;
}

export interface Household {
  _id: string;
  name: string;
}

export interface Member {
  _id: string;
  name: string;
  roleLabel: string;
  isOwner: boolean;
}

export interface ShoppingItem {
  _id: string;
  listId: string;
  name: string;
  category: ShoppingCategory;
  quantity: string | null;
  done: boolean;
  rawText: string;
  createdAt: string;
}

export interface Reminder {
  _id: string;
  kind: ReminderKind;
  title: string;
  person: string | null;
  assignedRole: string | null;
  dueDate: string;
  recurrence: Recurrence | null;
  reminderDaysBefore: number;
  status: "active" | "done" | "snoozed";
  rawText: string;
  createdAt: string;
}
