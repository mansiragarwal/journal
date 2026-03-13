import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/auth-helpers";
import { getLatestStats, getStatHistory, addBodyStat } from "@/lib/db";

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (name) {
      const history = await getStatHistory(userId, name);
      return NextResponse.json(history);
    }

    const stats = await getLatestStats(userId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const { category, name, value, unit } = await request.json();
    if (!category || !name || value == null) {
      return NextResponse.json({ error: "category, name, and value required" }, { status: 400 });
    }

    await addBodyStat(userId, category, name, Number(value), unit || "lbs");
    const stats = await getLatestStats(userId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to add stat:", error);
    return NextResponse.json({ error: "Failed to add stat" }, { status: 500 });
  }
}
