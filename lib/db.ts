import { sql } from "@vercel/postgres";
import type {
  GoalDefinition,
  GoalLog,
  GoalWithLog,
  BingoItem,
  BodyStat,
  Idea,
} from "./utils";

// ─── Goal Definitions ────────────────────────────────────────────────

export async function getGoalDefinitions(
  userId: string,
  frequency?: string
): Promise<GoalDefinition[]> {
  if (frequency) {
    const { rows } = await sql`
      SELECT * FROM goal_definitions
      WHERE user_id = ${userId} AND frequency = ${frequency} AND active = true
      ORDER BY sort_order, id
    `;
    return rows as GoalDefinition[];
  }
  const { rows } = await sql`
    SELECT * FROM goal_definitions
    WHERE user_id = ${userId} AND active = true
    ORDER BY frequency, sort_order, id
  `;
  return rows as GoalDefinition[];
}

export async function getAllGoalDefinitions(
  userId: string,
  frequency?: string
): Promise<GoalDefinition[]> {
  if (frequency) {
    const { rows } = await sql`
      SELECT * FROM goal_definitions
      WHERE user_id = ${userId} AND frequency = ${frequency}
      ORDER BY sort_order, id
    `;
    return rows as GoalDefinition[];
  }
  const { rows } = await sql`
    SELECT * FROM goal_definitions
    WHERE user_id = ${userId}
    ORDER BY frequency, sort_order, id
  `;
  return rows as GoalDefinition[];
}

export async function createGoalDefinition(
  userId: string,
  data: {
    name: string;
    frequency: string;
    tracking_type: string;
    target_value?: number | null;
    unit?: string | null;
    sort_order?: number;
  }
): Promise<GoalDefinition> {
  const { rows } = await sql`
    INSERT INTO goal_definitions (user_id, name, frequency, tracking_type, target_value, unit, sort_order)
    VALUES (${userId}, ${data.name}, ${data.frequency}, ${data.tracking_type}, ${data.target_value ?? null}, ${data.unit ?? null}, ${data.sort_order ?? 0})
    RETURNING *
  `;
  return rows[0] as GoalDefinition;
}

