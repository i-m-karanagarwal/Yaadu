import { NextResponse } from "next/server";
import {
  getShoppingItemsCollection,
  getShoppingListsCollection,
} from "@/lib/db";
import { getHouseholdContext } from "@/lib/household";
import type { ShoppingItemDocument } from "@/lib/shopping-document";
import type { ParsedShoppingItem, ShoppingCategory } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const ctx = await getHouseholdContext();
    const { searchParams } = new URL(request.url);
    const includeDone = searchParams.get("includeDone") === "1";

    const itemsCol = await getShoppingItemsCollection();
    const filter: Record<string, unknown> = { householdId: ctx.householdId };
    if (!includeDone) filter.done = false;

    const items = await itemsCol
      .find(filter)
      .sort({ done: 1, createdAt: -1 })
      .toArray();

    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        _id: item._id!.toString(),
        listId: item.listId.toString(),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list items";
    console.error("[/api/shopping GET]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getHouseholdContext();
    const body = await request.json();
    const rawText = typeof body.rawText === "string" ? body.rawText : "";
    const items = Array.isArray(body.items) ? body.items : null;

    if (!items?.length) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    const listsCol = await getShoppingListsCollection();
    let list = await listsCol.findOne({
      householdId: ctx.householdId,
      isDefault: true,
    });

    const listName =
      typeof body.listName === "string" && body.listName.trim()
        ? body.listName.trim()
        : null;

    if (listName) {
      list = await listsCol.findOne({
        householdId: ctx.householdId,
        name: listName,
      });
      if (!list) {
        const now = new Date().toISOString();
        const result = await listsCol.insertOne({
          householdId: ctx.householdId,
          name: listName,
          isDefault: false,
          createdAt: now,
        });
        list = {
          _id: result.insertedId,
          householdId: ctx.householdId,
          name: listName,
          isDefault: false,
          createdAt: now,
        };
      }
    }

    if (!list) {
      return NextResponse.json({ error: "No shopping list found" }, { status: 500 });
    }

    const now = new Date().toISOString();
    const docs: ShoppingItemDocument[] = items.map((entry: ParsedShoppingItem) => ({
      householdId: ctx.householdId,
      listId: list!._id!,
      name: String(entry.name || "").trim() || "Item",
      category: normalizeCategory(entry.category),
      quantity: entry.quantity ?? null,
      done: false,
      rawText,
      createdAt: now,
    }));

    const itemsCol = await getShoppingItemsCollection();
    const result = await itemsCol.insertMany(docs);

    const inserted = docs.map((doc, i) => ({
      ...doc,
      _id: result.insertedIds[i].toString(),
      listId: doc.listId.toString(),
    }));

    return NextResponse.json({ items: inserted }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save items";
    console.error("[/api/shopping POST]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function normalizeCategory(value: unknown): ShoppingCategory {
  const cats: ShoppingCategory[] = ["ration", "fresh", "household", "other"];
  return cats.includes(value as ShoppingCategory) ? (value as ShoppingCategory) : "other";
}
