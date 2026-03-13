"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface GoalDraft {
  name: string;
  tracking_type: "boolean" | "number";
  target_value: string;
  unit: string;
}

const FREQUENCIES = ["daily", "weekly", "monthly", "quarterly"] as const;

const SUGGESTIONS: Record<string, string[]> = {
  daily: ["10k steps", "Read 30 min", "Meditate", "Drink water", "No social media", "Journal", "Exercise", "Walk after meals", "Pushups", "Plank"],
  weekly: ["Yoga", "Pilates", "Weightlifting 3x", "Meal prep", "Deep clean", "Call a friend"],
  monthly: ["Read 2 books", "Try a new recipe", "Visit a new place", "Budget review"],
  quarterly: ["Complete a course", "Run a 5K", "Declutter wardrobe", "Plan a trip"],
};

const STEP_TITLES: Record<string, string> = {
  daily: "Daily Goals",
  weekly: "Weekly Goals",
  monthly: "Monthly Goals",
  quarterly: "Quarterly Goals",
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  daily: "Habits you want to track every day.",
  weekly: "Things to accomplish each week.",
  monthly: "Bigger targets for each month.",
  quarterly: "Major goals for each quarter.",
};

function emptyGoal(): GoalDraft {
  return { name: "", tracking_type: "boolean", target_value: "", unit: "" };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<Record<string, GoalDraft[]>>({
    daily: [emptyGoal()],
    weekly: [emptyGoal()],
    monthly: [emptyGoal()],
    quarterly: [emptyGoal()],
  });
  const [isPending, startTransition] = useTransition();

  const isWelcome = step === 0;
  const isDone = step === FREQUENCIES.length + 1;
  const freq = !isWelcome && !isDone ? FREQUENCIES[step - 1] : null;

  function addGoal() {
    if (!freq) return;
    setGoals((prev) => ({
      ...prev,
      [freq]: [...prev[freq], emptyGoal()],
    }));
  }

  function removeGoal(idx: number) {
    if (!freq) return;
    setGoals((prev) => ({
      ...prev,
      [freq]: prev[freq].filter((_, i) => i !== idx),
    }));
  }

  function updateGoal(idx: number, field: keyof GoalDraft, value: string) {
    if (!freq) return;
    setGoals((prev) => ({
      ...prev,
      [freq]: prev[freq].map((g, i) => (i === idx ? { ...g, [field]: value } : g)),
    }));
  }

  function addSuggestion(name: string) {
    if (!freq) return;
    setGoals((prev) => ({
      ...prev,
      [freq]: [...prev[freq].filter((g) => g.name !== ""), { ...emptyGoal(), name }],
    }));
  }

  function canProceed(): boolean {
    if (isWelcome) return true;
    return true;
  }

  function next() {
    if (isDone) return finish();
    setStep((s) => s + 1);
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  function finish() {
    startTransition(async () => {
      const allGoals = FREQUENCIES.flatMap((f, _) =>
        goals[f]
          .filter((g) => g.name.trim())
          .map((g, idx) => ({
            name: g.name.trim(),
            frequency: f,
            tracking_type: g.tracking_type,
            target_value: g.tracking_type === "number" && g.target_value ? Number(g.target_value) : null,
            unit: g.tracking_type === "number" ? g.unit || null : null,
            sort_order: idx,
          }))
      );

      for (const goal of allGoals) {
        await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(goal),
        });
      }

      await fetch("/api/onboarding", { method: "POST" });
      router.push("/");
      router.refresh();
    });
  }

  const currentGoals = freq ? goals[freq] : [];
  const currentSuggestions = freq ? SUGGESTIONS[freq] : [];
  const usedNames = new Set(currentGoals.map((g) => g.name.toLowerCase()));

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8 flex gap-1.5">
          {Array.from({ length: FREQUENCIES.length + 2 }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-gray-900" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {isWelcome && (
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Welcome to Goal Journal
            </h1>
            <p className="mt-3 text-gray-500">
              Let&apos;s set up your goals. You&apos;ll define what you want to track daily, weekly, monthly, and quarterly.
            </p>
            <p className="mt-2 text-sm text-gray-400">
              You can always change these later in Settings.
            </p>
          </div>
        )}

        {freq && (
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              {STEP_TITLES[freq]}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{STEP_DESCRIPTIONS[freq]}</p>

            <div className="mt-6 space-y-3">
              {currentGoals.map((goal, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start gap-2">
                    <input
                      type="text"
                      value={goal.name}
                      onChange={(e) => updateGoal(idx, "name", e.target.value)}
                      placeholder="Goal name..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
                    />
                    <button
                      onClick={() => removeGoal(idx)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex rounded-lg bg-gray-100 p-0.5">
                      <button
                        onClick={() => updateGoal(idx, "tracking_type", "boolean")}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                          goal.tracking_type === "boolean"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500"
                        }`}
                      >
                        Habit
                      </button>
                      <button
                        onClick={() => updateGoal(idx, "tracking_type", "number")}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                          goal.tracking_type === "number"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500"
                        }`}
                      >
                        Measurable
                      </button>
                    </div>

                    {goal.tracking_type === "number" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={goal.target_value}
                          onChange={(e) => updateGoal(idx, "target_value", e.target.value)}
                          placeholder="Target"
                          className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-center text-sm focus:border-gray-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={goal.unit}
                          onChange={(e) => updateGoal(idx, "unit", e.target.value)}
                          placeholder="unit"
                          className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-center text-sm focus:border-gray-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={addGoal}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Goal
              </button>
            </div>

            {/* Suggestions */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-gray-400">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {currentSuggestions
                  .filter((s) => !usedNames.has(s.toLowerCase()))
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => addSuggestion(s)}
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-200"
                    >
                      + {s}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {isDone && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              You&apos;re all set!
            </h2>
            <p className="mt-2 text-gray-500">
              Your goals are ready. You can always edit them later in Settings.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex gap-3">
          {step > 0 && !isDone && (
            <button
              onClick={back}
              className="rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200"
            >
              Back
            </button>
          )}
          <button
            onClick={next}
            disabled={!canProceed() || isPending}
            className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? "Saving..." : isDone ? "Go to Dashboard" : step === FREQUENCIES.length ? "Finish Setup" : "Continue"}
          </button>
        </div>

        {/* Skip */}
        {freq && (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="mt-3 w-full text-center text-sm text-gray-400 hover:text-gray-600"
          >
            Skip {freq} goals for now
          </button>
        )}
      </div>
    </div>
  );
}
