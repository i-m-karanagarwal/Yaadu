"use client";

import { FormEvent, useState } from "react";
import type { ParsedBill, Recurrence } from "@/lib/types";

type Props = {
  rawText: string;
  initial: ParsedBill;
  onCancel: () => void;
  onSaved: () => void;
};

const RECURRENCES: Recurrence[] = ["monthly", "weekly", "yearly", "one-time"];

export default function ConfirmParsedBill({ rawText, initial, onCancel, onSaved }: Props) {
  const [item, setItem] = useState(initial.item);
  const [category, setCategory] = useState(initial.category);
  const [amount, setAmount] = useState(
    initial.amount == null ? "" : String(initial.amount)
  );
  const [recurrence, setRecurrence] = useState<Recurrence>(initial.recurrence);
  const [dayOfMonth, setDayOfMonth] = useState(
    initial.dayOfMonth == null ? "" : String(initial.dayOfMonth)
  );
  const [dueDate, setDueDate] = useState(initial.dueDate ?? "");
  const [reminderDaysBefore, setReminderDaysBefore] = useState("2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const parsedAmount =
      amount.trim() === "" ? null : Number(amount.replace(/[₹,\s]/g, ""));
    if (amount.trim() !== "" && !Number.isFinite(parsedAmount)) {
      setError("Amount must be a number");
      setLoading(false);
      return;
    }

    const day =
      dayOfMonth.trim() === "" ? null : Number.parseInt(dayOfMonth, 10);
    if (dayOfMonth.trim() !== "" && (day == null || day < 1 || day > 31)) {
      setError("Day of month must be 1–31");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          item,
          category,
          amount: parsedAmount,
          recurrence,
          dayOfMonth: day,
          dueDate: dueDate.trim() || null,
          reminderDaysBefore: Number.parseInt(reminderDaysBefore, 10) || 2,
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

  const summaryAmount =
    amount.trim() === "" ? "no amount set" : `₹${amount.trim()}`;
  const summaryDay = dayOfMonth.trim()
    ? `on the ${dayOfMonth.trim()}`
    : dueDate
      ? `on ${dueDate}`
      : "";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm sm:p-5"
    >
      <h2 className="text-base font-semibold text-stone-900">Confirm before saving</h2>
      <p className="mt-1 text-sm text-stone-600">
        {item}, {summaryAmount}, {recurrence}
        {summaryDay ? ` ${summaryDay}` : ""} — right? Edit anything below if not.
      </p>
      <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-stone-500">
        You typed: &ldquo;{rawText}&rdquo;
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Item">
          <input
            required
            value={item}
            onChange={(e) => setItem(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Category">
          <input
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Amount (INR)">
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Leave blank if unknown"
            className={inputClass}
          />
        </Field>
        <Field label="Recurrence">
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence)}
            className={inputClass}
          >
            {RECURRENCES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Day of month">
          <input
            inputMode="numeric"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            placeholder="e.g. 10"
            className={inputClass}
          />
        </Field>
        <Field label="Specific due date">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Remind days before">
          <input
            inputMode="numeric"
            value={reminderDaysBefore}
            onChange={(e) => setReminderDaysBefore(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save reminder"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-medium text-stone-600">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
