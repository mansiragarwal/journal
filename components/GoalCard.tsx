"use client";

import { useState, useTransition } from "react";
import type { GoalWithLog } from "@/lib/utils";

interface Props {
  title: string;
  frequency: string;
  periodDate: string;
  goals: GoalWithLog[];
}

const COLORS: Record<string, { bg: string; badge: string; button: string }> = {
  daily: { bg: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", button: "bg-emerald-600 hover:bg-emerald-700" },
  weekly: { bg: "bg-violet-500", badge: "bg-violet-100 text-violet-700", button: "bg-violet-600 hover:bg-violet-700" },
  monthly: { bg: "bg-blue-500", badge: "bg-blue-100 text-blue-700", button: "bg-blue-600 hover:bg-blue-700" },
  quarterly: { bg: "bg-amber-500", badge: "bg-amber-100 text-amber-700", button: "bg-amber-600 hover:bg-amber-700" },
};

export function GoalCard({ title, frequency, periodDate, goals: initialGoals }: Props) {
  const colors = COLORS[frequency] || COLORS.daily;
  const [goals, setGoals] = useState(initialGoals);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggleBoolean(goalId: number) {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? {
              ...g,
              log: {
                id: g.log?.id ?? 0,
                goal_id: g.id,
                user_id: g.user_id,
                period_date: periodDate,
                updated_at: new Date().toISOString(),
                completed: !(g.log?.completed ?? false),
                value: g.log?.value ?? null,
              },
            }
          : g
      )
    );
    setSaved(false);
  }

  function setNumericValue(goalId: number, value: number) {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? {
              ...g,
              log: {
                id: g.log?.id ?? 0,
                goal_id: g.id,
                user_id: g.user_id,
                period_date: periodDate,
                updated_at: new Date().toISOString(),
                completed: g.target_value ? value >= g.target_value : value > 0,
                value,
              },
            }
          : g
      )
    );
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      const logs = goals.map((g) => ({
        goal_id: g.id,
        period_date: periodDate,
        completed: g.tracking_type === "boolean"
          ? (g.log?.completed ?? false)
          : g.target_value
            ? (g.log?.value ?? 0) >= g.target_value
            : (g.log?.value ?? 0) > 0,
        value: g.tracking_type === "number" ? (g.log?.value ?? null) : null,
      }));

      await fetch("/api/goals/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs }),
      });
      setSaved(true);
    });
  }

  const completedCount = goals.filter((g) => {
    if (g.tracking_type === "boolean") return g.log?.completed;
    if (g.target_value && g.log?.value != null) return g.log.value >= g.target_value;
    return (g.log?.value ?? 0) > 0;
  }).length;

  if (goals.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-400">
          No {frequency} goals defined yet. Add some in Settings.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${colors.badge}`}>
          {completedCount}/{goals.length}
        </span>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => {
          const progressPct =
            goal.tracking_type === "number" && goal.target_value && goal.log?.value != null
              ? Math.min(100, (goal.log.value / goal.target_value) * 100)
              : null;

          return (
            <div key={goal.id}>
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div className="flex-1 min-w-0 mr-3">
                  <span className="text-sm font-medium text-gray-700">{goal.name}</span>
                  {goal.tracking_type === "number" && goal.target_value && (
                    <span className="ml-2 text-xs text-gray-400">
                      / {goal.target_value} {goal.unit || ""}
                    </span>
                  )}
                </div>

                {goal.tracking_type === "boolean" ? (
                  <button
                    onClick={() => toggleBoolean(goal.id)}
                    className={`h-6 w-11 shrink-0 rounded-full transition-colors ${
                      goal.log?.completed ? colors.bg : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        goal.log?.completed ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={0}
                      value={goal.log?.value ?? ""}
                      placeholder="0"
                      onChange={(e) =>
                        setNumericValue(goal.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-center text-sm"
                    />
                    {goal.unit && (
                      <span className="text-xs text-gray-400">{goal.unit}</span>
                    )}
                  </div>
                )}
              </div>

              {progressPct !== null && (
                <div className="mx-4 mt-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colors.bg} transition-all`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={save}
        disabled={isPending}
        className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${colors.button}`}
      >
        {isPending ? "Saving..." : saved ? "Saved!" : "Save Progress"}
      </button>
    </div>
  );
}
