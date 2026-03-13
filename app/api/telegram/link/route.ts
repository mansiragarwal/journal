import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/auth-helpers";
import { createTelegramLinkCode, getTelegramLink, unlinkTelegram } from "@/lib/db";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const link = await getTelegramLink(userId);
    return NextResponse.json({ linked: !!link, chat_id: link?.chat_id ?? null });
  } catch (error) {
    console.error("Failed to check telegram link:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await createTelegramLinkCode(userId, code, expires);
    return NextResponse.json({ code, expires_at: expires.toISOString() });
  } catch (error) {
    console.error("Failed to create link code:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    await unlinkTelegram(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to unlink telegram:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
