import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/auth-helpers";
import {
  getGoalDefinitions,
  getAllGoalDefinitions,
  createGoalDefinition,
  updateGoalDefinition,
  deleteGoalDefinition,
} from "@/lib/db";

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const frequency = searchParams.get("frequency") ?? undefined;
    const includeInactive = searchParams.get("all") === "true";

    const goals = includeInactive
      ? await getAllGoalDefinitions(userId, frequency)
      : await getGoalDefinitions(userId, frequency);
    return NextResponse.json(goals);
  } catch (error) {
    console.error("Failed to fetch goals:", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json();
    const goal = await createGoalDefinition(userId, body);
    return NextResponse.json(goal);
  } catch (error) {
    console.error("Failed to create goal:", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const { id, ...data } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await updateGoalDefinition(id, userId, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update goal:", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await deleteGoalDefinition(id, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete goal:", error);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
