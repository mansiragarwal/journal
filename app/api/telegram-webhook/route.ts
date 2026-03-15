import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram";
import { parseGoalReply, parseStatsReply, parseBingoReply } from "@/lib/ai-parse";
import {
  getUserByTelegramChatId,
  redeemTelegramLinkCode,
  getGoalDefinitions,
  upsertGoalLog,
  getBingoItems,
  updateBingoItem,
  addBodyStat,
  getLatestStats,
  addIdea,
  getIdeas,
} from "@/lib/db";
import { periodDateFor } from "@/lib/utils";
import { subDays, format } from "date-fns";
import { TZDate } from "@date-fns/tz";

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
  };
}

type MsgType = "daily" | "weekly" | "bingo" | "stats" | "idea" | "show_ideas" | "show_stats";

function detectType(text: string): MsgType {
  const lower = text.toLowerCase();

  if (/^(ideas?|show ideas|my ideas|list ideas)$/i.test(lower.trim())) return "show_ideas";
  if (/^(stats|show stats|my stats)$/i.test(lower.trim())) return "show_stats";
  if (lower.startsWith("idea:") || lower.startsWith("idea ")) return "idea";

  const bingoKeywords = ["bingo", "bucket list", "crossed off", "checked off"];
  if (bingoKeywords.some((kw) => lower.includes(kw))) return "bingo";

  const weeklyKeywords = ["yoga", "pilates", "weightlift", "lifted", "gym", "this week", "weekly"];
  if (weeklyKeywords.some((kw) => lower.includes(kw))) return "weekly";

  const statsKeywords = [
    "weight:", "weighed", "lbs", "kg",
    "bench", "squat", "deadlift", "hip thrust", "press",
    "curl", "row", "lift:",
    "waist", "hips", "chest", "bicep", "thigh", "calf",
    "inches", "inch", "cm", "measurement",
  ];
  if (statsKeywords.some((kw) => lower.includes(kw))) return "stats";
  if (/\bweigh\b/.test(lower)) return "stats";

  return "daily";
}

