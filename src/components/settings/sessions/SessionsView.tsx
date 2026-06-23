import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pin,
  RefreshCw,
  Volume2,
  ExternalLink,
  GitBranch,
  Send,
  Square,
  Loader2,
  Mic,
  X,
  SlidersHorizontal,
  Play,
  Radio,
} from "lucide-react";
import { commands } from "@/bindings";
import type { SessionInfo, SessionStatus, TranscriptTurn } from "@/bindings";
import { useSessionsStore } from "../../../stores/sessionsStore";
import { useAgentsStore } from "../../../stores/agentsStore";
import { useSettings } from "../../../hooks/useSettings";

// ---- color + status helpers --------------------------------------------------

const PALETTE = [
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

function basename(p: string): string {
  const t = p.replace(/\/+$/, "");
  const i = t.lastIndexOf("/");
  return i >= 0 ? t.slice(i + 1) : t;
}

/** Stable auto-color for a project key when the user hasn't picked one. */
function autoColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function projectKeyOf(s: SessionInfo): string {
  return s.workspace ? basename(s.workspace) : s.repo;
}

function rel(ms?: number | null): string {
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

const STATUS_META: Record<
  SessionStatus,
  { dot: string; label: string; chip: string }
> = {
  working: { dot: "bg-emerald-500", label: "working", chip: "bg-emerald-500/15 text-emerald-600" },
  waiting_for_you: {
    dot: "bg-amber-400 animate-pulse",
    label: "needs you",
    chip: "bg-amber-400/15 text-amber-600",
  },
  idle: { dot: "bg-mid-gray/40", label: "idle", chip: "bg-mid-gray/15 text-mid-gray" },
};

const StatusDot: React.FC<{ status: SessionStatus }> = ({ status }) => (
  <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_META[status].dot}`} />
);

// ---- color swatch picker -----------------------------------------------------

const SwatchPicker: React.FC<{ color: string; onPick: (c: string) => void }> = ({
  color,
  onPick,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Project color"
        className="h-3.5 w-3.5 rounded-full ring-2 ring-white/40 shrink-0"
        style={{ backgroundColor: color }}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute z-30 mt-1 left-0 flex flex-wrap gap-1.5 p-2 rounded-lg border border-mid-gray/20 bg-background shadow-lg w-[132px]">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
                className={`h-5 w-5 rounded-full hover:scale-110 transition-transform ${
                  c === color ? "ring-2 ring-offset-1 ring-mid-gray/50" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ---- session row -------------------------------------------------------------

const SessionRow: React.FC<{
  session: SessionInfo;
  active: boolean;
  onSelect: () => void;
  onPin: () => void;
}> = ({ session, active, onSelect, onPin }) => (
  <div
    onClick={onSelect}
    className={`group flex items-start gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
      active ? "bg-logo-primary/15" : "hover:bg-mid-gray/10"
    }`}
  >
    <div className="pt-0.5">
      <StatusDot status={session.status} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <p className="text-[13px] font-medium truncate flex-1" title={session.title ?? session.repo}>
          {session.title ?? session.repo}
        </p>
        <span className="text-[10px] text-mid-gray shrink-0">{rel(session.last_activity_ms)}</span>
      </div>
      {session.git_branch && (
        <span className="flex items-center gap-0.5 text-[10px] text-mid-gray truncate">
          <GitBranch size={9} />
          {session.git_branch}
        </span>
      )}
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
      <Pin size={12} fill={session.pinned ? "currentColor" : "none"} />
    </button>
  </div>
);

// ---- project tile ------------------------------------------------------------

const ProjectTile: React.FC<{
  name: string;
  color: string;
  sessions: SessionInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPin: (id: string) => void;
  onColor: (c: string) => void;
}> = ({ name, color, sessions, selectedId, onSelect, onPin, onColor }) => {
  const counts = sessions.reduce(
    (a, s) => {
      a[s.status] += 1;
      return a;
    },
    { working: 0, waiting_for_you: 0, idle: 0 } as Record<SessionStatus, number>,
  );
  return (
    <div
      className="flex flex-col rounded-xl border border-mid-gray/15 bg-background overflow-hidden"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-mid-gray/10">
        <SwatchPicker color={color} onPick={onColor} />
        <h3 className="font-semibold text-sm truncate flex-1" title={name}>
          {name}
        </h3>
        <div className="flex items-center gap-1.5 text-[10px]">
          {counts.working > 0 && (
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {counts.working}
            </span>
          )}
          {counts.waiting_for_you > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {counts.waiting_for_you}
            </span>
          )}
          {counts.idle > 0 && (
            <span className="flex items-center gap-1 text-mid-gray">
              <span className="h-1.5 w-1.5 rounded-full bg-mid-gray/40" />
              {counts.idle}
            </span>
          )}
        </div>
      </div>
      <div className="p-1.5 space-y-0.5">
        {sessions.map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            active={s.id === selectedId}
            onSelect={() => onSelect(s.id)}
            onPin={() => onPin(s.id)}
          />
        ))}
      </div>
    </div>
  );
};

