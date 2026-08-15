"use client";

import { FormEvent, useState } from "react";
import type {
  ParsedShopping,
  ParsedShoppingItem,
  ShoppingCategory,
} from "@/lib/types";

type Props = {
  rawText: string;
  initial: ParsedShopping;
  onCancel: () => void;
  onSaved: () => void;
};

const CATEGORIES: ShoppingCategory[] = ["ration", "fresh", "household", "other"];

export default function ConfirmShoppingItems({
  rawText,
  initial,
  onCancel,
  onSaved,
}: Props) {
  const [items, setItems] = useState<ParsedShoppingItem[]>(initial.items);
  const [listName, setListName] = useState(initial.listName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateItem(index: number, patch: Partial<ParsedShoppingItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      setError("Add at least one item");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          items,
          listName: listName.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      onSaved();
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
        Shopping list
      </p>
      <p className="mt-1 text-sm text-stone-600">
        Confirm items before adding to your shared list.
      </p>

      <label className="mt-4 block text-xs font-medium text-stone-600">
        List name (optional)
        <input
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          placeholder="Groceries"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </label>

      <ul className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li
            key={index}
            className="rounded-xl border border-stone-200 bg-white p-3 space-y-2"
          >
            <div className="flex gap-2">
              <input
                value={item.name}
                onChange={(e) => updateItem(index, { name: e.target.value })}
                className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                aria-label="Item name"
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-xs text-stone-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={item.category}
                onChange={(e) =>
                  updateItem(index, { category: e.target.value as ShoppingCategory })
                }
                className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs"
                aria-label="Category"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                value={item.quantity ?? ""}
                onChange={(e) =>
                  updateItem(index, {
                    quantity: e.target.value.trim() || null,
                  })
                }
                placeholder="Qty"
                className="w-24 rounded-lg border border-stone-300 px-2 py-1.5 text-xs"
                aria-label="Quantity"
              />
            </div>
          </li>
        ))}
      </ul>

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Add to list"}
        </button>
      </div>
    </form>
  );
}
