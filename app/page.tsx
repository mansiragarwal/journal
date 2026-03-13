import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getBingoItems, getDailyCompletionHistory, isOnboardingComplete } from "@/lib/db";
import { calculateStreak } from "@/lib/utils";
import { Dashboard } from "@/components/Dashboard";
import { format, subDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const onboarded = await isOnboardingComplete(userId);
  if (!onboarded) redirect("/onboarding");

  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const [bingoItems, dailyHistory] = await Promise.all([
    getBingoItems(userId),
    getDailyCompletionHistory(userId, startDate, endDate),
  ]);

  const streak = calculateStreak(dailyHistory);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Dashboard
        streak={streak}
        bingoItems={bingoItems}
        userName={session.user.name}
      />
    </main>
  );
}
