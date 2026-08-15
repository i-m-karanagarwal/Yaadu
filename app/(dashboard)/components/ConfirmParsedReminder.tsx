"use client";

import { FormEvent, useState } from "react";
import type { ParsedReminder, Recurrence, ReminderKind } from "@/lib/types";

type Props = {
  rawText: string;
  initial: ParsedReminder;
  onCancel: () => void;
  onSaved: () => void;
};

const KINDS: ReminderKind[] = ["birthday", "task", "event", "other"];
const RECURRENCES: Recurrence[] = ["one-time", "yearly", "monthly", "weekly"];

export default function ConfirmParsedReminder({
  rawText,
  initial,
  onCancel,
  onSaved,
}: Props) {
  const [kind, setKind] = useState<ReminderKind>(initial.kind);
  const [title, setTitle] = useState(initial.title);
  const [person, setPerson] = useState(initial.person ?? "");
  const [dueDate, setDueDate] = useState(initial.dueDate ?? "");
  const [recurrence, setRecurrence] = useState<Recurrence | "">(
    initial.recurrence ?? ""
  );
  const [reminderDaysBefore, setReminderDaysBefore] = useState(
    String(initial.reminderDaysBefore ?? (initial.kind === "birthday" ? 7 : 2))
  );
  const [assignedRole, setAssignedRole] = useState(initial.assignedRole ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!dueDate.trim()) {
      setError("Due date is required");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          kind,
          title: title.trim(),
          person: person.trim() || null,
          dueDate: dueDate.trim(),
          recurrence: recurrence || null,
          reminderDaysBefore: Number.parseInt(reminderDaysBefore, 10) || 2,
          assignedRole: assignedRole.trim() || null,
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
      className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
        Reminder
      </p>
      <p className="mt-1 text-sm text-stone-600">
        Confirm before Yaadu starts reminding you.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-stone-600">
          Kind
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ReminderKind)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-stone-600">
          Due date
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="block text-xs font-medium text-stone-600 sm:col-span-2">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="block text-xs font-medium text-stone-600">
          Person
          <input
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            placeholder="Mummy"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-stone-600">
          Remind role
          <input
            value={assignedRole}
            onChange={(e) => setAssignedRole(e.target.value)}
            placeholder="Papa"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-stone-600">
          Recurrence
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence | "")}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {RECURRENCES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-stone-600">
          Remind days before
          <input
            type="number"
            min={0}
            max={60}
            value={reminderDaysBefore}
            onChange={(e) => setReminderDaysBefore(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

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
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save reminder"}
        </button>
      </div>
    </form>
  );
}
