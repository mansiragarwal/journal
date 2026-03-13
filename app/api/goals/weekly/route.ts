import { NextResponse } from "next/server";
import { getWeekLog, upsertWeeklyLog } from "@/lib/db";
import { weekStartStr } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("week") ?? weekStartStr();

    const log = await getWeekLog(weekStart);
    return NextResponse.json(log);
  } catch (error) {
    console.error("Failed to fetch weekly log:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly log" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const weekStart = body.week_start ?? weekStartStr();
    delete body.week_start;

    await upsertWeeklyLog(weekStart, body);
    const updated = await getWeekLog(weekStart);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update weekly log:", error);
    return NextResponse.json(
      { error: "Failed to update weekly log" },
      { status: 500 }
    );
  }
}
