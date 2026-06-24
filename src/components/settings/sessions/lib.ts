import type { SessionInfo, SessionStatus } from "@/bindings";

/** Tiny className joiner (no clsx dependency in this repo). */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// ── color + status helpers ──────────────────────────────────────────────────

/** The 10-swatch project palette — the organizing spine of Sessions.
 *  KEEP exactly as-is (persisted via setProjectColor → project_colors). */
export const PALETTE = [
  "#2dd4bf", // teal
  "#a78bfa", // violet
  "#f59e0b", // amber
  "#34d399", // emerald
  "#60a5fa", // blue
  "#f472b6", // pink
  "#f87171", // red
  "#22d3ee", // cyan
  "#c084fc", // purple
  "#fbbf24", // gold
];

export function basename(p: string): string {
  const t = p.replace(/\/+$/, "");
  const i = t.lastIndexOf("/");
  return i >= 0 ? t.slice(i + 1) : t;
}

/** Stable auto-color for a project key when the user hasn't picked one. */
export function autoColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function projectKeyOf(s: SessionInfo): string {
  return s.workspace ? basename(s.workspace) : s.repo;
}

/** Relative time → now / 30s / 5m / 2h / 1d. */
export function rel(ms?: number | null): string {
  if (!ms) return "";
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (sec < 5) return "now";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/** Convert a #rrggbb hex + alpha into an rgba() string (for color washes). */
export function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** The five visual kinds a status icon / badge can express. Live sessions only
 *  ever carry the three SessionStatus values; `done`/`failed` are reserved for
 *  finished agent runs. */
export type StatusKind = "working" | "needs_you" | "idle" | "done" | "failed";

/** Map the runtime SessionStatus enum to the visual StatusKind. */
export function kindOf(status: SessionStatus): StatusKind {
  return status === "waiting_for_you" ? "needs_you" : status;
}

export const STATUS_LABEL: Record<StatusKind, string> = {
  working: "working",
  needs_you: "needs you",
  idle: "idle",
  done: "done",
  failed: "failed",
};

/** Aggregate a project's status from its sessions (worst-first precedence). */
export function projectStatus(sessions: SessionInfo[]): StatusKind {
  if (sessions.some((s) => s.status === "waiting_for_you")) return "needs_you";
  if (sessions.some((s) => s.status === "working")) return "working";
  if (sessions.some((s) => s.status === "idle")) return "idle";
  return "idle";
}
