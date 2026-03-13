import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/auth-helpers";
import { getIdeas, addIdea, deleteIdea } from "@/lib/db";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const ideas = await getIdeas(userId);
    return NextResponse.json(ideas);
  } catch (error) {
    console.error("Failed to fetch ideas:", error);
    return NextResponse.json({ error: "Failed to fetch ideas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const { text } = await request.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    await addIdea(userId, text.trim());
    const ideas = await getIdeas(userId);
    return NextResponse.json(ideas);
  } catch (error) {
    console.error("Failed to add idea:", error);
    return NextResponse.json({ error: "Failed to add idea" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const { id } = await request.json();
    if (typeof id !== "number") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await deleteIdea(id, userId);
    const ideas = await getIdeas(userId);
    return NextResponse.json(ideas);
  } catch (error) {
    console.error("Failed to delete idea:", error);
    return NextResponse.json({ error: "Failed to delete idea" }, { status: 500 });
  }
}
