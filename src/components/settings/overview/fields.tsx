import React from "react";

export type ChipState = "active" | "on" | "off" | "loading" | "idle";

export const KeyChip: React.FC<{ keys: string }> = ({ keys }) => (
  <span className="px-2 py-0.5 text-xs font-semibold bg-mid-gray/10 border border-mid-gray/30 rounded-md whitespace-nowrap">
    {keys || "—"}
  </span>
);

export const StatusDot: React.FC<{ state?: ChipState }> = ({ state = "idle" }) => {
  const cls =
    state === "active" || state === "on"
      ? "bg-logo-primary"
      : state === "loading"
        ? "bg-amber-400 animate-pulse"
        : "bg-mid-gray/40";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
};

export const FieldRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex items-center justify-between gap-2 text-sm">
    <span className="text-mid-gray">{label}</span>
    <span className="font-medium truncate max-w-[62%] text-right">{value}</span>
  </div>
);
