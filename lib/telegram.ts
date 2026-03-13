const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendMessage(text: string) {
  const res = await fetch(`${API_BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram sendMessage failed: ${err}`);
  }

  return res.json();
}

export async function sendDailyReminder() {
  await sendMessage(
    [
      "Hey! How'd today go?",
      "",
      "• 10k walking",
      "• Walking after meals",
      "• 10 pushups",
      "• Plank",
      "• 30 min brainstorming",
      "",
      "Just reply naturally:",
      '_"did everything"_',
      '_"only walked after meals today"_',
      '_"everything except pushups"_',
      '_"20 pushups, 90s plank"_',
      '_"nope"_',
    ].join("\n")
  );
}

export async function sendWeeklyReminder() {
  await sendMessage(
    [
      "Hey! Weekly check-in time:",
      "",
      "• Yoga",
      "• Pilates",
      "• Weightlifting (2-3x)",
      "",
      "Just reply naturally:",
      '_"did yoga and pilates, lifted 3 times"_',
      '_"only yoga this week"_',
      '_"everything except pilates"_',
      '_"nope"_',
    ].join("\n")
  );
}
