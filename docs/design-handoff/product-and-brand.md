# Product & Brand

## What Murmur is

**Murmur** is a macOS desktop app — the **voice-first "human layer" for Claude Code**. The product name shipping in the bundle is "Murmur" (`tauri.conf.json` → `"productName": "Murmur"`), even though the repo, the binary lineage, and most code identifiers still say "strat"/"Handy". The first-run tagline in the app is literally:

> **Your voice layer for Claude Code.** — *a Stratos House product*
> (`src/components/onboarding/WelcomeOnboarding.tsx`)

It is a Tauri v2 app (Rust backend in `src-tauri/`, React + Tailwind v4 frontend in `src/`), forked from **Handy**, the open-source offline dictation app. Murmur keeps Handy's local, privacy-respecting dictation core and adds two new pillars on top — cloud TTS ("Read Aloud" in the Monoli voice) and a live **Sessions observatory** that watches and talks to running Claude Code sessions.

The naming is mid-transition by design: the design spec explicitly lists "the name/brand swap" as **Out of scope (Phase 1)** (`docs/superpowers/specs/2026-06-23-sessions-observatory-design.md`). So today the UI reads "Murmur" in user-facing copy (`alt="Murmur"`, onboarding, `translation.json` ~30 strings), while internals, the companion plugin (`strat-control`, `/strat`), and the docs still say "Strat". Claude Design should treat **Murmur as the user-facing name** and not "fix" the internal `strat` identifiers.

## Who it's for

The primary (and authoring) user is **Arshia** and people who build like him: developers and operators running **many concurrent Claude Code sessions at once**. The grounding number from the design spec is concrete:

> "Arshia runs **~12 live Claude Code sessions** across multiple VS Code windows (and sometimes terminals)."

At that scale the bottleneck is no longer typing — it's *attention*. You can't watch twelve transcripts. Murmur's job is to let one human stay the conductor of a fleet of agents using their **voice and ears** instead of twelve windows and a mouse: dictate prompts hands-free, hear answers and finished-session reports read aloud, and get told (spoken + native notification) exactly which session needs them next. It is a tool for the "fleet operator," not the single-session coder.

## The three core capabilities

### 1. Dictation (inherited + sharpened from Handy)
Press a hotkey, speak, and clean text lands in any focused text field — **including the Claude Code prompt**. Transcription runs **fully locally/offline** (Whisper.cpp / Parakeet via `transcribe-rs`, Silero VAD), so audio never leaves the machine. This is the "talk instead of type" pillar; in-app copy: *"Talk instead of type. A hotkey turns your voice into clean text in any app — including Claude Code."* This is the foundation that makes the voice-first posture credible.

### 2. Read Aloud / Monoli (hear it back)
Select any text and press **⌥⌃R** (also available as a right-click macOS Service) to hear it spoken in a natural cloud voice. The signature voice is **"Monoli"** — an **ElevenLabs Studio voice** played through the Rust `tts.rs` path (`src-tauri/src/converse/mod.rs`: *"'Monoli' voice through the existing tts.rs path"*). Onboarding framing: *"Read Aloud speaks any selection in a natural voice (Monoli) — proofread with your ears."* Monoli is also the **default voice for everything spoken** in the app (session summaries, answers, attention alerts), resolved per-session → per-repo → global (`elevenlabs_voice_id`).

> Brand note: the ElevenLabs key/account label uses the spelling **"Monoly"** (`translation.json` keyDescription, `settings.rs`), but the user-facing brand spelling is **"Monoli"**. Treat **Monoli** as canonical in any design copy.

### 3. Sessions observatory + in-app voice
The headline new surface. A unified **Sessions** tab (master–detail) discovers **every live Claude Code session** from `~/.claude/sessions/<PID>.json`, groups them by VS Code window/project, and shows a triage status for each:

- 🟢 **working** (streaming in the last ~8s)
- 🟡 **waiting-for-you** (turn ended, your move)
- ⚪ **idle**
- ✓ **done** (process gone; report moves to the "Recently finished" strip)

On a transition into **waiting-for-you** it fires a native macOS notification and (optionally) speaks *"X needs you"* in Monoli. The detail pane carries the live transcript plus on-demand **Haiku 4.5 summaries** and an **Ask-about-this-session** box (answered by Sonnet, spoken by Monoli). The mental model the docs use: *holding the speak key = deploying an agent; a finished session reporting back = an agent returning* (`docs/voice-agent-control-center.md`). This is the "run your sessions" pillar: *"See every live Claude Code session at a glance, ask any of them what's going on, and get told when one needs you."*

## Positioning

Murmur lives in the same category as agent control planes / "watch-and-approve" tools (HumanLayer, Conductor, session monitors) — but it is deliberately a different *sense*. The one-line wedge, taken verbatim from the design spec's plugin README positioning, is the north star for all brand copy:

> **"They let you watch and approve agents by clicking; Murmur lets you talk to them and hear them back."**

Everyone else makes you *read and click*. Murmur makes the relationship with your agents **conversational and ambient** — input by voice, output by voice, attention routed to your ears. Supporting positioning lines: "the **human layer** — a voice-first control plane over all local Claude Code sessions," and the product tagline "**Your voice layer for Claude Code.**"

## The brand

### Name rationale — "Murmur"
A *murmur* is a quiet, intimate, continuous sound — the sound of something **always present and always listening** without demanding attention. It is deliberately the **anti-Siri**: no wake word theatrics, no chirpy assistant persona, no "How can I help you today?" The name signals a calm background presence — a voice layer that hums alongside your work and speaks only when there's something worth hearing (a session needs you, a report is ready). It pairs naturally with the always-on Sessions watcher and the soft spoken alerts. Tone is *low, close, and unobtrusive* — a murmur, not an announcement.

