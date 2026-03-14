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
import type { GoalWithLog } from "@/lib/utils";

interface DayEntry {
  date: string;
  rate: number;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function StreakCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [tooltipGoals, setTooltipGoals] = useState<GoalWithLog[]>([]);
  const [tooltipLoading, setTooltipLoading] = useState(false);
  const mountedRef = useRef(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback((date: Date) => {
    const ms = startOfMonth(date);
    const me = endOfMonth(date);
    const startStr = format(ms, "yyyy-MM-dd");
    const endDate = new Date(me);
    endDate.setDate(endDate.getDate() + 1);
    const endStr = format(endDate, "yyyy-MM-dd");

    fetch(`/api/goals/log?history=true&start=${startStr}&end=${endStr}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchData(currentMonth);
    }
  }, [currentMonth, fetchData]);

  function changeMonth(next: Date) {
    setLoading(true);
    setCurrentMonth(next);
    fetchData(next);
  }

  function handleHover(dateStr: string) {
    setHoveredDate(dateStr);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setTooltipLoading(true);
      fetch(`/api/goals/log?frequency=daily&period_date=${dateStr}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setTooltipGoals(data);
          setTooltipLoading(false);
        })
        .catch(() => setTooltipLoading(false));
    }, 150);
  }

  function handleLeave() {
    setHoveredDate(null);
    setTooltipGoals([]);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = (getDay(monthStart) + 6) % 7;

  const entryMap = new Map(entries.map((e) => [e.date, e.rate]));

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
          <div key={d} className="pb-2 text-center text-xs font-medium text-gray-400">
            {d}
          </div>
        ))}

        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const rate = entryMap.get(dateStr) ?? 0;
          const future = isFuture(day);
          const today = isToday(day);
          const isHovered = hoveredDate === dateStr;

          return (
            <div
              key={dateStr}
              className="relative"
              onMouseEnter={() => !future && handleHover(dateStr)}
              onMouseLeave={handleLeave}
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
              {isHovered && !future && (
                <div className="absolute -top-2 left-1/2 z-50 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-3 py-2 text-left text-xs text-white shadow-lg whitespace-nowrap">
                  <p className="mb-1 font-semibold">{format(day, "MMM d")}</p>
                  {tooltipLoading ? (
                    <p className="text-gray-400">Loading...</p>
                  ) : tooltipGoals.length === 0 ? (
                    <p className="text-gray-400">No goals logged</p>
                  ) : (
                    <ul className="space-y-0.5">
                      {tooltipGoals.map((g) => {
                        const done = g.log?.completed;
                        const valueStr =
                          g.tracking_type === "number" && g.log?.value != null
                            ? ` (${g.log.value}${g.target_value ? `/${g.target_value}` : ""} ${g.unit || ""})`
                            : "";
                        return (
                          <li key={g.id} className={done ? "text-emerald-300" : "text-gray-500"}>
                            {done ? "✓" : "·"} {g.name}{valueStr}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="mt-3 text-center text-xs text-gray-400">Loading...</div>
      )}

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
        <span>Less</span>
        {["bg-gray-100", "bg-emerald-100", "bg-emerald-200", "bg-emerald-400", "bg-emerald-500"].map(
          (c) => <div key={c} className={`h-3 w-3 rounded ${c}`} />
        )}
        <span>More</span>
      </div>
    </div>
  );
}
