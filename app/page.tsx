import { getTodayLog, getWeekLog, getBingoItems, getRecentDailyLogs } from "@/lib/db";
import { todayStr, weekStartStr, calculateStreak } from "@/lib/utils";
import { DailyGoalsCard } from "@/components/DailyGoalsCard";
import { WeeklyGoalsCard } from "@/components/WeeklyGoalsCard";
import { StreakCalendar } from "@/components/StreakCalendar";
import { BingoBoard } from "@/components/BingoBoard";
import { ManualEntryForm } from "@/components/ManualEntryForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const today = todayStr();
  const weekStart = weekStartStr();

  const [dailyLog, weeklyLog, bingoItems, recentLogs] = await Promise.all([
    getTodayLog(today),
    getWeekLog(weekStart),
    getBingoItems(),
    getRecentDailyLogs(30),
  ]);

  const streak = calculateStreak(recentLogs);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Goal Journal
        </h1>
        <p className="mt-1 text-gray-500">
          Track your daily habits, weekly goals, and yearly bucket list.
        </p>
      </header>

      {streak > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-6 py-4">
          <span className="text-3xl">&#128293;</span>
          <div>
            <p className="text-lg font-bold text-amber-800">
              {streak} day streak!
            </p>
            <p className="text-sm text-amber-600">
              Keep it going — you&apos;re building something great.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <DailyGoalsCard log={dailyLog} date={today} />
          <WeeklyGoalsCard log={weeklyLog} weekStart={weekStart} />
          <ManualEntryForm />
        </div>

        <div className="space-y-6">
          <StreakCalendar />
          <BingoBoard items={bingoItems} />
        </div>
      </div>
    </main>
  );
}
