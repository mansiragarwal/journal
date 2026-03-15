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
        <h3 className="text-sm font-semibold text-gray-900">Body Stats</h3>
        <p className="mt-2 text-xs text-gray-400">
          No stats yet. Text the bot something like &quot;weight: 145 lbs&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Body Stats</h3>

      <div className="space-y-4">
        {weight.length > 0 && (
          <StatSection
            label="Weight"
            items={weight}
            expanded={expanded}
            history={history}
            onToggle={toggleHistory}
            large
          />
        )}

        {exercises.length > 0 && (
          <StatSection
            label="Lifting"
            items={exercises}
            expanded={expanded}
            history={history}
            onToggle={toggleHistory}
          />
        )}

        {measurements.length > 0 && (
          <StatSection
            label="Measurements"
            items={measurements}
            expanded={expanded}
            history={history}
            onToggle={toggleHistory}
          />
        )}
      </div>
    </div>
  );
}

function StatSection({
  label,
  items,
  expanded,
  history,
  onToggle,
  large,
}: {
  label: string;
  items: BodyStat[];
  expanded: string | null;
  history: BodyStat[];
  onToggle: (name: string) => void;
  large?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <div className="space-y-1">
        {items.map((s) => (
          <div key={s.id}>
            <button
              onClick={() => onToggle(s.name)}
              className="group flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
            >
              {large ? (
                <span className="text-lg font-bold text-gray-900">
                  {s.value} {s.unit}
                </span>
              ) : (
                <>
                  <span className="text-sm capitalize text-gray-600">{s.name}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {s.value} {s.unit}
                  </span>
                </>
              )}
              <svg
                className={`ml-1 h-3.5 w-3.5 shrink-0 text-gray-300 transition-transform group-hover:text-gray-500 ${expanded === s.name ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expanded === s.name && history.length > 0 && (
              <HistoryPanel items={history} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;

  const w = 180;
  const h = 40;
  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const trending = data[0] >= data[data.length - 1] ? "down" : "up";
  const color = trending === "up" ? "#10b981" : "#f59e0b";

  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[0].x} cy={points[0].y} r={3} fill={color} />
    </svg>
  );
}

function HistoryPanel({ items }: { items: BodyStat[] }) {
  const chronological = [...items].reverse();
  const values = chronological.map((h) => h.value);

  const first = items[items.length - 1]?.value;
  const latest = items[0]?.value;
  const delta = first != null && latest != null ? latest - first : null;

  return (
    <div className="mt-1 rounded-lg bg-gray-50 p-3">
      {values.length >= 2 && (
        <div className="mb-2">
          <Sparkline data={values} />
        </div>
      )}

      {delta != null && delta !== 0 && (
        <div className="mb-2 flex items-center gap-1.5">
          <span className={`text-xs font-semibold ${delta > 0 ? "text-emerald-600" : "text-amber-600"}`}>
            {delta > 0 ? "+" : ""}{delta.toFixed(1)} {items[0]?.unit}
          </span>
          <span className="text-xs text-gray-400">overall change</span>
        </div>
      )}

      <div className="max-h-36 overflow-y-auto space-y-0.5">
        {items.slice(0, 15).map((h) => (
          <div key={h.id} className="flex justify-between py-0.5 text-xs">
            <span className="text-gray-400">
              {new Date(h.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            <span className="font-medium text-gray-600">{h.value} {h.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
