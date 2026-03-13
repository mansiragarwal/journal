import Anthropic from "@anthropic-ai/sdk";
import type { ParsedDailyResponse, ParsedWeeklyResponse } from "./parse";
import type { BingoItem } from "./utils";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

const DAILY_SYSTEM = `You parse natural language messages about daily goal completion into JSON.

The 5 daily goals are:
1. walking_10k (walked 10,000 steps)
2. walking_after_meals (walked after meals)
3. pushups (target: 10, but could be any number)
4. plank (did a plank)
5. brainstorming (30 min brainstorming session)

Rules:
- If they say "did everything" / "all done" / "yes" → all true, pushups=10
- If they say "nothing" / "nope" / "no" → all false, pushups=0
- If they say "only X and Y" → only those are true
- If they say "everything except X" / "skipped X" → all true except those
- If they mention a specific pushup count like "20 pushups", use that number
- If they mention plank time like "90s plank" or "2 min plank", set plank=true and plank_time in seconds
- Default plank_time to null unless they specify a duration

Respond with ONLY valid JSON, no markdown, no explanation:
{"walking_10k":bool,"walking_after_meals":bool,"pushups":number,"plank":bool,"plank_time":number|null,"brainstorming":bool}`;

const WEEKLY_SYSTEM = `You parse natural language messages about weekly goal completion into JSON.

The 3 weekly goals are:
1. yoga (did a yoga session this week)
2. pilates (did a pilates session this week)
3. weightlifting (number of weightlifting sessions, target: 2-3)

Rules:
- If they say "did everything" / "all done" / "yes" → yoga=true, pilates=true, weightlifting=2
- If they say "nothing" / "nope" / "no" → all false, weightlifting=0
- If they say "only X" → only that is true
- If they say "everything except X" → all true except that
- If they mention a specific number for weightlifting like "lifted 3 times", use that number

Respond with ONLY valid JSON, no markdown, no explanation:
{"yoga":bool,"pilates":bool,"weightlifting":number}`;

export async function parseDailyReply(
  text: string
): Promise<ParsedDailyResponse> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    system: DAILY_SYSTEM,
    messages: [{ role: "user", content: text }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const parsed = JSON.parse(extractJSON(content.text));

  return {
    walking_10k: Boolean(parsed.walking_10k),
    walking_after_meals: Boolean(parsed.walking_after_meals),
    pushups: Number(parsed.pushups) || 0,
    plank: Boolean(parsed.plank),
    plank_time: parsed.plank_time != null ? Number(parsed.plank_time) : null,
    brainstorming: Boolean(parsed.brainstorming),
  };
}

export async function parseWeeklyReply(
  text: string
): Promise<ParsedWeeklyResponse> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    system: WEEKLY_SYSTEM,
    messages: [{ role: "user", content: text }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const parsed = JSON.parse(extractJSON(content.text));

  return {
    yoga: Boolean(parsed.yoga),
    pilates: Boolean(parsed.pilates),
    weightlifting: Number(parsed.weightlifting) || 0,
  };
}

export interface ParsedStat {
  category: string;
  name: string;
  value: number;
  unit: string;
}

export async function parseStatsReply(text: string): Promise<ParsedStat[]> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: `You parse natural language messages about body stats into JSON.

There are 3 categories:
- "weight" — body weight (e.g. "I weigh 145 lbs", "weight: 65 kg")
- "exercise" — weight lifted for exercises (e.g. "bench: 95 lbs", "I can squat 135", "deadlift 225 lbs")
- "measurement" — body measurements (e.g. "waist: 28 inches", "my hips are 36 in", "bicep 13 inches")

Rules:
- Normalize exercise names to lowercase (e.g. "bench press", "squat", "deadlift", "hip thrust")
- For body weight, name should be "weight"
- Default unit to "lbs" for weight/exercise, "inches" for measurements
- If they specify kg or cm, use those units
- A single message can contain multiple stats

Respond with ONLY valid JSON array, no markdown, no explanation:
[{"category":"...","name":"...","value":number,"unit":"..."}]`,
    messages: [{ role: "user", content: text }],
  });

  const content = message.content[0];
  if (content.type !== "text") return [];

  const parsed = JSON.parse(extractJSON(content.text));
  return Array.isArray(parsed) ? parsed : [];
}

export async function parseBingoReply(
  text: string,
  items: BingoItem[]
): Promise<BingoItem[]> {
  const itemList = items.map((i) => `${i.id}: "${i.title}"`).join("\n");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: `You match a user's message to bingo board items they've completed.

Here are all the bingo items:
${itemList}

Return a JSON array of the IDs that match what the user is describing.
If nothing matches, return an empty array.

Respond with ONLY a valid JSON array of numbers, no markdown, no explanation.
Example: [15] or [3, 7] or []`,
    messages: [{ role: "user", content: text }],
  });

  const content = message.content[0];
  if (content.type !== "text") return [];

  const ids: number[] = JSON.parse(extractJSON(content.text));
  return items.filter((i) => ids.includes(i.id));
}
