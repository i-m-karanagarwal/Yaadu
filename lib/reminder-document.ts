import type { ObjectId } from "mongodb";
import type { ReminderKind, Recurrence } from "./types";

export type ReminderStatus = "active" | "done" | "snoozed";

export interface ReminderDocument {
  _id?: ObjectId;
  householdId: ObjectId;
  kind: ReminderKind;
  title: string;
  person: string | null;
  assignedRole: string | null;
  dueDate: string;
  recurrence: Recurrence | null;
  reminderDaysBefore: number;
  status: ReminderStatus;
  rawText: string;
  createdAt: string;
}
