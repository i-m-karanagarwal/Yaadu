import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBillsCollection } from "@/lib/db";
import type { BillDocument } from "@/lib/bill-document";
import {
  computeRolloverDueDate,
  statusForDueDate,
  todayISO,
} from "@/lib/recurrence";
import type { Recurrence } from "@/lib/types";

type RouteContext = { params: { id: string } };

function isValidId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json();
    const collection = await getBillsCollection();
    const _id = new ObjectId(params.id);
    const existing = await collection.findOne({ _id });

    if (!existing) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (body.action === "mark-paid") {
      const paidOn = todayISO();
      const historyEntry = {
        dueDate: existing.nextDueDate,
        paidOn,
        ...(existing.amount != null
          ? {
              amountPaid:
                typeof body.amountPaid === "number"
                  ? body.amountPaid
                  : existing.amount,
            }
          : {}),
      };

      const nextDue = computeRolloverDueDate(existing);
      const update: Partial<BillDocument> = {
        history: [...(existing.history || []), historyEntry],
      };

      if (nextDue == null) {
        update.status = "paid";
      } else {
        update.nextDueDate = nextDue;
        update.status = statusForDueDate(nextDue, paidOn);
      }

      await collection.updateOne({ _id }, { $set: update });
      const bill = await collection.findOne({ _id });
      return NextResponse.json({
        bill: bill ? { ...bill, _id: bill._id!.toString() } : null,
      });
    }

    const allowed = [
      "item",
      "category",
      "amount",
      "recurrence",
      "dayOfMonth",
      "nextDueDate",
      "reminderDaysBefore",
      "status",
    ] as const;

    const $set: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        $set[key] = body[key];
      }
    }

    if ($set.recurrence != null) {
      const r = $set.recurrence as Recurrence;
      if (!["one-time", "monthly", "weekly", "yearly"].includes(r)) {
        return NextResponse.json({ error: "Invalid recurrence" }, { status: 400 });
      }
    }

    if ($set.nextDueDate != null && typeof $set.nextDueDate === "string") {
      $set.status = statusForDueDate($set.nextDueDate, todayISO());
    }

    if (Object.keys($set).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await collection.updateOne({ _id }, { $set });
    const bill = await collection.findOne({ _id });
    return NextResponse.json({
      bill: bill ? { ...bill, _id: bill._id!.toString() } : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update bill";
    console.error("[/api/bills/:id PATCH]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const collection = await getBillsCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(params.id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete bill";
    console.error("[/api/bills/:id DELETE]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
