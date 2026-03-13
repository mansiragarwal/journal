import { NextResponse } from "next/server";
import {
  parseDailyEmailResponse,
  parseWeeklyEmailResponse,
} from "@/lib/email";
import { upsertDailyLog, upsertWeeklyLog } from "@/lib/db";
import { todayStr, weekStartStr } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const emailText: string = body.text || body.html || "";
    const subject: string = body.subject || "";

    if (subject.includes("Daily Goals")) {
      const parsed = parseDailyEmailResponse(emailText);
      await upsertDailyLog(todayStr(), parsed);
      return NextResponse.json({ success: true, type: "daily", parsed });
    }

    if (subject.includes("Weekly Goals")) {
      const parsed = parseWeeklyEmailResponse(emailText);
      await upsertWeeklyLog(weekStartStr(), parsed);
      return NextResponse.json({ success: true, type: "weekly", parsed });
    }

    return NextResponse.json(
      { error: "Unrecognized email subject" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to process email:", error);
    return NextResponse.json(
      { error: "Failed to process email" },
      { status: 500 }
    );
  }
}
