import { Resend } from "resend";
import type { Bill } from "./types";
import { daysUntil, formatRecurrence } from "./recurrence";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(key);
}

function formatAmount(amount: number | null): string {
  if (amount == null) return "";
  return ` (₹${amount.toLocaleString("en-IN")})`;
}

function lineForBill(bill: Bill): string {
  const days = daysUntil(bill.nextDueDate);
  const when =
    days === 0
      ? "due today"
      : days === 1
        ? "due tomorrow"
        : days > 1
          ? `due in ${days} days`
          : `overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;

  return `• ${bill.item}${formatAmount(bill.amount)} — ${when}, on ${bill.nextDueDate} (${formatRecurrence(bill.recurrence, bill.dayOfMonth)})`;
}

export async function sendReminderEmail(bills: Bill[]): Promise<{ id?: string }> {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) {
    throw new Error("NOTIFY_EMAIL is not set");
  }

  const resend = getResend();
  const subject =
    bills.length === 1
      ? `Yaadu: ${bills[0].item} reminder`
      : `Yaadu: ${bills.length} bills need your attention`;

  const body = [
    "Yaadu reminder — bills coming up:",
    "",
    ...bills.map(lineForBill),
    "",
    "Open Yaadu to mark them paid when you're done.",
  ].join("\n");

  const { data, error } = await resend.emails.send({
    from: "Yaadu <onboarding@resend.dev>",
    to: [to],
    subject,
    text: body,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { id: data?.id };
}
