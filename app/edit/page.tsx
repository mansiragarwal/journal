import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getGoalsWithLogs } from "@/lib/db";
import { todayStr, weekStartStr, monthStartStr, quarterStartStr } from "@/lib/utils";
import { GoalCard } from "@/components/GoalCard";
import { StatsForm } from "@/components/StatsForm";
import { IdeaForm } from "@/components/IdeaForm";

export const dynamic = "force-dynamic";

export default async function EditPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const today = todayStr();
  const weekStart = weekStartStr();
  const monthStart = monthStartStr();
  const quarterStart = quarterStartStr();

  const [dailyGoals, weeklyGoals, monthlyGoals, quarterlyGoals] = await Promise.all([
    getGoalsWithLogs(userId, "daily", today),
    getGoalsWithLogs(userId, "weekly", weekStart),
    getGoalsWithLogs(userId, "monthly", monthStart),
    getGoalsWithLogs(userId, "quarterly", quarterStart),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit</h1>
        <Link
          href="/"
          className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          Back
        </Link>
      </header>

      <div className="space-y-6">
        <GoalCard title="Daily Goals" frequency="daily" periodDate={today} goals={dailyGoals} />
        <GoalCard title="Weekly Goals" frequency="weekly" periodDate={weekStart} goals={weeklyGoals} />
        <GoalCard title="Monthly Goals" frequency="monthly" periodDate={monthStart} goals={monthlyGoals} />
        <GoalCard title="Quarterly Goals" frequency="quarterly" periodDate={quarterStart} goals={quarterlyGoals} />
        <StatsForm />
        <IdeaForm />
      </div>
    </main>
  );
}
