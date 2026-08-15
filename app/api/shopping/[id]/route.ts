import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getShoppingItemsCollection } from "@/lib/db";
import { getHouseholdContext } from "@/lib/household";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const ctx = await getHouseholdContext();
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.done === "boolean") updates.done = body.done;
    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates" }, { status: 400 });
    }

    const itemsCol = await getShoppingItemsCollection();
    const result = await itemsCol.updateOne(
      { _id: new ObjectId(params.id), householdId: ctx.householdId },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update item";
    console.error("[/api/shopping PATCH]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const ctx = await getHouseholdContext();
    const itemsCol = await getShoppingItemsCollection();
    const result = await itemsCol.deleteOne({
      _id: new ObjectId(params.id),
      householdId: ctx.householdId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete item";
    console.error("[/api/shopping DELETE]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
