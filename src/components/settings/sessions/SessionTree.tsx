import React from "react";
import { useTranslation } from "react-i18next";
import type { SessionInfo } from "@/bindings";
import { StatusIcon } from "./StatusIcon";
import { SwatchPicker } from "./controls";
import { FOCUS_RING } from "./controls";
import {
  cx,
  kindOf,
  projectStatus,
  rel,
  STATUS_LABEL,
  type StatusKind,
} from "./lib";

// ── per-project status badge ─────────────────────────────────────────────────

const BADGE_STYLE: Record<StatusKind, { bg: string; color: string }> = {
  working: { bg: "var(--live-soft)", color: "var(--live)" },
  needs_you: { bg: "var(--warn-soft)", color: "var(--warn)" },
  idle: { bg: "var(--card-2)", color: "var(--text-3)" },
  done: { bg: "var(--ok-soft)", color: "var(--ok)" },
  failed: { bg: "var(--danger-soft)", color: "var(--danger)" },
};

const StatusBadge: React.FC<{ kind: StatusKind }> = ({ kind }) => (
  <span
    className="inline-flex items-center px-2.5 py-[3px] rounded-[7px] text-[11px] font-medium"
    style={{ background: BADGE_STYLE[kind].bg, color: BADGE_STYLE[kind].color }}
  >
    {STATUS_LABEL[kind]}
  </span>
);

const CountChip: React.FC<{ n: number; tone: "warn" | "live" }> = ({ n, tone }) => (
  <span
    className={cx(
      "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md font-mono tnum text-[11px] font-semibold",
      tone === "warn" ? "bg-warn-soft text-warn" : "bg-live-soft text-live",
    )}
  >
    {n}
  </span>
);

// ── session sub-row (collapsed) + its expanded panel ─────────────────────────

const SessionSubRow: React.FC<{
  session: SessionInfo;
  active: boolean;
  expanded: boolean;
  branch: string | null;
  onToggle: () => void;
  onOpenChat: () => void;
}> = ({ session, active, expanded, branch, onToggle, onOpenChat }) => {
  const { t } = useTranslation();
  const kind = kindOf(session.status);
  const title = session.title ?? session.repo;
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cx(
          "flex items-center gap-2.5 w-full pl-[30px] pr-2 py-[7px] rounded-[9px] text-left transition-colors duration-150 hover:bg-card-hover",
          active && "bg-card-hover",
          FOCUS_RING,
        )}
      >
        <span className="flex shrink-0">
          <StatusIcon kind={kind} size={15} />
        </span>
        <span className="text-[12.5px] font-medium shrink-0 text-text" title={title}>
          {title}
        </span>
        {session.summary && (
          <span className="text-[11.5px] text-text-3 flex-1 min-w-0 truncate">
            {session.summary}
          </span>
        )}
        <span className="ml-auto font-mono tnum text-[10px] text-text-3 shrink-0">
          {rel(session.last_activity_ms)}
        </span>
      </button>

      {expanded && (
        <div className="ml-[30px] mt-0.5 mb-2 px-3.5 py-3 rounded-[11px] border border-line bg-bg-2">
          {session.summary ? (
            <div className="text-[12.5px] leading-[1.55] text-text-2 select-text">
              {session.summary}
            </div>
          ) : (
            <div className="text-[12.5px] leading-[1.55] text-text-3">
              {t("sessions.noSummary")}
            </div>
          )}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {branch && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full border border-line-2 font-mono tnum text-[10px] text-text-2">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <circle cx="6" cy="6" r="2.4" />
                  <circle cx="6" cy="18" r="2.4" />
                  <circle cx="18" cy="7" r="2.4" />
                  <path d="M6 8.4v7.2M18 9.4c0 3-3 3.6-6 3.6" />
                </svg>
                {branch}
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-[3px] rounded-full border border-line-2 font-mono text-[10px] text-text-2">
              {STATUS_LABEL[kind]}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenChat();
              }}
              className={cx(
                "ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-signal bg-signal-soft text-signal text-[11px] font-semibold transition-colors duration-150 hover:bg-signal hover:text-on-signal",
                FOCUS_RING,
              )}
            >
              {t("sessions.openChat")}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── project row (top-level button + expandable sessions) ─────────────────────

export const ProjectRow: React.FC<{
  name: string;
  color: string;
  sessions: SessionInfo[];
  expanded: boolean;
  expandedSessions: Record<string, boolean>;
  selectedId: string | null;
  onToggle: () => void;
  onToggleSession: (id: string) => void;
  onOpenChat: (id: string) => void;
  onColor: (c: string) => void;
}> = ({
  name,
  color,
  sessions,
  expanded,
  expandedSessions,
  selectedId,
  onToggle,
  onToggleSession,
  onOpenChat,
  onColor,
}) => {
  const pst = projectStatus(sessions);
  const needN = sessions.filter((s) => s.status === "waiting_for_you").length;
  const workN = sessions.filter((s) => s.status === "working").length;

  return (
    <div className="border-t border-line first:border-t-0">
      <div
        className={cx(
          "flex items-center gap-2.5 w-full px-4 py-3 transition-colors duration-150 hover:bg-card-hover",
        )}
      >
        {/* Expand/collapse — the whole row is the toggle. */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`${name}, ${STATUS_LABEL[pst]} — ${expanded ? "collapse" : "expand"}`}
          className={cx("flex items-center gap-2.5 flex-1 min-w-0 text-left rounded-md", FOCUS_RING)}
        >
          <span className="flex shrink-0">
            <StatusIcon kind={pst} size={18} />
          </span>
          {/* per-project color dot lives inside the row but the swatch picker is
              a separate interactive control rendered after, so this is decorative */}
          <span
            aria-hidden
            className="w-[7px] h-[7px] rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-semibold text-text truncate">{name}</span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {needN > 0 && <CountChip n={needN} tone="warn" />}
          {workN > 0 && <CountChip n={workN} tone="live" />}
          <StatusBadge kind={pst} />
          {/* Swatch picker — keeps the per-project color wiring (setProjectColor). */}
          <SwatchPicker color={color} onPick={onColor} />
          <button
            type="button"
            onClick={onToggle}
            aria-hidden
            tabIndex={-1}
            className="flex items-center justify-center"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-3)"
              strokeWidth={2}
              style={{
                transition: "transform 0.18s var(--ease-out-quint)",
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="relative px-4 pb-2.5 pt-0.5">
          {/* dashed vertical connector */}
          <div
            aria-hidden
            className="absolute top-0 left-[25px] border-l-[1.5px] border-dashed border-line-2"
            style={{ bottom: "14px" }}
          />
          {sessions.map((s) => (
            <SessionSubRow
              key={s.id}
              session={s}
              branch={s.git_branch}
              active={s.id === selectedId}
              expanded={!!expandedSessions[s.id]}
              onToggle={() => onToggleSession(s.id)}
              onOpenChat={() => onOpenChat(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
