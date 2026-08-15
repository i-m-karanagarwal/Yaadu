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
