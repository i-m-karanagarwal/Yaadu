"use client";

import type { Reminder } from "@/lib/types";
import { daysUntil } from "@/lib/recurrence";

type Props = {
  reminders: Reminder[];
  onChanged: () => void;
};

export default function ReminderList({ reminders, onChanged }: Props) {
  const active = reminders.filter((r) => r.status === "active");

  if (active.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        No upcoming reminders. Birthdays, tasks, and events show up here.
      </p>
    );
  }

  async function markDone(reminder: Reminder) {
    await fetch(`/api/reminders/${reminder._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    onChanged();
  }

  async function remove(reminder: Reminder) {
    await fetch(`/api/reminders/${reminder._id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <ul className="space-y-2">
      {active.map((reminder) => {
        const days = daysUntil(reminder.dueDate);
        const when =
          days === 0
            ? "Today"
            : days === 1
              ? "Tomorrow"
              : days > 1
                ? `In ${days} days`
                : `${Math.abs(days)}d ago`;

        return (
          <li
            key={reminder._id}
            className="rounded-xl border border-stone-200 bg-white px-3 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-stone-900">{reminder.title}</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {reminder.kind}
                  {reminder.person ? ` · ${reminder.person}` : ""}
                  {reminder.assignedRole ? ` → ${reminder.assignedRole}` : ""}
                </p>
                <p className="mt-1 text-xs text-violet-700">
                  {when} · {reminder.dueDate}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => markDone(reminder)}
                  className="text-xs font-medium text-violet-700 hover:text-violet-900"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => remove(reminder)}
                  className="text-xs text-stone-400 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
