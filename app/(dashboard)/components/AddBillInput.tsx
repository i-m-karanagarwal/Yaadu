"use client";

import { FormEvent, useState } from "react";
import type { ParsedBill } from "@/lib/types";

type Props = {
  onParsed: (rawText: string, parsed: ParsedBill) => void;
};

export default function AddBillInput({ onParsed }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not parse that");
        return;
      }
      onParsed(data.rawText, data.parsed);
      setText("");
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <label htmlFor="bill-input" className="block text-sm font-medium text-stone-800">
        Type a bill, in any language
      </label>
      <p className="mt-1 text-xs text-stone-500">
        Hindi, English, or Hinglish — e.g. &ldquo;Bijli ka bill har mahine 10 tareekh ko aata hai, ₹2000 ke aas paas&rdquo;
      </p>
      <textarea
        id="bill-input"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Internet bill every month on the 5th, around 999…"
        className="mt-3 w-full resize-none rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
      />
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading || !text.trim()}
        className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {loading ? "Parsing…" : "Parse bill"}
      </button>
    </form>
  );
}
