# Kokoro TTS — Free Local Default Voice for Murmur

Date: 2026-06-23
Status: approved (brainstorm), pre-implementation
Branch: `feat/kokoro-tts`

## Problem

Read Aloud and the session/Conversation voice currently default to ElevenLabs (paid). When the free ElevenLabs tier is exhausted, every synthesis 401s with `quota_exceeded` and the app **silently** drops to the robotic macOS `say` voice. The user hit this live (9995/10000 credits used) and experienced it as "all my voices disappeared." The user does not want to pay for voices.

## Goal

Make a free, high-quality, offline voice the default, keep ElevenLabs as an optional power feature, and never degrade silently.

- **Default engine:** Kokoro-82M (Apache-2.0, local ONNX neural TTS, no key, no quota, offline). Top open-weight model on the 2026 TTS Arena.
- **Opt-in engine:** ElevenLabs via bring-your-own-key (preserves the user's "Monoli" voice when they have credits).
- **Fallback:** macOS `say` (Premium voice if installed, else compact) as a silent-no-more last resort.

## Non-goals (YAGNI for this pass)

- Chatterbox / Python sidecar for max realism (future toggle).
- Streaming TTS.
- Microsoft edge-tts (online, ToS gray area).
- Removing ElevenLabs or the `say` fallback entirely.

## Architecture

The single dispatch seam is `speak_with_settings(settings, text)` in `src-tauri/src/tts.rs`, which matches on `settings.tts_provider`. Today: `Say | ElevenLabs`. We add `Kokoro` and make it the default.

Playback is unchanged: every engine writes/returns audio that is played through the existing `afplay`/`say` child process tracked in the `CURRENT` static, with the `GEN` AtomicU64 generation counter providing race-safe barge-in. `stop()`, `is_speaking()`, and hotkey/Esc cancellation keep working without modification.

### Components

1. **`TtsProvider::Kokoro`** (enum + `Default`) — `src-tauri/src/settings.rs`. Becomes the default provider.
2. **`speak_kokoro(text, voice_id)`** — `src-tauri/src/tts.rs`. Mirrors `speak_elevenlabs`: synth on a background thread, generation-guarded, WAV to temp file, played via the tracked `afplay` child. On error, runs the fallback chain and emits a degraded event.
3. **Kokoro synth backend** — an in-process Rust crate (see Crate Decision). Produces PCM/WAV from text + a Kokoro voice id, using `misaki-rs` for grapheme-to-phoneme.
4. **Kokoro model manager** — mirrors the existing STT model-download flow (`commands::models`, the model manager that fetches the Parakeet model). Downloads the Kokoro ONNX model (~80 MB quantized) + voicepacks to `~/Library/Application Support/com.stratos.strat/models/kokoro/` with the same progress/cancel UI.
5. **Fallback + error surfacing** — a small pure function `choose_engine(provider, state) -> Engine` plus a Tauri `tts-degraded` event consumed by a UI toast.
6. **Read Aloud settings UI** — `src/components/settings/read-aloud/ReadAloudSettings.tsx`: Kokoro voice picker by default; an "Advanced: use my ElevenLabs key" disclosure reveals the key field + ElevenLabs voice picker.

## Crate Decision (build step 0: a compile spike)

Risk: the app's `ort` (onnxruntime) `2.0.0-rc.12` arrives **transitively** through `transcribe-rs`, not as a direct dependency. A Kokoro crate that pulls a different `ort`/onnxruntime version can collide at link time (duplicate native lib).

Spike: try, in order, a crate that (a) matches `ort 2.0.0-rc.12` so it reuses the same onnxruntime, or (b) uses **Candle** (no onnxruntime, so no possible link conflict). Candidates verified on crates.io: `kokoroxide`, `kokoro-en`, `atomr-agents-tts-runtime-kokoro`, `kokoro-tiny`, `any-tts` (Candle). G2P via `misaki-rs` with `default-features=false` to drop the GPL espeak fallback.

Decision rule:
- If a crate compiles + links + produces a valid WAV alongside `transcribe-rs` -> **in-process** (preferred: one signed binary, lowest complexity).
- If none link cleanly -> **bundled `kokoro` sidecar binary**, invoked as a subprocess like `afplay` (isolates ONNX from the main binary; costs a second codesign/notarize target — acceptable but not preferred given the signing pipeline's sensitivity).

Voicepack licensing: confirm the Kokoro voicepack `.bin`/weights license permits product use before shipping (model weights are Apache-2.0; voice files are not always explicitly licensed).

## Data flow

1. Hotkey / right-click / session event -> `speak_with_settings(settings, text)`.
2. `tts_provider == Kokoro`:
   - If the Kokoro model is downloaded and a crate loaded -> `speak_kokoro`. Synth -> WAV -> `afplay`.
   - If the model is not yet downloaded -> emit `tts-degraded { reason: "model_downloading" }`, speak via `say` fallback, and (on first run) trigger the model download.
   - On synth error -> emit `tts-degraded { reason }`, run the fallback chain.
3. `tts_provider == ElevenLabs` (only when the user has opted in with a key): unchanged path; on quota/401/offline -> emit `tts-degraded { reason: "elevenlabs_failed" }` and fall back to **Kokoro** (then `say`).

## Fallback + error surfacing (the "this can't happen" fix)

- Chain: **Kokoro -> say(Premium if installed -> compact)**. ElevenLabs (opt-in) falls back to Kokoro first.
- Replace today's silent `warn!`-only fallback with a `tts-degraded` Tauri event carrying a human reason. The frontend shows a `sonner` toast, e.g. "ElevenLabs quota exhausted, using Kokoro" or "Voice model downloading, using system voice."

## Settings + UI

- `tts_provider` default flips to `Kokoro`.
- New field `kokoro_voice_id: Option<String>` with `#[serde(default)]` AND an entry in `get_default_settings()` (per the known gotcha: a non-defaulted new field makes the whole settings store fail to deserialize and reset to defaults, wiping config).
- `session_voices` (per-session/per-repo) store Kokoro voice ids by default; ElevenLabs ids only when the user is in opt-in mode.
- A `change_kokoro_voice_setting` command + a `settingUpdaters` entry (clobber-safe per the store pattern). `src/bindings.ts` hand-edited (specta only regenerates on a debug run, which collides with the running app).
- Read Aloud UI: default Kokoro voice picker (list comes from the crate's bundled voice names, ~54 voices). Disclosure: "Advanced: use my ElevenLabs key" -> reveals key field + the existing ElevenLabs voice picker.

## Testing / verification

- Unit: `choose_engine` selection logic (pure fn over provider + model-ready + key-present + premium-installed), and Kokoro voice-list parsing.
- Manual smoke (the proven pattern): build -> launch -> confirm pid alive past setup -> Read Aloud a selection -> hear Kokoro (not robotic say) -> remove the kokoro model dir -> confirm the degraded toast + `say` fallback -> re-add -> hear Kokoro again.
- Each build wave gated by `cargo check` + `tsc`; commit granularly.

## Build waves

0. **Spike**: pick the Kokoro crate (compile + WAV alongside `transcribe-rs`). Locks in-process vs sidecar.
1. **Engine**: `TtsProvider::Kokoro`, `speak_kokoro`, model wiring, `choose_engine` + fallback chain (default still `Say` until UI ships, to keep main usable).
2. **Model manager**: Kokoro model + voicepack download mirroring STT, first-run trigger.
3. **Error surfacing**: `tts-degraded` event + UI toast.
4. **Settings + UI**: flip default to Kokoro, voice picker, ElevenLabs "Advanced" disclosure, bindings.ts.
5. **Verify + smoke**, then finish-branch.

## Risks

- ort link conflict (mitigated by the spike + sidecar fallback).
- Voicepack licensing (verify before ship).
- Kokoro neutral tone has less emotional range than ElevenLabs (acceptable for narration/summaries; ElevenLabs opt-in covers expressive needs).
- misaki-rs without espeak spells out out-of-dictionary words (acceptable; revisit if pronunciation is poor).
