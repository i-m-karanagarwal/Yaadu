"use client";

import type { ShoppingItem } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  ration: "Ration",
  fresh: "Fresh",
  household: "Household",
  other: "Other",
};

type Props = {
  items: ShoppingItem[];
  onChanged: () => void;
};

export default function ShoppingList({ items, onChanged }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        Shopping list is empty. Tell Yaadu what to buy.
      </p>
    );
  }

  const grouped = groupByCategory(items);

  async function toggleDone(item: ShoppingItem) {
    await fetch(`/api/shopping/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done }),
    });
    onChanged();
  }

  async function remove(item: ShoppingItem) {
    await fetch(`/api/shopping/${item._id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, catItems]) => (
        <section key={category}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          <ul className="mt-2 space-y-2">
            {catItems.map((item) => (
              <li
                key={item._id}
                className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => toggleDone(item)}
                  aria-label={item.done ? "Mark not done" : "Mark done"}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    item.done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-stone-300"
                  }`}
                >
                  {item.done ? "✓" : ""}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${item.done ? "text-stone-400 line-through" : "text-stone-900"}`}>
                    {item.name}
                    {item.quantity ? (
                      <span className="text-stone-500"> · {item.quantity}</span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  className="text-xs text-stone-400 hover:text-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function groupByCategory(items: ShoppingItem[]): Record<string, ShoppingItem[]> {
  const order = ["ration", "fresh", "household", "other"];
  const map: Record<string, ShoppingItem[]> = {};
  for (const item of items) {
    if (!map[item.category]) map[item.category] = [];
    map[item.category].push(item);
  }
  const sorted: Record<string, ShoppingItem[]> = {};
  for (const key of order) {
    if (map[key]) sorted[key] = map[key];
  }
  for (const key of Object.keys(map)) {
    if (!sorted[key]) sorted[key] = map[key];
  }
  return sorted;
}
