import { NextResponse } from "next/server";
import { getBillsCollection } from "@/lib/db";
import { getHouseholdContext } from "@/lib/household";
import type { BillDocument } from "@/lib/bill-document";
import {
  computeInitialDueDate,
  statusForDueDate,
  todayISO,
} from "@/lib/recurrence";
import type { ConfirmBillInput, Recurrence } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const ctx = await getHouseholdContext();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const collection = await getBillsCollection();
    const filter: Record<string, unknown> = {
      $or: [
        { householdId: ctx.householdId },
        { householdId: { $exists: false } },
      ],
    };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const bills = await collection
      .find(filter)
      .sort({ nextDueDate: 1 })
      .toArray();

    const serialized = bills.map((b) => ({
      ...b,
      _id: b._id!.toString(),
    }));

    return NextResponse.json({ bills: serialized });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list bills";
    console.error("[/api/bills GET]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getHouseholdContext();
    const body = (await request.json()) as ConfirmBillInput;
    if (!body?.item || !body?.rawText) {
      return NextResponse.json(
        { error: "item and rawText are required" },
        { status: 400 }
      );
    }

    const recurrence = (body.recurrence || "monthly") as Recurrence;
    const nextDueDate = computeInitialDueDate({
      item: body.item,
      category: body.category || "Other",
      amount: body.amount ?? null,
      recurrence,
      dayOfMonth: body.dayOfMonth ?? null,
      dueDate: body.dueDate ?? null,
    });

    const bill: BillDocument = {
      householdId: ctx.householdId,
      rawText: body.rawText,
      item: body.item.trim(),
      category: (body.category || "Other").trim(),
      amount: body.amount ?? null,
      currency: "INR",
      recurrence,
      ...(body.dayOfMonth != null ? { dayOfMonth: body.dayOfMonth } : {}),
      nextDueDate,
      reminderDaysBefore: body.reminderDaysBefore ?? 2,
      status: statusForDueDate(nextDueDate, todayISO()),
      history: [],
      createdAt: new Date().toISOString(),
    };

    const collection = await getBillsCollection();
    const result = await collection.insertOne(bill);

    return NextResponse.json(
      { bill: { ...bill, _id: result.insertedId.toString() } },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save bill";
    console.error("[/api/bills POST]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
