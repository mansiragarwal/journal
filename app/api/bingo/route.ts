import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/auth-helpers";
import { getBingoItems, updateBingoItem, createBingoItems } from "@/lib/db";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const items = await getBingoItems(userId);
    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to fetch bingo items:", error);
    return NextResponse.json({ error: "Failed to fetch bingo items" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const { id, completed } = await request.json();
    if (typeof id !== "number" || typeof completed !== "boolean") {
      return NextResponse.json({ error: "id and completed are required" }, { status: 400 });
    }

    await updateBingoItem(id, userId, completed);
    const items = await getBingoItems(userId);
    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to update bingo item:", error);
    return NextResponse.json({ error: "Failed to update bingo item" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const { items } = await request.json();
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "items array required" }, { status: 400 });
    }
    await createBingoItems(userId, items);
    const all = await getBingoItems(userId);
    return NextResponse.json(all);
  } catch (error) {
    console.error("Failed to create bingo items:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
