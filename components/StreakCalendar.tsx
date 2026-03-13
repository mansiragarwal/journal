"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  subMonths,
  addMonths,
  isToday,
  isFuture,
} from "date-fns";
import type { DailyLog } from "@/lib/utils";
import { dailyCompletionRate } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function GoalTooltip({ log, day }: { log: DailyLog | undefined; day: Date }) {
  const items = log
    ? [
        { done: log.walking_10k, label: "10k walking" },
        { done: log.walking_after_meals, label: "Walk after meals" },
        { done: log.pushups > 0, label: `Pushups${log.pushups > 0 ? ` (${log.pushups})` : ""}` },
        { done: log.plank, label: `Plank${log.plank_time ? ` (${log.plank_time}s)` : ""}` },
        { done: log.brainstorming, label: "Brainstorming" },
      ]
    : [];

  const hasAny = items.some((i) => i.done);

  return (
    <div className="absolute -top-2 left-1/2 z-50 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-3 py-2 text-left text-xs text-white shadow-lg whitespace-nowrap">
      <p className="mb-1 font-semibold">{format(day, "MMM d")}</p>
      {!hasAny ? (
        <p className="text-gray-400">No goals logged</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.label} className={item.done ? "text-emerald-300" : "text-gray-500"}>
              {item.done ? "✓" : "·"} {item.label}
            </li>
          ))}
        </ul>
      )}
      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
    </div>
  );
}

export function StreakCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const mountedRef = useRef(false);

  const fetchLogs = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    fetch(`/api/goals/daily?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchLogs(currentMonth);
    }
  }, [currentMonth, fetchLogs]);

  function changeMonth(next: Date) {
    setLoading(true);
    setCurrentMonth(next);
    fetchLogs(next);
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPadding = (getDay(monthStart) + 6) % 7;

  const logMap = new Map(
    logs.map((l) => [
      typeof l.date === "string" ? l.date.split("T")[0] : l.date,
      l,
    ])
  );

  function rateToColor(rate: number): string {
    if (rate === 0) return "bg-gray-100";
    if (rate <= 0.25) return "bg-emerald-100";
    if (rate <= 0.5) return "bg-emerald-200";
    if (rate <= 0.75) return "bg-emerald-400";
    return "bg-emerald-500";
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => changeMonth(subMonths(currentMonth, 1))}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={() => changeMonth(addMonths(currentMonth, 1))}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="pb-2 text-center text-xs font-medium text-gray-400"
          >
            {d}
          </div>
        ))}

        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const log = logMap.get(dateStr);
          const rate = log ? dailyCompletionRate(log) : 0;
          const future = isFuture(day);
          const today = isToday(day);
          const isHovered = hoveredDate === dateStr;

          return (
            <div
              key={dateStr}
              className="relative"
              onMouseEnter={() => !future && setHoveredDate(dateStr)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              <div
                className={`flex aspect-square cursor-default items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                  future
                    ? "text-gray-300"
                    : today
                      ? `ring-2 ring-emerald-500 ${rateToColor(rate)} text-gray-700`
                      : `${rateToColor(rate)} text-gray-700`
                }`}
              >
                {format(day, "d")}
              </div>
              {isHovered && <GoalTooltip log={log} day={day} />}
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="mt-3 text-center text-xs text-gray-400">
          Loading...
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
        <span>Less</span>
        {["bg-gray-100", "bg-emerald-100", "bg-emerald-200", "bg-emerald-400", "bg-emerald-500"].map(
          (c) => (
            <div key={c} className={`h-3 w-3 rounded ${c}`} />
          )
        )}
        <span>More</span>
      </div>
    </div>
  );
}
