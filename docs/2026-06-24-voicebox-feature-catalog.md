# VoiceBox → Murmur feature catalog

Date: 2026-06-24. Source: [jamiepine/voicebox](https://github.com/jamiepine/voicebox)
(Tauri + Rust shell, React/TS frontend, FastAPI/Python backend, SQLite). Target:
Murmur (`~/Dev/strat`, Handy fork: global dictation + Read-Aloud TTS + Conversation
Mode + Sessions/Agents observatory + overlay; engines edge-tts / Kokoro / ElevenLabs).

This is the answer to "find all the different features VoiceBox has that we can add."
Ratings: portability HIGH/MED/LOW, effort S(<1h)/M(half-day)/L(1-2d), judged against
what Murmur already ships. The UI adoption itself is tracked separately in
`2026-06-24-voicebox-ui-adoption.md`.

---

## Group A — directly portable & high value

| # | Feature | Portability / effort | Why it fits Murmur |
|---|---------|----------------------|--------------------|
| A1 | **Unified dictation/speech pill** — one overlay state machine (recording / transcribing / refining / speaking / completed / error), bidirectional | HIGH / M | Murmur has an overlay but split dictation vs read-aloud surfaces. One pill for all states is cleaner. Port the *contract*. |
| A2 | **"Agent speaks" pill driven by playback events** — show pill only once audio actually plays, arm elapsed on `onplaying`, last-speak-wins teardown, 60s backstop | HIGH / M | Maps to Read-Aloud + Sessions auto-speak. Solves the exact flicker/stuck-pill problems Murmur's auto-speak will hit. |
| A3 | **Rebindable chord picker** — push-to-talk + tap-to-toggle, hold→toggle upgrade mid-press, peak-held set capture | HIGH / S–M | Murmur has PushToTalk/ShortcutInput; the hold→toggle-upgrade UX + chord-replay-into-Rust pattern are nicer. |
| A4 | **LLM transcript refinement** — filler/stutter/false-start cleanup before paste, re-runnable with flags, raw+refined preserved | HIGH / S | Murmur already has text post-processing + Apple Intelligence. Adopt the refine *flags* + dual-store; reuse existing LLM client. |
| A5 | **Target-aware auto-paste** — snapshot focused field at chord-start, atomic clipboard save/restore, consume-once | HIGH / S | Murmur has paste injection; the focus-snapshot-at-start guard (stops a late refine pasting after you moved on) is a robustness upgrade. |
| A6 | **First-run permission gates** — Accessibility + Input Monitoring deep-linked to System Settings + a "dictation readiness checklist" | HIGH / S | Murmur has an accessibility gate but no Input-Monitoring gate / readiness checklist. Directly droppable. |
| A7 | **Per-agent voice binding + `last_seen_at`** — pin Claude Code→VoiceA, Cursor→VoiceB; resolution arg → per-client → global; confirms the install took | HIGH / M | Exactly the data model Murmur's multi-session voice Control Center needs. **Top pick.** |
| A8 | **Expose Murmur TTS as MCP `speak`/`transcribe` tool** + `POST /speak` | MED–HIGH / M–L | Turns Murmur from pull-only (reads session JSONL) into bidirectional: agents proactively voice themselves. **Strategic.** |
| A9 | **Captures library** — every dictation preserved w/ audio+transcript; replay, re-transcribe at higher quality, re-refine, inline edit, export md/txt, "promote to voice sample" | HIGH / M | Richer than Murmur's `history/`. Strong upgrade; reuses existing TTS for playback. |
| A10 | **Async non-blocking generation queue** — serial exec (no GPU contention), live status events, retryable, auto-recover stale tasks on startup | HIGH / M | Same shape as Murmur's Sessions Control Center (queue of agent runs to speak). More mature than a FIFO. **Top pick.** |

## Group B — portable with adaptation

| # | Feature | Portability / effort | Note |
|---|---------|----------------------|------|
| B1 | Multi-engine TTS abstraction (7 engines, one protocol, per-call switch, profile→engine auto-select) | MED / L | Adopt the *abstraction* in Rust `tts.rs`; the Python backends don't port. |
| B2 | Voice profiles + zero-shot cloning from samples (named voice + default engine + persona + effects, import/export `.zip`, avatars) | MED / L | The **profile model** maps perfectly to "per-session voice." Port profiles + UI; skip local cloning engines unless Murmur bundles one (cf. Chatterbox decision). |
| B3 | Voice personalities — persona prompt → Compose / Speak-in-character via local LLM | MED / M | "Claude Code sounds terse, Cursor cheery." Reuses LLM client; needs a persona field on the voice model. |
| B4 | Audio effects chain — pitch/reverb/delay/chorus/compressor/gain/HPF/LPF, drag-reorder, presets, per-profile default | MED / M | Net-new (Murmur has *text* post-proc, not audio DSP). Needs a Rust DSP lib or Python sidecar; the chain editor UI ports cleanly. |
| B5 | Generation versions / takes / favorites + provenance | MED / M | Port favorites + retry-failed now; full versioning only if Murmur grows a studio. |
| B6 | **Unlimited-length generation** — sentence-boundary chunking (abbrev/CJK/[tag]-aware) + crossfade | MED / S–M | Directly relevant to reading long Claude responses/articles. Implement against Murmur's Rust TTS (it already chunks; add smart splitter + crossfade). |
| B7 | Paralinguistic tag inserter (`/` autocomplete → `[laugh]`/`[sigh]` badges) | MED / S | Engine-specific (only Chatterbox Turbo honors tags). Self-contained gem; low priority today. |
| B8 | STT with selectable Whisper sizes + re-transcribe | MED / M | Murmur already runs Whisper/Parakeet in Rust. Adopt the *re-transcribe-at-higher-quality* UX + shared-model design. |
| B9 | Settings IA + in-app Logs page + Changelog page + GPU info card + model unload-to-free-VRAM | MED / S–M | Murmur has acceleration/models/update-checker/debug. The Logs + Changelog pages + unload-to-free-VRAM are nice adds; CUDA auto-download is out of scope. |
| B10 | System-audio (loopback) capture as a voice-sample source | MED / M | Murmur's roadmap lists a dual-stream (mic + system) recorder. Working reference for the capture side. |

## Group C — out of scope for Murmur (intentionally skipped)

- **C1 Stories editor** (multi-voice podcast timeline) — Murmur is a voice *layer*, not a content studio.
- **C2 Audio channels / multi-output routing** — `OutputDeviceSelector` already covers Murmur's single-output need.
- **C3 Local cloning TTS engines** (Qwen3-TTS, Chatterbox, LuxTTS, TADA, Qwen CustomVoice + 50+ presets) — multi-GB Python servers contradict Murmur's light footprint. (Abstraction = B1; engines themselves out.)
- **C4 Python FastAPI backend + REST API + docs site** — Murmur's logic is Rust/Tauri; a sidecar would be a re-architecture. (Keep the MCP *interface* A8; not the FastAPI host.)
- **C5 Remote / Docker server mode + broad GPU matrix** — tied to the standalone server (C4); Murmur is single-machine, on-device.
- **C6 Landing/marketing site, sponsors, DeepWiki/Trendshift** — website assets, not features.
- **C7 "Add a TTS engine" agent skill + contributor tooling** — repo-dev tooling specific to VoiceBox's Python multi-engine architecture.

---

## Recommended order for Murmur (highest leverage first)

1. **A7 per-agent voice binding + `last_seen_at`** and **A10 async queue + status events + crash-recovery** — the exact data model + execution engine Murmur's multi-session Voice Agent Control Center needs (its overnight plan already calls for a queue + per-session voice + auto-speak FIFO; VoiceBox solved both well).
2. **A1 / A2 unified bidirectional pill** — replace the split dictation/read-aloud surfaces with one state machine; the "show-on-play" + stale-cycle guards are battle-tested.
3. **A8 expose Murmur TTS as MCP `speak`** — bidirectional voice; agents speak themselves.
4. **B6 chunk-and-crossfade long-form Read-Aloud** + **A9 richer Captures** — direct quality wins for the core flows.
5. **A4/A5/A6 dictation robustness** (refine flags, focus-snapshot paste, readiness checklist) — cheap, high polish.
6. Later/studio: B2 profiles, B3 personas, B4 audio effects, B8 re-transcribe.
