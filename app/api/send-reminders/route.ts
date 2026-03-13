import { NextResponse } from "next/server";
import { sendDailyReminder, sendWeeklyReminder } from "@/lib/telegram";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    if (type === "daily") {
      await sendDailyReminder();
    } else if (type === "weekly") {
      await sendWeeklyReminder();
    } else {
      return NextResponse.json(
        { error: "Invalid type parameter" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, type });
  } catch (error) {
    console.error("Failed to send reminder:", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}
