"use client";

interface Props {
  active: "calendar" | "bingo";
  onChange: (view: "calendar" | "bingo") => void;
}

export function ViewToggle({ active, onChange }: Props) {
  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-1">
      {(["calendar", "bingo"] as const).map((view) => (
        <button
          key={view}
          onClick={() => onChange(view)}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
            active === view
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {view === "calendar" ? "Calendar" : "Bingo"}
        </button>
      ))}
    </div>
  );
}
