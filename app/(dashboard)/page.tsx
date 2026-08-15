"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Bill,
  Household,
  IntentResult,
  Member,
  ParsedBill,
  ParsedReminder,
  ParsedShopping,
  Reminder,
  ShoppingItem,
} from "@/lib/types";
import CommandBar from "./components/CommandBar";
import ConfirmParsedBill from "./components/ConfirmParsedBill";
import ConfirmShoppingItems from "./components/ConfirmShoppingItems";
import ConfirmParsedReminder from "./components/ConfirmParsedReminder";
import BillList from "./components/BillList";
import ShoppingList from "./components/ShoppingList";
import ReminderList from "./components/ReminderList";
import BottomNav, { type TabId } from "./components/BottomNav";

type Draft =
  | { type: "bill"; rawText: string; parsed: ParsedBill }
  | { type: "shopping"; rawText: string; parsed: ParsedShopping }
  | { type: "reminder"; rawText: string; parsed: ParsedReminder };

export default function DashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("home");
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  const loadAll = useCallback(async () => {
    setError("");
    try {
      const [houseRes, billsRes, shopRes, remRes] = await Promise.all([
        fetch("/api/household"),
        fetch("/api/bills"),
        fetch("/api/shopping"),
        fetch("/api/reminders"),
      ]);

      const houseData = await houseRes.json();
      const billsData = await billsRes.json();
      const shopData = await shopRes.json();
      const remData = await remRes.json();

      if (!houseRes.ok) {
        setError(houseData.error || "Failed to load household");
        return;
      }
      setHousehold(houseData.household);
      setMembers(houseData.members || []);

      if (billsRes.ok) setBills(billsData.bills || []);
      if (shopRes.ok) setShopping(shopData.items || []);
      if (remRes.ok) setReminders(remData.reminders || []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function onIntent(result: IntentResult) {
    if (result.intent === "shopping") {
      setDraft({
        type: "shopping",
        rawText: result.rawText,
        parsed: result.parsed as ParsedShopping,
      });
      return;
    }
    if (result.intent === "reminder") {
      setDraft({
        type: "reminder",
        rawText: result.rawText,
        parsed: result.parsed as ParsedReminder,
      });
      return;
    }
    setDraft({
      type: "bill",
      rawText: result.rawText,
      parsed: result.parsed as ParsedBill,
    });
  }

  function onDraftSaved() {
    setDraft(null);
    loadAll();
  }

  const upcomingBills = bills.filter((b) => b.status !== "paid").slice(0, 3);
  const activeShopping = shopping.filter((i) => !i.done);
  const activeReminders = reminders.filter((r) => r.status === "active").slice(0, 3);

  return (
    <main className="min-h-screen bg-stone-50 pb-20">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Yaadu
            </p>
            <h1 className="text-xl font-semibold text-stone-900">
              {household?.name ?? "Household OS"}
            </h1>
            {members.length > 0 ? (
              <p className="text-xs text-stone-500">
                {members.map((m) => m.roleLabel).join(" · ")}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-stone-500 hover:text-stone-800"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {draft ? (
          draft.type === "bill" ? (
            <ConfirmParsedBill
              rawText={draft.rawText}
              initial={draft.parsed}
              onCancel={() => setDraft(null)}
              onSaved={onDraftSaved}
            />
          ) : draft.type === "shopping" ? (
            <ConfirmShoppingItems
              rawText={draft.rawText}
              initial={draft.parsed}
              onCancel={() => setDraft(null)}
              onSaved={onDraftSaved}
            />
          ) : (
            <ConfirmParsedReminder
              rawText={draft.rawText}
              initial={draft.parsed}
              onCancel={() => setDraft(null)}
              onSaved={onDraftSaved}
            />
          )
        ) : tab === "home" ? (
          <CommandBar onIntent={onIntent} />
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : (
          <>
            {tab === "home" && !draft ? (
              <div className="space-y-6">
                <section>
                  <h2 className="text-sm font-semibold text-stone-800">Upcoming bills</h2>
                  {upcomingBills.length === 0 ? (
                    <p className="mt-2 text-sm text-stone-500">No bills yet.</p>
                  ) : (
                    <BillList bills={upcomingBills} onChanged={loadAll} compact />
                  )}
                </section>
                <section>
                  <h2 className="text-sm font-semibold text-stone-800">Shopping</h2>
                  <div className="mt-2">
                    <ShoppingList items={activeShopping.slice(0, 5)} onChanged={loadAll} />
                  </div>
                </section>
                <section>
                  <h2 className="text-sm font-semibold text-stone-800">Reminders</h2>
                  <div className="mt-2">
                    <ReminderList reminders={activeReminders} onChanged={loadAll} />
                  </div>
                </section>
              </div>
            ) : null}

            {tab === "bills" ? (
              <section>
                <h2 className="text-sm font-semibold text-stone-800">All bills</h2>
                <div className="mt-3">
                  <BillList bills={bills} onChanged={loadAll} />
                </div>
              </section>
            ) : null}

            {tab === "shopping" ? (
              <section>
                <h2 className="text-sm font-semibold text-stone-800">Shopping list</h2>
                <div className="mt-3">
                  <ShoppingList items={shopping} onChanged={loadAll} />
                </div>
              </section>
            ) : null}

            {tab === "reminders" ? (
              <section>
                <h2 className="text-sm font-semibold text-stone-800">Reminders</h2>
                <div className="mt-3">
                  <ReminderList reminders={reminders} onChanged={loadAll} />
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>

      <BottomNav active={tab} onChange={setTab} />
    </main>
  );
}
