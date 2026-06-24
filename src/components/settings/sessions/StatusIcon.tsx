import React from "react";
import type { StatusKind } from "./lib";
import { STATUS_LABEL } from "./lib";

/**
 * Small inline-SVG status icons — the icons "carry the life":
 *   working   = rotating dashed ring (signal, mur-spin)
 *   needs_you = pulsing alert (warn/amber, mur-dotpulse)
 *   idle      = hollow circle (text-3)
 *   done      = check (ok)
 *   failed    = ✕ (danger)
 *
 * Motion is honored/disabled by the global prefers-reduced-motion block in
 * App.css (it kills all `animation`), so these stay static when reduced.
 */
export const StatusIcon: React.FC<{ kind: StatusKind; size?: number }> = ({
  kind,
  size = 16,
}) => {
  const base = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    role: "img" as const,
    "aria-label": STATUS_LABEL[kind],
  };

  if (kind === "working") {
    return (
      <svg
        {...base}
        style={{ stroke: "var(--signal)", animation: "mur-spin 4.5s linear infinite" }}
      >
        <circle cx={12} cy={12} r={9} strokeDasharray="2.4 3.4" />
      </svg>
    );
  }
  if (kind === "needs_you") {
    return (
      <svg
        {...base}
        style={{ stroke: "var(--warn)", animation: "mur-dotpulse 1.9s var(--ease-io) infinite" }}
      >
        <circle cx={12} cy={12} r={9} />
        <line x1={12} y1={7.5} x2={12} y2={13} />
        <circle cx={12} cy={16.3} r={0.7} fill="var(--warn)" stroke="none" />
      </svg>
    );
  }
  if (kind === "done") {
    return (
      <svg {...base} style={{ stroke: "var(--ok)" }}>
        <circle cx={12} cy={12} r={9} />
        <path d="M8.4 12.2l2.5 2.5 4.7-5.2" />
      </svg>
    );
  }
  if (kind === "failed") {
    return (
      <svg {...base} style={{ stroke: "var(--danger)" }}>
        <circle cx={12} cy={12} r={9} />
        <path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6" />
      </svg>
    );
  }
  // idle
  return (
    <svg {...base} style={{ stroke: "var(--text-3)" }}>
      <circle cx={12} cy={12} r={9} />
    </svg>
  );
};
