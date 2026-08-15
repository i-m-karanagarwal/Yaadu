import type { ObjectId } from "mongodb";
import type { BillHistoryEntry, BillStatus, Recurrence } from "./types";

/** Document shape stored in MongoDB `bills` collection. */
export interface BillDocument {
  _id?: ObjectId;
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
