"use client";

import { useState, useTransition } from "react";
import type { DailyLog } from "@/lib/utils";

interface Props {
  log: DailyLog | null;
  date: string;
}

const GOALS = [
  { key: "walking_10k", label: "10k Walking", type: "boolean" },
  { key: "walking_after_meals", label: "Walk After Meals", type: "boolean" },
  { key: "pushups", label: "Pushups", type: "number" },
  { key: "plank", label: "Plank", type: "boolean" },
  { key: "brainstorming", label: "30 Min Brainstorming", type: "boolean" },
] as const;

export function DailyGoalsCard({ log, date }: Props) {
  const [data, setData] = useState({
    walking_10k: log?.walking_10k ?? false,
    walking_after_meals: log?.walking_after_meals ?? false,
    pushups: log?.pushups ?? 0,
    plank: log?.plank ?? false,
    plank_time: log?.plank_time ?? null,
    brainstorming: log?.brainstorming ?? false,
  });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(key: string) {
    setData((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
    setSaved(false);
  }

  function setNumber(key: string, value: number) {
    setData((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      await fetch("/api/goals/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, ...data }),
      });
      setSaved(true);
    });
  }

  const completedCount = [
    data.walking_10k,
    data.walking_after_meals,
    data.pushups >= 10,
    data.plank,
    data.brainstorming,
  ].filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Daily Goals</h2>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
          {completedCount}/5
        </span>
      </div>

      <div className="space-y-3">
        {GOALS.map((goal) => (
          <div
            key={goal.key}
            className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
          >
            <span className="text-sm font-medium text-gray-700">
              {goal.label}
            </span>

            {goal.type === "boolean" ? (
              <button
                onClick={() => toggle(goal.key)}
                className={`h-6 w-11 rounded-full transition-colors ${
                  data[goal.key as keyof typeof data]
                    ? "bg-emerald-500"
                    : "bg-gray-300"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    data[goal.key as keyof typeof data]
                      ? "translate-x-5"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            ) : (
              <input
                type="number"
                min={0}
                value={data.pushups}
                onChange={(e) =>
                  setNumber("pushups", parseInt(e.target.value) || 0)
                }
                className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-center text-sm"
              />
            )}
          </div>
        ))}

        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <span className="text-sm font-medium text-gray-700">
            Plank Time (seconds)
          </span>
          <input
            type="number"
            min={0}
            value={data.plank_time ?? ""}
            placeholder="--"
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                plank_time: e.target.value ? parseInt(e.target.value) : null,
              }))
            }
            className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-center text-sm"
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={isPending}
        className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
      >
        {isPending ? "Saving..." : saved ? "Saved!" : "Save Progress"}
      </button>
    </div>
  );
}
