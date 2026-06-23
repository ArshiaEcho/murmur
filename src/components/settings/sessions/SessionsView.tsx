import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pin,
  RefreshCw,
  Volume2,
  ExternalLink,
  GitBranch,
  Send,
  Square,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Loader2,
  Play,
  Radio,
} from "lucide-react";
import { commands } from "@/bindings";
import type { SessionInfo, SessionStatus, TranscriptTurn } from "@/bindings";
import { useSessionsStore } from "../../../stores/sessionsStore";
import { useAgentsStore } from "../../../stores/agentsStore";
import { useSettings } from "../../../hooks/useSettings";

const STATUS_META: Record<
  SessionStatus,
  { dot: string; label: string; chip: string }
> = {
  working: {
    dot: "bg-emerald-500",
    label: "working",
    chip: "bg-emerald-500/15 text-emerald-600",
  },
  waiting_for_you: {
    dot: "bg-amber-400 animate-pulse",
    label: "needs you",
    chip: "bg-amber-400/15 text-amber-600",
  },
  idle: {
    dot: "bg-mid-gray/40",
    label: "idle",
    chip: "bg-mid-gray/15 text-mid-gray",
  },
};

function basename(p: string): string {
  const t = p.replace(/\/+$/, "");
  const i = t.lastIndexOf("/");
  return i >= 0 ? t.slice(i + 1) : t;
}

