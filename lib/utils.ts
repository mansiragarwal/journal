import {
  format,
  startOfWeek,
  differenceInCalendarDays,
  subDays,
} from "date-fns";

export function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export function weekStartStr(date: Date = new Date()) {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export interface DailyLog {
  id: number;
  date: string;
  walking_10k: boolean;
  walking_after_meals: boolean;
  pushups: number;
  plank: boolean;
  plank_time: number | null;
  brainstorming: boolean;
}

export interface WeeklyLog {
  id: number;
  week_start: string;
  yoga: boolean;
  pilates: boolean;
  weightlifting: number;
}

export interface BingoItem {
  id: number;
  position: number;
  title: string;
  completed: boolean;
  completed_at: string | null;
}

export interface BodyStat {
  id: number;
  category: string;
  name: string;
  value: number;
  unit: string;
  recorded_at: string;
}

export interface Idea {
  id: number;
  text: string;
  created_at: string;
}

export function dailyCompletionRate(log: DailyLog): number {
  const goals = [
    log.walking_10k,
    log.walking_after_meals,
    log.pushups >= 10,
    log.plank,
    log.brainstorming,
  ];
  return goals.filter(Boolean).length / goals.length;
}

export function calculateStreak(logs: DailyLog[]): number {
  if (logs.length === 0) return 0;

  const sorted = [...logs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let streak = 0;
  let checkDate = new Date();

  for (const log of sorted) {
    const logDate = new Date(log.date);
    const diff = differenceInCalendarDays(checkDate, logDate);

    if (diff > 1) break;

    if (dailyCompletionRate(log) >= 0.6) {
      streak++;
      checkDate = subDays(logDate, 1);
    } else {
      break;
    }
  }

  return streak;
}
