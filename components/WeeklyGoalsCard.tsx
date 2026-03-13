"use client";

import { useState, useTransition } from "react";
import type { WeeklyLog } from "@/lib/utils";

interface Props {
  log: WeeklyLog | null;
  weekStart: string;
}

export function WeeklyGoalsCard({ log, weekStart }: Props) {
  const [data, setData] = useState({
    yoga: log?.yoga ?? false,
    pilates: log?.pilates ?? false,
    weightlifting: log?.weightlifting ?? 0,
  });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(key: "yoga" | "pilates") {
    setData((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      await fetch("/api/goals/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: weekStart, ...data }),
      });
      setSaved(true);
    });
  }

  const completedCount = [
    data.yoga,
    data.pilates,
    data.weightlifting >= 2,
  ].filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Weekly Goals</h2>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700">
          {completedCount}/3
        </span>
      </div>

      <div className="space-y-3">
        {(["yoga", "pilates"] as const).map((key) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
          >
            <span className="text-sm font-medium capitalize text-gray-700">
              {key}
            </span>
            <button
              onClick={() => toggle(key)}
              className={`h-6 w-11 rounded-full transition-colors ${
                data[key] ? "bg-violet-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  data[key] ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        ))}

        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <span className="text-sm font-medium text-gray-700">
            Weightlifting Sessions
          </span>
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => {
                  setData((prev) => ({ ...prev, weightlifting: n }));
                  setSaved(false);
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  data.weightlifting === n
                    ? "bg-violet-500 text-white"
                    : "bg-white text-gray-600 hover:bg-violet-50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={isPending}
        className="mt-4 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
      >
        {isPending ? "Saving..." : saved ? "Saved!" : "Save Progress"}
      </button>
    </div>
  );
}
