# Strat — Overnight Build Plan (2026-06-23)

Autonomous god-mode build on branch `feature/conversation-mode-and-redesign`.
`main` holds the working checkpoint (ElevenLabs Read Aloud + Monoli, commit 9ac68dd).

Full scoping specs (6-agent workflow) archived at the session transcript; this is the living checklist.

## Decisions locked (Arshia asleep — review in AM)
- **Conversation Mode**: read the active Claude Code session transcript JSONL directly (`~/.claude/projects/<dashed-cwd>/<uuid>.jsonl`, most-recently-modified = active). Answer with **claude-sonnet-4-6** via a native `/v1/messages` client (NOT the OpenAI-shaped llm_client). Speak with **Monoli** (existing tts.rs). Hotkey **⌥⌃A** push-to-talk. Auto-watch most recent session by default. Barge-in via `tts::stop()`. Hook enricher = later phase.
- **No app rename tonight** — renaming `com.stratos.strat` resets all TCC grants. Deliver 10 names + the display-name-only path. Top picks: **Murmur / Murmr** (runner-up Aside).
- **Defer**: custom titlebar (Tauri risk), settings-IA regroup (drop-a-setting risk), voice barge-in, wake word.
- **3D hero**: crafted SVG faceted-diamond `StratosMark` now; swap a Blender render later.
- **Add** framer-motion (onboarding hero + sidebar pill).
- One TCC re-grant in the AM: final build installed, Arshia re-approves Accessibility + Microphone.

## Phases / checklist
- [ ] **P0 Docs**: this plan + names doc (vault). 
- [ ] **P1 Brand mark**: `StratosMark.tsx` reusable SVG; swap General-tab HandyHand → StratosMark; delete HandyHand; onboarding hero uses it.
- [ ] **P2 Design system**: `tokens.css` (spacing/radius/elevation/type/motion/z + color tokens) wired via Tailwind v4 @theme; extend App.css.
- [ ] **P3 Control primitives**: restyle ToggleSwitch + Slider (drop-in, same props); sidebar active-pill + panel bg.
- [ ] **P4 Overview tab**: `Overview.tsx` + `SummaryCard` + `NavigationContext`; default landing section; summary cards per section; brand header.
- [ ] **P5 Conversation Mode (MVP)**: `converse/` module (session reader, anthropic client, prompt, run_turn), `ConverseAction` + ACTION_MAP, settings fields + `converse_api_key()`, commands, Conversation settings tab, bindings, sidebar entry.
- [ ] **P6 Onboarding**: hi-fi restyle + animated `StratosMark` hero (framer-motion + reduced-motion).
- [ ] **P7 Icons**: regenerate tray PNGs (mono template) + app iconset from the mark.
- [ ] **P8 Performance**: release profile (LTO/codegen-units/opt-level/strip/panic) + frontend render/bundle wins.
- [ ] **P5.5 Voice Agent Control Center** (NEW, Arshia 2026-06-23): STRAT as a multi-session command center. Sessions PUSH their end-of-work results into a queue in STRAT (the "pull" Conversation Mode is the other half). A Strat-shipped Claude Code **skill + Stop hook** delivers each finished session's summary+next-steps to `~/.claude/strat/queue/`; STRAT watches it, shows a **Sessions/Agents dashboard** (queue of agent runs ready to review, grouped by repo/session), speaks each in that **session's assigned voice**. fn-triggered voice tasks are logged as "agents." Deep design in flight (background agent) → `2026-06-23-voice-agent-control-center.md`. MVP: Stop hook writes report → watcher ingests → Sessions tab lists → Play speaks in Monoli.
- [ ] **P9 Build + verify + handoff**: cargo check + tsc green throughout; final release build; STATE + handoff doc for the morning.

## Verification gates
- `cd ~/Dev/strat/src-tauri && cargo check` after each Rust wave.
- `cd ~/Dev/strat && bunx tsc --noEmit` after each frontend wave.
- Commit after each coherent chunk (granular restore points on the branch).
- Final: one release build, installed, ready for the AM TCC re-grant.
