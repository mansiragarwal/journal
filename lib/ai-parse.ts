import Anthropic from "@anthropic-ai/sdk";
import type { GoalDefinition, BingoItem } from "./utils";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

export interface ParsedGoalUpdate {
  goal_id: number;
  completed: boolean;
  value: number | null;
}

export interface DateGroup {
  date_offset: number | null;
  updates: ParsedGoalUpdate[];
}

export async function parseGoalReply(
  text: string,
  goals: GoalDefinition[],
  frequency: string,
  todayDate: string
): Promise<DateGroup[]> {
  if (goals.length === 0) return [];

  const goalList = goals
    .map((g) => {
      const desc = g.tracking_type === "number"
        ? `(measurable, target: ${g.target_value ?? "?"} ${g.unit || ""})`
        : "(habit, yes/no)";
      return `  ${g.id}: "${g.name}" ${desc}`;
    })
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: `You parse natural language messages about ${frequency} goal completion into JSON.
Today's date is ${todayDate}.

The user's ${frequency} goals are:
${goalList}

Rules:
- If they say "did everything" / "all done" / "yes" -> all completed
- If they say "nothing" / "nope" / "no" -> none completed
- If they say "only X and Y" -> only those completed
- If they say "everything except X" -> all except those completed
- For measurable goals: ALWAYS extract the numeric value if mentioned (e.g. "1x", "twice", "2 times" = value 2). Set completed = true ONLY if value >= target. Partial progress (value < target) should still be logged with completed = false but with the value set.
- For habits, set completed: true/false
- The message may contain MULTIPLE dates/entries (e.g. separate lines for different days). Parse EACH date separately.
- For date references like "yesterday", "3/12", "March 10", "Monday", "2 days ago" — compute date_offset as negative days from today. E.g. if today is 3/13 and they say 3/12, date_offset = -1. If today is 3/13 and they say 3/9, date_offset = -4. If no date is mentioned, date_offset = null (means today).

Respond with ONLY valid JSON array, no markdown. Each entry has a date_offset and the goal updates for that date:
[{"date_offset": number|null, "updates": [{"goal_id": number, "completed": boolean, "value": number|null}]}]`,
    messages: [{ role: "user", content: text }],
  });

  const content = message.content[0];
  if (content.type !== "text") return [];

  const parsed = JSON.parse(extractJSON(content.text));

  if (Array.isArray(parsed)) {
    if (parsed.length > 0 && parsed[0].updates) {
      return parsed as DateGroup[];
    }
    return [{ date_offset: null, updates: parsed as ParsedGoalUpdate[] }];
  }
  if (parsed.updates) {
    return [parsed as DateGroup];
  }
  return [];
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
- "exercise" — weight lifted for exercises (e.g. "bench: 95 lbs", "I can squat 135")
- "measurement" — body measurements (e.g. "waist: 28 inches", "bicep 13 inches")

Rules:
- Normalize exercise names to lowercase
- For body weight, name should be "weight"
- Default unit to "lbs" for weight/exercise, "inches" for measurements
- A single message can contain multiple stats

Respond with ONLY valid JSON array, no markdown:
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

Respond with ONLY a valid JSON array of numbers, no markdown.
Example: [15] or [3, 7] or []`,
    messages: [{ role: "user", content: text }],
  });

  const content = message.content[0];
  if (content.type !== "text") return [];

  const ids: number[] = JSON.parse(extractJSON(content.text));
  return items.filter((i) => ids.includes(i.id));
}