// ---- detail (inside the drawer) ---------------------------------------------

type MicState = "idle" | "listening" | "transcribing";

const Detail: React.FC<{ session: SessionInfo; color: string; onClose: () => void }> = ({
  session,
  color,
  onClose,
}) => {
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [summary, setSummary] = useState<string | null>(session.summary);
  const [summarizing, setSummarizing] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [askErr, setAskErr] = useState<string | null>(null);
  const [mic, setMic] = useState<MicState>("idle");
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const mounted = useRef(true);
  const micRef = useRef<MicState>("idle");
  useEffect(() => {
    micRef.current = mic;
  }, [mic]);
  useEffect(
    () => () => {
      mounted.current = false;
      // Release a dangling recording if the drawer closes mid-listen, so the
      // recorder doesn't stay on and block the global hotkey / next dictation.
      if (micRef.current === "listening") {
        commands.appStopDictation().catch(() => {});
      }
    },
    [],
  );

  useEffect(() => {
    if (session.summary) setSummary(session.summary);
  }, [session.summary]);

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

  useEffect(() => {
    if (scrollRef.current && atBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  const refreshSummary = async () => {
    setSummarizing(true);
    const r = await commands.summarizeSession(session.id);
    if (!mounted.current) return;
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
    if (!mounted.current) return;
    setAsking(false);
    if (r.status === "ok") setAnswer(r.data);
    else setAskErr(r.error);
  };

  // Push-to-talk: click to start, click again to stop + transcribe into the box.
  const toggleMic = async () => {
    if (mic === "idle") {
      const r = await commands.appStartDictation();
      if (!mounted.current) return;
      if (r.status === "ok") setMic("listening");
      else setAskErr(r.error);
    } else if (mic === "listening") {
      setMic("transcribing");
      const r = await commands.appStopDictation();
      if (!mounted.current) return;
      setMic("idle");
      if (r.status === "ok") {
        if (r.data) setQuestion((p) => (p.trim() ? p.trim() + " " : "") + r.data);
      } else {
        setAskErr(r.error);
      }
    }
  };

  const meta = STATUS_META[session.status];
  const iconBtn =
    "flex items-center justify-center h-8 w-8 rounded-lg border border-mid-gray/20 hover:bg-mid-gray/15 transition-colors";

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="flex items-start gap-2 px-4 py-3 border-b border-mid-gray/15">
        <span className="mt-1 h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
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
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" className={iconBtn} onClick={refreshSummary} disabled={summarizing} title="Refresh summary">
            {summarizing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
          <button type="button" className={iconBtn} onClick={() => commands.speakSessionSummary(session.id)} title="Speak summary">
            <Volume2 size={14} />
          </button>
          <button type="button" className={iconBtn} onClick={() => commands.focusSessionWindow(session.id)} title="Focus this window">
            <ExternalLink size={14} />
          </button>
          <button
            type="button"
            className={`${iconBtn} ${session.pinned ? "text-logo-primary" : ""}`}
            onClick={() => commands.toggleSessionPin(session.id)}
            title={session.pinned ? "Unpin" : "Pin for live summaries"}
          >
            <Pin size={14} fill={session.pinned ? "currentColor" : "none"} />
          </button>
          <button type="button" className={iconBtn} onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-2.5 text-sm border-b border-mid-gray/10">
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
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-0"
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
              <p className="whitespace-pre-wrap break-words text-text/85 leading-snug">{turn.text}</p>
            </div>
          ))
        )}
      </div>

      {/* Ask box */}
      <div className="px-4 py-3 border-t border-mid-gray/15">
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={toggleMic}
            disabled={mic === "transcribing" || asking}
            title={mic === "listening" ? "Stop & transcribe" : "Hold a thought — click to dictate"}
            className={`flex items-center justify-center h-9 w-9 rounded-lg shrink-0 transition-colors ${
              mic === "listening"
                ? "bg-red-500 text-white animate-pulse"
                : "border border-mid-gray/20 hover:bg-mid-gray/15"
            } disabled:opacity-50`}
          >
            {mic === "transcribing" ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
          </button>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask();
            }}
            placeholder={
              mic === "listening"
                ? "Listening… click the mic to stop"
                : `Ask about ${session.repo}…  (mic or ⌘/Ctrl+Enter)`
            }
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
              disabled={!asking}
              className="flex items-center gap-1.5 text-xs rounded-lg px-3 py-1 border border-mid-gray/20 hover:bg-mid-gray/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Square size={12} /> Stop
            </button>
          </div>
        </div>
        {askErr && <p className="text-xs text-red-500 mt-1.5">{askErr}</p>}
        {answer && <p className="text-sm bg-logo-primary/10 rounded-lg px-3 py-2 mt-1.5">{answer}</p>}
      </div>
    </div>
  );
};

