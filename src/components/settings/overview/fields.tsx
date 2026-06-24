import React from "react";

export type ChipState = "active" | "on" | "off" | "loading" | "idle";

export const KeyChip: React.FC<{ keys: string }> = ({ keys }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-line-2 bg-card-2 font-mono text-xs font-semibold text-text whitespace-nowrap tnum">
    {keys || "—"}
  </span>
);

// Token-driven status dot. `active`/`on` read as live (signal/teal), `loading`
// pulses (warn), `off` is the danger-free muted state and `idle` is neutral.
export const StatusDot: React.FC<{ state?: ChipState }> = ({
  state = "idle",
}) => {
  const cls =
    state === "active" || state === "on"
      ? "bg-signal"
      : state === "loading"
        ? "bg-warn motion-safe:animate-pulse"
        : state === "off"
          ? "bg-text-3"
          : "bg-text-3/40";
  return (
    <span className={`inline-block h-[7px] w-[7px] rounded-full ${cls}`} />
  );
};

// Key/value summary row: muted key on the left, mono tabular value on the right.
export const FieldRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex items-center gap-2">
    <span className="text-xs font-medium text-text-3">{label}</span>
    <span className="ml-auto font-mono text-xs font-semibold text-text-2 tnum truncate max-w-[62%] text-right">
      {value}
    </span>
  </div>
);