function rel(ms?: number | null): string {
  if (!ms) return "";
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const StatusDot: React.FC<{ status: SessionStatus }> = ({ status }) => (
  <span
    className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_META[status].dot}`}
  />
);

const SessionRow: React.FC<{
  session: SessionInfo;
  active: boolean;
  onSelect: () => void;
  onPin: () => void;
}> = ({ session, active, onSelect, onPin }) => (
  <div
    onClick={onSelect}
    className={`group flex items-start gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
      active
        ? "bg-logo-primary/15"
        : "hover:bg-mid-gray/10"
    }`}
  >
    <div className="pt-1">
      <StatusDot status={session.status} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium truncate flex-1" title={session.title ?? session.repo}>
          {session.title ?? session.repo}
        </p>
        <span className="text-[10px] text-mid-gray shrink-0">
          {rel(session.last_activity_ms)}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-mid-gray">
        <span className="truncate">{session.repo}</span>
        {session.git_branch && (
          <span className="flex items-center gap-0.5 truncate">
            <GitBranch size={10} />
            {session.git_branch}
          </span>
        )}
      </div>
    </div>
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onPin();
      }}
      title={session.pinned ? "Unpin" : "Pin (live summary)"}
      className={`shrink-0 p-0.5 rounded transition-opacity ${
        session.pinned
          ? "text-logo-primary opacity-100"
          : "text-mid-gray opacity-0 group-hover:opacity-100"
      }`}
    >
      <Pin size={13} fill={session.pinned ? "currentColor" : "none"} />
    </button>
  </div>
);

const Group: React.FC<{
  name: string;
  sessions: SessionInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPin: (id: string) => void;
}> = ({ name, sessions, selectedId, onSelect, onPin }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 w-full px-1.5 py-1 text-[11px] uppercase tracking-wide text-mid-gray hover:text-text"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="truncate">{name}</span>
        <span className="ml-auto">{sessions.length}</span>
      </button>
      {open &&
        sessions.map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            active={s.id === selectedId}
            onSelect={() => onSelect(s.id)}
            onPin={() => onPin(s.id)}
          />
        ))}
    </div>
  );
};

const Detail: React.FC<{ session: SessionInfo }> = ({ session }) => {
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [summary, setSummary] = useState<string | null>(session.summary);
  const [summarizing, setSummarizing] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [askErr, setAskErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset per-session UI state when the selection changes.
  useEffect(() => {
    setSummary(session.summary);
    setAnswer(null);
    setAskErr(null);
    setQuestion("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  // Keep the cached summary in sync as poll updates arrive.
  useEffect(() => {
    if (session.summary) setSummary(session.summary);
  }, [session.summary]);

  // Live transcript: fetch on select, then poll while this session is open.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const r = await commands.getSessionTranscript(session.id, 60);
      if (alive && r.status === "ok") setTurns(r.data);
    };
    load();
    const t = setInterval(load, 2500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [session.id]);

  // Auto-scroll the transcript to the newest turn.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  const refreshSummary = async () => {
    setSummarizing(true);
    const r = await commands.summarizeSession(session.id);
    setSummarizing(false);
    if (r.status === "ok") setSummary(r.data);
    else setSummary(`(${r.error})`);
  };

  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    setAsking(true);
    setAskErr(null);
    setAnswer(null);
    const r = await commands.askSession(session.id, q);
    setAsking(false);
    if (r.status === "ok") setAnswer(r.data);
    else setAskErr(r.error);
  };

  const meta = STATUS_META[session.status];
  const btn =
    "flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 border border-mid-gray/20 hover:bg-mid-gray/15 transition-colors";

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b border-mid-gray/15">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold truncate" title={session.cwd}>
              {session.repo}
            </h2>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${meta.chip}`}>
              {meta.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-mid-gray mt-0.5">
            {session.git_branch && (
              <span className="flex items-center gap-1">
                <GitBranch size={11} />
                {session.git_branch}
              </span>
            )}
            <span>{rel(session.last_activity_ms)} ago</span>
            {session.is_background && <span>· background</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" className={btn} onClick={refreshSummary} disabled={summarizing}>
            {summarizing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Summary
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => commands.speakSessionSummary(session.id)}
            title="Speak the summary"
          >
            <Volume2 size={13} />
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => commands.focusSessionWindow(session.id)}
            title="Focus this session's window"
          >
            <ExternalLink size={13} />
          </button>
          <button
            type="button"
            className={`${btn} ${session.pinned ? "text-logo-primary" : ""}`}
            onClick={() => commands.toggleSessionPin(session.id)}
            title={session.pinned ? "Unpin" : "Pin for live summaries"}
          >
            <Pin size={13} fill={session.pinned ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="py-2.5 text-sm">
        {summary ? (
          <p className="text-text/90">{summary}</p>
        ) : (
          <button
            type="button"
            onClick={refreshSummary}
            disabled={summarizing}
            className="text-xs text-logo-primary hover:underline"
          >
            {summarizing ? "Summarizing…" : "Summarize what this session is doing"}
          </button>
        )}
      </div>

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg bg-mid-gray/5 border border-mid-gray/10 p-3 space-y-2.5 min-h-0"
      >
        {turns.length === 0 ? (
          <p className="text-xs text-mid-gray">No recent messages.</p>
        ) : (
          turns.map((turn, i) => (
            <div key={i} className="text-sm">
              <span
                className={`text-[10px] uppercase tracking-wide font-semibold ${
                  turn.role === "assistant" ? "text-logo-primary" : "text-mid-gray"
                }`}
              >
                {turn.role === "assistant" ? "Agent" : "You"}
              </span>
              <p className="whitespace-pre-wrap break-words text-text/85 leading-snug">
                {turn.text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Ask box */}
      <div className="pt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask();
            }}
            placeholder={`Ask about ${session.repo}…  (spoken back via Monoli)`}
            rows={2}
            className="flex-1 text-sm rounded-lg border border-mid-gray/20 bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-logo-primary resize-none"
          />
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={ask}
              disabled={asking || !question.trim()}
              className="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5 bg-logo-primary/85 hover:bg-logo-primary text-white transition-colors disabled:opacity-50"
            >
              {asking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Ask
            </button>
            <button
              type="button"
              onClick={() => commands.askSessionCancel()}
              className="flex items-center gap-1.5 text-xs rounded-lg px-3 py-1 border border-mid-gray/20 hover:bg-mid-gray/15 transition-colors"
            >
              <Square size={12} /> Stop
            </button>
          </div>
        </div>
        {askErr && <p className="text-xs text-red-500 mt-1.5">{askErr}</p>}
        {answer && (
          <p className="text-sm bg-logo-primary/10 rounded-lg px-3 py-2 mt-1.5">{answer}</p>
        )}
      </div>
    </div>
  );
};

export const SessionsView: React.FC = () => {
  const sessions = useSessionsStore((s) => s.sessions);
  const selectedId = useSessionsStore((s) => s.selectedId);
  const select = useSessionsStore((s) => s.select);
  const init = useSessionsStore((s) => s.init);
  const reports = useAgentsStore((s) => s.runs);
  const initReports = useAgentsStore((s) => s.init);
  const { getSetting, refreshSettings } = useSettings();
  const [showReports, setShowReports] = useState(false);

  useEffect(() => {
    init();
    initReports();
  }, [init, initReports]);

  const hideBackground = getSetting("sessions_hide_background") ?? true;
  const rolling = !!getSetting("sessions_rolling_summaries");
  const voiceAlerts = !!getSetting("sessions_voice_alerts");

  const visible = useMemo(
    () => sessions.filter((s) => !hideBackground || !s.is_background),
    [sessions, hideBackground],
  );

  const groups = useMemo(() => {
    const g: Record<string, SessionInfo[]> = {};
    for (const s of visible) {
      const key = s.workspace ? basename(s.workspace) : s.repo;
      (g[key] ??= []).push(s);
    }
    return g;
  }, [visible]);

  const liveCount = visible.length;
  const needCount = visible.filter((s) => s.status === "waiting_for_you").length;
  const selected = sessions.find((s) => s.id === selectedId) ?? null;

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
  const pin = (id: string) => commands.toggleSessionPin(id);

  return (
    <div className="w-full flex gap-3 h-[78vh]">
      {/* Left rail */}
      <div className="w-72 shrink-0 flex flex-col rounded-xl border border-mid-gray/15 bg-background overflow-hidden">
        <div className="px-3 py-2.5 border-b border-mid-gray/15">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-logo-primary" />
            <h2 className="font-semibold text-sm">Sessions</h2>
            <span className="ml-auto text-xs text-mid-gray">
              {liveCount} live{needCount > 0 ? ` · ${needCount} need you` : ""}
            </span>
          </div>
          <div className="flex flex-col gap-1 mt-2 text-[11px] text-mid-gray">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={rolling} onChange={toggleRolling} />
              Rolling summaries (auto-refresh active + pinned)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={voiceAlerts} onChange={toggleVoiceAlerts} />
              Speak "X needs you" alerts
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!hideBackground} onChange={toggleHideBackground} />
              Show background (SDK) sessions
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-1.5 py-2">
          {liveCount === 0 && (
            <p className="text-xs text-mid-gray px-2 py-4">
              No live Claude Code sessions found. Start one in a terminal or VS Code.
            </p>
          )}
          {Object.entries(groups).map(([name, items]) => (
            <Group
              key={name}
              name={name}
              sessions={items}
              selectedId={selectedId}
              onSelect={select}
              onPin={pin}
            />
          ))}

          {/* Recently finished reports (from the Voice Agent queue). */}
          {reports.length > 0 && (
            <div className="mt-2 border-t border-mid-gray/15 pt-1">
              <button
                type="button"
                onClick={() => setShowReports((o) => !o)}
                className="flex items-center gap-1 w-full px-1.5 py-1 text-[11px] uppercase tracking-wide text-mid-gray hover:text-text"
              >
                {showReports ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                Recently finished
                <span className="ml-auto">{reports.length}</span>
              </button>
              {showReports &&
                reports.slice(0, 20).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg hover:bg-mid-gray/10"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate" title={r.title ?? ""}>
                        {r.title ?? "Session report"}
                      </p>
                      <p className="text-[11px] text-mid-gray truncate">{r.repo}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => commands.playAgentRun(r.id)}
                      className="shrink-0 p-1 text-mid-gray hover:text-logo-primary"
                      title="Play"
                    >
                      <Play size={13} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail pane */}
      <div className="flex-1 min-w-0 rounded-xl border border-mid-gray/15 bg-background p-4">
        {selected ? (
          <Detail key={selected.id} session={selected} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-mid-gray gap-2">
            <MessageSquare size={28} className="opacity-40" />
            <p className="text-sm">Select a session to see its live chat, summary, and ask about it.</p>
          </div>
        )}
      </div>
    </div>
  );
};
