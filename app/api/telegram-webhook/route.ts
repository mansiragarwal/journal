import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram";
import { parseDailyReply, parseWeeklyReply } from "@/lib/ai-parse";
import { upsertDailyLog, upsertWeeklyLog } from "@/lib/db";
import { todayStr, weekStartStr } from "@/lib/utils";

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
  };
}

function isAuthorizedChat(chatId: number): boolean {
  return String(chatId) === process.env.TELEGRAM_CHAT_ID;
}

function detectType(text: string): "daily" | "weekly" | "unknown" {
  const lower = text.toLowerCase();

  const weeklyKeywords = [
    "yoga",
    "pilates",
    "weightlift",
    "lifted",
    "gym",
    "this week",
    "weekly",
  ];
  if (weeklyKeywords.some((kw) => lower.includes(kw))) return "weekly";

  return "daily";
}

function formatDailyConfirmation(data: {
  walking_10k: boolean;
  walking_after_meals: boolean;
  pushups: number;
  plank: boolean;
  plank_time: number | null;
  brainstorming: boolean;
}): string {
  const items = [
    `${data.walking_10k ? "✅" : "⬜"} 10k walking`,
    `${data.walking_after_meals ? "✅" : "⬜"} Walk after meals`,
    `${data.pushups > 0 ? "✅" : "⬜"} Pushups${data.pushups > 0 ? ` (${data.pushups})` : ""}`,
    `${data.plank ? "✅" : "⬜"} Plank${data.plank_time ? ` (${data.plank_time}s)` : ""}`,
    `${data.brainstorming ? "✅" : "⬜"} Brainstorming`,
  ];

  const done = [
    data.walking_10k,
    data.walking_after_meals,
    data.pushups >= 10,
    data.plank,
    data.brainstorming,
  ].filter(Boolean).length;

  return `Got it! ${done}/5 today:\n\n${items.join("\n")}`;
}

function formatWeeklyConfirmation(data: {
  yoga: boolean;
  pilates: boolean;
  weightlifting: number;
}): string {
  const items = [
    `${data.yoga ? "✅" : "⬜"} Yoga`,
    `${data.pilates ? "✅" : "⬜"} Pilates`,
    `${data.weightlifting > 0 ? "✅" : "⬜"} Weightlifting${data.weightlifting > 0 ? ` (${data.weightlifting}x)` : ""}`,
  ];

  const done = [data.yoga, data.pilates, data.weightlifting >= 2].filter(
    Boolean
  ).length;

  return `Got it! ${done}/3 this week:\n\n${items.join("\n")}`;
}

export async function POST(request: Request) {
  try {
    const update: TelegramUpdate = await request.json();
    const message = update.message;

    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    if (!isAuthorizedChat(message.chat.id)) {
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();

    if (text === "/start") {
      await sendMessage(
        "Hey! I'm your goal journal bot. I'll send you daily and weekly check-ins. Just reply naturally when I ask how your day went!"
      );
      return NextResponse.json({ ok: true });
    }

    const type = detectType(text);

    if (type === "daily") {
      const parsed = await parseDailyReply(text);
      await upsertDailyLog(todayStr(), parsed);
      await sendMessage(formatDailyConfirmation(parsed));
    } else if (type === "weekly") {
      const parsed = await parseWeeklyReply(text);
      await upsertWeeklyLog(weekStartStr(), parsed);
      await sendMessage(formatWeeklyConfirmation(parsed));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    try {
      await sendMessage("Hmm, I couldn't understand that. Try again?");
    } catch {
      // ignore send failure
    }
    return NextResponse.json({ ok: true });
  }
}