// ---- top-bar controls popover -----------------------------------------------

const Controls: React.FC<{
  rolling: boolean;
  voiceAlerts: boolean;
  hideBackground: boolean;
  onRolling: () => void;
  onVoiceAlerts: () => void;
  onHideBackground: () => void;
}> = ({ rolling, voiceAlerts, hideBackground, onRolling, onVoiceAlerts, onHideBackground }) => {
  const [open, setOpen] = useState(false);
  const row = "flex items-center gap-2 text-sm cursor-pointer px-1 py-1";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm rounded-lg px-2.5 py-1.5 border border-mid-gray/20 hover:bg-mid-gray/15 transition-colors"
        title="View options"
      >
        <SlidersHorizontal size={14} /> Options
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute z-30 right-0 mt-1 w-64 p-2 rounded-xl border border-mid-gray/20 bg-background shadow-lg">
            <label className={row}>
              <input type="checkbox" checked={rolling} onChange={onRolling} />
              Rolling summaries (auto-refresh)
            </label>
            <label className={row}>
              <input type="checkbox" checked={voiceAlerts} onChange={onVoiceAlerts} />
              Speak "needs you" alerts
            </label>
            <label className={row}>
              <input type="checkbox" checked={!hideBackground} onChange={onHideBackground} />
              Show background (SDK) sessions
            </label>
          </div>
        </>
      )}
    </div>
  );
};

// ---- main view ---------------------------------------------------------------

export const SessionsView: React.FC = () => {
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

  useEffect(() => {
    if (selectedId && !sessions.some((s) => s.id === selectedId)) select(null);
  }, [sessions, selectedId, select]);

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
    <div className="w-full flex flex-col gap-3 h-[80vh]">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Radio size={18} className="text-logo-primary shrink-0" />
        <div className="flex items-baseline gap-2 flex-1 min-w-0">
          <h1 className="text-lg font-semibold">Sessions</h1>
          <span className="text-sm text-mid-gray truncate">
            {liveCount} live{needCount > 0 ? ` · ${needCount} need you` : ""}
          </span>
        </div>
        <Controls
          rolling={rolling}
          voiceAlerts={voiceAlerts}
          hideBackground={hideBackground}
          onRolling={toggleRolling}
          onVoiceAlerts={toggleVoiceAlerts}
          onHideBackground={toggleHideBackground}
        />
      </div>

      {/* Project dashboard */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {liveCount === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-mid-gray gap-2">
            <Radio size={28} className="opacity-40" />
            <p className="text-sm">
              No live Claude Code sessions found. Start one in a terminal or VS Code.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {groups.map(([name, items]) => (
              <ProjectTile
                key={name}
                name={name}
                color={colorFor(name)}
                sessions={items}
                selectedId={selectedId}
                onSelect={select}
                onPin={(id) => commands.toggleSessionPin(id)}
                onColor={(c) => pickColor(name, c)}
              />
            ))}
          </div>
        )}

        {/* Recently finished reports */}
        {reports.length > 0 && (
          <div className="mt-4">
            <h3 className="text-[11px] uppercase tracking-wide text-mid-gray px-1 mb-1.5">
              Recently finished ({reports.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {reports.slice(0, 9).map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg border border-mid-gray/15 bg-background"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] truncate" title={r.title ?? ""}>
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
          </div>
        )}
      </div>

      {/* Right-side chat drawer */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${
          selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-black/30" onClick={() => select(null)} />
        <div
          className={`absolute top-0 right-0 h-full w-full sm:w-[460px] lg:w-[560px] bg-background border-s border-mid-gray/20 shadow-2xl transition-transform duration-300 ease-out ${
            selected ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {selected && (
            <Detail
              key={selected.id}
              session={selected}
              color={colorFor(projectKeyOf(selected))}
              onClose={() => select(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
