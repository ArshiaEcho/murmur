# Strat — Sessions Observatory (Conversation Mode v2)

Design spec. Status: approved by Arshia 2026-06-23. Phase 1 of a 3-phase arc.

## Problem

Arshia runs ~12 live Claude Code sessions across multiple VS Code windows (and
sometimes terminals). The current Conversation tab only tails the single
most-recently-active transcript, and the Agents tab only shows finished-session
reports. There is no way to (a) see every live session at once, (b) know which
ones need attention, (c) read any session's full chat, or (d) talk to a chosen
session. Strat should become the "human layer" — a voice-first control plane over
all local Claude Code sessions.

## The injection wall (grounding fact)

Claude Code has **no supported way to inject a prompt into a session a human is
already interactively driving** (confirmed three ways: no IPC/socket/API;
`TIOCSTI` is EPERM on macOS; VS Code-extension sessions have no pty). Two things
that ARE possible shape the phasing:

1. **Voice-paste** into an existing session: focus its VS Code window (titles end
   with the workspace folder name) + clipboard + synthesized Cmd-V. Strat already
   holds Accessibility/CGEvent trust (Handy fork).
2. **Strat-owned agents** via the Agent SDK: spawn + fully control NEW headless
   sessions (deep two-way control). Not the user's existing windows.

## Phasing

- **Phase 1 (this spec): the Sessions observatory.** See every live session,
  grouped, with triage status + on-demand Haiku summaries + the full live chat +
  an Ask-about-this-session box. Foundation for everything else.
- **Phase 2:** voice-paste remote-control (window-focus + Cmd-V), global ⌥⌃A
  converse hotkey, speak-replies-back, per-session voice picker.
- **Phase 3:** Agent-SDK owned agents, task management, build-new-agents,
  voice-confirmed approval gates, streaming TTS.

## Phase 1 architecture

Unify the `conversation` + `agents` tabs into one **Sessions** tab (master-detail).

### Data source (recon-verified)

- **Registry:** `~/.claude/sessions/<PID>.json` — one file per running `claude`
  process: `{pid, sessionId, cwd, startedAt, entrypoint, kind}`. Self-deletes on
  exit. Liveness = file exists AND `kill(pid, 0)` succeeds.
- **Transcript path:** forward-encode the cwd (every non-`[A-Za-z0-9]` char → `-`)
  then `~/.claude/projects/<encoded>/<sessionId>.jsonl`. NEVER reverse-decode the
  dir name (lossy). Read `cwd`/`gitBranch` from inside the transcript.
- **Window grouping:** `~/.claude/ide/<PID>.lock` → `workspaceFolders` maps a VS
  Code window to its workspace folder; join on cwd.
- **Activity:** transcript file **mtime** (the sessions JSON mtime is frozen at
  startup — do not use it).
- **Background filter:** `entrypoint in {claude-vscode, cli}` & `kind=interactive`
  are human sessions; `sdk-cli`/`sdk-py` (claude-mem) collapse into a hidden group.

### Status engine (no plugin required for basic triage)

Derived from the transcript so it works on every session with zero install:

- 🟢 **working** — transcript appended within the last ~8s (actively streaming).
- 🟡 **waiting-for-you** — alive, not working, and the last non-sidechain message
  is an `assistant` message (turn ended, your move).
- ⚪ **idle** — alive, quiet, last message not a finished assistant turn.
- ✓ **done** — process gone (drops out of the live list; final report stays in the
  reports strip).

On a transition **into** waiting-for-you, fire a native macOS notification
(`osascript display notification`, zero deps) + optional spoken "X needs you" via
the existing Monoli TTS (gated by `sessions_voice_alerts`).

### Summaries + model routing

- **Title:** free/instant — first real user message + repo + branch + activity.
- **Haiku on-demand:** `summarize_session(id)` tails the transcript → Haiku 4.5 →
  one spoken-style sentence, cached against transcript mtime (never re-pays for an
  unchanged session).
