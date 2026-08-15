import { NextResponse } from "next/server";
import { getRemindersCollection } from "@/lib/db";
import { getHouseholdContext } from "@/lib/household";
import type { ReminderDocument } from "@/lib/reminder-document";
import { todayISO } from "@/lib/recurrence";
import type { ParsedReminder, Recurrence, ReminderKind } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const ctx = await getHouseholdContext();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const remindersCol = await getRemindersCollection();
    const filter: Record<string, unknown> = { householdId: ctx.householdId };
    if (status) filter.status = status;

    const reminders = await remindersCol
      .find(filter)
      .sort({ dueDate: 1 })
      .toArray();

    return NextResponse.json({
      reminders: reminders.map((r) => ({
        ...r,
        _id: r._id!.toString(),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list reminders";
    console.error("[/api/reminders GET]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getHouseholdContext();
    const body = (await request.json()) as ParsedReminder & { rawText?: string };

    const rawText = typeof body.rawText === "string" ? body.rawText : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const dueDate =
      typeof body.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)
        ? body.dueDate
        : todayISO();

    const kind = normalizeKind(body.kind);
    const recurrence = normalizeRecurrence(body.recurrence, kind);
    const reminderDaysBefore =
      typeof body.reminderDaysBefore === "number" && body.reminderDaysBefore >= 0
        ? Math.floor(body.reminderDaysBefore)
        : kind === "birthday"
          ? 7
          : 2;

    const doc: ReminderDocument = {
      householdId: ctx.householdId,
      kind,
      title,
      person:
        typeof body.person === "string" && body.person.trim()
          ? body.person.trim()
          : null,
      assignedRole:
        typeof body.assignedRole === "string" && body.assignedRole.trim()
          ? body.assignedRole.trim()
          : null,
      dueDate,
      recurrence,
      reminderDaysBefore,
      status: "active",
      rawText,
      createdAt: new Date().toISOString(),
    };

    const remindersCol = await getRemindersCollection();
    const result = await remindersCol.insertOne(doc);

    return NextResponse.json(
      { reminder: { ...doc, _id: result.insertedId.toString() } },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save reminder";
    console.error("[/api/reminders POST]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function normalizeKind(value: unknown): ReminderKind {
  const kinds: ReminderKind[] = ["birthday", "task", "event", "other"];
  return kinds.includes(value as ReminderKind) ? (value as ReminderKind) : "other";
}

function normalizeRecurrence(
  value: unknown,
  kind: ReminderKind
): Recurrence | null {
  const recurrences: Recurrence[] = ["one-time", "monthly", "weekly", "yearly"];
  if (recurrences.includes(value as Recurrence)) {
    return value as Recurrence;
  }
  if (kind === "birthday") return "yearly";
  return null;
}
