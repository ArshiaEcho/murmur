import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { commands } from "@/bindings";
import type { SessionInfo } from "@/bindings";
import { useSessionsStore } from "../../../stores/sessionsStore";
import { useAgentsStore } from "../../../stores/agentsStore";
import { useSettings } from "../../../hooks/useSettings";
import { ProjectRow } from "./SessionTree";
import { Drawer } from "./Drawer";
import { OptionsMenu, PILL } from "./controls";
import { StatusIcon } from "./StatusIcon";
import { autoColor, cx, projectKeyOf, rel } from "./lib";

// ── main view ────────────────────────────────────────────────────────────────

export const SessionsView: React.FC = () => {
  const { t } = useTranslation();
  const sessions = useSessionsStore((s) => s.sessions);
  const selectedId = useSessionsStore((s) => s.selectedId);
  const select = useSessionsStore((s) => s.select);
  const init = useSessionsStore((s) => s.init);
  const reports = useAgentsStore((s) => s.runs);
  const initReports = useAgentsStore((s) => s.init);
  const { getSetting, refreshSettings } = useSettings();

  useEffect(() => {
    init();
    initReports();
  }, [init, initReports]);

  const hideBackground = getSetting("sessions_hide_background") ?? true;
  const rolling = !!getSetting("sessions_rolling_summaries");
  const voiceAlerts = !!getSetting("sessions_voice_alerts");
  const projectColors = (getSetting("project_colors") ?? {}) as Record<string, string>;

  const visible = useMemo(
    () => sessions.filter((s) => !hideBackground || !s.is_background),
    [sessions, hideBackground],
  );

  const groups = useMemo(() => {
    const g: Record<string, SessionInfo[]> = {};
    for (const s of visible) {
      const key = projectKeyOf(s);
      (g[key] ??= []).push(s);
    }
    // Sort projects: those needing attention first, then by name.
    return Object.entries(g).sort((a, b) => {
      const an = a[1].some((s) => s.status === "waiting_for_you") ? 1 : 0;
      const bn = b[1].some((s) => s.status === "waiting_for_you") ? 1 : 0;
      if (an !== bn) return bn - an;
      return a[0].localeCompare(b[0]);
    });
  }, [visible]);

  const colorFor = (key: string) => projectColors[key] || autoColor(key);
  const liveCount = visible.length;
  const needCount = visible.filter((s) => s.status === "waiting_for_you").length;
  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  // ── tree expand/collapse (local UI state; not a data refresh trigger) ──
  // Projects default to expanded; collapse is opt-in. Sessions default collapsed.
  const projectKeys = useMemo(() => groups.map(([name]) => name), [groups]);
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  const allExpanded = projectKeys.every((k) => !collapsedProjects[k]);
  const toggleAll = () =>
    setCollapsedProjects(
      allExpanded ? Object.fromEntries(projectKeys.map((k) => [k, true])) : {},
    );
  const toggleProject = (key: string) =>
    setCollapsedProjects((m) => ({ ...m, [key]: !m[key] }));
  const toggleSession = (id: string) =>
    setExpandedSessions((m) => ({ ...m, [id]: !m[id] }));

  useEffect(() => {
    if (selectedId && !sessions.some((s) => s.id === selectedId)) select(null);
  }, [sessions, selectedId, select]);

  // Escape closes the chat drawer (standard overlay behavior).
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, select]);

  const toggleRolling = async () => {
    await commands.setSessionsRolling(!rolling);
    await refreshSettings();
  };
  const toggleVoiceAlerts = async () => {
    await commands.setSessionsVoiceAlerts(!voiceAlerts);
    await refreshSettings();
  };
  const toggleHideBackground = async () => {
    await commands.setSessionsHideBackground(!hideBackground);
    await refreshSettings();
  };
  const pickColor = async (key: string, color: string) => {
    await commands.setProjectColor(key, color);
    await refreshSettings();
  };

  return (
    <div className="w-full flex flex-col h-[80vh] mx-auto max-w-[1080px]">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-4">
        <h1 className="text-[26px] font-semibold tracking-[-0.4px] text-text">{t("sessions.title")}</h1>
        <span className="inline-flex items-center gap-1.5 font-mono text-[12px] font-semibold text-live">
          <span
            aria-hidden
            className="w-1.5 h-1.5 rounded-full bg-live"
            style={{ animation: "mur-dotpulse 2.2s var(--ease-io) infinite" }}
          />
          <span className="tnum">{liveCount}</span> {t("sessions.live")}
        </span>
        {needCount > 0 && (
          <span className="font-mono text-[12px] font-semibold text-warn">
            <span className="tnum">{needCount}</span> {t("sessions.needYou")}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={toggleAll} className={PILL}>
            {allExpanded ? t("sessions.collapseAll") : t("sessions.expandAll")}
          </button>
          <OptionsMenu
            rolling={rolling}
            voiceAlerts={voiceAlerts}
            hideBackground={hideBackground}
            onRolling={toggleRolling}
            onVoiceAlerts={toggleVoiceAlerts}
            onHideBackground={toggleHideBackground}
          />
        </div>
      </div>

      {/* Tree + recently-finished */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {liveCount === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 12h4l2.5-7 4.5 14 2.5-7H22" />
            </svg>
            <p className="text-[13px] text-text-2 max-w-[320px]">
              {t("sessions.empty")}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-line rounded-2xl overflow-hidden">
            {groups.map(([name, items]) => (
              <ProjectRow
                key={name}
                name={name}
                color={colorFor(name)}
                sessions={items}
                expanded={!collapsedProjects[name]}
                expandedSessions={expandedSessions}
                selectedId={selectedId}
                onToggle={() => toggleProject(name)}
                onToggleSession={toggleSession}
                onOpenChat={select}
                onColor={(c) => pickColor(name, c)}
              />
            ))}
          </div>
        )}

        {/* Recently finished — a single dim strip per run */}
        {reports.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {reports.slice(0, 9).map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-line bg-card opacity-[0.72]"
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[1px] text-text-3 shrink-0">
                  {t("sessions.recentlyFinished")}
                </span>
                <span className="flex items-center shrink-0">
                  <StatusIcon kind={r.status === "failed" ? "failed" : "done"} size={14} />
                </span>
                <span className="text-[12px] text-text-2 truncate" title={r.title ?? ""}>
                  {r.title ?? "Session report"}
                </span>
                <span className="font-mono tnum text-[10px] text-text-3 shrink-0">
                  · {r.repo ?? ""}
                  {r.created_at ? ` · ${rel(Date.parse(r.created_at)) || ""}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => commands.playAgentRun(r.id)}
                  aria-label="Play"
                  title="Play"
                  className={cx(
                    "ml-auto flex items-center justify-center w-7 h-7 rounded-full border border-line-2 text-text-2 transition-colors duration-150 hover:border-signal hover:text-signal shrink-0",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
                  )}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M7 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right-side chat drawer (the hero) */}
      <Drawer
        session={selected}
        color={selected ? colorFor(projectKeyOf(selected)) : "var(--signal)"}
        onClose={() => select(null)}
      />
    </div>
  );
};
