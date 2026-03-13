const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendMessage(chatId: string, text: string) {
  const res = await fetch(`${API_BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
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

export async function sendDailyReminder(chatId: string, goalNames: string[]) {
  const goals = goalNames.map((n) => `• ${n}`).join("\n");
  await sendMessage(
    chatId,
    [
      "Hey! How'd today go?",
      "",
      goals,
      "",
      "Just reply naturally:",
      '_"did everything"_',
      '_"only walked after meals today"_',
      '_"everything except pushups"_',
      '_"nope"_',
    ].join("\n")
  );
}

export async function sendWeeklyReminder(chatId: string, goalNames: string[]) {
  const goals = goalNames.map((n) => `• ${n}`).join("\n");
  await sendMessage(
    chatId,
    [
      "Hey! Weekly check-in time:",
      "",
      goals,
      "",
      "Just reply naturally:",
      '_"did everything"_',
      '_"only yoga this week"_',
      '_"nope"_',
    ].join("\n")
  );
}
