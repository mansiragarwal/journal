import { NextResponse } from "next/server";
import { getIdeas, addIdea, deleteIdea } from "@/lib/db";

export async function GET() {
  try {
    const ideas = await getIdeas();
    return NextResponse.json(ideas);
  } catch (error) {
    console.error("Failed to fetch ideas:", error);
    return NextResponse.json({ error: "Failed to fetch ideas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    await addIdea(text.trim());
    const ideas = await getIdeas();
    return NextResponse.json(ideas);
  } catch (error) {
    console.error("Failed to add idea:", error);
    return NextResponse.json({ error: "Failed to add idea" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (typeof id !== "number") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await deleteIdea(id);
    const ideas = await getIdeas();
    return NextResponse.json(ideas);
  } catch (error) {
    console.error("Failed to delete idea:", error);
    return NextResponse.json({ error: "Failed to delete idea" }, { status: 500 });
  }
}
