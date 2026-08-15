"use client";

import { useMemo, useState } from "react";
import type { Bill } from "@/lib/types";
import { daysUntil, formatRecurrence } from "@/lib/recurrence";

type Props = {
  bills: Bill[];
  onChanged: () => void;
  compact?: boolean;
};

export default function BillList({ bills, onChanged, compact = false }: Props) {
  const [category, setCategory] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Bill | null>(null);

  const categories = useMemo(() => {
    const set = new Set(bills.map((b) => b.category).filter(Boolean));
    return Array.from(set).sort();
  }, [bills]);

  const overdue = bills
    .filter((b) => b.status === "overdue")
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  const upcoming = bills
    .filter((b) => {
      if (b.status !== "upcoming") return false;
      const d = daysUntil(b.nextDueDate);
      return d >= 0 && d <= 14;
    })
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  const allFiltered = bills
    .filter((b) => (category === "all" ? true : b.category === category))
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  async function markPaid(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-paid" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not mark paid");
        return;
      }
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this bill reminder?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/bills/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not delete");
        return;
      }
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing?._id) return;
    const form = new FormData(e.currentTarget);
    const amountRaw = String(form.get("amount") || "").trim();
    const dayRaw = String(form.get("dayOfMonth") || "").trim();
    setBusyId(editing._id);
    try {
      const res = await fetch(`/api/bills/${editing._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: String(form.get("item") || ""),
          category: String(form.get("category") || ""),
          amount: amountRaw === "" ? null : Number(amountRaw),
          recurrence: String(form.get("recurrence") || "monthly"),
          dayOfMonth: dayRaw === "" ? undefined : Number(dayRaw),
          nextDueDate: String(form.get("nextDueDate") || ""),
          reminderDaysBefore: Number(form.get("reminderDaysBefore") || 2),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not update");
        return;
      }
      setEditing(null);
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  if (compact) {
    return (
      <ul className="mt-2 space-y-2">
        {bills.map((bill) => (
          <BillCard
            key={bill._id}
            bill={bill}
            busy={busyId === bill._id}
            onPaid={() => bill._id && markPaid(bill._id)}
            onEdit={() => setEditing(bill)}
            onDelete={() => bill._id && remove(bill._id)}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-8">
      {overdue.length > 0 ? (
        <Section title="Overdue" tone="danger" count={overdue.length}>
          <ul className="space-y-3">
            {overdue.map((bill) => (
              <BillCard
                key={bill._id}
                bill={bill}
                busy={busyId === bill._id}
                onPaid={() => bill._id && markPaid(bill._id)}
                onEdit={() => setEditing(bill)}
                onDelete={() => bill._id && remove(bill._id)}
              />
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Upcoming (next 14 days)" tone="default" count={upcoming.length}>
        {upcoming.length === 0 ? (
          <p className="text-sm text-stone-500">Nothing due in the next two weeks.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((bill) => (
              <BillCard
                key={bill._id}
                bill={bill}
                busy={busyId === bill._id}
                onPaid={() => bill._id && markPaid(bill._id)}
                onEdit={() => setEditing(bill)}
                onDelete={() => bill._id && remove(bill._id)}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section title="All bills" tone="muted" count={allFiltered.length}>
        <div className="mb-3">
          <label className="text-xs font-medium text-stone-600">
            Filter by category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="ml-2 rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        {allFiltered.length === 0 ? (
          <p className="text-sm text-stone-500">No bills yet — add one above.</p>
        ) : (
          <ul className="space-y-3">
            {allFiltered.map((bill) => (
              <BillCard
                key={bill._id}
                bill={bill}
                busy={busyId === bill._id}
                onPaid={() => bill._id && markPaid(bill._id)}
                onEdit={() => setEditing(bill)}
                onDelete={() => bill._id && remove(bill._id)}
              />
            ))}
          </ul>
        )}
      </Section>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            onSubmit={saveEdit}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-stone-900">Edit bill</h3>
            <div className="mt-4 grid gap-3">
              <EditField name="item" label="Item" defaultValue={editing.item} />
              <EditField name="category" label="Category" defaultValue={editing.category} />
              <EditField
                name="amount"
                label="Amount"
                defaultValue={editing.amount == null ? "" : String(editing.amount)}
              />
              <label className="text-xs font-medium text-stone-600">
                Recurrence
                <select
                  name="recurrence"
                  defaultValue={editing.recurrence}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="monthly">monthly</option>
                  <option value="weekly">weekly</option>
                  <option value="yearly">yearly</option>
                  <option value="one-time">one-time</option>
                </select>
              </label>
              <EditField
                name="dayOfMonth"
                label="Day of month"
                defaultValue={
                  editing.dayOfMonth == null ? "" : String(editing.dayOfMonth)
                }
              />
              <EditField
                name="nextDueDate"
                label="Next due date"
                type="date"
                defaultValue={editing.nextDueDate}
              />
              <EditField
                name="reminderDaysBefore"
                label="Remind days before"
                defaultValue={String(editing.reminderDaysBefore ?? 2)}
              />
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="submit"
                disabled={busyId === editing._id}
                className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl border border-stone-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "danger" | "default" | "muted";
  children: React.ReactNode;
}) {
  const titleColor =
    tone === "danger"
      ? "text-red-700"
      : tone === "muted"
        ? "text-stone-700"
        : "text-stone-900";
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className={`text-lg font-semibold ${titleColor}`}>{title}</h2>
        <span className="text-xs text-stone-400">{count}</span>
      </div>
      {children}
    </section>
  );
}

function BillCard({
  bill,
  busy,
  onPaid,
  onEdit,
  onDelete,
}: {
  bill: Bill;
  busy: boolean;
  onPaid: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const days = daysUntil(bill.nextDueDate);
  const isOverdue = bill.status === "overdue";
  const amount =
    bill.amount == null ? null : `₹${bill.amount.toLocaleString("en-IN")}`;

  return (
    <li
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        isOverdue ? "border-red-200 bg-red-50/40" : "border-stone-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-stone-900">{bill.item}</h3>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
              {bill.category}
            </span>
            {bill.status === "paid" ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                paid
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-stone-600">
            {amount ? `${amount} · ` : ""}
            {formatRecurrence(bill.recurrence, bill.dayOfMonth)}
          </p>
          <p
            className={`mt-1 text-sm font-medium ${
              isOverdue ? "text-red-700" : "text-stone-800"
            }`}
          >
            Due {bill.nextDueDate}
            {isOverdue
              ? ` · overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`
              : days === 0
                ? " · today"
                : days === 1
                  ? " · tomorrow"
                  : ` · in ${days} days`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {bill.status !== "paid" ? (
            <button
              type="button"
              disabled={busy}
              onClick={onPaid}
              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Mark as paid
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={onEdit}
            className="rounded-xl border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

function EditField({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="text-xs font-medium text-stone-600">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
      />
    </label>
  );
}
