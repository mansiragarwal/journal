import { NextResponse } from "next/server";
import { getTodayLog, upsertDailyLog, getDailyLogsForMonth } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? todayStr();
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (month && year) {
      const logs = await getDailyLogsForMonth(
        parseInt(year),
        parseInt(month)
      );
      return NextResponse.json(logs);
    }

    const log = await getTodayLog(date);
    return NextResponse.json(log);
  } catch (error) {
    console.error("Failed to fetch daily log:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily log" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const date = body.date ?? todayStr();
    delete body.date;

    await upsertDailyLog(date, body);
    const updated = await getTodayLog(date);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update daily log:", error);
    return NextResponse.json(
      { error: "Failed to update daily log" },
      { status: 500 }
    );
  }
}
