"use client";

import { useState, useTransition } from "react";

const CATEGORIES = [
  { value: "weight", label: "Body Weight" },
  { value: "exercise", label: "Exercise" },
  { value: "measurement", label: "Measurement" },
] as const;

export function StatsForm() {
  const [category, setCategory] = useState<string>("weight");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("lbs");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function submit() {
    startTransition(async () => {
      const statName = category === "weight" ? "weight" : name.toLowerCase().trim();
      if (!statName || !value) return;

      const res = await fetch("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, name: statName, value: Number(value), unit }),
      });

      if (res.ok) {
        setResult("Logged!");
        setValue("");
        if (category !== "weight") setName("");
        setTimeout(() => setResult(null), 3000);
      } else {
        setResult("Something went wrong.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Log Stats</h2>

      <div className="mb-3 flex gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => {
              setCategory(c.value);
              setUnit(c.value === "measurement" ? "inches" : "lbs");
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              category === c.value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {category !== "weight" && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              category === "exercise"
                ? "e.g. bench press, squat, deadlift"
                : "e.g. waist, hips, bicep"
            }
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
          />
        )}

        <div className="flex gap-2">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Value"
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-500 focus:outline-none"
          >
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
            <option value="inches">inches</option>
            <option value="cm">cm</option>
          </select>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={isPending || !value}
        className="mt-3 w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Log Stat"}
      </button>

      {result && (
        <p className="mt-2 text-center text-sm text-emerald-600">{result}</p>
      )}
    </div>
  );
}
