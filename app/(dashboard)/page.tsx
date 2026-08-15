"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Bill, ParsedBill } from "@/lib/types";
import AddBillInput from "./components/AddBillInput";
import ConfirmParsedBill from "./components/ConfirmParsedBill";
import BillList from "./components/BillList";

type Draft = { rawText: string; parsed: ParsedBill };

export default function DashboardPage() {
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  const loadBills = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/bills");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load bills");
        return;
      }
      setBills(data.bills || []);
    } catch {
      setError("Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Yaadu
            </p>
            <h1 className="text-xl font-semibold text-stone-900">Bill reminders</h1>
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
          <ConfirmParsedBill
            rawText={draft.rawText}
            initial={draft.parsed}
            onCancel={() => setDraft(null)}
            onSaved={() => {
              setDraft(null);
              loadBills();
            }}
          />
        ) : (
          <AddBillInput
            onParsed={(rawText, parsed) => setDraft({ rawText, parsed })}
          />
        )}

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-stone-500">Loading bills…</p>
        ) : (
          <BillList bills={bills} onChanged={loadBills} />
        )}
      </div>
    </main>
  );
}
