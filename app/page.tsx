import { getBingoItems, getRecentDailyLogs } from "@/lib/db";
import { calculateStreak } from "@/lib/utils";
import { Dashboard } from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [bingoItems, recentLogs] = await Promise.all([
    getBingoItems(),
    getRecentDailyLogs(30),
  ]);

  const streak = calculateStreak(recentLogs);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Dashboard streak={streak} bingoItems={bingoItems} />
    </main>
  );
}
