# Decision: rebuilding the "Monoli" voice for free

**Date:** 2026-06-23 · **Voice ID:** `lFgEIfmwAezm69n8Om85` · **Status:** recommendation (decision-ready)
Researched via multi-agent workflow with adversarial verification (ElevenLabs ToS, local cloning engines, integration into `tts.rs`, quality vs ElevenLabs).

## TL;DR
**Do not clone Monoli from ElevenLabs audio.** It breaches ElevenLabs' Terms (a contract-law blocker independent of who "owns" the output), and the project already solved the underlying problem — Read Aloud runs free on **edge-tts + Kokoro**, sentence-chunked to ~1-2s first audio, and STATE says *"voices are DONE."*

- **Recommended (option 0):** don't rebuild Monoli; ship a top-tier **free stock voice** (already wired). Flip the Edge default `AriaNeural → AvaMultilingualNeural`/`AndrewMultilingualNeural`; Kokoro fallback stays `af_heart`. Hours of work, $0, zero legal exposure, no quality regression.
- **Only if a bespoke branded voice becomes a real requirement (option 1):** clone a voice you **own or have a release for** (your own recording, the original upload samples if Monoli is *your* clone, or a paid VO with an AI-replica release) using a **permissively-licensed** cloner (OpenVoice v2, MIT) — **never** from ElevenLabs output.

## The legal reality (this is the crux)
- **Cloning from ElevenLabs-generated audio is prohibited on every plan.** ElevenLabs' Prohibited Use Policy bars using their Output "as input for any machine learning or training of AI models" or as part of a training dataset. Zero-shot voice cloning is exactly that. Owning the output ≠ permission to use it as ML input. Output is also watermarked (forensic/PerTh + C2PA) and classifier-detectable; the copyright "AI voices aren't copyrightable" argument does **not** cure a *contract* breach.
- **The quota was a free plan** (9995/10000), whose ToS restricts output to **non-commercial** use — and Murmur is a commercial product. So the reference audio was out-of-license at the source.
- **Right-of-publicity:** if Monoli derives from a real person, reproducing the recognizable voice can trigger the TN ELVIS Act + ~12 state voice laws — independent of any model's open license.

## First action before ANY clone work: identify the voice type
One API call resolves whether a legal clone is even possible:
```bash
curl -H "xi-api-key: <KEY>" https://api.elevenlabs.io/v1/voices/lFgEIfmwAezm69n8Om85
```
Read `category` / `sharing`:
- `generated` (Voice Design) → **no human source exists**; nothing to legally clone, only approximate.
- `cloned`/`professional` **and it's your own** → the **original upload recordings are yours** (clean reference, no ElevenLabs-output restriction). This is the one clean path.
- `premade`/`high_quality`/another author → a real actor's timbre under ElevenLabs contract; **not yours to replicate** off-platform (and many library voices are fully synthetic with no actor to license).

## Engine licensing (Murmur is commercial / code-signed `com.stratos.strat`)
**Safe (MIT/Apache):** OpenVoice v2 (MIT, bakes a reusable speaker embedding — best fit), Chatterbox (MIT, but every output carries a PerTh watermark; best free realism), Qwen3-TTS (Apache-2.0), OpenF5-TTS-Base (Apache-2.0, alpha), StyleTTS2 (MIT), Kokoro (Apache-2.0, **can't clone** — fixed voices).
**Excluded (non-commercial / restricted):** Coqui XTTS-v2 (CPML; Coqui defunct), official SWivid F5-TTS (CC-BY-NC), Fish/OpenAudio S1, VibeVoice, IndexTTS-2.

## If option 1 is greenlit — integration shape (mirrors existing `tts.rs` seams)
One-time **offline** Python bake (run once, not shipped) → small speaker embedding stored like Kokoro's voices → a thin local inference sidecar that `tts.rs` calls over HTTP exactly like ElevenLabs. Steps:
1. Capture 1-5 min clean reference (own/consented voice; `ffmpeg -ac 1 -ar 24000 -af loudnorm`).
2. Bake once with OpenVoice v2 → `~/Library/Application Support/com.stratos.strat/models/openvoice/voices/<name>.pth` (reuse the model-manager download flow; add `set_clone_dir()` mirroring `set_kokoro_dir()`).
3. Wire a provider: add `OpenVoice` to `TtsProvider` (settings.rs ~L165); add `#[serde(default)] clone_voice_id` to `AppSettings` **and** to `get_default_settings()` (the store-reset-on-missing-field gotcha); add `speak_openvoice()` reusing `speak_chunked()` (closure is `Fn(&str)->Result<PathBuf,String>`); add the dispatch arm in `speak_with_settings` (~L496); add `list_clone_voices`/`change_clone_voice_setting` commands; update `ReadAloudSettings.tsx` + hand-edited `bindings.ts` + `settingsStore.ts`. Set fallback to Kokoro→`say` via `emit_degraded`.
- **Cost:** breaks the current no-Python design and adds a second codesign/notarize target. The cleaner-but-bigger alternative is an F5-TTS ONNX export running in-process on the existing `ort` runtime (no Python, no second binary) — larger investment, and F5/OpenF5 quality is below ElevenLabs today.

## Quality expectation
- **Free stock voices (the rec):** effectively at parity *by ear* for neutral Read-Aloud narration (the ElevenLabs gap lives in dramatic/emotional delivery this use case doesn't exercise).
- **A legal custom clone (OpenVoice v2):** "recognizably the same person," but below ElevenLabs on prosody/long-form polish — a re-interpretation, not a perceptual match.
- **What you cannot have:** an exact, legal, free reproduction of the *ElevenLabs-generated* Monoli timbre.

## Ranked options
1. **Don't clone — flip to a great free stock voice** (Edge Ava/Andrew, Kokoro af_heart). $0, hours, no risk. ← recommended
2. **Record fresh consented voice → bake once with OpenVoice v2 (MIT).** Only legally-clean way to get a bespoke "Monoli-like" voice. Medium-high effort (Python sidecar + 2nd notarize).
3. **Chatterbox (MIT)** local sidecar — best free realism (beat ElevenLabs in blind tests) but ships a watermark, slow/buggy on Apple Silicon, needs a consented reference.
4. **Qwen3-TTS / OpenF5** — license-clean but real-time-too-slow / alpha on Apple Silicon today. Track, don't ship.
5. **NEVER:** clone from exported ElevenLabs Monoli audio (ToS breach, watermark-traceable, publicity-law exposure).
