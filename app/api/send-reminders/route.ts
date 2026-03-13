import { NextResponse } from "next/server";
import { sendDailyReminder, sendWeeklyReminder } from "@/lib/telegram";
import { getAllLinkedTelegramUsers, getGoalDefinitions } from "@/lib/db";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type !== "daily" && type !== "weekly") {
    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  }

  try {
    const linkedUsers = await getAllLinkedTelegramUsers();
    let sent = 0;

    for (const { user_id, chat_id } of linkedUsers) {
      const goals = await getGoalDefinitions(user_id, type);
      if (goals.length === 0) continue;

      const goalNames = goals.map((g) => {
        if (g.tracking_type === "number" && g.target_value) {
          return `${g.name} (${g.target_value} ${g.unit || ""})`;
        }
        return g.name;
      });

      try {
        if (type === "daily") {
          await sendDailyReminder(chat_id, goalNames);
        } else {
          await sendWeeklyReminder(chat_id, goalNames);
        }
        sent++;
      } catch (err) {
        console.error(`Failed to send ${type} reminder to ${chat_id}:`, err);
      }
    }

    return NextResponse.json({ success: true, type, sent });
  } catch (error) {
    console.error("Failed to send reminders:", error);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
