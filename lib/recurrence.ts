import type { Bill, BillStatus, ParsedBill, Recurrence } from "./types";

/** Today's date as YYYY-MM-DD in local calendar (UTC date components for consistency). */
export function todayISO(date = new Date()): string {
  return toISODate(date);
}

export function toISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function clampDayOfMonth(year: number, monthIndex: number, day: number): number {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

/** Next calendar occurrence of `dayOfMonth` on or after `from` (UTC). */
export function nextMonthlyDue(dayOfMonth: number, from = new Date()): string {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const todayDay = from.getUTCDate();

  if (todayDay <= dayOfMonth) {
    const day = clampDayOfMonth(year, month, dayOfMonth);
    return toISODate(new Date(Date.UTC(year, month, day)));
  }

  const nextMonth = month + 1;
  const nextYear = year + Math.floor(nextMonth / 12);
  const nextMonthIndex = nextMonth % 12;
  const day = clampDayOfMonth(nextYear, nextMonthIndex, dayOfMonth);
  return toISODate(new Date(Date.UTC(nextYear, nextMonthIndex, day)));
}

/** Advance a monthly bill from its current due date to the following month. */
export function rollMonthly(dayOfMonth: number, currentDue: string): string {
  const current = parseISODate(currentDue);
  const nextMonth = current.getUTCMonth() + 1;
  const year = current.getUTCFullYear() + Math.floor(nextMonth / 12);
  const monthIndex = nextMonth % 12;
  const day = clampDayOfMonth(year, monthIndex, dayOfMonth);
  return toISODate(new Date(Date.UTC(year, monthIndex, day)));
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

export function addYears(iso: string, years: number): string {
  const d = parseISODate(iso);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return toISODate(d);
}

/**
 * Compute the first nextDueDate when saving a newly confirmed bill.
 */
export function computeInitialDueDate(parsed: ParsedBill, from = new Date()): string {
  if (parsed.dueDate) {
    const due = parseISODate(parsed.dueDate);
    if (due >= startOfUtcDay(from) || parsed.recurrence === "one-time") {
      return parsed.dueDate;
    }
  }

  const day = parsed.dayOfMonth ?? from.getUTCDate();

  switch (parsed.recurrence) {
    case "monthly":
      return nextMonthlyDue(day, from);
    case "weekly":
      return addDays(todayISO(from), 7);
    case "yearly": {
      const year = from.getUTCFullYear();
      const month = from.getUTCMonth();
      const candidateDay = clampDayOfMonth(year, month, day);
      const candidate = new Date(Date.UTC(year, month, candidateDay));
      if (candidate >= startOfUtcDay(from)) {
        return toISODate(candidate);
      }
      return toISODate(
        new Date(Date.UTC(year + 1, month, clampDayOfMonth(year + 1, month, day)))
      );
    }
    case "one-time":
    default:
      return nextMonthlyDue(day, from);
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** After marking paid: next cycle due date, or null if one-time (stay paid). */
export function computeRolloverDueDate(bill: Pick<Bill, "recurrence" | "dayOfMonth" | "nextDueDate">): string | null {
  switch (bill.recurrence) {
    case "one-time":
      return null;
    case "monthly":
      return rollMonthly(bill.dayOfMonth ?? parseISODate(bill.nextDueDate).getUTCDate(), bill.nextDueDate);
    case "weekly":
      return addDays(bill.nextDueDate, 7);
    case "yearly":
      return addYears(bill.nextDueDate, 1);
    default:
      return null;
  }
}

export function statusForDueDate(nextDueDate: string, today = todayISO()): BillStatus {
  if (nextDueDate < today) return "overdue";
  return "upcoming";
}

export function daysUntil(nextDueDate: string, today = todayISO()): number {
  const a = parseISODate(today).getTime();
  const b = parseISODate(nextDueDate).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function isWithinReminderWindow(
  nextDueDate: string,
  reminderDaysBefore: number,
  today = todayISO()
): boolean {
  const days = daysUntil(nextDueDate, today);
  return days >= 0 && days <= reminderDaysBefore;
}

export function formatRecurrence(recurrence: Recurrence, dayOfMonth?: number): string {
  switch (recurrence) {
    case "monthly":
      return dayOfMonth ? `every month on the ${ordinal(dayOfMonth)}` : "every month";
    case "weekly":
      return "every week";
    case "yearly":
      return dayOfMonth ? `every year on the ${ordinal(dayOfMonth)}` : "every year";
    case "one-time":
      return "one-time";
  }
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
