# Changelog

All notable changes to Murmur. This project follows semantic versioning.

## 1.0.0 — 2026-06-24

First public release of Murmur, the voice layer for Claude Code, by Stratos House.

### Added
- VoiceBox-inspired redesign: clean surfaces, a single warm gold accent, and teal
  reserved for live session indicators.
- Light and dark themes with a persisted toggle (default light); rail toggle and an
  Appearance setting.
- Collapsible and lockable sidebar: pinned wide (icons + text), pinned narrow (icon
  rail), or unlocked with a hover-to-peek overlay.
- Read-Aloud neural voices: Microsoft Edge (free, 47 English voices) as the default,
  Kokoro for fully offline playback, and ElevenLabs behind an advanced option.
- Live Sessions observatory: a per-project dashboard with a chat drawer and
  push-to-talk voice.
- Real Stratos House branding throughout, including the app icon.
- In-app changelog.

### Fixed
- App icon rendered as a generic placeholder on some systems.
- Sessions view left a dead band at the bottom and clipped rows.

## 0.9.0 — 2026-06-23

### Added
- Sentence-chunked Read-Aloud so the first sentence plays in ~1–2s.
- Multi-engine voice stack (Edge TTS, Kokoro, ElevenLabs) with graceful fallback.
- Sessions observatory groundwork and onboarding.
