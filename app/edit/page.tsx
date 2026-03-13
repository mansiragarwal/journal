import Link from "next/link";
import { getTodayLog, getWeekLog } from "@/lib/db";
import { todayStr, weekStartStr } from "@/lib/utils";
import { DailyGoalsCard } from "@/components/DailyGoalsCard";
import { WeeklyGoalsCard } from "@/components/WeeklyGoalsCard";
import { ManualEntryForm } from "@/components/ManualEntryForm";
import { StatsForm } from "@/components/StatsForm";
import { IdeaForm } from "@/components/IdeaForm";

export const dynamic = "force-dynamic";

export default async function EditPage() {
  const today = todayStr();
  const weekStart = weekStartStr();

  const [dailyLog, weeklyLog] = await Promise.all([
    getTodayLog(today),
    getWeekLog(weekStart),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Edit
        </h1>
        <Link
          href="/"
          className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          Back
        </Link>
      </header>

      <div className="space-y-6">
        <DailyGoalsCard log={dailyLog} date={today} />
        <WeeklyGoalsCard log={weeklyLog} weekStart={weekStart} />
        <ManualEntryForm />
        <StatsForm />
        <IdeaForm />
      </div>
    </main>
  );
}