- **Rolling mode:** global `sessions_rolling_summaries` toggle + per-session
  `sessions_pinned` — the poll loop auto-refreshes pinned/active sessions.
- **Routing:** Haiku = summaries, Sonnet = conversation, Opus = reserved (Phase 3).
  All on the one Anthropic key already configured. `anthropic::answer` already
  takes a `model` param.

### Backend modules

- `src-tauri/src/sessions/mod.rs` — `SessionInfo`, `SessionStatus`,
  `discover()`, forward-encode, title/branch/mtime extraction, status engine,
  `SessionRegistryManager` (poll loop mirroring `AgentQueueManager`, emits
  `SessionsUpdate::Reset`, fires attention notifications on transition).
- `src-tauri/src/commands/sessions.rs` — `get_sessions`, `summarize_session`,
  `get_session_transcript`, `ask_session`, `focus_session_window`,
  `set_sessions_rolling`, `toggle_session_pin`, `set_sessions_voice_alerts`,
  `speak_session_summary`.
- Reuse: `converse/session.rs` (`tail_turns`), `converse/anthropic.rs`,
  `converse/mod.rs` (add `run_turn_for_path`), `tts.rs`, the `~/.claude/strat`
  scaffolding.

### Frontend

- `src/stores/sessionsStore.ts` — mirrors `agentsStore`; `sessions`, `selectedId`,
  `init()`, `select()`, listens `sessions-update`.
- `src/components/settings/sessions/SessionsView.tsx` — master-detail:
  - Left: "(N live)" header + rolling toggle; collapsible window/project groups;
    rows = status dot + title + repo/branch + relative time + pin; hidden
    background group; a "Recently finished" strip from `agentsStore`.
  - Right: header (repo · branch · status · activity) + actions (Refresh summary,
    Speak, Focus window, Pin) + expandable Haiku summary + live transcript + Ask
    box (Ask-about-this-session via `ask_session`; Phase 2 upgrades to talk-to).
- `Sidebar.tsx` — replace `conversation` + `agents` with one `sessions` section.
  `Overview` deep-link updated `agents` → `sessions`.

### Settings (all `#[serde(default)]` + in `get_default_settings`)

`sessions_rolling_summaries: bool=false`, `sessions_pinned: Vec<String>=[]`,
`sessions_voice_alerts: bool=false`, `sessions_notifications: bool=true`,
`sessions_hide_background: bool=true`, `summary_model: String="claude-haiku-4-5"`.

### Companion plugin `strat-control` (the shareable artifact)

New GitHub marketplace repo (`~/Dev/strat-control`):
`.claude-plugin/plugin.json` + `marketplace.json`, `hooks/hooks.json` (Stop →
report, Notification → attention, SessionEnd → done), `commands/strat.md`
(`/strat`), `skills/strat-report/SKILL.md`, README positioning Strat vs HumanLayer
/ Conductor / monitors ("they let you watch and approve by clicking; Strat lets
you talk to them and hear them back"). The app keeps working locally via the
existing `install_strat_reporter`; the plugin is the one-command shareable version.

## Risks / mitigations

- **Undocumented internal files** (`sessions/*.json`, `ide/*.lock`) — version drift.
  Key off field names, tolerate missing fields; `ps --resume <id>` fallback.
- **bindings.ts** only auto-regenerates on a debug run (and a debug run now would
  collide with the production app via single-instance). Hand-edit it to match the
  Rust exactly (commands + types + the `SessionsUpdate` event).
- **New AppSettings fields** must have `#[serde(default)]` AND appear in
  `get_default_settings()` or `get_settings` wipes ALL settings on parse failure.
- **Public distribution** needs a real Apple Developer ID + notarization (currently
  self-signed). Deferred to the packaging milestone.

## Out of scope (Phase 1)

Voice-paste injection, global hotkey, Agent-SDK owned agents, task management,
per-session voice picker UI, streaming TTS, the name/brand swap.
