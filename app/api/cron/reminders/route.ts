import { NextResponse } from "next/server";
import { getBillsCollection } from "@/lib/db";
import {
  isWithinReminderWindow,
  statusForDueDate,
  todayISO,
} from "@/lib/recurrence";
import { sendReminderEmail } from "@/lib/resend";
import type { Bill } from "@/lib/types";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = todayISO();
    const collection = await getBillsCollection();

    const active = await collection
      .find({ status: { $in: ["upcoming", "overdue"] } })
      .toArray();

    let markedOverdue = 0;
    for (const bill of active) {
      const nextStatus = statusForDueDate(bill.nextDueDate, today);
      if (nextStatus === "overdue" && bill.status !== "overdue") {
        await collection.updateOne(
          { _id: bill._id },
          { $set: { status: "overdue" } }
        );
        markedOverdue += 1;
        bill.status = "overdue";
      }
    }

    const dueForReminder = active.filter(
      (b) =>
        b.status !== "paid" &&
        isWithinReminderWindow(b.nextDueDate, b.reminderDaysBefore ?? 2, today)
    );

    let emailId: string | undefined;
    if (dueForReminder.length > 0) {
      const asBills: Bill[] = dueForReminder.map((b) => ({
        ...b,
        _id: b._id?.toString(),
      }));
      const result = await sendReminderEmail(asBills);
      emailId = result.id;
    }

    return NextResponse.json({
      ok: true,
      today,
      checked: active.length,
      markedOverdue,
      reminded: dueForReminder.length,
      emailId: emailId ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed";
    console.error("[/api/cron/reminders]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