export async function updateGoalDefinition(
  id: number,
  userId: string,
  data: Partial<Pick<GoalDefinition, "name" | "target_value" | "unit" | "sort_order" | "active">>
) {
  const current = await sql`SELECT * FROM goal_definitions WHERE id = ${id} AND user_id = ${userId}`;
  if (current.rows.length === 0) return;
  const row = current.rows[0];

  await sql`
    UPDATE goal_definitions SET
      name = ${data.name ?? row.name},
      target_value = ${data.target_value !== undefined ? data.target_value : row.target_value},
      unit = ${data.unit !== undefined ? data.unit : row.unit},
      sort_order = ${data.sort_order ?? row.sort_order},
      active = ${data.active !== undefined ? data.active : row.active}
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

export async function deleteGoalDefinition(id: number, userId: string) {
  await sql`DELETE FROM goal_definitions WHERE id = ${id} AND user_id = ${userId}`;
}

// ─── Goal Logs ───────────────────────────────────────────────────────

export async function getGoalLogs(
  userId: string,
  periodDate: string,
  frequency?: string
): Promise<GoalLog[]> {
  if (frequency) {
    const { rows } = await sql`
      SELECT gl.* FROM goal_logs gl
      JOIN goal_definitions gd ON gl.goal_id = gd.id
      WHERE gl.user_id = ${userId} AND gl.period_date = ${periodDate} AND gd.frequency = ${frequency}
    `;
    return rows as GoalLog[];
  }
  const { rows } = await sql`
    SELECT * FROM goal_logs
    WHERE user_id = ${userId} AND period_date = ${periodDate}
  `;
  return rows as GoalLog[];
}

export async function upsertGoalLog(
  userId: string,
  goalId: number,
  periodDate: string,
  data: { completed?: boolean; value?: number | null }
) {
  await sql`
    INSERT INTO goal_logs (goal_id, user_id, period_date, completed, value)
    VALUES (${goalId}, ${userId}, ${periodDate}, ${data.completed ?? false}, ${data.value ?? null})
    ON CONFLICT (goal_id, period_date) DO UPDATE SET
      completed = ${data.completed ?? false},
      value = ${data.value ?? null},
      updated_at = NOW()
  `;
}

export async function getGoalsWithLogs(
  userId: string,
  frequency: string,
  periodDate: string
): Promise<GoalWithLog[]> {
  const { rows } = await sql`
    SELECT
      gd.*,
      gl.id as log_id,
      gl.period_date as log_period_date,
      gl.completed as log_completed,
      gl.value as log_value,
      gl.updated_at as log_updated_at
    FROM goal_definitions gd
    LEFT JOIN goal_logs gl ON gl.goal_id = gd.id AND gl.period_date = ${periodDate}
    WHERE gd.user_id = ${userId} AND gd.frequency = ${frequency} AND gd.active = true
    ORDER BY gd.sort_order, gd.id
  `;

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    frequency: r.frequency,
    tracking_type: r.tracking_type,
    target_value: r.target_value,
    unit: r.unit,
    sort_order: r.sort_order,
    active: r.active,
    created_at: r.created_at,
    log: r.log_id
      ? {
          id: r.log_id,
          goal_id: r.id,
          user_id: r.user_id,
          period_date: r.log_period_date,
          completed: r.log_completed,
          value: r.log_value,
          updated_at: r.log_updated_at,
        }
      : undefined,
  })) as GoalWithLog[];
}

export async function getDailyCompletionHistory(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ date: string; rate: number }[]> {
  const { rows: totalRow } = await sql`
    SELECT COUNT(*) as total FROM goal_definitions
    WHERE user_id = ${userId} AND frequency = 'daily' AND active = true
  `;
  const totalGoals = Number(totalRow[0]?.total) || 0;
  if (totalGoals === 0) return [];

  const { rows } = await sql`
    SELECT
      gl.period_date::text as date,
      COUNT(CASE WHEN gl.completed THEN 1 END)::float as done
    FROM goal_logs gl
    JOIN goal_definitions gd ON gl.goal_id = gd.id
    WHERE gl.user_id = ${userId}
      AND gd.frequency = 'daily'
      AND gd.active = true
      AND gl.period_date >= ${startDate}::date
      AND gl.period_date < ${endDate}::date
    GROUP BY gl.period_date
    ORDER BY gl.period_date
  `;
  return rows.map((r) => ({
    date: r.date,
    rate: Math.min(1, Number(r.done) / totalGoals),
  }));
}

// ─── Bingo Items ─────────────────────────────────────────────────────

export async function getBingoItems(userId: string): Promise<BingoItem[]> {
  const { rows } = await sql`
    SELECT * FROM bingo_items WHERE user_id = ${userId} ORDER BY position
  `;
  return rows as BingoItem[];
}

export async function updateBingoItem(
  id: number,
  userId: string,
  completed: boolean
) {
  if (completed) {
    await sql`
      UPDATE bingo_items SET completed = true, completed_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `;
  } else {
    await sql`
      UPDATE bingo_items SET completed = false, completed_at = NULL
      WHERE id = ${id} AND user_id = ${userId}
    `;
  }
}

export async function createBingoItems(
  userId: string,
  items: { position: number; title: string }[]
) {
  await sql`DELETE FROM bingo_items WHERE user_id = ${userId}`;
  for (const item of items) {
    await sql`
      INSERT INTO bingo_items (user_id, position, title)
      VALUES (${userId}, ${item.position}, ${item.title})
    `;
  }
}

// ─── Body Stats ──────────────────────────────────────────────────────

export async function addBodyStat(
  userId: string,
  category: string,
  name: string,
  value: number,
  unit: string = "lbs"
) {
  await sql`
    INSERT INTO body_stats (user_id, category, name, value, unit)
    VALUES (${userId}, ${category}, ${name}, ${value}, ${unit})
  `;
}

export async function getLatestStats(userId: string): Promise<BodyStat[]> {
  const { rows } = await sql`
    SELECT DISTINCT ON (name) *
    FROM body_stats
    WHERE user_id = ${userId}
    ORDER BY name, recorded_at DESC
  `;
  return rows as BodyStat[];
}

export async function getStatHistory(
  userId: string,
  name: string,
  limit: number = 30
): Promise<BodyStat[]> {
  const { rows } = await sql`
    SELECT * FROM body_stats
    WHERE user_id = ${userId} AND name = ${name}
    ORDER BY recorded_at DESC
    LIMIT ${limit}
  `;
  return rows as BodyStat[];
}

// ─── Ideas ───────────────────────────────────────────────────────────

export async function addIdea(userId: string, text: string) {
  await sql`INSERT INTO ideas (user_id, text) VALUES (${userId}, ${text})`;
}

export async function getIdeas(
  userId: string,
  limit: number = 50
): Promise<Idea[]> {
  const { rows } = await sql`
    SELECT * FROM ideas
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as Idea[];
}

