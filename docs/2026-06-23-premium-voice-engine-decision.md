# Decision: premium, characterful, free voice engine for Murmur

**Date:** 2026-06-23 · **Status:** recommendation (decision-ready)
Researched via multi-agent workflow (6 survey angles + completeness critic + adversarial verification of 12 top models across 60 candidates). Goal: replace flat free TTS (edge-tts/Kokoro) with a premium, characterful, low-latency, free/self-hostable voice with a real owned identity.

## Bottom line
Ship **Chatterbox-Turbo (Resemble AI, MIT)** as the new premium default — local **MLX/Python sidecar** on Apple Silicon for the $0 tier, optional **self-hosted cheap-GPU endpoint** as an "HD" toggle. Keep **Kokoro-82M** as the instant offline fallback. Build Murmur's identity as an **owned, consented voice clone + LoRA fine-tune** — never from ElevenLabs output.

## Why Chatterbox-Turbo
It's the only model that clears all five hard gates at once:
- **Premium realism** — ElevenLabs-class on clean references (vendor blind pref ~63-65%; independent devs "much more natural").
- **Real character/identity** — the **only permissive model with an explicit emotion-exaggeration dial** + cfg/pace + paralinguistic tags (`[sigh] [laugh] [whisper]`) + 5-10s zero-shot clone. This is the exact "escape flat" lever.
- **Low latency** — one-step distilled decoder, 350M, ~75ms TTFA / ~6x realtime on GPU; sentence-chunkable.
- **Free** — self-hosted, $0 marginal.
- **License** — **MIT on code AND weights** (base, Turbo, Multilingual v3). The cleanest license of any characterful model.
- Watermark catch (Resemble PerTh) is a removable MIT post-process; leaving it on is actually an EU AI Act Art. 50 asset.

## Why not the "better-sounding" rivals (license/latency filter)
- **Fish S2 Pro / OpenAudio S1** — best neutral arena scores, but **non-commercial** (Fish Research / CC-BY-NC). Disqualified.
- **Higgs Audio v2** — most expressive near-clean option, but custom Boson license (100k-AAU cap + Llama attribution), 24GB GPU, 2-3s latency. GPU-tier only.
- **Orpheus-3B** — characterful, but weights are a Llama-3.2 derivative (Llama Community License), 3B GPU-first, no clean MLX path.
- **Maya1** — best prompt-voice-design story, but ranks ~tied with Kokoro on neutral arena and emotion tags misfire. Would reproduce the flat complaint.
- **XTTS-v2** (CPML, Coqui defunct), **official F5-TTS** (CC-BY-NC), **Spark-TTS** (CC-BY-NC), **IndexTTS-2** (PRC custom), **VibeVoice** (research-only + forced audible "AI" disclaimer, MS pulled it). All avoid.
- **Vanilla Kokoro/edge-tts** — structurally flat (no emotion/clone/fine-tune); fine as fallback only.

## Deployment: hybrid, local-first
The core 2026 finding: *characterful AND low-latency AND on-device* does not exist in one model — characterful models hit their headline latency only on NVIDIA GPUs. So tier it:
| Tier | Engine | Deployment | TTFA | Cost |
|---|---|---|---|---|
| Instant fallback | Kokoro-82M | in-process ONNX (shipped) | ~45-180ms | $0 |
| Premium default | Chatterbox-Turbo | bundled MLX/Python sidecar on the Mac | ~0.5-2s first sentence (chunked) | $0 |
| HD toggle (opt-in) | Chatterbox-Turbo | your own self-hosted GPU endpoint | ~0.5s first chunk, RTF ~0.5 | ~$0 (own GPU electricity / Modal free tier + scale-to-zero) |
Warm the model at app launch to hide the Metal cold-compile; sentence-chunking is mandatory on the Mac tier.

## Building a real Murmur identity (owned, legally clean)
1. **Consented zero-shot clone (start here):** commission ONE voice actor, record a studio-clean **10-30s** reference with a signed commercial buyout. Chatterbox clones it zero-shot. Pin a house preset (exaggeration ~0.6-0.7, cfg ~0.3) so every Read Aloud is recognizably "the Murmur voice."
2. **LoRA fine-tune (hardening):** fine-tune on ~10-30 min of the same actor → MIT lets you ship/redistribute the weights → an owned, drift-free, unrepeatable identity. (Mitigates the #1 risk: Chatterbox quality swings on the reference clip.)
- **Never clone from ElevenLabs output** (policy breach — matches the Monoli decision). Clone only audio you own. Get the actor's written AI-replica release.

## Latency architecture: reuse the existing seam
`tts.rs::speak_chunked` (line 338) already does sentence-split + generation-guarded background playback + per-chunk `synth: Fn(&str)->Result<PathBuf>` closure + `say` fallback. A Chatterbox provider is just a new closure that turns a chunk into a WAV — structurally identical to `speak_kokoro` (382) / `speak_edge` (466). No new latency plumbing.

## Integration plan (phased)
Chatterbox is PyTorch/MLX — no Rust/Candle/ONNX path — so it slots in as a **sidecar provider** behind the same closure (like `speak_edge`'s HTTP shape).
- **Phase 1 (ships first):** add `Chatterbox` to `TtsProvider` (settings.rs:165) + a `chatterbox_voice_id`/reference-clip field; add `speak_chatterbox` that POSTs each chunk to a localhost sidecar → WAV → existing `play_and_wait`; bundle a small Python sidecar (chatterbox-tts + mlx-audio, or devnen/Chatterbox-TTS-Server) as a Tauri-managed child, warmed at startup; wire into `speak_with_settings` (489). **Cost: breaks the no-Python design + adds a second notarize target.**
- **Phase 2:** native MLX sidecar, ship the fine-tuned brand-voice weights, expose the exaggeration dial in settings, first-chunk-Kokoro warm-start.
- **Phase 3:** optional self-hosted GPU "HD" toggle — same HTTP closure pointed at a remote endpoint; zero new audio code.

## Dark horses to A/B before committing
- **CosyVoice 2/3 (Apache)** — 150ms streaming, 100+ instruction types, emotion decoupled from identity, zero-shot clone. The strongest alternative; same Python-sidecar friction.
- **GLM-TTS (code Apache / weights MIT)** — RL-trained on emotion accuracy + speaker similarity, lowest open CER, streaming. Newer/less battle-tested.
- **Qwen3-TTS (Apache, mlx-audio port)** — ~97ms TTFA, 3s clone, NL voice design, runs on Apple Silicon.

## Honest expectation + biggest risk
- **Vs ElevenLabs:** ElevenLabs-*class*, not ElevenLabs-*beating*. On a clean fixed reference with a pinned preset it's human-indistinguishable to most listeners and dramatically better than current edge-tts/Kokoro flatness. ElevenLabs v3 still edges it on the subtlest emotional shifts; the "65% win" is vendor-run. The trade: last ~10% of polish for $0/use, full ownership, offline, and a brand voice no competitor can replicate.
- **Biggest risk:** reference-audio sensitivity → inconsistent identity (bad refs → artifacts). Mitigate from day one: ONE studio-clean reference + LoRA fine-tune (bake the voice into weights) + frozen exaggeration/cfg preset.

## Recommended first step (de-risk before building)
**Listening test, not architecture.** Install Chatterbox locally, synthesize a few samples (stock + a cloned reference + the emotion dial at a couple settings), and *listen* — the whole ask is subjective ("sounds weird/flat"). Confirm it sounds the way you want before committing to the Python-sidecar build.
