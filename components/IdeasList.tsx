"use client";

import { useEffect, useState } from "react";
import type { Idea } from "@/lib/utils";

export function IdeasList() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/ideas")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setIdeas(data); })
      .catch(() => {});
  }, []);

  if (ideas.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">Ideas</h3>
        <p className="mt-2 text-xs text-gray-400">
          No ideas yet. Text the bot: &quot;idea: learn pottery&quot;
        </p>
      </div>
    );
  }

  const visible = open ? ideas : ideas.slice(0, 5);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between"
      >
        <h3 className="text-sm font-semibold text-gray-900">
          Ideas ({ideas.length})
        </h3>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <ul className="mt-3 space-y-1.5">
        {visible.map((idea) => (
          <li
            key={idea.id}
            className="flex items-start gap-2 text-sm text-gray-600"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
            <span>{idea.text}</span>
          </li>
        ))}
      </ul>

      {ideas.length > 5 && !open && (
        <button
          onClick={() => setOpen(true)}
          className="mt-2 text-xs text-gray-400 hover:text-gray-600"
        >
          +{ideas.length - 5} more
        </button>
      )}
    </div>
  );
}
