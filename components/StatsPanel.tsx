"use client";

import { useEffect, useState } from "react";
import type { BodyStat } from "@/lib/utils";

export function StatsPanel() {
  const [stats, setStats] = useState<BodyStat[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<BodyStat[]>([]);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setStats(data); })
      .catch(() => {});
  }, []);

  function toggleHistory(name: string) {
    if (expanded === name) {
      setExpanded(null);
      setHistory([]);
      return;
    }
    setExpanded(name);
    fetch(`/api/stats?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setHistory(data); })
      .catch(() => {});
  }

  const weight = stats.filter((s) => s.category === "weight");
  const exercises = stats.filter((s) => s.category === "exercise");
  const measurements = stats.filter((s) => s.category === "measurement");

  if (stats.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">Stats</h3>
        <p className="mt-2 text-xs text-gray-400">
          No stats yet. Text the bot something like &quot;weight: 145 lbs&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Stats</h3>

      <div className="space-y-4">
        {weight.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
              Weight
            </p>
            {weight.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleHistory(s.name)}
                className="w-full text-left"
              >
                <p className="text-lg font-bold text-gray-900">
                  {s.value} {s.unit}
                </p>
              </button>
            ))}
            {expanded === "weight" && history.length > 1 && (
              <HistoryList items={history} />
            )}
          </div>
        )}

        {exercises.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
              Exercise PRs
            </p>
            <div className="space-y-1">
              {exercises.map((s) => (
                <div key={s.id}>
                  <button
                    onClick={() => toggleHistory(s.name)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-sm capitalize text-gray-600">{s.name}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {s.value} {s.unit}
                    </span>
                  </button>
                  {expanded === s.name && history.length > 0 && (
                    <HistoryList items={history} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {measurements.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
              Measurements
            </p>
            <div className="space-y-1">
              {measurements.map((s) => (
                <div key={s.id}>
                  <button
                    onClick={() => toggleHistory(s.name)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-sm capitalize text-gray-600">{s.name}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {s.value} {s.unit}
                    </span>
                  </button>
                  {expanded === s.name && history.length > 0 && (
                    <HistoryList items={history} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryList({ items }: { items: BodyStat[] }) {
  return (
    <div className="mt-1 ml-2 border-l-2 border-gray-100 pl-3">
      {items.slice(0, 8).map((h) => (
        <div key={h.id} className="flex justify-between py-0.5 text-xs text-gray-400">
          <span>{new Date(h.recorded_at).toLocaleDateString()}</span>
          <span>{h.value} {h.unit}</span>
        </div>
      ))}
    </div>
  );
}