export async function deleteIdea(id: number, userId: string) {
  await sql`DELETE FROM ideas WHERE id = ${id} AND user_id = ${userId}`;
}

// ─── Users ───────────────────────────────────────────────────────────

export async function completeOnboarding(userId: string) {
  await sql`UPDATE users SET onboarding_complete = true WHERE id = ${userId}`;
}

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const { rows } = await sql`
    SELECT onboarding_complete FROM users WHERE id = ${userId}
  `;
  return rows[0]?.onboarding_complete ?? false;
}

export async function getUserByEmail(email: string) {
  const { rows } = await sql`SELECT * FROM users WHERE email = ${email}`;
  return rows[0] ?? null;
}

// ─── Telegram ────────────────────────────────────────────────────────

export async function getUserByTelegramChatId(
  chatId: string
): Promise<{ user_id: string } | null> {
  const { rows } = await sql`
    SELECT user_id FROM telegram_links WHERE chat_id = ${chatId}
  `;
  return rows[0] ? { user_id: rows[0].user_id } : null;
}

export async function createTelegramLinkCode(
  userId: string,
  code: string,
  expiresAt: Date
) {
  await sql`
    DELETE FROM telegram_link_codes WHERE user_id = ${userId}
  `;
  await sql`
    INSERT INTO telegram_link_codes (code, user_id, expires_at)
    VALUES (${code}, ${userId}, ${expiresAt.toISOString()})
  `;
}

export async function redeemTelegramLinkCode(
  code: string,
  chatId: string
): Promise<boolean> {
  const { rows } = await sql`
    SELECT * FROM telegram_link_codes
    WHERE code = ${code} AND expires_at > NOW()
  `;
  if (rows.length === 0) return false;

  const userId = rows[0].user_id;

  await sql`
    INSERT INTO telegram_links (user_id, chat_id)
    VALUES (${userId}, ${chatId})
    ON CONFLICT (user_id) DO UPDATE SET chat_id = ${chatId}, linked_at = NOW()
  `;

  await sql`DELETE FROM telegram_link_codes WHERE code = ${code}`;
  return true;
}

export async function getTelegramLink(
  userId: string
): Promise<{ chat_id: string } | null> {
  const { rows } = await sql`
    SELECT chat_id FROM telegram_links WHERE user_id = ${userId}
  `;
  return rows[0] ? { chat_id: rows[0].chat_id } : null;
}

export async function unlinkTelegram(userId: string) {
  await sql`DELETE FROM telegram_links WHERE user_id = ${userId}`;
}

export async function getAllLinkedTelegramUsers(): Promise<
  { user_id: string; chat_id: string }[]
> {
  const { rows } = await sql`SELECT user_id, chat_id FROM telegram_links`;
  return rows as { user_id: string; chat_id: string }[];
}
