import {
  format,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  differenceInCalendarDays,
  subDays,
} from "date-fns";
import { TZDate } from "@date-fns/tz";

const TZ = "America/New_York";

function nowET() {
  return new TZDate(new Date(), TZ);
}

export function todayStr() {
  return format(nowET(), "yyyy-MM-dd");
}

export function weekStartStr(date: Date = nowET()) {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function monthStartStr(date: Date = nowET()) {
  return format(startOfMonth(date), "yyyy-MM-dd");
}

export function quarterStartStr(date: Date = nowET()) {
  return format(startOfQuarter(date), "yyyy-MM-dd");
}

export function periodDateFor(frequency: string, date: Date = nowET()): string {
  switch (frequency) {
    case "weekly":
      return weekStartStr(date);
    case "monthly":
      return monthStartStr(date);
    case "quarterly":
      return quarterStartStr(date);
    default:
      return format(date, "yyyy-MM-dd");
  }
}

export interface GoalDefinition {
  id: number;
  user_id: string;
  name: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  tracking_type: "boolean" | "number";
  target_value: number | null;
  unit: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface GoalLog {
  id: number;
  goal_id: number;
  user_id: string;
  period_date: string;
  completed: boolean;
  value: number | null;
  updated_at: string;
}

export interface GoalWithLog extends GoalDefinition {
  log?: GoalLog;
}

export interface BingoItem {
  id: number;
  user_id: string;
  position: number;
  title: string;
  completed: boolean;
  completed_at: string | null;
}

export interface BodyStat {
  id: number;
  user_id: string;
  category: string;
  name: string;
  value: number;
  unit: string;
  recorded_at: string;
}

export interface Idea {
  id: number;
  user_id: string;
  text: string;
  created_at: string;
}

export interface TelegramLink {
  user_id: string;
  chat_id: string;
}

export function completionRate(goals: GoalWithLog[]): number {
  if (goals.length === 0) return 0;
  const done = goals.filter((g) => {
    if (!g.log) return false;
    if (g.tracking_type === "boolean") return g.log.completed;
    if (g.target_value && g.log.value != null) return g.log.value >= g.target_value;
    return g.log.value != null && g.log.value > 0;
  }).length;
  return done / goals.length;
}

export function calculateStreak(
  dailyCompletion: { date: string; rate: number }[]
): number {
  if (dailyCompletion.length === 0) return 0;

  const sorted = [...dailyCompletion].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let streak = 0;
  let checkDate = new Date();

  for (const entry of sorted) {
    const logDate = new Date(entry.date);
    const diff = differenceInCalendarDays(checkDate, logDate);
    if (diff > 1) break;
    if (entry.rate >= 0.6) {
      streak++;
      checkDate = subDays(logDate, 1);
    } else {
      break;
    }
  }

  return streak;
}
