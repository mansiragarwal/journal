import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram";
import { parseDailyReply, parseWeeklyReply, parseBingoReply, parseStatsReply } from "@/lib/ai-parse";
import {
  upsertDailyLog, upsertWeeklyLog,
  getBingoItems, updateBingoItem,
  addBodyStat, getLatestStats,
  addIdea, getIdeas,
} from "@/lib/db";
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

type MsgType = "daily" | "weekly" | "bingo" | "stats" | "idea" | "show_ideas" | "show_stats";

function detectType(text: string): MsgType {
  const lower = text.toLowerCase();

  if (/^(ideas?|show ideas|my ideas|list ideas)$/i.test(lower.trim())) return "show_ideas";
  if (/^(stats|show stats|my stats)$/i.test(lower.trim())) return "show_stats";

  if (lower.startsWith("idea:") || lower.startsWith("idea ")) return "idea";

  const statsKeywords = [
    "weigh", "weight:", "lbs", "kg",
    "bench", "squat", "deadlift", "hip thrust", "press",
    "curl", "row", "lift:",
    "waist", "hips", "chest", "bicep", "thigh", "calf",
    "inches", "inch", "cm",
    "measurement",
  ];
  if (statsKeywords.some((kw) => lower.includes(kw))) return "stats";

  const bingoKeywords = ["bingo", "bucket list", "crossed off", "checked off"];
  if (bingoKeywords.some((kw) => lower.includes(kw))) return "bingo";

  const weeklyKeywords = ["yoga", "pilates", "weightlift", "lifted", "gym", "this week", "weekly"];
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
    data.walking_10k, data.walking_after_meals,
    data.pushups >= 10, data.plank, data.brainstorming,
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
  const done = [data.yoga, data.pilates, data.weightlifting >= 2].filter(Boolean).length;
  return `Got it! ${done}/3 this week:\n\n${items.join("\n")}`;
}

export async function POST(request: Request) {
  try {
    const update: TelegramUpdate = await request.json();
    const message = update.message;

    if (!message?.text) return NextResponse.json({ ok: true });
    if (!isAuthorizedChat(message.chat.id)) return NextResponse.json({ ok: true });

    const text = message.text.trim();

    if (text === "/start") {
      await sendMessage(
        [
          "Hey! I'm your goal journal bot. Here's what I can do:",
          "",
          "Just text me naturally and I'll figure it out:",
          '• Daily goals: "only walked after meals today"',
          '• Weekly goals: "did yoga and pilates"',
          '• Bingo: "bingo: I got a tattoo"',
          '• Stats: "bench: 95 lbs" or "I weigh 145"',
          '• Measurements: "waist: 28 inches"',
          '• Ideas: "idea: learn pottery"',
          "",
          "Commands:",
          '• "ideas" — see your idea list',
          '• "stats" — see your latest stats',
        ].join("\n")
      );
      return NextResponse.json({ ok: true });
    }

    const type = detectType(text);

    if (type === "show_ideas") {
      const ideas = await getIdeas(20);
      if (ideas.length === 0) {
        await sendMessage("No ideas yet! Add one like:\nidea: learn pottery");
      } else {
        const list = ideas.map((i, idx) => `${idx + 1}. ${i.text}`).join("\n");
        await sendMessage(`Your ideas:\n\n${list}`);
      }
    } else if (type === "show_stats") {
      const stats = await getLatestStats();
      if (stats.length === 0) {
        await sendMessage("No stats logged yet! Try:\n\"weight: 145 lbs\" or \"bench: 95\"");
      } else {
        const weight = stats.filter((s) => s.category === "weight");
        const exercises = stats.filter((s) => s.category === "exercise");
        const measurements = stats.filter((s) => s.category === "measurement");
        const lines: string[] = [];
        if (weight.length) {
          lines.push("⚖️ Weight");
          weight.forEach((s) => lines.push(`  ${s.value} ${s.unit}`));
        }
        if (exercises.length) {
          lines.push("\n💪 Exercises");
          exercises.forEach((s) => lines.push(`  ${s.name}: ${s.value} ${s.unit}`));
        }
        if (measurements.length) {
          lines.push("\n📏 Measurements");
          measurements.forEach((s) => lines.push(`  ${s.name}: ${s.value} ${s.unit}`));
        }
        await sendMessage(lines.join("\n"));
      }
    } else if (type === "idea") {
      const ideaText = text.replace(/^idea:?\s*/i, "").trim();
      if (!ideaText) {
        await sendMessage("What's the idea? Try: idea: learn pottery");
      } else {
        await addIdea(ideaText);
        const count = (await getIdeas()).length;
        await sendMessage(`💡 Added! You have ${count} ideas saved.`);
      }
    } else if (type === "stats") {
      const parsed = await parseStatsReply(text);
      if (parsed.length === 0) {
        await sendMessage("Couldn't parse that. Try:\n\"weight: 145 lbs\" or \"bench: 95\"");
      } else {
        for (const stat of parsed) {
          await addBodyStat(stat.category, stat.name, stat.value, stat.unit);
        }
        const confirmation = parsed.map((s) =>
          s.category === "weight"
            ? `⚖️ Weight: ${s.value} ${s.unit}`
            : s.category === "exercise"
              ? `💪 ${s.name}: ${s.value} ${s.unit}`
              : `📏 ${s.name}: ${s.value} ${s.unit}`
        ).join("\n");
        await sendMessage(`Logged!\n\n${confirmation}`);
      }
    } else if (type === "bingo") {
      const bingoItems = await getBingoItems();
      const matched = await parseBingoReply(text, bingoItems);
      if (matched.length === 0) {
        await sendMessage("Couldn't match that to any bingo items. Try:\n\"bingo: I had a phone free day\"");
      } else {
        for (const item of matched) await updateBingoItem(item.id, true);
        const all = await getBingoItems();
        const total = all.filter((i) => i.completed).length;
        const names = matched.map((i) => `✅ ${i.title}`).join("\n");
        await sendMessage(`Bingo updated! ${total}/25 complete:\n\n${names}`);
      }
    } else if (type === "daily") {
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
    const errMsg = error instanceof Error ? error.message : String(error);
    try {
      await sendMessage(`Something went wrong: ${errMsg}`);
    } catch {
      // ignore
    }
    return NextResponse.json({ ok: true });
  }
}
