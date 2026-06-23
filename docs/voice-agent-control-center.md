# Voice Agent Control Center (design)

STRAT as a multi-session voice command center. Conversation Mode is the **pull** half
(ask "what's going on" → read transcript → Sonnet → Monoli). This is the **push** half:
sessions report their results into a queue when they finish; STRAT shows a dashboard of
"agents ready to review," speaks each in that session's voice.

Mental model (Arshia): holding **fn** to speak = deploying an agent. A finished session
reporting back = an agent returning. One dashboard of agents (`kind: session_report | voice_task`).

## Substrate (verified)
- Transcript JSONL: `~/.claude/projects/<dashed-cwd>/<uuid>.jsonl`. Dashed-cwd = every
  non-alphanumeric char → `-` (LOSSY, not reversible → the hook writes the real `cwd`).
- Final summary = last `type:"assistant"` record whose `message.content` has a `{"type":"text"}` block.
- Stop-hook stdin (snake_case): `session_id, transcript_path, cwd, permission_mode, hook_event_name, stop_hook_active`.
  Honor `stop_hook_active` (early-exit), Stop hooks take no matcher, always exit 0, never block.
- `notify` crate NOT in Cargo → **poll watcher** (1.5s). `jq` exists but the hook uses python3 (cleaner JSONL parse + atomic `os.replace`).
- `tts::speak_with_settings` plays **one utterance at a time** (every speak calls stop first) → auto-speak must be a FIFO drained via `tts::is_speaking()`.

## Persistence: file-drop queue (not sqlite)
```
~/.claude/strat/
├── queue/      # inbox: hook drops <id>.json (atomic temp+rename); watcher ignores .tmp-*
├── done/       # moved here after ingest
├── archive/    # pruned / dismissed
├── .state/     # <session_id>.last fingerprint for idempotency
├── strat-report.sh          # the Stop hook (installed by STRAT)
└── skills/strat-report/{SKILL.md,push.sh}
```

## Queue entry contract (v1)
```jsonc
{ "v":1, "id":"<uuid>", "kind":"session_report",
  "session_id":"…", "cwd":"<verbatim from stdin>", "repo":"<basename cwd>",
  "repo_dashed":"<non-alnum→->", "git_branch":"…", "transcript_path":"…",
  "created_at":"ISO-8601Z", "title":"<=80 chars", "summary":"<spoken body>",
  "next_steps":["…"], "speak_text":"Here's what we did on <repo>. …",
  "char_count":N, "status":"ready", "source":"stop_hook|skill|manual" }
```
`speak_text` is pre-rendered by the hook so STRAT speaks it verbatim (auditable, dumb Rust side).
Hook cleans for speech (strip code fences/inline code/md/urls), caps at ~1200 chars, redacts obvious secrets.
Idempotent via `sha256(session_id + last_text)` in `.state/`.

## Rust
- `agents.rs`: `AgentRun` / `AgentKind` / `AgentStatus` types + `AgentsUpdate` (tauri_specta::Event:
  Added/Updated/Removed/Reset). `AgentQueueManager` (Arc, managed in `initialize_core_logic`):
  poll `queue/` → parse → de-dupe by id → emit `AgentsUpdate::Added` → maybe auto-speak → move to `done/`.
- Voice resolution: per-`session_id` → per-`repo_dashed` → global `elevenlabs_voice_id` (Monoli).
- `commands/agents.rs`: `install_strat_reporter(repo)` (idempotent deep-merge of a `Stop` hook into
  `<repo>/.claude/settings.json`, never clobber), `get_agent_runs`, `play/dismiss/delete_agent_run`,
  `set/clear_session_voice`.
- `settings.rs`: `session_voices: BTreeMap<String,String>`, `agents_autospeak: bool` (default off),
  `agents_enabled: bool` (default on).

## React
- `agentsStore.ts` (zustand): `runs`, `readyCount`; init via `get_agent_runs` + `listen("agents-update")`.
- `settings/agents/AgentsSettings.tsx`: cards grouped by repo; Play / Mark reviewed / Delete; per-card `SessionVoicePicker`.
- Sidebar `agents` tab (Bot icon). Overview gets an "N agents ready" card deep-linking to it.

## Phases
- **P0** scaffolding: types + `AgentsUpdate` event + settings fields + `~/.claude/strat` dirs on startup.
- **P1 MVP** (core demo): `strat-report.sh` + `install_strat_reporter`; poll watcher → `agents-update`;
  `AgentsSettings` tab; `play_agent_run` → `speak_with_settings` (global Monoli). Finish a session → card appears → Play → Monoli reads it.
- **P2** Overview count + dismiss/delete lifecycle.
- **P3** per-session/per-repo voices (`session_voices`, `SessionVoicePicker`, resolver).
- **P4** auto-speak FIFO (one-channel, barge-in flushes queue).
- **P5** the `strat-report` skill (SKILL.md + push.sh) for explicit mid-session push.
- **P6** fn/converse turns → `voice_task` AgentRuns; "Ask back" seeds Conversation Mode with the report's transcript_path.
- **P7** polish: notify upgrade, retention pruning, secret redaction.

## Risks
- Hook-install: read→merge→write, only append if our exact command absent; abort on malformed settings.json; provide uninstall.
- Active-session detection: dashed-cwd lossy → rely on hook's verbatim cwd; "returned" only in v1, live "active" later.
- One TTS channel: FIFO + `is_speaking()`; barge-in stops + flushes.
- Privacy: summaries are plaintext + spoken; hook strips code/urls, caps length, redacts key-shaped strings; `queue/` chmod 0700.
