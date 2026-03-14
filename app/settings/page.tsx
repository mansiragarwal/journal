"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { GoalDefinition, BingoItem } from "@/lib/utils";

const FREQUENCIES = ["daily", "weekly", "monthly", "quarterly"] as const;

const FREQ_LABELS: Record<string, string> = {
  daily: "Daily Goals",
  weekly: "Weekly Goals",
  monthly: "Monthly Goals",
  quarterly: "Quarterly Goals",
};

const FREQ_COLORS: Record<string, string> = {
  daily: "border-emerald-200",
  weekly: "border-violet-200",
  monthly: "border-blue-200",
  quarterly: "border-amber-200",
};

interface NewGoal {
  name: string;
  tracking_type: "boolean" | "number";
  target_value: string;
  unit: string;
}

export default function SettingsPage() {
  const [goals, setGoals] = useState<GoalDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGoals, setNewGoals] = useState<Record<string, NewGoal | null>>({});
  const [isPending, startTransition] = useTransition();
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [bingoItems, setBingoItems] = useState<BingoItem[]>([]);
  const [bingoEditing, setBingoEditing] = useState(false);
  const [bingoDrafts, setBingoDrafts] = useState<string[]>(Array(25).fill(""));
  const [bingoSaved, setBingoSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/goals?all=true").then((r) => r.json()),
      fetch("/api/telegram/link").then((r) => r.json()),
      fetch("/api/bingo").then((r) => r.json()),
    ]).then(([goalsData, telegramData, bingoData]) => {
      if (Array.isArray(goalsData)) setGoals(goalsData);
      setTelegramLinked(telegramData.linked ?? false);
      if (Array.isArray(bingoData)) {
        setBingoItems(bingoData);
        const drafts = Array(25).fill("");
        bingoData.forEach((item: BingoItem) => {
          if (item.position >= 0 && item.position < 25) {
            drafts[item.position] = item.title;
          }
        });
        setBingoDrafts(drafts);
      }
      setLoading(false);
    });
  }, []);

  function saveGoal(goal: GoalDefinition, updates: Partial<GoalDefinition>) {
    startTransition(async () => {
      await fetch("/api/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: goal.id, ...updates }),
      });
      setGoals((prev) =>
        prev.map((g) => (g.id === goal.id ? { ...g, ...updates } : g))
      );
    });
  }

  function deleteGoal(id: number) {
    startTransition(async () => {
      await fetch("/api/goals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setGoals((prev) => prev.filter((g) => g.id !== id));
    });
  }

  function startAddGoal(freq: string) {
    setNewGoals((prev) => ({
      ...prev,
      [freq]: { name: "", tracking_type: "boolean", target_value: "", unit: "" },
    }));
  }

  function addGoal(freq: string) {
    const ng = newGoals[freq];
    if (!ng || !ng.name.trim()) return;

    startTransition(async () => {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ng.name.trim(),
          frequency: freq,
          tracking_type: ng.tracking_type,
          target_value: ng.tracking_type === "number" && ng.target_value ? Number(ng.target_value) : null,
          unit: ng.tracking_type === "number" ? ng.unit || null : null,
        }),
      });
      const created = await res.json();
      setGoals((prev) => [...prev, created]);
      setNewGoals((prev) => ({ ...prev, [freq]: null }));
    });
  }

  function generateLinkCode() {
    startTransition(async () => {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const data = await res.json();
      setLinkCode(data.code);
    });
  }

  function unlinkTelegram() {
    startTransition(async () => {
      await fetch("/api/telegram/link", { method: "DELETE" });
      setTelegramLinked(false);
      setLinkCode(null);
    });
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <p className="text-center text-gray-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
        <Link
          href="/"
          className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          Back
        </Link>
      </header>

      <div className="space-y-8">
        {/* Goal Editing */}
        {FREQUENCIES.map((freq) => {
          const freqGoals = goals.filter((g) => g.frequency === freq);
          const ng = newGoals[freq];

          return (
            <section key={freq}>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                {FREQ_LABELS[freq]}
              </h2>

              <div className="space-y-2">
                {freqGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className={`flex items-center gap-3 rounded-xl border bg-white p-3 ${FREQ_COLORS[freq]} ${
                      !goal.active ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{goal.name}</p>
                      <p className="text-xs text-gray-400">
                        {goal.tracking_type === "boolean" ? "Habit" : `Measurable${goal.target_value ? ` (target: ${goal.target_value} ${goal.unit || ""})` : ""}`}
                      </p>
                    </div>
                    <button
                      onClick={() => saveGoal(goal, { active: !goal.active })}
                      className={`rounded-lg px-3 py-1 text-xs font-medium ${
                        goal.active
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}
                      disabled={isPending}
                    >
                      {goal.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      disabled={isPending}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}

                {ng ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ng.name}
                        onChange={(e) =>
                          setNewGoals((prev) => ({
                            ...prev,
                            [freq]: { ...ng, name: e.target.value },
                          }))
                        }
                        placeholder="Goal name..."
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                        onKeyDown={(e) => e.key === "Enter" && addGoal(freq)}
                        autoFocus
                      />
                      <button
                        onClick={() => addGoal(freq)}
                        disabled={isPending || !ng.name.trim()}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setNewGoals((prev) => ({ ...prev, [freq]: null }))}
                        className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex rounded-lg bg-gray-100 p-0.5">
                        <button
                          onClick={() =>
                            setNewGoals((prev) => ({
                              ...prev,
                              [freq]: { ...ng, tracking_type: "boolean" },
                            }))
                          }
                          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                            ng.tracking_type === "boolean"
                              ? "bg-white text-gray-900 shadow-sm"
                              : "text-gray-500"
                          }`}
                        >
                          Habit
                        </button>
                        <button
                          onClick={() =>
                            setNewGoals((prev) => ({
                              ...prev,
                              [freq]: { ...ng, tracking_type: "number" },
                            }))
                          }
                          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                            ng.tracking_type === "number"
                              ? "bg-white text-gray-900 shadow-sm"
                              : "text-gray-500"
                          }`}
                        >
                          Measurable
                        </button>
                      </div>

                      {ng.tracking_type === "number" && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={ng.target_value}
                            onChange={(e) =>
                              setNewGoals((prev) => ({
                                ...prev,
                                [freq]: { ...ng, target_value: e.target.value },
                              }))
                            }
                            placeholder="Target"
                            className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-center text-sm focus:border-gray-500 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={ng.unit}
                            onChange={(e) =>
                              setNewGoals((prev) => ({
                                ...prev,
                                [freq]: { ...ng, unit: e.target.value },
                              }))
                            }
                            placeholder="unit"
                            className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-center text-sm focus:border-gray-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => startAddGoal(freq)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add {freq} goal
                  </button>
                )}
              </div>
            </section>
          );
        })}

        {/* Bingo Board */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Bingo Board</h2>
            {bingoItems.length > 0 && !bingoEditing && (
              <button
                onClick={() => setBingoEditing(true)}
                className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
              >
                Edit
              </button>
            )}
          </div>

          {bingoItems.length === 0 && !bingoEditing ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">
                No bingo board yet. Create a 5x5 board with 25 goals or fun items to check off.
              </p>
              <button
                onClick={() => setBingoEditing(true)}
                className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Create Bingo Board
              </button>
            </div>
          ) : bingoEditing ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="mb-3 text-sm text-gray-500">
                Fill in 25 items for your bingo board. Leave blank to skip a slot.
              </p>
              <div className="grid grid-cols-5 gap-2">
                {bingoDrafts.map((title, i) => (
                  <input
                    key={i}
                    type="text"
                    value={title}
                    onChange={(e) => {
                      const next = [...bingoDrafts];
                      next[i] = e.target.value;
                      setBingoDrafts(next);
                      setBingoSaved(false);
                    }}
                    placeholder={`${i + 1}`}
                    className="rounded-lg border border-gray-300 px-2 py-2 text-center text-xs placeholder:text-gray-300 focus:border-pink-400 focus:outline-none"
                  />
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    startTransition(async () => {
                      const items = bingoDrafts
                        .map((title, position) => ({ position, title: title.trim() }))
                        .filter((item) => item.title !== "");
                      const res = await fetch("/api/bingo", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ items }),
                      });
                      const data = await res.json();
                      if (Array.isArray(data)) setBingoItems(data);
                      setBingoSaved(true);
                      setBingoEditing(false);
                    });
                  }}
                  disabled={isPending || bingoDrafts.every((d) => !d.trim())}
                  className="flex-1 rounded-xl bg-pink-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pink-700 disabled:opacity-50"
                >
                  {isPending ? "Saving..." : bingoSaved ? "Saved!" : "Save Board"}
                </button>
                <button
                  onClick={() => {
                    setBingoEditing(false);
                    const drafts = Array(25).fill("");
                    bingoItems.forEach((item) => {
                      if (item.position >= 0 && item.position < 25) {
                        drafts[item.position] = item.title;
                      }
                    });
                    setBingoDrafts(drafts);
                  }}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 25 }).map((_, i) => {
                const item = bingoItems.find((b) => b.position === i);
                return (
                  <div
                    key={i}
                    className={`flex aspect-square items-center justify-center rounded-lg border p-1 text-center text-xs leading-tight ${
                      item?.completed
                        ? "border-pink-300 bg-pink-200 font-semibold text-pink-800"
                        : item
                          ? "border-gray-200 bg-gray-50 text-gray-600"
                          : "border-gray-100 bg-gray-50 text-gray-300"
                    }`}
                  >
                    <span className="line-clamp-3">{item?.title || ""}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Telegram */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Telegram Bot</h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            {telegramLinked ? (
              <div>
                <p className="text-sm text-emerald-600 font-medium">Telegram linked</p>
                <p className="mt-1 text-xs text-gray-400">
                  You can message the bot to update your goals.
                </p>
                <button
                  onClick={unlinkTelegram}
                  disabled={isPending}
                  className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  Unlink Telegram
                </button>
              </div>
            ) : linkCode ? (
              <div>
                <p className="text-sm text-gray-700">
                  Send this to the bot:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="rounded-lg bg-gray-100 px-4 py-2 text-lg font-mono font-bold tracking-wider text-gray-900">
                    /link {linkCode}
                  </code>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Code expires in 10 minutes.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500">
                  Link your Telegram account to update goals via chat.
                </p>
                <button
                  onClick={generateLinkCode}
                  disabled={isPending}
                  className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  Generate Link Code
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
