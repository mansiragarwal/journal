"use client";

import { useState } from "react";
import Link from "next/link";
import { ViewToggle } from "./ViewToggle";
import { StreakCalendar } from "./StreakCalendar";
import { BingoBoard } from "./BingoBoard";
import { StatsPanel } from "./StatsPanel";
import { IdeasList } from "./IdeasList";
import type { BingoItem } from "@/lib/utils";

interface Props {
  streak: number;
  bingoItems: BingoItem[];
}

export function Dashboard({ streak, bingoItems }: Props) {
  const [view, setView] = useState<"calendar" | "bingo">("calendar");

  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Goal Journal
          </h1>
          {streak > 0 && (
            <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-sm font-medium text-amber-700">
              {streak} day streak
            </span>
          )}
        </div>
        <Link
          href="/edit"
          className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          Edit
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="mb-4">
            <ViewToggle active={view} onChange={setView} />
          </div>

          <div className="min-h-[400px]">
            {view === "calendar" ? (
              <StreakCalendar />
            ) : (
              <BingoBoard items={bingoItems} />
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <StatsPanel />
          <IdeasList />
        </aside>
      </div>
    </>
  );
}
