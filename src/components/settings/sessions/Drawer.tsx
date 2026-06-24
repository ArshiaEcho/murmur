import React, { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { commands } from "@/bindings";
import type { SessionInfo, TranscriptTurn } from "@/bindings";
import { cx, hexA, kindOf, rel, STATUS_LABEL } from "./lib";
import { FOCUS_RING } from "./controls";

type MicState = "idle" | "listening" | "transcribing";

const ICON_BTN =
  "flex items-center justify-center w-[31px] h-[31px] rounded-full border border-line-2 bg-transparent text-text-2 transition-colors duration-150 hover:border-signal hover:text-signal-ink disabled:opacity-50 " +
  FOCUS_RING;

// ── the drawer body (one open session) ───────────────────────────────────────

const DrawerBody: React.FC<{
  session: SessionInfo;
  color: string;
  onClose: () => void;
}> = ({ session, color, onClose }) => {
  const { t } = useTranslation();
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [transcriptLoaded, setTranscriptLoaded] = useState(false);
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    micRef.current = mic;
  }, [mic]);

  useEffect(
    () => () => {
      mounted.current = false;
      // Release a dangling recording if the drawer closes mid-listen, so the
      // recorder doesn't stay on and block the global hotkey / next dictation.
      // Cancel (not stop) so no Whisper runs on teardown.
      if (micRef.current === "listening") {
        commands.appCancelDictation().catch(() => {});
      }
    },
    [],
  );

  // Sync the server-side cached summary only when it actually changes, so a poll
  // tick can't clobber a summary the user just refreshed locally.
  const lastServerSummary = useRef<string | null>(session.summary);
  useEffect(() => {
    if (session.summary && session.summary !== lastServerSummary.current) {
      lastServerSummary.current = session.summary;
      setSummary(session.summary);
    }
  }, [session.summary]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const r = await commands.getSessionTranscript(session.id, 60);
      if (alive && r.status === "ok") {
        setTurns(r.data);
        setTranscriptLoaded(true);
      }
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
    if (r.status === "ok") {
      lastServerSummary.current = r.data; // keep poll-sync in agreement
      setSummary(r.data);
    } else {
      setSummary(`(${r.error})`);
    }
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
      if (!mounted.current) {
        // Drawer closed during start — release so the recorder isn't stuck on.
        if (r.status === "ok") commands.appCancelDictation().catch(() => {});
        return;
      }
      if (r.status === "ok") setMic("listening");
      else setAskErr(r.error);
    } else if (mic === "listening") {
      setMic("transcribing");
      micRef.current = "transcribing"; // exclude this from the unmount cancel
      const r = await commands.appStopDictation();
      if (!mounted.current) return;
      setMic("idle");
      if (r.status === "ok") {
        if (r.data) setQuestion((p) => (p.trim() ? p.trim() + " " : "") + r.data);
      } else if (!/no in-app recording/i.test(r.error)) {
        // Benign if an external cancel already stopped it; otherwise surface.
        setAskErr(r.error);
      }
    }
  };

  const kind = kindOf(session.status);
  const titleId = useId();

  return (
    <>
      {/* Header */}
      <div className="relative px-5 pt-[22px] pb-4 border-b border-line">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, ${hexA(color, 0.13)}, transparent)` }}
        />
        <div className="relative flex items-start gap-2.5">
          <span
            aria-hidden
            className="mt-[5px] w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
          />
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-[17px] font-semibold tracking-[-0.2px] text-text truncate"
              title={session.cwd}
            >
              {session.repo}
            </h2>
            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
              <span
                className="inline-flex items-center px-2.5 py-[3px] rounded-full font-mono text-[10.5px] font-semibold uppercase tracking-[0.5px]"
                style={{
                  background:
                    kind === "needs_you"
                      ? "var(--warn-soft)"
                      : kind === "working"
                        ? "var(--signal-soft)"
                        : "var(--card-2)",
                  color:
                    kind === "needs_you"
                      ? "var(--warn)"
                      : kind === "working"
                        ? "var(--signal)"
                        : "var(--text-3)",
                }}
              >
                {STATUS_LABEL[kind]}
              </span>
              {session.git_branch && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-text-3">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
                    <circle cx="6" cy="6" r="2.4" />
                    <circle cx="6" cy="18" r="2.4" />
                    <circle cx="18" cy="7" r="2.4" />
                    <path d="M6 8.4v7.2M18 9.4c0 3-3 3.6-6 3.6" />
                  </svg>
                  {session.git_branch}
                </span>
              )}
              <span className="font-mono tnum text-[11px] text-text-3">
                {t("sessions.timeAgo", { time: rel(session.last_activity_ms) })}
              </span>
              {session.is_background && (
                <span className="font-mono text-[11px] text-text-3">{t("sessions.background")}</span>
              )}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              className={ICON_BTN}
              onClick={refreshSummary}
              disabled={summarizing}
              aria-label="Refresh summary"
              title="Refresh summary"
            >
              {summarizing ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{ animation: "mur-spin 0.8s linear infinite" }} aria-hidden>
                  <path d="M21 12a9 9 0 1 1-6.2-8.5" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
                  <path d="M21 12a9 9 0 1 1-2.6-6.3" />
                  <path d="M21 4v5h-5" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className={ICON_BTN}
              onClick={() => commands.speakSessionSummary(session.id)}
              aria-label="Speak summary"
              title="Speak summary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
                <path d="M4 9v6h3.5L13 19V5L7.5 9H4z" />
                <path d="M16.5 8.5a5 5 0 0 1 0 7" />
              </svg>
            </button>
            <button
              type="button"
              className={ICON_BTN}
              onClick={() => commands.focusSessionWindow(session.id)}
              aria-label="Focus this window"
              title="Focus this window"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                <path d="M14 4h6v6M20 4l-8 8" />
                <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
              </svg>
            </button>
            <button
              type="button"
              className={cx(ICON_BTN, session.pinned && "text-signal-ink border-signal")}
              onClick={() => commands.toggleSessionPin(session.id)}
              aria-label={session.pinned ? "Unpin session" : "Pin for live summaries"}
              aria-pressed={session.pinned}
              title={session.pinned ? "Unpin" : "Pin for live summaries"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={session.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} aria-hidden>
                <path d="M12 17v5M9 3h6l-1 7 3 3H7l3-3z" />
              </svg>
            </button>
            <button
              type="button"
              className={ICON_BTN}
              onClick={onClose}
              aria-label="Close"
              title="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Body: Summary card + Transcript */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="flex-1 min-h-0 overflow-y-auto px-5 py-[18px]"
      >
        {/* Summary card */}
        <div
          className="border border-line-2 bg-card rounded-2xl px-[15px] py-3.5 mb-5"
          aria-busy={summarizing}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--signal)" strokeWidth={1.8} aria-hidden>
              <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4z" />
            </svg>
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[1px] text-signal-ink">
              {t("sessions.summary")}
            </span>
          </div>
          {summary ? (
            <div className="text-[13.5px] leading-[1.6] text-text-2 select-text">{summary}</div>
          ) : (
            <button
              type="button"
              onClick={refreshSummary}
              disabled={summarizing}
              className={cx("text-[13px] text-signal-ink hover:underline", FOCUS_RING)}
            >
              {summarizing ? "Summarizing…" : "Summarize what this session is doing"}
            </button>
          )}
        </div>

        {/* Transcript */}
        <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[1px] text-text-3 mb-3">
          {t("sessions.transcript")}
        </div>
        <div
          className="flex flex-col gap-4"
          aria-live="polite"
          aria-busy={!transcriptLoaded}
        >
          {!transcriptLoaded ? (
            // Skeleton — matches the real turn layout (no shimmer; reduced-motion safe).
            <>
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <div className="h-2.5 w-16 rounded bg-card-hover mb-2" />
                  <div className="h-3 w-full rounded bg-card-hover mb-1.5" />
                  <div className="h-3 w-3/4 rounded bg-card-hover" />
                </div>
              ))}
            </>
          ) : turns.length === 0 ? (
            <p className="text-[12.5px] text-text-3">{t("sessions.noMessages")}</p>
          ) : (
            turns.map((turn, i) => (
              <div key={`${i}:${turn.role}:${turn.text.slice(0, 24)}`}>
                <div
                  className="font-mono text-[10px] font-semibold uppercase tracking-[1px] mb-1.5"
                  style={{ color: turn.role === "assistant" ? "var(--signal-ink)" : "var(--text-3)" }}
                >
                  {turn.role === "assistant" ? t("sessions.agent") : t("sessions.you")}
                </div>
                <div className="text-[13.5px] leading-[1.6] text-text whitespace-pre-wrap break-words select-text">
                  {turn.text}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer: answer card + Ask box */}
      <div className="flex-none px-[18px] pt-3.5 pb-[18px] border-t border-line bg-bg-2">
        <div aria-live="polite">
          {askErr && (
            <p className="text-[12px] text-danger mb-2 px-0.5">
              {t("sessions.askError", { error: askErr })}
            </p>
          )}
          {answer && (
            <div
              className="border border-line-2 bg-card rounded-[13px] px-3.5 py-3 mb-3"
              style={{ animation: "mur-reveal 0.2s var(--ease-out-quint)" }}
            >
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[1px] text-signal-ink mb-1.5">
                {t("sessions.agent")}
              </div>
              <div className="text-[13px] leading-[1.55] text-text select-text">{answer}</div>
            </div>
          )}
        </div>

        <div className="flex items-end gap-2.5">
          {/* Push-to-talk mic */}
          <div className="relative flex-none">
            {mic === "listening" && (
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-signal pointer-events-none"
                style={{ animation: "mur-micring 1.5s var(--ease-io) infinite" }}
              />
            )}
            <button
              type="button"
              onClick={toggleMic}
              disabled={mic === "transcribing" || asking}
              aria-label={
                mic === "listening"
                  ? "Stop and transcribe"
                  : mic === "transcribing"
                    ? "Transcribing"
                    : "Push to talk — dictate your question"
              }
              aria-pressed={mic === "listening"}
              title={mic === "listening" ? "Stop & transcribe" : "Hold a thought — click to dictate"}
              className={cx(
                "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-150 disabled:opacity-60",
                mic === "idle"
                  ? "border border-line-2 bg-card"
                  : "border border-signal bg-signal scale-[1.04]",
                FOCUS_RING,
              )}
            >
              {mic === "transcribing" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--on-signal)" strokeWidth={2.4} style={{ animation: "mur-spin 0.8s linear infinite" }} aria-hidden>
                  <path d="M21 12a9 9 0 1 1-6.2-8.5" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={mic === "listening" ? "var(--on-signal)" : "var(--text-2)"} strokeWidth={1.9} aria-hidden>
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M6 11a6 6 0 0 0 12 0" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              )}
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-2 min-w-0">
            {mic !== "idle" && (
              <div className="font-mono text-[11px] text-signal-ink pl-0.5">
                {mic === "listening" ? "Listening…" : "Transcribing…"}
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
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
                rows={1}
                className={cx(
                  "flex-1 min-h-10 text-[13px] rounded-[13px] border border-line-2 bg-bg px-3 py-2.5 text-text resize-none placeholder:text-text-3",
                  FOCUS_RING,
                )}
              />
              <button
                type="button"
                onClick={ask}
                disabled={asking || !question.trim()}
                className={cx(
                  "flex items-center justify-center h-10 px-4 rounded-[13px] border border-signal bg-signal text-on-signal text-[13px] font-semibold transition-[filter] duration-150 hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100",
                  FOCUS_RING,
                )}
              >
                {asking ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--on-signal)" strokeWidth={2.4} style={{ animation: "mur-spin 0.8s linear infinite" }} aria-hidden>
                    <path d="M21 12a9 9 0 1 1-6.2-8.5" />
                  </svg>
                ) : (
                  t("sessions.ask")
                )}
              </button>
              {asking && (
                <button
                  type="button"
                  onClick={() => commands.askSessionCancel()}
                  aria-label="Stop"
                  className={cx(
                    "flex items-center justify-center h-10 px-3 rounded-[13px] border border-line-2 text-text-2 text-[12px] transition-colors duration-150 hover:bg-card-hover",
                    FOCUS_RING,
                  )}
                >
                  {t("sessions.stop")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── the drawer shell: scrim + sliding panel + focus management ───────────────

export const Drawer: React.FC<{
  session: SessionInfo | null;
  color: string;
  onClose: () => void;
}> = ({ session, color, onClose }) => {
  const open = !!session;
  const panelRef = useRef<HTMLDivElement>(null);
  // Remember the element that had focus when the drawer opened, to restore it.
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Capture the trigger and move focus into the drawer on open; restore on close.
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement as HTMLElement;
      // Focus the panel heading region (the panel itself, which is focusable).
      requestAnimationFrame(() => {
        const first = panelRef.current?.querySelector<HTMLElement>(
          'button, textarea, [href], [tabindex]:not([tabindex="-1"])',
        );
        (first ?? panelRef.current)?.focus();
      });
    } else {
      returnFocusRef.current?.focus?.();
      returnFocusRef.current = null;
    }
  }, [open]);

  // Focus trap within the panel while open.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea, [href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ pointerEvents: open ? "auto" : "none" }}
      aria-hidden={!open}
    >
      {/* Scrim — click closes */}
      <div
        onClick={onClose}
        className="absolute inset-0"
        style={{
          background: "rgba(0,0,0,0.42)",
          opacity: open ? 1 : 0,
          transition: "opacity 0.2s var(--ease-io)",
        }}
      />
      {/* Sliding panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={session ? `${session.repo} session chat` : "Session chat"}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="absolute top-0 right-0 bottom-0 w-[480px] max-w-[94%] bg-bg-2 border-l border-line-2 flex flex-col outline-none"
        style={{
          boxShadow: "var(--shadow)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          opacity: open ? 1 : 0,
          transition:
            "transform 0.3s var(--ease-out-quint), opacity 0.3s var(--ease-out-quint)",
        }}
      >
        {session && (
          <DrawerBody key={session.id} session={session} color={color} onClose={onClose} />
        )}
      </div>
    </div>
  );
};
