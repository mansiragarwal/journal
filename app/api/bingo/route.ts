import { NextResponse } from "next/server";
import { getBingoItems, updateBingoItem } from "@/lib/db";

export async function GET() {
  try {
    const items = await getBingoItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to fetch bingo items:", error);
    return NextResponse.json(
      { error: "Failed to fetch bingo items" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, completed } = await request.json();

    if (typeof id !== "number" || typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "id (number) and completed (boolean) are required" },
        { status: 400 }
      );
    }

    await updateBingoItem(id, completed);
    const items = await getBingoItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to update bingo item:", error);
    return NextResponse.json(
      { error: "Failed to update bingo item" },
      { status: 500 }
    );
  }
}
