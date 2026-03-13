import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/auth-helpers";
import { completeOnboarding, isOnboardingComplete } from "@/lib/db";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const complete = await isOnboardingComplete(userId);
    return NextResponse.json({ complete });
  } catch (error) {
    console.error("Failed to check onboarding:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    await completeOnboarding(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to complete onboarding:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
