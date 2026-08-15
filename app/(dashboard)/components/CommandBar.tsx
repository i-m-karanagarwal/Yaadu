"use client";

import { FormEvent, useRef, useState } from "react";
import type { IntentResult } from "@/lib/types";
import {
  type SpeechLang,
  useSpeechRecognition,
} from "@/lib/useSpeechRecognition";

type Props = {
  onIntent: (result: IntentResult) => void;
};

export default function CommandBar({ onIntent }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState<SpeechLang>("hi-IN");
  const textRef = useRef(text);
  textRef.current = text;
  const parsingRef = useRef(false);

  const speech = useSpeechRecognition({
    lang,
    onFinalTranscript: (spoken) => {
      const next = textRef.current.trim()
        ? `${textRef.current.trim()} ${spoken}`
        : spoken;
      setText(next);
      textRef.current = next;
      void routeIntent(next);
    },
  });

  async function routeIntent(trimmed: string) {
    const value = trimmed.trim();
    if (!value || parsingRef.current) return;

    parsingRef.current = true;
    setLoading(true);
    setError("");
    speech.clearError();
    try {
      const res = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not understand that");
        return;
      }
      onIntent(data as IntentResult);
      setText("");
      textRef.current = "";
    } catch {
      setError("Network error — try again");
    } finally {
      parsingRef.current = false;
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (speech.listening) speech.stop();
    await routeIntent(text);
  }

  function toggleMic() {
    setError("");
    speech.clearError();
    if (speech.listening) {
      speech.stop();
      return;
    }
    speech.start();
  }

  const displayText =
    speech.listening && speech.interim
      ? `${text}${text ? " " : ""}${speech.interim}`.trim()
      : text;

  const combinedError = error || speech.error;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <label htmlFor="command-input" className="block text-sm font-medium text-stone-800">
            Tell Yaadu what the house needs
          </label>
          <p className="mt-1 text-xs text-stone-500">
            Bills, shopping, birthdays, tasks — Hindi, English, or Hinglish.
          </p>
        </div>
        {speech.supported ? (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={toggleMic}
              disabled={loading}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? "Stop listening" : "Start voice input"}
              className={`relative flex h-12 w-12 items-center justify-center rounded-full transition ${
                speech.listening
                  ? "bg-red-600 text-white shadow-lg shadow-red-200"
                  : "bg-stone-900 text-white hover:bg-stone-800"
              } disabled:opacity-50`}
            >
              {speech.listening ? (
                <span className="absolute inset-0 animate-ping rounded-full bg-red-400/40" />
              ) : null}
              <MicIcon listening={speech.listening} />
            </button>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as SpeechLang)}
              disabled={speech.listening}
              aria-label="Voice language"
              className="max-w-[7.5rem] rounded-lg border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] text-stone-600"
            >
              <option value="hi-IN">Hindi / Hinglish</option>
              <option value="en-IN">English (India)</option>
            </select>
          </div>
        ) : null}
      </div>

      {speech.listening ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          Listening… speak naturally, then tap the mic to stop. Yaadu will figure out what you mean.
        </p>
      ) : null}

      <textarea
        id="command-input"
        rows={3}
        value={displayText}
        onChange={(e) => {
          setText(e.target.value);
          textRef.current = e.target.value;
        }}
        placeholder="Kal doodh lena hai… Mummy ka birthday 15 September… Bijli bill har mahine 10 tareekh…"
        className="mt-3 w-full resize-none rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
      />

      {!speech.supported ? (
        <p className="mt-2 text-xs text-stone-500">
          Voice works best in Chrome. You can still type here.
        </p>
      ) : null}

      {combinedError ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {combinedError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || !text.trim() || speech.listening}
        className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {loading ? "Understanding…" : "Go"}
      </button>
    </form>
  );
}

function MicIcon({ listening }: { listening: boolean }) {
  if (listening) {
    return (
      <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="currentColor" aria-hidden>
        <rect x="7" y="7" width="10" height="10" rx="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
      <path d="M17 11a1 1 0 1 1 2 0 7 7 0 0 1-6 6.93V21a1 1 0 1 1-2 0v-3.07A7 7 0 0 1 5 11a1 1 0 1 1 2 0 5 5 0 0 0 10 0Z" />
    </svg>
  );
}
