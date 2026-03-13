import { sql } from "@vercel/postgres";
import type { DailyLog, WeeklyLog, BingoItem } from "./utils";

export async function getTodayLog(date: string): Promise<DailyLog | null> {
  const { rows } = await sql`
    SELECT * FROM daily_logs WHERE date = ${date}
  `;
  return (rows[0] as DailyLog) ?? null;
}

export async function upsertDailyLog(
  date: string,
  data: Partial<Omit<DailyLog, "id" | "date">>
) {
  const {
    walking_10k = false,
    walking_after_meals = false,
    pushups = 0,
    plank = false,
    plank_time = null,
    brainstorming = false,
  } = data;

  await sql`
    INSERT INTO daily_logs (date, walking_10k, walking_after_meals, pushups, plank, plank_time, brainstorming)
    VALUES (${date}, ${walking_10k}, ${walking_after_meals}, ${pushups}, ${plank}, ${plank_time}, ${brainstorming})
    ON CONFLICT (date) DO UPDATE SET
      walking_10k = ${walking_10k},
      walking_after_meals = ${walking_after_meals},
      pushups = ${pushups},
      plank = ${plank},
      plank_time = ${plank_time},
      brainstorming = ${brainstorming},
      updated_at = NOW()
  `;
}

export async function getWeekLog(
  weekStart: string
): Promise<WeeklyLog | null> {
  const { rows } = await sql`
    SELECT * FROM weekly_logs WHERE week_start = ${weekStart}
  `;
  return (rows[0] as WeeklyLog) ?? null;
}

export async function upsertWeeklyLog(
  weekStart: string,
  data: Partial<Omit<WeeklyLog, "id" | "week_start">>
) {
  const { yoga = false, pilates = false, weightlifting = 0 } = data;

  await sql`
    INSERT INTO weekly_logs (week_start, yoga, pilates, weightlifting)
    VALUES (${weekStart}, ${yoga}, ${pilates}, ${weightlifting})
    ON CONFLICT (week_start) DO UPDATE SET
      yoga = ${yoga},
      pilates = ${pilates},
      weightlifting = ${weightlifting},
      updated_at = NOW()
  `;
}

export async function getBingoItems(): Promise<BingoItem[]> {
  const { rows } = await sql`
    SELECT * FROM bingo_items ORDER BY position
  `;
  return rows as BingoItem[];
}

export async function updateBingoItem(id: number, completed: boolean) {
  if (completed) {
    await sql`
      UPDATE bingo_items SET completed = true, completed_at = NOW() WHERE id = ${id}
    `;
  } else {
    await sql`
      UPDATE bingo_items SET completed = false, completed_at = NULL WHERE id = ${id}
    `;
  }
}

export async function getDailyLogsForMonth(
  year: number,
  month: number
): Promise<DailyLog[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const { rows } = await sql`
    SELECT * FROM daily_logs
    WHERE date >= ${startDate}::date AND date < ${endDate}::date
    ORDER BY date
  `;
  return rows as DailyLog[];
}

export async function getRecentDailyLogs(limit: number = 30): Promise<DailyLog[]> {
  const { rows } = await sql`
    SELECT * FROM daily_logs ORDER BY date DESC LIMIT ${limit}
  `;
  return rows as DailyLog[];
}
