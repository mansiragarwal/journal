"use client";

import { useState, useTransition } from "react";
import { parseDailyEmailResponse, parseWeeklyEmailResponse } from "@/lib/parse";

export function ManualEntryForm() {
  const [text, setText] = useState("");
  const [type, setType] = useState<"daily" | "weekly">("daily");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function submit() {
    startTransition(async () => {
      const endpoint =
        type === "daily" ? "/api/goals/daily" : "/api/goals/weekly";
      const body =
        type === "daily"
          ? { ...parseDailyEmailResponse(text) }
          : { ...parseWeeklyEmailResponse(text) };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setResult("Saved successfully!");
        setText("");
        setTimeout(() => setResult(null), 3000);
      } else {
        setResult("Something went wrong.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Quick Entry
      </h2>
      <p className="mb-3 text-sm text-gray-500">
        Type the same way you&apos;d reply to the email reminder.
      </p>

      <div className="mb-3 flex gap-2">
        {(["daily", "weekly"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              type === t
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "daily" ? "Daily" : "Weekly"}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          type === "daily"
            ? 'e.g. "yes to all but pushups" or "pushups: 15, plank: 90s"'
            : 'e.g. "yoga: yes, pilates: yes, weightlifting: 3"'
        }
        rows={3}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
      />

      <button
        onClick={submit}
        disabled={isPending || !text.trim()}
        className="mt-3 w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Log It"}
      </button>

      {result && (
        <p className="mt-2 text-center text-sm text-emerald-600">{result}</p>
      )}
    </div>
  );
}
