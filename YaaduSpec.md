# Yaadu — Build Spec (Hinglish Bill Reminder MVP)

## 1. What this is

The wedge feature from the household OS idea, built alone and built well: you type a bill in plain Hindi, English, or Hinglish — "Bijli ka bill har mahine 10 tareekh ko aata hai, ₹2000 ke aas paas" — and Yaadu turns that into a structured, recurring reminder that actually fires on time. No WhatsApp integration in v1, no document OCR, no multi-user household setup. One person, one login, one job done well: never miss a bill.

If this works — if people trust it enough to keep typing their bills into it — everything else from the original household-OS idea (groceries, domestic help, documents, WhatsApp) becomes a natural v2+ addition instead of something you had to build all at once to feel "complete."

---

## 2. Tech stack

Same foundation as Fin, plus one addition for actually delivering reminders:

- **Next.js 14+ (App Router), TypeScript**, deployed on **Vercel**.
- **MongoDB Atlas, free M0 tier** — one database (`yaadu`), one main collection: `bills`.
- **AI: Google AI Studio / Gemini API** (`gemini-2.0-flash`) — used for exactly one job: parsing free-text Hinglish/Hindi/English input into structured bill data. Not used for anything else in v1.
- **Reminder delivery: Vercel Cron + Resend (free tier, 100 emails/day)** — since there's no WhatsApp integration yet, email is the simplest zero-cost delivery channel that doesn't require your own SMTP server. A daily cron job checks what's due and emails the user.
- **Auth: same passcode-gate middleware as Fin** — single user, `APP_PASSCODE` env var.

---

## 3. Environment variables

```
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=...
RESEND_API_KEY=...
APP_PASSCODE=...
NOTIFY_EMAIL=you@example.com     # where reminders get sent
CRON_SECRET=...                   # random string, checked by the cron route so it can't be triggered by randoms
```

All in `.env.local` (gitignored) and mirrored in Vercel's project env vars. Never commit any of these.

---

## 4. Data model

```ts
interface Bill {
  _id: ObjectId;
  rawText: string;            // exactly what the user typed, kept for reference
  item: string;                // "Electricity", "Internet", "LPG Cylinder"
  category: string;             // "Utilities", "Rent", "Subscription", etc.
  amount: number | null;        // null if user didn't specify — Gemini shouldn't guess
  currency: "INR";
  recurrence: "one-time" | "monthly" | "weekly" | "yearly";
  dayOfMonth?: number;           // for monthly recurrence, e.g. 10
  nextDueDate: string;           // ISO date — the next occurrence to remind about
  reminderDaysBefore: number;    // default 2
  status: "upcoming" | "paid" | "overdue";
  history: Array<{
    dueDate: string;
    paidOn?: string;
    amountPaid?: number;
  }>;
  createdAt: string;
}
```

---

## 5. Core flow

### 5.1 Add a bill (the whole product, really)
- One text input on the home screen: "Type a bill, in any language."
- User types free text → sent to `/api/parse` → Gemini prompt returns strict JSON:
  ```json
  { "item": "Electricity", "category": "Utilities", "amount": 2000, "recurrence": "monthly", "dayOfMonth": 10 }
  ```
- **Show the parsed result back to the user before saving** — a confirm screen: "Electricity, ₹2000, every month on the 10th — right?" This matters more than it sounds: a wrong parse that silently gets saved is exactly the kind of thing that breaks trust in week one. Let them edit any field before confirming.
- On confirm, compute `nextDueDate` from `dayOfMonth`/recurrence and save.

### 5.2 Gemini prompt design (`/api/parse`)
- System prompt should explicitly instruct: respond with *only* the JSON object, no prose, no markdown fences; leave `amount` as `null` if not mentioned rather than guessing; support Hindi, English, and Hinglish (Roman-script Hindi) input.
- Keep this as a single small model call — no need for a larger model or multi-turn conversation for a job this narrow.

### 5.3 Dashboard
- **Upcoming** — bills due in the next 14 days, soonest first, with a "Mark as paid" button.
- **Overdue** — anything past `nextDueDate` still unpaid, visually distinct (this list should be the first thing you see if it's non-empty).
- **All bills** — full list, filterable by category, with edit/delete.

### 5.4 Marking paid → recurrence rollover
- "Mark as paid" logs an entry in `history`, and for recurring bills, immediately computes the *next* `nextDueDate` (e.g. next month's 10th) and resets `status` to `upcoming`. One-time bills just get marked `paid` and drop off the upcoming list.

### 5.5 Reminder delivery (the part that makes this actually useful)
- `/api/cron/reminders` — a route Vercel Cron hits once daily (configured in `vercel.json`). It:
  1. Checks the `CRON_SECRET` header to confirm the request is legitimate.
  2. Queries all bills where `nextDueDate` minus today ≤ `reminderDaysBefore`, and status isn't already `paid` for that cycle.
  3. Sends one email via Resend summarizing what's due, e.g. "Electricity (₹2000) due in 2 days, on the 10th."
  4. Also flips any bill whose `nextDueDate` has passed to `status: "overdue"`.

---

## 6. API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/parse` | POST | Free text → structured bill JSON (Gemini) |
| `/api/bills` | GET | List bills (filter by status/category) |
| `/api/bills` | POST | Save a confirmed bill |
| `/api/bills/:id` | PATCH | Edit, or mark paid (triggers recurrence rollover) |
| `/api/bills/:id` | DELETE | Remove a bill |
| `/api/cron/reminders` | GET | Daily cron target — checks due bills, sends email |

---

## 7. `vercel.json` (cron config)

```json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 3 * * *" }
  ]
}
```
(3am UTC ≈ 8:30am IST — adjust to whenever you actually want the daily nudge to land.)

---

## 8. File structure

```
yaadu/
├── app/
│   ├── api/
│   │   ├── parse/route.ts
│   │   ├── bills/route.ts
│   │   ├── bills/[id]/route.ts
│   │   └── cron/reminders/route.ts
│   ├── (dashboard)/
│   │   ├── page.tsx              # upcoming / overdue / all
│   │   └── components/
│   │       ├── AddBillInput.tsx
│   │       ├── ConfirmParsedBill.tsx
│   │       └── BillList.tsx
│   └── login/page.tsx
├── lib/
│   ├── db.ts
│   ├── gemini.ts
│   ├── resend.ts
│   └── recurrence.ts            # nextDueDate computation logic
├── middleware.ts
├── vercel.json
└── package.json
```

---

## 9. Explicitly out of scope for v1

- WhatsApp integration (add once the core loop is proven).
- Multi-user households / shared access.
- Document/photo OCR for bills.
- Auto-pay or any payment integration.
- Any category beyond bills (no groceries, no domestic help, no vehicles yet) — resist the pull to add these until Yaadu's core loop is something you'd personally rely on daily.

---

## 10. Build order (give Cursor one step at a time)

1. Scaffold Next.js + MongoDB connection, confirm read/write works.
2. Build the passcode login + middleware.
3. Build `/api/parse` with the Gemini prompt, test it against a handful of real Hinglish examples before building any UI around it.
4. Build the add-bill flow: text input → parse → confirm screen → save.
5. Build the dashboard (upcoming/overdue/all) + mark-as-paid with recurrence rollover.
6. Set up Resend, build `/api/cron/reminders`, add the cron config, test by temporarily setting a bill's due date to tomorrow.
7. Push to GitHub, deploy to Vercel, add production env vars, confirm the cron actually fires in production (Vercel's cron logs will show this).