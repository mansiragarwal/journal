"use client";

import { useState, useTransition } from "react";

export function IdeaForm() {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function submit() {
    if (!text.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (res.ok) {
        setResult("Added!");
        setText("");
        setTimeout(() => setResult(null), 3000);
      } else {
        setResult("Something went wrong.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Add Idea</h2>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="e.g. learn pottery, try that new restaurant..."
        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
      />

      <button
        onClick={submit}
        disabled={isPending || !text.trim()}
        className="mt-3 w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Add Idea"}
      </button>

      {result && (
        <p className="mt-2 text-center text-sm text-emerald-600">{result}</p>
      )}
    </div>
  );
}