### "A Stratos House product"
Murmur is published by **Stratos House** (Stratos Agency). The endorsement is shown literally in onboarding (*"a Stratos House product"*, `WelcomeOnboarding.tsx`) and the visual identity is shared with Stratos (`stratos-logo.png` is the same asset as `strat-logo.png`). The bundle identifier reflects the org: **`com.stratos.strat`**.

### The logo — layered teal nested-diamonds
The core mark is **`src/assets/strat-logo.png`**: three stacked, nested **diamonds/rhombuses** in teal, outlined with a lighter teal stroke, the innermost diamond filled solid teal, with a soft **teal→warm-gold** gradient glow falling off the bottom edge. It reads as layered, calm, dimensional — a stack of "rooms"/layers, on-brand with "Stratos" (strata/layers). It is imported and used as the brand mark across `Sidebar.tsx`, all onboarding screens (`WelcomeOnboarding`, `FinishOnboarding`, `Onboarding`, `AccessibilityOnboarding`), and wrapped as a component in `src/components/icons/StratLogo.tsx`. There is also a custom React **wordmark** (`src/components/icons/HandyTextLogo.tsx`) whose fill follows the `--color-logo-primary` theme token, plus generated app/tray icon variants in `/assets`.

> **DO NOT redesign the core nested-diamonds mark** without explicitly flagging it. It is the shared Stratos House identity, not just Murmur's. Refinement of *placement, sizing, padding, and the wordmark* is fine; the diamond geometry is not open without sign-off.

### The teal accent (real values, from `src/App.css`)
Teal is the single brand accent, expressed through CSS custom properties (consumed by Tailwind v4 via `tailwind.config.js`):

| Token | Light mode | Dark mode |
| --- | --- | --- |
| `--color-logo-primary` (accent) | `#16B8A3` | `#2FD3BD` |
| `--color-logo-stroke` | `#0E3B37` | `#CFEFE8` |
| `--color-background` | `#fbfbfb` | `#1B2422` (deep teal-black) |
| `--color-text` | `#0f0f0f` | `#fbfbfb` |
| `--color-background-ui` | `#0FA697` | — |
| `--color-mid-gray` | `#808080` | — |

The accent drives status/active states, focus borders, the logo gradient glow, and primary buttons (`bg-logo-primary text-white`). Even the **dark background (`#1B2422`) is a teal-tinted near-black**, not neutral gray — the whole surface leans into the teal world. The logo glow's warm-gold lower edge is the one non-teal hue and is currently logo-only.

### Tone / personality
- **Quiet, ambient, intimate.** Calm presence over loud assistant. Speak when it matters; otherwise hum in the background.
- **Voice-first and human.** The verbs are *talk, listen, hear, say* — not *click, approve, monitor*. Output to ears, not just eyes.
- **Operator-grade, not consumer-cute.** Built for someone running 12 agents; dense, fast, and trustworthy beats playful. No mascot, no emoji-heavy chrome (status dots excepted).
- **Anti-Siri.** No wake-word persona, no fake personality, no "assistant" theater. The voice is a *natural human voice* (Monoli), not a robot.
- **Layered and grounded.** Visual language of strata/layers (the diamonds, the teal-on-teal depth), conveying a calm, deep, dependable system.

## Brand guardrails for Claude Design

**Do NOT change (load-bearing — flag before touching):**
- **Bundle identifier `com.stratos.strat`** must stay exactly as-is (`tauri.conf.json` → `identifier`). Changing it breaks the app's stored settings/data path, permissions trust (Accessibility/CGEvent), and notarization identity.
- **The core nested-diamonds mark** (`src/assets/strat-logo.png`). Shared Stratos House identity — refine usage, not geometry, without sign-off.
- **The teal accent system** (`--color-logo-primary` etc. in `src/App.css`). Teal is *the* brand color; do not swap the hue family or introduce a competing accent.
- **The product name "Murmur"** as the user-facing name, and **"Monoli"** as the signature voice name. Don't rename either, and don't "correct" Murmur back to "Strat" in user-facing copy.
- **The positioning wedge** — *"they let you watch and approve by clicking; Murmur lets you talk to them and hear them back."* The voice-first / talk-and-hear-back distinction is the whole point; keep it central.
- **Internal `strat`/`Handy` identifiers** (repo name, `strat-control` plugin, `/strat` command, Rust modules, `handy-app` package name). These are deliberately not renamed in Phase 1 — leave them; don't sweep them into a "consistency" pass.

**Open for elevation (encouraged):**
- Typography / wordmark treatment, spacing, sizing, layout, and visual hierarchy (the React `HandyTextLogo` wordmark is fair game to refine).
- The full neutral/surface palette, dark-mode tuning, elevation/shadows, and how broadly the teal-tinted dark surface (`#1B2422`) and gradients are applied — as long as teal stays the accent.
- Iconography beyond the core mark (tray icons, status dots, the four-state status visual language), motion/micro-interactions, and the spoken-alert / "needs you" affordances.
- All UI copy and tone polish, the onboarding flow, the Sessions observatory master–detail layout, empty/idle/working/done states, and overall calm-but-dense operator feel.
- Whether and how to surface the "ambient/always-listening" personality visually (the murmur idea) — this is underexpressed and a strong opportunity.