export async function POST(request: Request) {
  try {
    const update: TelegramUpdate = await request.json();
    const message = update.message;
    if (!message?.text) return NextResponse.json({ ok: true });

    const chatId = String(message.chat.id);
    const text = message.text.trim();

    // Handle /start
    if (text === "/start") {
      await sendMessage(chatId, [
        "Hey! I'm your goal journal bot.",
        "",
        "If you already have an account, link it by going to Settings in the web app and getting a link code.",
        "",
        "Then send: /link YOUR_CODE",
      ].join("\n"));
      return NextResponse.json({ ok: true });
    }

    // Handle /link command
    if (text.startsWith("/link ")) {
      const code = text.replace("/link ", "").trim().toUpperCase();
      const success = await redeemTelegramLinkCode(code, chatId);
      if (success) {
        await sendMessage(chatId, "Linked! You can now message me to update your goals.");
      } else {
        await sendMessage(chatId, "Invalid or expired code. Go to Settings in the web app to get a new one.");
      }
      return NextResponse.json({ ok: true });
    }

    // Look up user by chat ID
    const link = await getUserByTelegramChatId(chatId);
    if (!link) {
      await sendMessage(chatId, "Your Telegram isn't linked yet. Go to Settings in the web app and generate a link code, then send /link YOUR_CODE here.");
      return NextResponse.json({ ok: true });
    }

    const userId = link.user_id;
    const type = detectType(text);

    if (type === "show_ideas") {
      const ideas = await getIdeas(userId, 20);
      if (ideas.length === 0) {
        await sendMessage(chatId, "No ideas yet! Add one like:\nidea: learn pottery");
      } else {
        const list = ideas.map((i, idx) => `${idx + 1}. ${i.text}`).join("\n");
        await sendMessage(chatId, `Your ideas:\n\n${list}`);
      }
    } else if (type === "show_stats") {
      const stats = await getLatestStats(userId);
      if (stats.length === 0) {
        await sendMessage(chatId, "No stats logged yet! Try:\n\"weight: 145 lbs\" or \"bench: 95\"");
      } else {
        const weight = stats.filter((s) => s.category === "weight");
        const exercises = stats.filter((s) => s.category === "exercise");
        const measurements = stats.filter((s) => s.category === "measurement");
        const lines: string[] = [];
        if (weight.length) {
          lines.push("Weight");
          weight.forEach((s) => lines.push(`  ${s.value} ${s.unit}`));
        }
        if (exercises.length) {
          lines.push("\nExercises");
          exercises.forEach((s) => lines.push(`  ${s.name}: ${s.value} ${s.unit}`));
        }
        if (measurements.length) {
          lines.push("\nMeasurements");
          measurements.forEach((s) => lines.push(`  ${s.name}: ${s.value} ${s.unit}`));
        }
        await sendMessage(chatId, lines.join("\n"));
      }
    } else if (type === "idea") {
      const ideaText = text.replace(/^idea:?\s*/i, "").trim();
      if (!ideaText) {
        await sendMessage(chatId, "What's the idea? Try: idea: learn pottery");
      } else {
        await addIdea(userId, ideaText);
        const count = (await getIdeas(userId)).length;
        await sendMessage(chatId, `Added! You have ${count} ideas saved.`);
      }
    } else if (type === "stats") {
      const parsed = await parseStatsReply(text);
      if (parsed.length === 0) {
        await sendMessage(chatId, "Couldn't parse that. Try:\n\"weight: 145 lbs\" or \"bench: 95\"");
      } else {
        for (const stat of parsed) {
          await addBodyStat(userId, stat.category, stat.name, stat.value, stat.unit);
        }
        const confirmation = parsed
          .map((s) => `${s.name}: ${s.value} ${s.unit}`)
          .join("\n");
        await sendMessage(chatId, `Logged!\n\n${confirmation}`);
      }
    } else if (type === "bingo") {
      const bingoItems = await getBingoItems(userId);
      if (bingoItems.length === 0) {
        await sendMessage(chatId, "You don't have a bingo board set up. Create one in the web app.");
        return NextResponse.json({ ok: true });
      }
      const matched = await parseBingoReply(text, bingoItems);
      if (matched.length === 0) {
        await sendMessage(chatId, "Couldn't match that to any bingo items.");
      } else {
        for (const item of matched) await updateBingoItem(item.id, userId, true);
        const all = await getBingoItems(userId);
        const total = all.filter((i) => i.completed).length;
        const names = matched.map((i) => `✅ ${i.title}`).join("\n");
        await sendMessage(chatId, `Bingo updated! ${total}/${all.length} complete:\n\n${names}`);
      }
    } else {
      // daily or weekly goal update
      const frequency = type === "weekly" ? "weekly" : "daily";
      const goals = await getGoalDefinitions(userId, frequency);
      if (goals.length === 0) {
        await sendMessage(chatId, `No ${frequency} goals defined. Set them up in the web app.`);
        return NextResponse.json({ ok: true });
      }

      const now = new TZDate(new Date(), "America/New_York");
      const todayDateStr = format(now, "yyyy-MM-dd");
      const dateGroups = await parseGoalReply(text, goals, frequency, todayDateStr);

      const confirmations: string[] = [];

      for (const group of dateGroups) {
        let pDate: string;
        let dateLabel: string;
        if (group.date_offset != null && group.date_offset < 0) {
          const targetDate = subDays(now, Math.abs(group.date_offset));
          pDate = format(targetDate, "yyyy-MM-dd");
          dateLabel = format(targetDate, "MMM d");
        } else {
          pDate = periodDateFor(frequency);
          dateLabel = frequency === "daily" ? "today" : "this week";
        }

        for (const update of group.updates) {
          await upsertGoalLog(userId, update.goal_id, pDate, {
            completed: update.completed,
            value: update.value,
          });
        }

        const done = group.updates.filter((p) => p.completed).length;
        const items = goals.map((g) => {
          const upd = group.updates.find((p) => p.goal_id === g.id);
          const check = upd?.completed ? "✅" : "⬜";
          const extra = g.tracking_type === "number" && upd?.value != null ? ` (${upd.value})` : "";
          return `${check} ${g.name}${extra}`;
        });

        confirmations.push(`${dateLabel}: ${done}/${goals.length}\n${items.join("\n")}`);
      }

      await sendMessage(chatId, `Got it!\n\n${confirmations.join("\n\n")}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    try {
      const update: TelegramUpdate = await request.clone().json();
      if (update.message?.chat?.id) {
        await sendMessage(String(update.message.chat.id), `Something went wrong: ${errMsg}`);
      }
    } catch {
      // ignore
    }
    return NextResponse.json({ ok: true });
  }
}
