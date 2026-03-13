"use client";

import { useState, useTransition } from "react";
import type { BingoItem } from "@/lib/utils";

interface Props {
  items: BingoItem[];
}

export function BingoBoard({ items: initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const [celebrateId, setCelebrateId] = useState<number | null>(null);

  const completedCount = items.filter((i) => i.completed).length;

  function hasBingo(): boolean {
    const grid = Array.from({ length: 5 }, (_, r) =>
      items.slice(r * 5, r * 5 + 5)
    );

    for (let i = 0; i < 5; i++) {
      if (grid[i].every((item) => item.completed)) return true;
      if (grid.every((row) => row[i].completed)) return true;
    }

    if ([0, 1, 2, 3, 4].every((i) => grid[i][i].completed)) return true;
    if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i].completed)) return true;

    return false;
  }

  function toggleItem(id: number, currentlyCompleted: boolean) {
    startTransition(async () => {
      const res = await fetch("/api/bingo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: !currentlyCompleted }),
      });
      const updated = await res.json();
      if (Array.isArray(updated)) {
        setItems(updated);
        if (!currentlyCompleted) {
          setCelebrateId(id);
          setTimeout(() => setCelebrateId(null), 1000);
        }
      }
    });
  }

  const grid = Array.from({ length: 5 }, (_, row) =>
    items.slice(row * 5, row * 5 + 5)
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">2026 Bingo</h2>
        <div className="flex items-center gap-2">
          {hasBingo() && (
            <span className="rounded-full bg-pink-100 px-3 py-1 text-sm font-bold text-pink-600">
              BINGO!
            </span>
          )}
          <span className="rounded-full bg-pink-100 px-3 py-1 text-sm font-medium text-pink-700">
            {completedCount}/25
          </span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {grid.map((row) =>
          row.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id, item.completed)}
              disabled={isPending}
              className={`relative flex aspect-square items-center justify-center rounded-xl border-2 p-2 text-center text-xs leading-tight transition-all ${
                item.completed
                  ? "border-pink-400 bg-pink-50 font-semibold text-pink-700"
                  : "border-gray-200 bg-gray-50 text-gray-600 hover:border-pink-300 hover:bg-pink-50"
              } ${celebrateId === item.id ? "scale-110" : ""}`}
            >
              {item.completed && (
                <span className="absolute -right-1 -top-1 text-base">
                  &#10003;
                </span>
              )}
              <span className="line-clamp-3">{item.title}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
