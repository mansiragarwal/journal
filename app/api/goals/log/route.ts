import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/auth-helpers";
import {
  getGoalsWithLogs,
  upsertGoalLog,
  getDailyCompletionHistory,
} from "@/lib/db";

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const frequency = searchParams.get("frequency");
    const periodDate = searchParams.get("period_date");

    if (searchParams.has("history")) {
      const startDate = searchParams.get("start")!;
      const endDate = searchParams.get("end")!;
      const history = await getDailyCompletionHistory(userId, startDate, endDate);
      return NextResponse.json(history);
    }

    if (!frequency || !periodDate) {
      return NextResponse.json(
        { error: "frequency and period_date are required" },
        { status: 400 }
      );
    }

    const goals = await getGoalsWithLogs(userId, frequency, periodDate);
    return NextResponse.json(goals);
  } catch (error) {
    console.error("Failed to fetch goal logs:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json();

    if (Array.isArray(body.logs)) {
      for (const log of body.logs) {
        await upsertGoalLog(userId, log.goal_id, log.period_date, {
          completed: log.completed,
          value: log.value,
        });
      }
    } else {
      const { goal_id, period_date, completed, value } = body;
      if (!goal_id || !period_date) {
        return NextResponse.json(
          { error: "goal_id and period_date are required" },
          { status: 400 }
        );
      }
      await upsertGoalLog(userId, goal_id, period_date, { completed, value });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to upsert goal log:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
