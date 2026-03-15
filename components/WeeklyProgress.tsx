"use client";

import { useEffect, useState } from "react";
import { startOfWeek, format } from "date-fns";
import type { GoalWithLog } from "@/lib/utils";

export function WeeklyProgress() {
  const [goals, setGoals] = useState<GoalWithLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    fetch(`/api/goals/log?frequency=weekly&period_date=${weekStart}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setGoals(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="mt-3 space-y-2">
          <div className="h-8 rounded-lg bg-gray-100" />
          <div className="h-8 rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  if (goals.length === 0) return null;

  const completed = goals.filter((g) => {
    if (g.tracking_type === "boolean") return g.log?.completed;
    if (g.target_value && g.log?.value != null) return g.log.value >= g.target_value;
    return (g.log?.value ?? 0) > 0;
  }).length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">This Week</h3>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
          {completed}/{goals.length}
        </span>
      </div>

      <div className="space-y-2">
        {goals.map((goal) => {
          const isNumeric = goal.tracking_type === "number";
          const value = goal.log?.value ?? 0;
          const target = goal.target_value ?? 0;
          const done = isNumeric
            ? target > 0
              ? value >= target
              : value > 0
            : goal.log?.completed ?? false;
          const pct = isNumeric && target > 0
            ? Math.min(100, (value / target) * 100)
            : done ? 100 : 0;

          return (
            <div key={goal.id}>
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                    done
                      ? "bg-violet-500 text-white"
                      : pct > 0
                        ? "bg-violet-200 text-violet-700"
                        : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {done ? "✓" : isNumeric && value > 0 ? "" : ""}
                </span>
                <span className={`flex-1 truncate text-sm ${done ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                  {goal.name}
                </span>
                {isNumeric && target > 0 && (
                  <span className="shrink-0 text-xs text-gray-400">
                    {value}/{target}
                  </span>
                )}
              </div>
              {isNumeric && target > 0 && (
                <div className="ml-7 mt-1 h-1 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
