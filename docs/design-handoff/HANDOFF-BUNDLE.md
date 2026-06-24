# Murmur — Claude Design Handoff (concatenated bundle)
_Generated 2026-06-23. All docs in reading order. Screenshots are in screenshots/ (see manifest.json). Build against tokens.json._


============================================================
## ::: README.md :::
============================================================

# Murmur — Claude Design Handoff Package

Everything Claude Design needs to elevate the UI of **Murmur** (a Stratos House product) —
the voice-first "human layer" for Claude Code.

**The key fact:** Murmur looks native but its UI is a **web frontend** (React 18 + Tailwind v4 in
a WebView). That is Claude Design's home turf — its HTML + token output maps back to this app's
Tailwind classes nearly 1:1, with **no "web → SwiftUI" translation tax**. The only real constraint
layer is the native macOS shell (window, vibrancy, WKWebView quirks), captured in its own doc below.

Read in this order:

0. **[00-how-to-drive-claude-design.md](00-how-to-drive-claude-design.md)** — **START HERE.** The
   current (June 2026) workflow for actually running this through Claude Design: what the product
   is now, how to set up the design system from `src/`, the prompt to paste, how to refine and hand
   off to Claude Code. Claude Design changed a lot recently — don't run it from memory.
1. **[product-and-brand.md](product-and-brand.md)** — what Murmur is, who it's for, positioning,
   the brand (name rationale, logo, teal, tone), and brand guardrails (what NOT to change).
2. **[design-system.md](design-system.md)** — the *current* system extracted from the code:
   color tokens, typography, spacing/radius, surfaces, status colors, the project palette. The
   thing to formalize and extend.
3. **[native-constraints.md](native-constraints.md)** — the **guardrails**: what the Tauri v2 /
   macOS shell makes possible (vibrancy, overlay titlebar) and forbids (no custom scrollbars on
   macOS, WKWebView-not-Chromium, 680×570 floor). Read before designing, not after.
4. **[screens-and-flows.md](screens-and-flows.md)** — every screen/section + the onboarding flow
   + global chrome, with current layout and rough edges. Priority surfaces are flagged.
5. **[component-catalog.md](component-catalog.md)** — the reusable components that exist today
   (paths, props, styling, duplication) — the primitives to systematize.
6. **[redesign-brief.md](redesign-brief.md)** — **the actual ask**: goals, priority surfaces,
   weaknesses/opportunities, hard constraints, deliverable options, and the screenshot checklist.

### Build-against specs (the buildable layer — added 2026-06-23)
- **[tokens.json](tokens.json)** — machine-readable token export (DTCG, light+dark). The canonical
  source to build against; covers the colors, status + project palette, type/radius/spacing slots,
  elevation, and motion that live inline in the code today. **The #1 deliverable.**
- **[states.md](states.md)** — empty / loading / error / skeleton matrix (copy, trigger, treatment, recovery).
- **[motion.md](motion.md)** — per-interaction motion map (token + duration + easing + reduced-motion).
- **[a11y.md](a11y.md)** — roles, focus management, keyboard model, and `aria-live` policy.
- **[screenshots/manifest.json](screenshots/manifest.json)** — screenshot + brand-asset inventory and capture status.

## TL;DR of the ask
Make Murmur **more modular, sleek, cohesive, and distinctive** without breaking any wiring.
Priority surfaces: **Sessions** (color-coded project dashboard + right-side chat drawer + mic),
**Overview** (home), and **Onboarding**. Keep it a calm, quiet, voice-first desktop app (the
"anti-Siri" tone). See `redesign-brief.md` for specifics.

## Hard constraints (also in the brief)
- Stack: **Tauri v2 + React 18 + Tailwind v4 + lucide-react + zustand**. Desktop window, not mobile. Offline-capable.
- **Preserve all functional wiring** — the Tauri commands/`bindings.ts`, the sessions/agents zustand stores, the mic/voice flow, settings persistence. Restyle, don't rewire.
- Keep the **nested-diamonds logo** (shared Stratos identity) and bundle id `com.stratos.strat`.
- Light + dark themes both matter.

## Preferred deliverable
Updated **Tailwind theme tokens + restyled components** as a drop-in PR/branch. Cut a working
branch `design/elevation-pass` from **`main`** and PR back into `main` (so it merges into the live
app). A Figma mock and/or new component variants are also welcome. See `redesign-brief.md` → "How to
hand back." The machine-readable token export to build against is [`tokens.json`](tokens.json).

## Screenshots (captured)
**22 real screenshots** (light + dark) are in [`screenshots/`](screenshots/) — all 9 sidebar sections
plus 2 onboarding screens, including the live populated Sessions dashboard. They are the
**highest-leverage input** to Claude Design (real examples beat specs); the inventory + capture status
is in [`screenshots/manifest.json`](screenshots/manifest.json). Six interactive shots (the open drawer,
mic states, popovers, overlay) still need staging in the live app — recipe in
[`screenshots/MANUAL-CAPTURE-GUIDE.md`](screenshots/MANUAL-CAPTURE-GUIDE.md).

## Source of truth
The app lives at `~/Dev/strat` (branch **`main`**; the prior `feat/sessions-observatory` work is
merged into `main`). The product spec + 3-phase roadmap:
`~/Dev/strat/docs/superpowers/specs/2026-06-23-sessions-observatory-design.md`.


============================================================
## ::: 00-how-to-drive-claude-design.md :::
============================================================

# How to drive Claude Design on this package (current as of June 2026)

Read this first. It tells **Arshia** (the operator) how to actually run this handoff through Claude Design today, and it tells **Claude Design / Claude Code** (the recipient) exactly what input it's getting and what to give back. Claude Design changed a lot in spring 2026, so do not run this from memory — the workflow below reflects the current product.

---

## 0. The one fact that makes this easy

Murmur looks like a native macOS app, but **its UI is a web frontend** — React 18 + TypeScript + Tailwind v4, rendered in a WebView. That is Claude Design's home turf. Its output (HTML + design tokens) maps back to this app's Tailwind classes nearly 1:1. There is **no "web → SwiftUI" translation tax** here, unlike a true AppKit/SwiftUI app.

The catch: the WebView on macOS is **WKWebView (Safari/WebKit), not Chromium**, and it lives inside a native window with hard physical limits. So the only real constraint layer is the native shell. That layer is documented in **[native-constraints.md](native-constraints.md)** — treat it as the guardrails, not optional reading.

---

## 1. What Claude Design is now (don't assume the old version)

- **Claude Design** (Anthropic Labs, launched Apr 2026; major update Jun 17, 2026) is a chat-left / canvas-right tool at `claude.ai/design` or in the Claude Desktop sidebar. It generates polished visual work and, as of the June update, can **import a real design system from a codebase or design files**, has a **direct-manipulation canvas editor**, and does **bidirectional sync with Claude Code**.
- Its export targets are **HTML / PDF / PPTX / Canva** — it is a *visual-direction and prototyping* layer, plus a Tailwind-friendly token/spec emitter. It does **not** emit native code, but for Murmur that doesn't matter (our UI is web).
- The implementation leg runs in **Claude Code with the `frontend-design` skill** pointed at `~/Dev/strat/src`. That's what actually edits the repo. Claude Design sets the direction; Claude Code lands the PR described in [redesign-brief.md](redesign-brief.md) §5/§7.

Verify the exact current commands in your build with `/help` before relying on names — `/design` and `/design-sync` were correct as of June 2026 but the product is moving fast.

---

## 2. Operator workflow (Arshia)

Do it in this order. Iterate in low-fidelity first — high-fi renders are token-heavy.

1. **Set up the design system from the real code, not from scratch.** Point Claude Design's design-system import at the **scoped UI subdirectory** `~/Dev/strat/src` (NOT the repo root — don't feed it `src-tauri/` Rust). It auto-extracts colors, type, spacing, and components. Our current tokens live in the `@theme` block + `:root` in `src/App.css`; [design-system.md](design-system.md) names them so you can confirm the import caught them.
2. **Attach the real artifacts.** Upload screenshots of the running app (light **and** dark — see §4) and this `docs/design-handoff/` folder. Anthropic's own guidance: *real examples beat specs.* The screenshots are the single highest-leverage input.
3. **Prompt with goal / layout / content / audience** (Anthropic's recommended 4-part structure). A starting prompt is in §3 below — paste it, then refine.
4. **Refine with inline comments, not just chat.** Click the exact element on the canvas and request the targeted change; reserve chat for sweeping moves. Use the canvas editor for spacing/alignment nudges.
5. **Lock the visual direction in Claude Design first.** Only once the look is agreed, hand off.
6. **Hand off to Claude Code** (the "Hand off to Claude Code" / sync action) as a **spec**, and additionally export a **token doc** + a one-line **changelog/version note** (handoff is a snapshot, not live). Then run the implementation in Claude Code with the `frontend-design` skill against `~/Dev/strat/src`, producing the branch/PR in [redesign-brief.md](redesign-brief.md) §7.

**Budget note:** a single high-fidelity Claude Design session can burn a large slice of a weekly allotment. Stay in wireframe/low-fi while structure is in flux; spend high-fi only when the three priority surfaces are settled.

---

## 3. Starting prompt (paste into Claude Design, then refine)

> **Goal:** Elevate the UI of Murmur, a calm, voice-first macOS desktop companion for Claude Code (dictation + Read Aloud + a live "Sessions" project observatory). Make it modular, sleek, cohesive, and unmistakably ours — premium and quiet, the "anti-Siri." Restyle only; preserve all wiring.
> **Layout:** A resizable desktop window (min 680×570, not mobile): left icon+label sidebar (10 sections) → main content pane. The flagship surface is **Sessions** — a color-coded grid of project tiles that opens a right-side **chat drawer** (~460–560px) with a transcript, an AI summary, and a push-to-talk **mic** Ask box. Also elevate **Overview** (a dashboard of summary cards) and the 4-step **Onboarding**.
> **Content:** Use the real structure, tokens, components, and screens in the attached `design-handoff/` package and the imported `src/` design system. Signature color is the teal `#16B8A3` (light) / `#2FD3BD` (dark). Carry each project's accent color through its tile, drawer header, status, and transcript attribution.
> **Audience:** Developers running Claude Code who live in this app all day, mostly in **dark mode**, on macOS.
> **Direction:** Aim for "a calm night-shift observatory / mixing console" — dark, instrument-grade, dim-by-default, with **teal as the single live signal**; depth from layered teal-on-teal, not decoration; precise, slightly tabular type. References: Raycast (dark density), Linear (motion restraint), an audio console (ambient instrument). **Avoid the generic-AI defaults:** no gradient hero blobs, no decorative glassmorphism, no glossy oversized cards, no emoji empty states, no friendly-assistant copy, no centered marketing hero. Squint test: a single dark Sessions shot must read as *Murmur*, not a generic dark dev dashboard. (Full direction + anti-slop list: `product-and-brand.md` → "Aesthetic direction".)
> **Constraints:** This is a WKWebView (Safari/WebKit) frontend inside a native window — see the attached `native-constraints.md`. Light + dark both required. Offline (no remote fonts/CDN). No new UI framework — stay Tailwind v4 + lucide-react. Don't restyle the macOS traffic-light buttons or invent custom scrollbars on macOS. Deliver as Tailwind v4 tokens + restyled components (see `redesign-brief.md`).

---

## 4. Screenshots — the missing input (status: TODO)

The package is text-complete but `screenshots/` is still empty, and §2.2 says these are the highest-leverage input. Capture from the running app (`bun tauri dev` at `~/Dev/strat`, or the installed `/Applications/Murmur.app`) in **both light and dark**. The full shot list with rationale is in [redesign-brief.md](redesign-brief.md) §6; the priority eight are:

- Sessions dashboard — populated (mixed statuses, a few custom colors) — light + dark
- Sessions drawer — open, with summary + multi-turn transcript + Ask box + mic — light + dark
- Sessions drawer — mic mid-**listening** (red pulse) and **transcribing** (spinner)
- Overview / home — populated — light + dark
- The four onboarding steps — Welcome / Accessibility / Model / Finish

A few states need staging (live Claude Code sessions, mic mid-listening), so this step is Arshia's to drive in the running app. Everything else in this package is ready to hand over now.

---

## 5. What "done" looks like

Claude Design (direction) → Claude Code with `frontend-design` (implementation) produces the deliverable in [redesign-brief.md](redesign-brief.md) §5/§7: updated Tailwind v4 tokens in `src/App.css` + restyled priority components + new reusable primitives under `src/components/ui/`, on a working branch (`design/elevation-pass`) cut from `main`, building and running with every command/store/event/hotkey and the `com.stratos.strat` / Murmur identity untouched.


============================================================
## ::: product-and-brand.md :::
============================================================

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

## Aesthetic direction (the visual translation — read this before designing)

The tone above ("quiet, anti-Siri, operator-grade") is the *feeling*. This section converts it into a *visual* direction so the redesign lands as something ownable, not the generic "tasteful AI SaaS settings panel" the app currently reads as. **Do not interpret "sleek / modular / premium" as license to default** — those adjectives are exactly where every AI tool converges.

### Named direction (pick this, commit to it)
**"A calm night-shift observatory / mixing console."** Dark, instrument-grade, dim-by-default, with **teal as the single live signal** in the room. Depth comes from **layered teal-on-teal strata** (the diamonds, the `#1B2422` teal-near-black), not from decoration. Typography is precise and slightly **tabular**, like a control surface — legible at a glance by someone monitoring 12 things. The felt sense: *a quiet control room at 2am, one teal indicator breathing — not a chat app, not a marketing page.*

Supporting adjectives on the visual plane: **instrument, ambient, layered, dim, precise.**

### Reference set (borrow the named quality, not the look)
- **Raycast** — confident dark command-surface density and keyboard-first calm. *Borrow:* assured dark hierarchy. *Avoid:* its purple.
- **Linear** — motion restraint, type hierarchy, the discipline of "quiet until it matters." *Borrow:* restraint + crisp hierarchy.
- **Things 3** — warmth and breathing room inside density. *Borrow:* humane spacing in a dense tool.
- **An audio mixing console / observatory dashboard** — instrument-grade, dim, one live signal glowing. *Borrow:* the ambient-instrument mood; signal-as-light.
- **NOT:** generic AI-chat UIs, Notion-style cards, gradient marketing hero pages.

### Banned generic defaults (anti-slop — the likely failure modes)
With teal as the brand color, the model's most probable wrong turn is the trained-in "AI startup" look. Avoid each → do the alternative:
- ❌ Purple/teal **gradient hero blobs** → ✅ flat teal-near-black surfaces; depth from layered opacity, not gradients.
- ❌ **Glassmorphism as decoration** → ✅ real native vibrancy (NSVisualEffect) only where it has function (sidebar/HUD); otherwise opaque.
- ❌ **Glossy oversized rounded cards** → ✅ quiet, tight cards with deliberate elevation (`--elev-*`), not glow.
- ❌ **Emoji in empty/error states** → ✅ a small line icon + one calm sentence.
- ❌ **Friendly-assistant copy** ("Oops!", "Let's get started!") → ✅ operator-grade, terse, factual.
- ❌ **Generic gradient CTAs** → ✅ the one solid action teal (`--color-action`).
- ❌ **Centered marketing hero** on a dense operator tool → ✅ information-first layout; the Overview header earns its space, doesn't dominate.

### Expressing "the murmur" (the most ownable idea — directions, not mandates)
- A **barely-there ambient pulse** on the mark / a faint teal signal-glow when sessions are live (sound felt as a slow light, not a UI animation).
- **Voice felt as a state change**, not a chatbot affordance — the listening/transcribing moment is a confident, quiet shift in the one teal signal.
- **Avoid:** a Siri-style orb, a literal waveform, any "assistant is thinking" theater.

### The squint test + the one signature element
Before shipping any surface: **squint at a single dark Sessions screenshot — it must read as *Murmur*, not as a generic dark dev dashboard.** The ownable signature to protect and amplify is **the project-colored spine running through the Sessions surface + the single teal voice moment.** If those two read instantly, the direction landed.


============================================================
## ::: design-system.md :::
============================================================

# Design System (current)

This section documents the **actual** tokens and conventions in the Murmur codebase as of the current `main` working tree. Everything below was extracted from real files — primarily `src/App.css` (the project's only global stylesheet; there is no `index.css`), `tailwind.config.js`, `src/overlay/RecordingOverlay.css`, and component source. Where the code is inconsistent (hardcoded hex vs. tokens, undocumented scales, dead/commented values), it is flagged explicitly. This is the raw material Claude Design should **formalize and extend** into a real system.

> **Machine-readable export:** every token below is mirrored in [`tokens.json`](tokens.json) (DTCG-style, light + dark) — the canonical, importable source. Build against that; this doc is the prose explanation.

The app is Tailwind **v4** (`@import "tailwindcss"` + `@theme {}` in `src/App.css`) with a **v3-style `tailwind.config.js` shim** that re-exposes *some* tokens under `theme.extend.colors`. **Correction (verified):** the shim is incomplete — it exposes only 5 of the 7 `@theme` colors, **omitting `--color-background-ui`** (the primary-action teal used by Button + ToggleSwitch) **and `--color-mid-gray`** (every border/divider/muted-text). Don't trust the config as a token list; use `tokens.json`. Recommend deleting `tailwind.config.js` entirely (redundant under v4, and currently misleading).

---

## 1. Color tokens

### 1.1 Core theme tokens (`@theme` in `src/App.css`)

These are the canonical design tokens. They are declared once in `@theme {}` and produce Tailwind utilities (`bg-*`, `text-*`, `border-*`, etc.). Dark values are overridden under `@media (prefers-color-scheme: dark)` on `:root`.

| Token | Tailwind utility stem | Light value | Dark value (override) | Role / notes |
|---|---|---|---|---|
| `--color-text` | `text`, `bg-text` | `#0f0f0f` | `#fbfbfb` | Primary foreground. Almost always used at reduced opacity (`text-text/90`, `/85`, `/60`, `/50`, `/40`). |
| `--color-background` | `background`, `bg-background` | `#fbfbfb` | `#1B2422` | Primary app surface. Dark is a desaturated near-black teal-green, not neutral gray. |
| `--color-background-ui` | `background-ui` | `#0FA697` | *(no dark override — same in both)* | "Action" teal. Drives the primary **Button** fill + focus ring and **ToggleSwitch** checked state. Darker/more saturated than `logo-primary`. |
| `--color-logo-primary` | `logo-primary` | `#16B8A3` | `#2FD3BD` | Brand teal. The single most-used accent across the UI (interactive accents, active states, links, agent labels, focus rings). |
| `--color-logo-stroke` | `logo-stroke` | `#0E3B37` | `#CFEFE8` | Dark teal used as logo outline (`.logo-stroke` fill+stroke). Inverts to a pale mint in dark mode. |
| `--color-text-stroke` | `text-stroke` | `#f6f6f6` | *(no dark override)* | Used only by the `.text-stroke` utility (`-webkit-text-stroke: 2px`). |
| `--color-mid-gray` | `mid-gray` | `#808080` | *(no dark override — same in both)* | The universal neutral. Used at many opacities for borders, muted text, idle status, hover fills. Theme-independent (intentional, but means it reads differently against light vs. dark surfaces). |

**Light/dark coverage gap:** only `--color-text`, `--color-background`, `--color-logo-primary`, and `--color-logo-stroke` get dark overrides. `--color-background-ui`, `--color-text-stroke`, and `--color-mid-gray` are **single-value across both themes** — `mid-gray` in particular is load-bearing for borders/dividers and never adapts.

### 1.2 Derived / runtime tokens (in `:root`, not in `@theme`)

These live in `:root` (and a dark `@media` block) but are **not** Tailwind colors — they're consumed via raw `var()` or bespoke utility classes.

| Variable | Light value | Dark value | Used by |
|---|---|---|---|
| `--scrollbar-thumb` | `color-mix(in srgb, var(--color-text), transparent 85%)` | *(inherits via `--color-text`)* | Native scrollbar tint (`scrollbar-color`) on macOS; webkit thumb on Win/Linux. |
| `--scrollbar-thumb-hover` | `color-mix(... transparent 70%)` | inherits | Webkit scrollbar `:hover`. |

### 1.3 Elevation tokens (`--elev-*`)

Defined in a separate "additive" `:root` block in `App.css`, with full dark overrides. Exposed as `.elev-2` / `.elev-3` helper classes (note: **no `.elev-1` class** exists even though the variable does).

| Token | Light | Dark | Class |
|---|---|---|---|
| `--elev-1` | `0 1px 2px rgba(15,15,15,0.06)` | `0 1px 2px rgba(0,0,0,0.4)` | *(none — variable only)* |
| `--elev-2` | `0 2px 8px rgba(15,15,15,0.08)` | `0 2px 10px rgba(0,0,0,0.45)` | `.elev-2` |
| `--elev-3` | `0 8px 24px rgba(15,15,15,0.12)` | `0 10px 30px rgba(0,0,0,0.55)` | `.elev-3`; also slider thumb `:active` |

In practice components mostly use Tailwind's built-in `shadow-lg` (9 uses) and `shadow-2xl` (1 use) for popovers/drawers — the bespoke `--elev-*` scale is **only** wired into the custom slider thumb (`.strat-slider`), so the system has **two parallel, unreconciled elevation scales**.

### 1.4 Hardcoded colors (NOT tokenized — flag for cleanup)

| Value | Where | Should be |
|---|---|---|
| `#16B8A3` | `AudioPlayer.tsx` progress gradient; default `color` prop in `TranscriptionIcon.tsx`, `CancelIcon.tsx`, `MicrophoneIcon.tsx` | `--color-logo-primary` |
| `rgba(128,128,128,0.2)` | `AudioPlayer.tsx` gradient track | `--color-mid-gray` @ 20% |
| `#0A1413ee`, `rgba(34,200,178,0.28)`, `rgba(34,200,178,0.45)`, `#16B8A3`, `#9BD64E`, `#16B8A333` | `RecordingOverlay.css` (overlay bg, border, bar glow, bar gradient, cancel hover) | The overlay is a **separate visual language** — dark glass card + teal→lime (`#16B8A3`→`#9BD64E`) gradient bars that appear **nowhere else** in the token set. Lime `#9BD64E` is an undocumented brand color. |
| `#ffffff` | `.strat-slider` thumb fill (`App.css`) | a surface token |
| The 10-color `PALETTE` | `SessionsView.tsx` | intentional data-viz palette (see §6), but raw hex |

---

## 2. Typography

There is **no defined type scale and no custom font.** The app relies on the browser/OS default font stack — `App.css :root` sets only `font-size`, `line-height`, `font-weight`, and rendering hints; it never declares a `font-family`. The OS system font (San Francisco on macOS) is the de-facto UI typeface.

### 2.1 Global type settings (`:root` in `App.css`)

| Property | Value |
|---|---|
| `font-size` | `15px` (root → `1rem` = 15px, which shifts the whole Tailwind text scale) |
| `line-height` | `24px` |
| `font-weight` | `400` |
| `font-synthesis` | `none` |
| `text-rendering` | `optimizeLegibility` |
| `-webkit-font-smoothing` | `antialiased` |
| `-moz-osx-font-smoothing` | `grayscale` |

### 2.2 Explicit font stacks (only two places — both hardcoded)

| Stack | Where | Notes |
|---|---|---|
| `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif` @ `fontSize 40`, `fontWeight 800`, `letterSpacing 1` | `HandyTextLogo.tsx` — the **"MURMUR" wordmark** (SVG `<text>`, fill = `.logo-primary`) | The wordmark is rendered text, not a logotype asset. 800 weight, +1 tracking, fitted via `textLength="190" lengthAdjust="spacingAndGlyphs"`. |
| `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` @ `12px` | `RecordingOverlay.css` `.transcribing-text` | Different fallback stack than the wordmark (Segoe UI/Roboto vs Helvetica Neue/Arial) — inconsistent. |

### 2.3 Font sizes actually used (Tailwind utilities, ranked by frequency)

| Utility | Count | Effective px (root = 15px) |
|---|---|---|
| `text-sm` | 115 | ~13.1px | 
| `text-xs` | 41 | ~11.25px |
| `text-[10px]` | 5 | 10px (arbitrary) |
| `text-base` | 4 | 15px |
| `text-xl` | 3 | ~22.5px |
| `text-[11px]` | 3 | 11px (arbitrary) |
| `text-lg` | 2 | ~16.9px |
| `text-[13px]` | 2 | 13px (arbitrary) |

**`text-sm` is the workhorse** (115 uses). The codebase reaches for **arbitrary pixel sizes** (`text-[10px]`, `text-[11px]`, `text-[13px]`) where the named scale doesn't have a step — a clear signal the scale needs explicit small-end tokens (`xs`/`2xs`).

### 2.4 Font weights actually used

| Utility | Count |
|---|---|
| `font-medium` | 43 |
| `font-semibold` | 33 |

Only **two weights** appear in component code (plus the wordmark's `800` and the global `400` default). No `font-bold`, `font-light`, etc. → effectively a 4-weight system (400 / 500 / 600 / 800) that is undocumented.

---

## 3. Spacing, radius & shape

### 3.1 Border radius (the de-facto radius scale, by frequency)

| Utility | Count | Typical use |
|---|---|---|
| `rounded-lg` | 48 | **Default** for buttons, inputs, icon buttons, list rows, small cards, answer bubbles |
| `rounded-full` | 36 | Status dots, color swatches, pills/chips, mic button, toggle knob |
| `rounded-md` | 16 | Smaller inset elements |
| `rounded-xl` | 8 | Larger containers — **project tiles**, options popover |
| `rounded-2xl` | 3 | Largest cards |

Convention reads as: **`lg` = controls, `xl` = cards/tiles, `2xl` = hero containers, `full` = dots/pills/toggles.** It's consistent enough to formalize but has never been written down. The recording overlay opts out entirely with raw `border-radius: 18px` (card) and `18px`/`2px`/`50%` (cancel button / bars).

### 3.2 Spacing

No spacing tokens are defined — components use Tailwind's default 4px-based scale ad hoc. Common patterns observed: tile padding `px-3 py-2`, row padding `px-2 py-1.5`, drawer header `px-4 py-3`, gaps `gap-1.5`/`gap-2`/`gap-3`, button sizes `px-4 py-[5px]` (md, arbitrary), `px-2 py-1` (sm), `px-4 py-2` (lg). Note the md button uses an **arbitrary `py-[5px]`** — another missing-step smell.

---

## 4. Borders & surfaces

### 4.1 Surface treatment

The base surface everywhere is **`bg-background`** (23 uses) — tiles, drawers, popovers, report cards all sit on it. There is **no distinct elevated-surface color**; depth is conveyed by border + shadow (`shadow-lg`) rather than a raised fill. Translucent fills layer on top: `bg-logo-primary/10–20` (selected/answer states), `bg-mid-gray/10` (hover), `bg-black/30`/`bg-black/50` (drawer scrim).

### 4.2 Border treatment (the dominant visual divider language)

Borders are almost always **`mid-gray` at low opacity**, giving hairline dividers that work on either theme:

| Utility | Count | Role |
|---|---|---|
| `border-mid-gray/20` | 34 | **Default border** — inputs, icon buttons, secondary buttons, popovers |
| `border-logo-primary` | 19 | Accent/active or hover-accent border |
| `border-mid-gray/80` | 15 | Stronger border — path/code displays (`PathDisplay`, `TextDisplay`) |
| `border-mid-gray/15` | 6 | **Card borders** — project tiles, report cards |
| `border-mid-gray/40` | 4 | Mid-strength |
| `border-mid-gray/10` | 2 | Faint internal dividers (tile header bottom-border) |

So the surface system is: **`bg-background` card + `border-mid-gray/15` + a colored accent bar/border.** The card-divider opacity ladder is `/10` (internal) → `/15` (card edge) → `/20` (controls) → `/40`/`/80` (emphasis). Worth canonicalizing as named border tokens.

### 4.3 Focus & rings

Focus uses **`focus:ring-logo-primary`** (12 uses) at `focus:ring-2` (7) or `focus:ring-1` (6); ToggleSwitch uses `ring-4`. Buttons (`Button.tsx`) instead ring on **`background-ui`** for the primary variant — so focus ring color is split between two near-identical teals (`logo-primary` vs `background-ui`). Selection swatches use `ring-white/40`, `ring-mid-gray/50`, `ring-offset-1`.

### 4.4 Button system (`src/components/ui/Button.tsx`)

Base: `font-medium rounded-lg border focus:outline-none transition-colors disabled:opacity-50`. Six variants, three sizes:

| Variant | Fill / border / text |
|---|---|
| `primary` | `bg-background-ui` + `border-background-ui` + `text-white`, hover `/80`, `focus:ring-1 ring-background-ui` |
| `primary-soft` | `bg-logo-primary/20` + `border-transparent` + `text-text`, hover `/30` |
| `secondary` | `bg-mid-gray/10` + `border-mid-gray/20`, hover `bg-background-ui/30` + `border-logo-primary` |
| `danger` | `bg-red-600` + `border-mid-gray/20` + `text-white`, hover `red-700` |
| `danger-ghost` | `text-red-400` + `border-transparent`, hover `bg-red-500/10` |
| `ghost` | `text-current` + `border-transparent`, hover `bg-mid-gray/10` + `border-logo-primary` |

Sizes: `sm` `px-2 py-1 text-xs` · `md` `px-4 py-[5px] text-sm` · `lg` `px-4 py-2 text-base`. Note that several SessionsView buttons are hand-rolled with their own classes (e.g. the Ask button uses `bg-logo-primary/85`) rather than this `Button` — so the button language is **partially centralized**.

---

## 5. Status colors (working / needs-you / idle)

Driven by `STATUS_META` in `SessionsView.tsx`, keyed on the `SessionStatus` union (`working | waiting_for_you | idle`). This is the app's semantic status system:

| Status | Semantic | Dot | Chip (badge) | Aggregate count text |
|---|---|---|---|---|
| `working` | active/running | `bg-emerald-500` | `bg-emerald-500/15 text-emerald-600` | `text-emerald-600` + `bg-emerald-500` dot |
| `waiting_for_you` ("needs you") | needs attention | `bg-amber-400 animate-pulse` | `bg-amber-400/15 text-amber-600` | `text-amber-600` + `bg-amber-400` dot |
| `idle` | dormant | `bg-mid-gray/40` | `bg-mid-gray/15 text-mid-gray` | `text-mid-gray` + `bg-mid-gray/40` dot |

Conventions worth formalizing:
- **Emerald = working, Amber = needs-you, Mid-gray = idle.** Only the "needs you" state animates (`animate-pulse`) — attention is the one thing that moves.
- Chips follow a uniform recipe: **`bg-{color}/15` + `text-{color shade up}`** (e.g. `bg-emerald-500/15` / `text-emerald-600`). This is a reusable badge pattern that should become a token/component.
- The mic recording state uses **`bg-red-500 animate-pulse`** (a fourth, recording-specific status), and errors use `text-red-500`. Red is "live recording / error," not a session status.
- These status colors come straight from **Tailwind's default emerald/amber/red palettes** — they are **not** in `@theme`, so they don't theme-shift and aren't reconciled with the brand teal/`mid-gray` tokens.

---

## 6. Per-project accent palette (`SessionsView.tsx`)

A fixed 10-color palette (`PALETTE`, lines 25–36) gives each project tile a stable accent. When the user hasn't picked a color, `autoColor(key)` hashes the project key (`h = h*31 + charCode`, mod 10) to a deterministic swatch; a `SwatchPicker` lets the user override (persisted via `setProjectColor` → `project_colors` setting). The accent is rendered as a 3px top bar on the tile (`h-[3px] rounded-t-xl`), the session dot, and the drawer header dot.

| # | Hex | Source comment |
|---|---|---|
| 0 | `#2dd4bf` | teal |
| 1 | `#a78bfa` | violet |
| 2 | `#f59e0b` | amber |
| 3 | `#34d399` | emerald |
| 4 | `#60a5fa` | blue |
| 5 | `#f472b6` | pink |
| 6 | `#f87171` | red |
| 7 | `#22d3ee` | cyan |
| 8 | `#c084fc` | purple |
| 9 | `#fbbf24` | gold |

These are Tailwind-400/500-family values used as **raw hex** (intentional for data-viz distinctness). **Collision risk to flag for Claude Design:** several palette entries overlap the *semantic* status colors — `#f59e0b` (amber) and `#fbbf24` (gold) are the "needs you" amber family, `#34d399`/`#2dd4bf` are the "working" emerald/teal family, and `#f87171` is the recording/error red. A project tinted amber/gold/emerald/red can read as a status. The palette should be reconciled with §5 (e.g. reserve amber/emerald/red for status, or hue-shift the project palette away from them).

---

## 7. Inconsistencies & gaps to formalize/extend

1. **Two teals, used interchangeably.** `--color-logo-primary` (`#16B8A3`) and `--color-background-ui` (`#0FA697`) are both "the teal." `background-ui` drives primary `Button` + `ToggleSwitch` + their focus rings; `logo-primary` drives nearly everything else (links, active states, accents, most focus rings). No documented rule for which to use. **Decide:** is there an "action teal" vs "brand teal" distinction, or collapse to one?
2. **Token source duplicated.** Colors are declared in both `@theme` (`App.css`) and `tailwind.config.js theme.extend.colors`. Kept in sync by hand. Tailwind v4 makes the config shim redundant.
3. **No documented type scale and no real font.** Root `font-size:15px` silently rescales the entire Tailwind scale; small sizes are filled with arbitrary `text-[10px]/[11px]/[13px]`. No `font-family` is set globally — the app inherits the OS font by accident, not by design. The wordmark and overlay use **two different** hardcoded fallback stacks.
4. **Status colors live outside the token system.** emerald/amber/red are raw Tailwind palette utilities, never themed, never tokenized as `--color-success/warning/danger`.
5. **Hardcoded hex bypasses tokens** in `AudioPlayer.tsx`, three `icons/*` components, the slider, and the entire `RecordingOverlay.css` (which also introduces an **undocumented lime `#9BD64E`** and a teal→lime gradient that exists nowhere else).
6. **Two elevation systems.** Bespoke `--elev-1/2/3` (with a missing `.elev-1` class) vs. Tailwind `shadow-lg`/`shadow-2xl` used in components. Pick one.
7. **Mid-gray and background-ui don't theme.** `--color-mid-gray` (all borders/dividers/muted text) and `--color-background-ui` (primary action) have no dark override; only 4 of 7 core tokens adapt.
8. **Partial component centralization.** A shared `Button.tsx` exists with 6 variants, yet SessionsView hand-rolls its own buttons/chips/rows. Badges (the `bg-{c}/15 + text-{c}-600` chip recipe), status dots, and icon-buttons (`iconBtn` string literal) are repeated inline and should become components/tokens.
9. **Project palette collides with status palette** (see §6).
10. **Dead/commented tokens** in `App.css` `:root` (a commented-out light-theme block with a stale `--color-logo-stroke: #382731` that disagrees with the live `#0E3B37`).

**Net:** the foundation is coherent — teal brand accent, `mid-gray` hairline borders on `bg-background` cards, emerald/amber/mid-gray status, `rounded-lg`/`xl` shape language, and a tasteful motion/elevation layer (`--ease-out-quint`, breathing `StratosMark` animation). What's missing is the **formalization**: a single canonical teal decision, named semantic color tokens (success/warning/danger/surface/border ladder), a written type scale + actual brand font, one elevation system, dark-mode parity for all tokens, and pulling repeated inline recipes (chips, dots, icon buttons) into the shared component layer.


============================================================
## ::: native-constraints.md :::
============================================================

# Native shell constraints (Tauri v2 / macOS)

Murmur's UI is web (React + Tailwind in a WebView), but it runs inside a **native macOS window**, not a browser tab. This doc is the guardrails: what the native shell makes possible, what it forbids, and the high-leverage native affordances a redesign should exploit. Everything here is verified against the actual repo at `~/Dev/strat` (Tauri **2.10.2**, `macOSPrivateApi: true`, min macOS **10.15**).

**The mental shift:** on macOS the WebView is **WKWebView (Safari/WebKit), not Chromium.** Test in **Safari**, not Chrome. Assume an older WebKit baseline (10.15 floor) and verify anything cutting-edge.

---

## Hard limits — respect these or the design breaks in the shell

- **WKWebView, not Chromium.** No Blink-only CSS, no `chrome://`, no DevTools-only features. Some newer CSS (`:has()` edge cases, container queries, subgrid, recent color-space features) depends on the user's macOS WebKit version — verify in Safari (incl. an older Safari), don't assume.
- **No custom scrollbars on macOS.** The app deliberately gates `::-webkit-scrollbar` styling to non-macOS and uses native overlay scrollbars on macOS (`src/App.css`, `:root[data-platform="macos"]`). Don't design custom scrollbars for the Mac build.
- **Traffic-light buttons can't be restyled.** The close/min/max buttons are AppKit-drawn — you may **inset/reposition** them or hide the whole titlebar and draw your own controls, but you cannot recolor/reshape the native buttons.
- **Window floor: 680×570, not maximizable.** The `main` window has a hard `min_inner_size` of 680×570 (`src-tauri/src/lib.rs`). Every responsive layout must work at exactly 680×570 and up. There is no smaller layout; the `sm/md/lg/xl` breakpoints are window-width, not phone.
- **Every color + component needs light AND dark.** Dark mode is first-class (`prefers-color-scheme` token overrides in `App.css`; the tray even swaps icon assets by theme). Users live in dark mode. Ship both values for everything.
- **Offline only.** No remote fonts, no CDN, no runtime web requests for styling. Bundle fonts locally. Prefer the `-apple-system` / `BlinkMacSystemFont` system stack (true San Francisco, already used in the overlay) for a native feel.
- **`macOSPrivateApi` is on** (required for transparency/vibrancy below) — which means the app can't ship on the Mac App Store as-is. Current distribution is Developer-ID signed + notarized (direct), so this is fine; just flag it before any MAS plan.
- **WKWebView is less forgiving of heavy compositing** than Chromium. Big `backdrop-filter` + large blur + animation = jank. Keep blurred/animated regions small; animate `transform`/`opacity`, not layout. Honor the existing `prefers-reduced-motion` block.

---

## High-leverage native affordances — currently UNUSED, exploit these

These are the moves that make Murmur feel premium and native instead of "a settings webpage in a window." None are wired today, all are available.

1. **Vibrancy / translucency (biggest single upgrade, currently zero usage).** Real NSVisualEffectView blur is fully available (`macOSPrivateApi` is on) but the app uses none — `main` is a flat opaque fill and the overlay fakes blur with a semi-opaque hex. Add real materials:
   - `main` window: **`Sidebar`** material behind the left nav + **`WindowBackground`/`ContentBackground`** for the content pane → instant native macOS settings-app depth.
   - recording overlay: **`HudWindow`** material → replaces the fake `#0A1413ee` fill with real system HUD depth.
   - Modern materials are semantic and auto-adapt to light/dark. Use `FollowsWindowActiveState` so blur dims on focus loss. Requires the window be `.transparent(true)` and the CSS background transparent/`rgba`. (Tauri API: `WebviewWindow::set_effects` / `windowEffects` config. This is a shell change, but call it out so the design assumes vibrancy exists underneath.)
2. **Overlay / transparent titlebar + inset traffic lights.** Switch `main` to `TitleBarStyle::Overlay` (or `Transparent`) and inset the traffic lights, so the sidebar/content runs **edge-to-edge to the top**. The current layout already has no titlebar-dependent chrome, so this is low-risk and high-impact. Requires `data-tauri-drag-region` on a top strip so the window can still be dragged.
3. **CSS `backdrop-filter` for inner panels** — supported in WKWebView, currently unused. Use it for cards/sheets/drawer over content (distinct from the window-level vibrancy in #1, which blurs what's *behind the window*). Keep blurred areas modest for performance.
4. **The recording overlay is a true NSPanel** (`tauri-nspanel`) that floats over all Spaces and fullscreen apps, doesn't steal focus, transparent, no native shadow — its visuals are **pure CSS today** (18px pill, mic-level bars). Redesign it freely to feel of-a-piece with the new system; consider giving it the real `HudWindow` material.

---

## Surfaces the designer must know exist (native, not web)

- **Menu-bar tray icon** is a primary surface: stateful (Idle/Recording/Transcribing), theme-aware (separate light/dark PNGs), with a native dropdown menu. Keep the icon monochrome/legible at 16–22px; provide light + dark template assets.
- **Dock presence is a design state.** With "start hidden" + tray, the app uses `ActivationPolicy::Accessory` → **no dock icon, menu-bar-only**. With a window it's `Regular`. Both are real modes.
- **Permission onboarding is a mandatory first-run UI surface**, not an afterthought. The app needs **Microphone** + **Accessibility** (it injects keystrokes and taps global hotkeys); the window is force-shown until granted (`AccessibilityOnboarding.tsx`). Design it as a first-class screen.
- **Native notifications** (via system) and a registered **Services menu** entry ("Read with Stratos House") exist — text-only, not restylable, but know they're there.
- **Retina/DPI:** design in CSS px, it's crisp on Retina; provide @2x raster assets (icons already do `@2x`).

---

## Typography & font loading (read — there's a real trap here)

- **The main app currently sets NO `font-family`.** It's set only in the overlay (`RecordingOverlay.css`). The main UI (`:root`/`body` in `App.css`) sets size/weight/smoothing but no family, so it inherits the WKWebView default — **not reliably San Francisco.** "We already use the SF stack" is false for the main window. The redesign **must** set an explicit stack on the main app: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`.
- **Fonts must be self-hosted** if you add any non-system face. `@import`/`<link>` to a CDN will silently work in dev and then fail offline / at notarization. There is **no `@font-face`, no font files, and no `public/` dir** today, and `tauri.conf.json` has `security.csp: null` (so remote fetches won't be blocked in dev — they'll just break for real users). Bundle the font locally via `@font-face { src: url(...) }` under `src/assets/` and **recommend setting a restrictive CSP** so any stray remote fetch fails loudly in dev. Prefer the system SF stack and avoid web fonts entirely if you can.

## Selection & cursor are native-by-default

The shell root is `select-none cursor-default` (`App.tsx`). Consequence: **copyable content** (transcripts, summaries, answers, file paths) must opt back in with `select-text cursor-text` (only `PathDisplay` does today — a user currently can't select a transcript), and clickable elements need `cursor-pointer`. Design assuming web defaults and you'll ship a UI where users can't copy a transcript.

## Overlays: in-WebView vs native (a load-bearing web-ism)

- A **CSS popover/menu cannot overflow the WKWebView window** — web devs assume the OS renders menus past the viewport; WKWebView can't. Menus that need to escape the window edge must be **native** (NSMenu/NSPanel), not CSS.
- Define a **z-index scale** (tooltip / popover / drawer / modal / toast). Today scrims collide at hand-picked z-values (z-20/30/40/50, tooltip 9999) with no system.
- Scrims must be **keyboard-dismissible** (Escape) and focus-trapped (see `a11y.md`).

## Titlebar / drag region spec (if you adopt overlay titlebar)

If you go with `TitleBarStyle::Overlay` + inset traffic lights (recommended): the top drag strip uses `data-tauri-drag-region`, but that **swallows clicks** unless interactive children set `-webkit-app-region: no-drag`. The inset traffic lights occupy **~78px top-left that must stay clear** of any control. Traffic lights only repaint when the window is **key** (active) — design an inactive-window appearance too.

## Window sizing

`.resizable(true).maximizable(false)` with **no `max_inner_size`** → the user can drag the window arbitrarily large; the Sessions grid hits `xl:grid-cols-3` then just stretches. Provide a **max content-width + centering** for very large windows. The window is built programmatically in `lib.rs` (`tauri.conf.json` has `windows: []`), so any size/titlebar change goes through **Rust, not JSON**.

## WebKit gotchas to verify on the 10.15 floor

- Prefix `-webkit-backdrop-filter` alongside `backdrop-filter`.
- `color-mix()` is used heavily (scrollbar, Select) — verify on the oldest supported Safari.
- Weak/absent `overscroll-behavior` and `scrollbar-gutter`; avoid `dvh`/`svh` units.
- Re-confirm `accent-color` (Sessions still uses native checkboxes).

## Per-window theming + dependency note

The recording overlay is a **separate window with its own stylesheet/tokens** — editing `App.css` does **not** restyle it; theme both. Once vibrancy lands, design **active-vs-inactive window** appearance for both. Footnote: `tauri-nspanel` is pinned to a **git branch (`v2.1`), not a release** — validate native overlay behavior before pushing it further.

## One-line summary for the designer

Design a **WKWebView (Safari) frontend** that assumes a **vibrant, edge-to-edge native window** underneath: exploit window vibrancy (`Sidebar`/`WindowBackground`/`HudWindow`), an overlay titlebar with inset traffic lights, and CSS `backdrop-filter` on inner panels — while respecting the 680×570 floor, native overlay scrollbars, light+dark-everything, **self-hosted fonts (set an explicit SF stack — the main app has none today)**, native-by-default selection/cursor, and the fact that the traffic-light buttons and system notifications are Apple's to draw, not yours.

> Key files for whoever implements the shell side: `src-tauri/src/lib.rs` (window/dock/tray), `src-tauri/src/overlay.rs` (NSPanel), `src-tauri/src/tray.rs` (tray visuals), `src-tauri/tauri.conf.json` (window/effects config), `src/App.css` + the `@theme` block (tokens/theming), `src/overlay/RecordingOverlay.css` (overlay styles).


============================================================
## ::: screens-and-flows.md :::
============================================================

# Screens & Flows

This section inventories every screen in Murmur, the global chrome that frames them, and the two flows that matter most (first-run onboarding, and "open a session → chat/ask"). It is written against the real source: `src/App.tsx` (state machine + layout shell), `src/components/Sidebar.tsx` (`SECTIONS_CONFIG`), `src/components/footer/Footer.tsx`, and the components under `src/components/settings/*` and `src/components/onboarding/*`.

Two structural facts to keep in mind throughout:

1. **The app is a single window with one persistent shell.** `App.tsx` renders the onboarding screens as full-screen takeovers *or* the main shell — never both. The main shell is always `Sidebar | scrollable content | Footer`. Every "screen" below (except the onboarding takeovers) is just a component swapped into the content pane based on `currentSection`.
2. **Everything keys off two design tokens:** `logo-primary` (the Stratos accent, used for active nav, focus rings, primary buttons, status accents) and `mid-gray` (borders at `/15`–`/20`, secondary text). Status semantics are emerald (working/granted), amber (needs-you/loading), and `mid-gray/40` (idle). This palette is consistent enough that a redesign can re-theme by touching these tokens — but it is also why the app currently reads as "tasteful default" rather than branded.

---

## Global chrome

### Window
- Created at runtime, not declared in `tauri.conf.json` (`"windows": []`). The React root is the entire window.
- Root layout in `App.tsx`: `<div className="h-screen flex flex-col select-none cursor-default">` — full-height flex column, **text selection disabled globally** and the cursor forced to default (desktop-app feel; note this means most body text is *not* selectable, which the History screen has to opt back out of with `select-text`).
- A `sonner` `<Toaster />` is mounted at the top, `theme="system"`, fully custom-styled (`bg-background border border-mid-gray/20 rounded-lg shadow-lg`). Toasts are the app's only transient-notification surface (recording errors, paste failures, model-load failures).
- RTL-aware: `dir={direction}` is set from the active language, and components use logical properties (`border-e`, `border-s`, `ms-auto`) rather than left/right.

### Sidebar (left rail) — `Sidebar.tsx`
- Fixed width `w-40`, full height, right border `border-e border-mid-gray/20`.
- **Brand lockup** at top: `strat-logo.png` (36×36) + `HandyTextLogo` (the "Murmur" wordmark, width 72), centered, with a divider beneath.
- **Nav items** are generated from `SECTIONS_CONFIG` (the single source of truth for all sections — see the inventory below). Each item is an icon + truncated label. Active state: `bg-logo-primary/15 text-logo-primary font-medium`. Hover: `hover:bg-mid-gray/15`. Transition `duration-150`.
- **Conditional items:** sections expose an `enabled(settings)` predicate. `postprocessing` only appears when `post_process_enabled`; `debug` only when `debug_mode`. All others are always shown. So the rail is **9 items normally, up to 11** when both flags are on.
- Order as declared: Overview, General, Models, Read Aloud, Sessions, Advanced, History, (Post-Process), (Debug), About.

### Content pane — `App.tsx`
- `flex-1 overflow-y-auto`, inner wrapper `flex flex-col items-center p-4 gap-4`. Every section component constrains itself to `max-w-3xl w-full mx-auto` (the Sessions view is the exception — it goes full-width).
- The **`AccessibilityPermissions` banner** renders *above* the active section on every screen (macOS only, and only while accessibility is not granted). It's a bordered card with a description + an "Open Settings" button. It is a persistent nag, not part of any one screen.
- Navigation between sections is via a `NavigationContext` provider, so any screen can deep-link to another (the Overview cards use this).

### Footer — `footer/Footer.tsx`
- Full-width, top border, `text-xs text-text/60`, `justify-between`.
- **Left:** the `ModelSelector` — a status button (`ModelStatusButton.tsx`) showing a colored status dot + truncated model name + a chevron that opens a model dropdown. Dot colors encode model lifecycle: green=ready, yellow=loading, `logo-primary`=downloading, orange=verifying/extracting, red=error/none, gray=unloaded.
- **Right:** the `UpdateChecker` (clickable "Check for updates" / "Update available" / download progress, respects `update_checks_enabled`, has a portable-build fallback dialog) + a `•` separator + `v{version}`.
- The footer is **always visible** in the main shell, including on Sessions where it competes for vertical space against the `h-[80vh]` Sessions layout.

### Keyboard chrome (global, in `App.tsx`)
- `Cmd/Ctrl+Shift+D` toggles `debug_mode` (which reveals the Debug nav item) from anywhere.

---

## Screen inventory

> **Priority legend:** ⭐ PRIORITY for redesign · ◻︎ secondary.

### ⭐ Overview — `settings/overview/Overview.tsx`
- **Purpose:** the glanceable home / control center. Read-only summary cards that each deep-link into their section. The default landing section (`currentSection` initializes to `"overview"`).
- **Key elements:**
  - **Hero header card:** `StratLogo` (56px) + `HandyTextLogo` (96) + tagline, in a `rounded-2xl` card with a `from-logo-primary/10 to-transparent` gradient.
  - **Card grid:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, eight `SummaryCard`s — Sessions, General, Models, Read Aloud, Post-Processing, History, Advanced, About.
  - Each `SummaryCard` (`overview/SummaryCard.tsx`) is a full-card `<button>`: icon + title + optional `StatusDot` + a `ChevronRight` that nudges right on hover. Body is one or two `FieldRow`s (label/value) or a hint line. `KeyChip` renders hotkeys as little keycaps.
  - Live data: pulls active model name + status from `modelStore`, agent/session counts from `agentsStore` (`ready` count, distinct-repo count), TTS voice (resolves ElevenLabs voice id → name), post-process provider label, mic, history limit, and formatted hotkeys.
- **Current layout:** clean uniform card grid; status communicated only by a 2px `StatusDot` (active/on=`logo-primary`, loading=amber pulse, else gray).
- **UX rough edges:**
  - **Visually flat / undifferentiated.** All eight cards have equal weight, so the most important card (Sessions, the product's headline feature) doesn't stand out. The hero card and the Sessions card don't read as a hierarchy.
  - Status is a tiny dot with no label on the card face — "is post-processing on?" requires reading the `FieldRow`, not scannable at a glance.
  - Empty/zero states are bare (`—`, `0`); no encouragement or next-action when, e.g., there are no sessions or no model.
  - Advanced and About cards have generic hint text rather than real data, so they feel like filler in an otherwise data-driven grid.

### ◻︎ General — `settings/general/GeneralSettings.tsx`
- **Purpose:** the everyday dictation settings: the transcribe hotkey, push-to-talk, mic + audio I/O.
- **Key elements:** three `SettingsGroup`s — (1) **shortcuts**: `ShortcutInput` for `transcribe`, `PushToTalk` toggle, and a conditional `cancel` shortcut (hidden when push-to-talk is on, since release cancels, and hidden on Linux); (2) **`ModelSettingsCard`** (only renders when the active model supports language selection or translation — otherwise nothing appears); (3) **sound**: mic selector, mute-while-recording, audio feedback, output-device selector + volume slider (the last two disabled unless audio feedback is on).
- **Layout:** standard stacked `SettingsGroup` list, `max-w-3xl`. Most rows use `descriptionMode="tooltip"` and `grouped`, so descriptions are hidden behind hover tooltips.
- **Rough edges:** the "General" label and `StratLogo` icon are an odd pairing (the brand mark is used as a settings-category icon). Conditional rows (`ModelSettingsCard`, cancel shortcut) mean the screen's content silently changes shape depending on model/platform, which can be disorienting. Tooltip-only descriptions hide useful guidance from first-time users.

### ◻︎ Models — `settings/models/ModelsSettings.tsx`
- **Purpose:** download / switch / delete local Whisper-Parakeet transcription models.
- **Key elements:** title + description; a **language filter dropdown** (searchable, top-right of the "Your models" header) that filters the list by supported language; two sections — **Your models** (downloaded/custom/active, sorted active-first) and **Available models** — each rendered as `ModelCard`s.
  - `ModelCard` (`onboarding/ModelCard.tsx`, shared with onboarding) shows name, description, **accuracy/speed score bars**, language + translation capability chips, size, and contextual state: `active` (2px primary border + check badge), `available`, `downloadable`, plus progress UIs for `downloading` (progress bar + MB/s + cancel), `verifying`, `extracting` (pulsing bars), `switching` (spinner badge). Delete uses a native confirm dialog.
- **Layout:** loading spinner state; empty-filter state ("no models match"). Cards are interactive with hover lift (`hover:scale-[1.01]`).
- **Rough edges:** the language-filter dropdown lives *inside* the "Your models" section header, so it's easy to miss and its scope (does it filter both sections?) is ambiguous. Score bars are unlabeled mini-bars with no numeric value or legend. The same `ModelCard` does a lot of jobs (onboarding hero, settings row, download progress) — visually busy in the dense settings context.

### ◻︎ Read Aloud — `settings/read-aloud/ReadAloudSettings.tsx`
- **Purpose:** configure ElevenLabs TTS ("Read Aloud" speaks the current selection in the **Monoli** voice). ElevenLabs-first; macOS `say` is only a silent offline fallback.
- **Key elements:** three groups — (1) **Voice**: a `<select>` with `optgroup`s for "your custom voices", "free ElevenLabs library", and an "offline / system default" fallback; a rate `Slider` (100–300 wpm, formatted `{n} wpm`); and **Preview / Stop** buttons. (2) **ElevenLabs**: an `ApiKeyField` (saved on blur, re-fetches voices) + a status line showing voice count or "needs key". (3) **Hotkey**: `ShortcutInput` for `read_selection` + help text.
- **Layout:** standard `SettingsGroup` stack. Key/voice plumbing is functional but utilitarian.
- **Rough edges:** the headline voice ("Monoli") is just one option in a native `<select>` with no preview-per-voice, no avatar/waveform, and no indication of which voice is the recommended/brand one. The API-key requirement is buried as a separate group below the voice picker, so a new user can land on an empty voice dropdown without understanding why. Uses a raw native `<select>` (inconsistent with the custom `Dropdown` used elsewhere).

### ⭐ Sessions — `settings/sessions/SessionsView.tsx`
- **Purpose:** the flagship "observatory" — a live, color-coded dashboard of every running Claude Code session grouped by project, plus a right-side chat/ask drawer with push-to-talk. This is the product's differentiator.
- **Key elements:**
  - **Top bar:** `Radio` icon + "Sessions" title + live counter ("`N` live · `M` need you") + an **Options** popover (`SlidersHorizontal`) with three checkboxes: *Rolling summaries (auto-refresh)*, *Speak "needs you" alerts*, *Show background (SDK) sessions*.
  - **Project dashboard:** responsive grid (`md:grid-cols-2 xl:grid-cols-3`) of **`ProjectTile`s**, one per project (keyed by workspace basename or repo). Each tile has a colored **accent bar** (auto-assigned from a 10-color `PALETTE` via a stable hash, or user-picked via the `SwatchPicker`), a header with project name + per-status counts (working/needs-you/idle), and a list of **`SessionRow`s**. Projects that need attention sort first.
  - **`SessionRow`:** `StatusDot` (emerald=working, amber pulse=needs-you, gray=idle) + title + relative time + optional git branch + a hover-revealed **pin** (pins a session for live summaries).
  - **"Recently finished" reports:** a secondary grid of completed agent runs (`agentsStore`) with a play button.
  - **Empty state:** centered `Radio` icon + "No live Claude Code sessions found. Start one in a terminal or VS Code."
  - **Right-side chat drawer** (the `Detail` component): a `fixed inset-0 z-40` overlay with a `bg-black/30` scrim and a slide-in panel (`w-full sm:w-[460px] lg:w-[560px]`, `translate-x-full → translate-x-0`). Contents:
    - **Header:** project color dot, repo name, status chip, git branch + "Nm ago" + optional "background", and an icon-button cluster: refresh summary, **speak summary** (`Volume2`), focus the session's window (`ExternalLink`), pin, close.
    - **Summary** line (cached server summary or a "Summarize what this session is doing" button).
    - **Transcript:** auto-scrolling list of `TranscriptTurn`s (polled every 2.5s), each labeled "Agent" (primary) or "You" (gray).
    - **Ask box:** a **push-to-talk mic button** (idle → `listening` red pulsing → `transcribing` spinner; click to start/stop, transcribes into the textarea), a 2-row textarea (submit on `⌘/Ctrl+Enter`), and **Ask** / **Stop** buttons. Errors and the returned answer render inline below.
  - **Drawer dismissal:** scrim click, close button, or `Escape`.
- **Current layout:** the view is `h-[80vh]` (so it doesn't simply flow in the scroll pane like other sections). The dashboard scrolls internally; the drawer is a global overlay on top of the whole window.
- **UX rough edges (highest-leverage for redesign):**
  - **Two scroll contexts + a fixed footer.** The Sessions view forces `h-[80vh]` inside an already-scrollable pane, and the always-on app footer eats space beneath it — vertical rhythm fights itself, especially on short windows.
  - **Color system is under-leveraged.** Project accent is a thin 3px bar and a tiny dot; the color-coding (the whole point of the dashboard) is barely visible at a glance. Auto-hashed colors can collide / look arbitrary.
  - **The drawer is dense and undifferentiated.** Five icon buttons in the header with tooltip-only labels; transcript "Agent/You" turns have minimal visual separation; the mic/ask/stop control cluster is cramped at the bottom.
  - **Push-to-talk affordance is subtle** — a 9×9 icon button that turns red; there's no waveform/level meter, and the "listening/transcribing" states rely on small animations.
  - **"Recently finished" reports** sit below the live grid inside the same scroll area and can get lost; their relationship to live sessions isn't visually expressed.
  - **Status legend is implicit** — working/needs-you/idle are only decoded by dot color; no key.

### ◻︎ Post-Process — `settings/post-processing/PostProcessingSettings.tsx`
- **Purpose:** configure the LLM that cleans up dictation after transcription. Nav item only appears when `post_process_enabled` (the toggle itself lives under Advanced → Experimental).
- **Key elements:** three groups — (1) **Hotkey** (`transcribe_with_post_process`); (2) **API** (`PostProcessingSettingsApi`): provider select, conditional base-URL (custom provider), API key, and a searchable/creatable model select with a refresh button; Apple Intelligence is a special provider that hides key/model fields and shows an availability alert; (3) **Prompts** (`PostProcessingSettingsPrompts`): a `Dropdown` of saved prompts + "create new", with an inline name/instructions editor (create/update/delete; delete disabled when only one prompt remains; a `promptTip` with inline `<code>`).
- **Rough edges:** discoverability — it's gated behind an experimental toggle two screens away, so the path to enabling it is non-obvious. The prompt editor and the API config are quite different interaction models stacked in one screen. Lots of conditional fields (Apple vs custom vs standard provider) make the screen's shape unstable.

### ◻︎ History — `settings/history/HistorySettings.tsx`
- **Purpose:** browse past transcriptions with audio playback.
- **Key elements:** a header (uppercase "History" label + "Open recordings folder" button) and a bordered list of entries with **infinite scroll** (IntersectionObserver, 30/page) and live updates (new transcriptions push in via an event listener). Each `HistoryEntryComponent`: formatted date + an action cluster (copy, save/star, re-transcribe with a reverse-spin animation, delete) + the transcription text (this is one of the few places text is `select-text`) + an `AudioPlayer`. Loading / empty states handled.
- **Rough edges:** very utilitarian list; the entry header's four icon buttons are unlabeled. Failed-transcription entries render in faint gray with a "transcription failed" placeholder. No grouping by day, no search/filter despite potentially long histories.

### ◻︎ Advanced — `settings/advanced/AdvancedSettings.tsx`
- **Purpose:** the catch-all power-user drawer.
- **Key elements:** grouped toggles/selectors — **App** (start hidden, autostart, tray icon, show overlay, model-unload timeout, **experimental toggle**), **Output** (paste method, typing tool, clipboard handling, auto-submit), **Transcription** (custom words, append trailing space), **History** (history limit, recording retention), and a conditional **Experimental** group (post-processing toggle, keyboard-implementation selector, acceleration selector, lazy stream close) shown only when experimental is enabled.
- **Rough edges:** long flat list of heterogeneous settings with tooltip-only descriptions; the Experimental group hides important, behavior-changing toggles (e.g. the post-processing enable) where users won't find them. Settings here overlap conceptually with General (both touch audio/output behavior) without a clear boundary.

### ◻︎ Debug — `settings/debug/DebugSettings.tsx`
- **Purpose:** diagnostics; hidden unless `debug_mode` is on (toggled by `Cmd/Ctrl+Shift+D`).
- **Key elements:** one group — log-level selector, update-checks toggle, sound-theme picker, word-correction threshold, paste delay, recording buffer, always-on microphone, clamshell mic selector.
- **Rough edges:** purely functional, no styling consideration (it's a debug surface) — but it's reachable by any user who hits the shortcut, so it can leak a "raw" feel into an otherwise polished app.

### ◻︎ About — `settings/about/AboutSettings.tsx`
- **Purpose:** app meta + attribution.
- **Key elements:** **app language selector**, version (`v{version}`, mono), a "Support development" donate button (→ `handy.computer/donate`), a "Source code" button (→ `github.com/cjpais/Handy`), app-data + log directory openers, and an acknowledgments group (Whisper).
- **Rough edges:** **branding leak** — the donate link and source-code link still point at upstream Handy, and acknowledgments read as the fork's, not Murmur/Stratos's. This screen most visibly betrays the "fork of Handy" origin and should be reconciled with the Murmur brand.

---

## Flow 1 — Onboarding (first run & returning-user permission repair)

Driven by the `OnboardingStep` state machine in `App.tsx`: `welcome → accessibility → model → finish → done`. Returning users (who already have a model) **skip welcome/model/finish** and only pass through `accessibility` if a permission is missing. Each step is a full-screen takeover; `done` mounts the main shell.

Screens involved:
- **Welcome** (`WelcomeOnboarding.tsx`): gradient backdrop, brand lockup, three value cards (Dictate anywhere · Hear it back · Run your sessions), "Get started" button. New users only.
- **Accessibility/Permissions** (`AccessibilityOnboarding.tsx`): platform-aware (macOS: mic + accessibility; Windows: mic only; other: auto-skip). Per-permission cards with grant buttons, live polling (1s) for grant, a macOS-specific **relaunch** flow (accessibility only takes effect after restart), a brief all-granted success screen, and a loading state while checking. Shown to both new and returning users (when needed).
- **Model** (`Onboarding.tsx`): brand lockup + a list of downloadable `ModelCard`s (recommended/featured first, then by size). Selecting one downloads → verifies → extracts → selects, then advances. New users only.
- **Finish** (`FinishOnboarding.tsx`): success badge on the logo, three quick tips (Dictate · Read Aloud `⌥⌃R` · Sessions), "Open Murmur" button. New users only.

```
                         App boot
                            │
                 checkOnboardingStatus()
                            │
            ┌───────────────┴────────────────┐
       hasModels? NO                     hasModels? YES (returning)
            │                                 │
        ┌───▼────┐                   macOS/Win perms OK?
        │ WELCOME│                       ┌─────┴─────┐
        └───┬────┘                      YES          NO
            │                            │            │
            ▼                            │            ▼
     ┌─────────────┐                     │   ┌────────────────┐
     │ACCESSIBILITY│◄────────────────────┼───│ ACCESSIBILITY  │
     │  /PERMS     │   (returning, only  │   │ (repair only)  │
     └──────┬──────┘    if perms missing)│   └───────┬────────┘
            │ all granted                │           │ all granted
            ▼                            │           │
        ┌───────┐                        │           │
        │ MODEL │ (new only)             │           │
        └───┬───┘                        │           │
            │ downloaded+selected        │           │
            ▼                            │           │
       ┌────────┐                        │           │
       │ FINISH │ (new only)             │           │
       └───┬────┘                        │           │
           │ "Open Murmur"               │           │
           └─────────────┬──────────────┴───────────┘
                         ▼
                   ┌──────────┐
                   │  DONE    │ → main shell (Overview)
                   └──────────┘
                   initializeEnigo() + initializeShortcuts()
                   + refresh audio/output devices
```

**Onboarding rough edges:**
- The macOS accessibility **relaunch** mid-flow is jarring (the app restarts to apply the grant) and is explained only by small hint text.
- New-user model download is a **blocking gate** with no skip / "decide later" — the user must finish a multi-stage download (download→verify→extract) before reaching the app.
- Welcome and Finish are nicely branded (gradient + cards), but Accessibility and Model are plainer — the onboarding's visual quality is inconsistent step-to-step.

## Flow 2 — Open a session → chat / ask

Entirely within the Sessions view (`SessionsView.tsx`), with the chat surface in the `Detail` drawer.

```
Sessions dashboard (ProjectTiles grouped by project)
        │  click a SessionRow  →  store.select(id)
        ▼
Right-side drawer slides in (scrim + translate-x)
        │
        ├─ Detail header: status chip · branch · refresh summary ·
        │                 speak summary (Volume2) · focus window · pin · close
        │
        ├─ Summary line (cached, or "Summarize…" → summarizeSession)
        │
        ├─ Transcript (polled every 2.5s, auto-scroll, Agent/You turns)
        │
        └─ Ask box:
             ┌─ Mic (push-to-talk) ─────────────────────────────┐
             │  idle ──click──► listening (red pulse, recording) │
             │  listening ──click──► transcribing (spinner)      │
             │  transcribing ──done──► text appended to textarea │
             └───────────────────────────────────────────────────┘
             type / dictate question
                  │  Ask (or ⌘/Ctrl+Enter) → askSession(id, q)
                  ▼
             answer renders inline (or error)   [Stop → askSessionCancel]

Dismiss: Esc · scrim click · close button → store.select(null)
(On unmount mid-listen, a dangling recording is cancelled via appCancelDictation)
```

**This flow's rough edges** are the Sessions rough edges above — chiefly the cramped ask/mic cluster, the subtle push-to-talk states, and the dense icon-button header.

---

## Redesign priority summary

| Screen | Priority | Why |
|---|---|---|
| **Sessions** (+ drawer + push-to-talk) | ⭐ Highest | The product's differentiator; color-coding and the chat/ask drawer are the experience, yet color is barely visible, the layout fights the fixed footer, and the ask/mic cluster is cramped. |
| **Overview** | ⭐ High | The home screen; currently a flat, equal-weight card grid that doesn't elevate Sessions or read as branded. |
| **Onboarding** (Welcome→Accessibility→Model→Finish) | ⭐ High | First impression; visually inconsistent step-to-step, with a jarring macOS relaunch and a blocking model download. |
| General, Models, Read Aloud, Post-Process, History, Advanced, Debug, About | ◻︎ Secondary | Functional settings screens. About in particular needs brand reconciliation (still links to upstream Handy). |


============================================================
## ::: component-catalog.md :::
============================================================

# Component Catalog

This is the inventory of reusable UI building blocks that already exist in Murmur. It maps every primitive and feature component a redesign can lean on, with file paths, props, and the exact Tailwind classes in use today. The goal is to tell Claude Design which primitives are real (and reusable) versus which surfaces hand-roll their own styling and should be folded back into a real component library.

All components are React function components (`React.FC`), styled with Tailwind v4 utility classes against a small set of CSS custom properties: `--color-text`, `--color-background` (`#fbfbfb` light / `#1B2422` dark), `--color-background-ui` (`#0FA697`), `--color-logo-primary` (`#16B8A3` light / `#2FD3BD` dark), `--color-mid-gray` (`#808080`), defined in `/Users/vabi/Dev/strat/src/App.css`. Colors are referenced as Tailwind tokens (`bg-logo-primary`, `text-mid-gray`, `border-background-ui`, etc.) or via `color-mix(...)` in inline styles.

---

## 1. Generic UI primitives (`src/components/ui/`)

These are the closest thing to a design system today. They live in `/Users/vabi/Dev/strat/src/components/ui/` and are partially re-exported from `index.ts` (note: `index.ts` only exports `Dropdown`, `Slider`, `ToggleSwitch`, `SettingContainer`, `SettingsGroup`, `TextDisplay`, `Textarea`, `Tooltip` — `Button`, `Input`, `Select`, `Alert`, `Badge`, `ResetButton`, `PathDisplay`, `AudioPlayer` are imported by direct path, an inconsistency in itself).

### SettingsGroup
- **File:** `/Users/vabi/Dev/strat/src/components/ui/SettingsGroup.tsx`
- **Type:** Generic layout primitive (bespoke to this app's settings idiom).
- **Purpose:** A titled card that wraps a vertical stack of settings rows with hairline dividers between them.
- **Props:** `title?: string`, `description?: string`, `children: ReactNode`.
- **Key styling:** Outer `space-y-2`; optional header `px-4` with `<h2 className="text-xs font-medium text-mid-gray uppercase tracking-wide">` + description `text-xs text-mid-gray mt-1`; body card `bg-background border border-mid-gray/20 rounded-lg overflow-visible` with `divide-y divide-mid-gray/20` between children.

### SettingContainer
- **File:** `/Users/vabi/Dev/strat/src/components/ui/SettingContainer.tsx`
- **Type:** Bespoke layout primitive — the backbone of nearly every settings row.
- **Purpose:** Renders a single setting's title + description + control, with a built-in info-tooltip affordance. Wrapped by `ToggleSwitch`, `Slider`, `TextDisplay`, and used directly by most individual settings components.
- **Props:** `title: string`, `description: string`, `children`, `descriptionMode?: "inline" | "tooltip"` (default `tooltip`), `grouped?: boolean` (default `false` — toggles whether it draws its own border), `layout?: "horizontal" | "stacked"` (default `horizontal`), `disabled?: boolean`, `tooltipPosition?: "top" | "bottom"`.
- **Key styling:** Grouped vs ungrouped switches between `px-4 p-2` and `px-4 p-2 rounded-lg border border-mid-gray/20`; horizontal variant adds `flex items-center justify-between`. Title `text-sm font-medium`, description `text-sm`, `opacity-50` when disabled. Title cell capped at `max-w-2/3`, control wrapped in `relative`.
- **Note:** Contains a **hand-inlined info-icon SVG and tooltip wiring duplicated verbatim across all four layout/mode branches** (stacked+tooltip, stacked+inline, horizontal+tooltip, horizontal+inline). The icon (`w-4 h-4 text-mid-gray cursor-help hover:text-logo-primary`) plus its `useState`/`useRef`/click-outside logic is a prime extraction candidate (an `InfoTooltip` trigger component).

### Button
- **File:** `/Users/vabi/Dev/strat/src/components/ui/Button.tsx`
- **Type:** Generic primitive (good shape, the canonical button).
- **Purpose:** Standard button with variant + size system.
- **Props:** extends `ButtonHTMLAttributes`; `variant?: "primary" | "primary-soft" | "secondary" | "danger" | "danger-ghost" | "ghost"` (default `primary`), `size?: "sm" | "md" | "lg"` (default `md`).
- **Key styling:** Base `font-medium rounded-lg border focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`. Variants e.g. `primary` = `text-white bg-background-ui border-background-ui hover:bg-background-ui/80 ... focus:ring-1 focus:ring-background-ui`; `primary-soft` = `bg-logo-primary/20 border-transparent`; `ghost` = `text-current border-transparent hover:bg-mid-gray/10 hover:border-logo-primary`. Sizes: `sm` `px-2 py-1 text-xs`, `md` `px-4 py-[5px] text-sm`, `lg` `px-4 py-2 text-base`.
- **Note:** This is the one true button — but many other surfaces (Sessions, TextDisplay copy button, voice preview) hand-roll their own `<button>` instead of using it (see §5).

### Input
- **File:** `/Users/vabi/Dev/strat/src/components/ui/Input.tsx`
- **Type:** Generic primitive.
- **Props:** extends `InputHTMLAttributes`; `variant?: "default" | "compact"`.
- **Key styling:** Base `px-2 py-1 text-sm font-semibold bg-mid-gray/10 border border-mid-gray/80 rounded-md text-start transition-all duration-150`; interactive `hover:bg-logo-primary/10 hover:border-logo-primary focus:bg-logo-primary/20 focus:border-logo-primary`; disabled `opacity-60 cursor-not-allowed`.
- **Bug/smell:** `variantClasses.default` (`px-3 py-2`) and `compact` (`px-2 py-1`) **redundantly re-declare padding already present in `baseClasses`**, producing duplicate `px-*`/`py-*` utilities on every input — a class-merge cleanup candidate.

### Textarea
- **File:** `/Users/vabi/Dev/strat/src/components/ui/Textarea.tsx`
- **Type:** Generic primitive. Mirror of `Input` for multi-line.
- **Props:** extends `TextareaHTMLAttributes`; `variant?: "default" | "compact"`.
- **Key styling:** Same `bg-mid-gray/10 border border-mid-gray/80 rounded-md` family + `resize-y`; default `min-h-[100px]`, compact `min-h-[80px]`. Same padding-duplication smell as `Input`.

### Select
- **File:** `/Users/vabi/Dev/strat/src/components/ui/Select.tsx`
- **Type:** Generic primitive wrapping the third-party **`react-select`** library (incl. `CreatableSelect`).
- **Purpose:** Themed searchable/creatable single-select.
- **Props:** `value: string | null`, `options: SelectOption[]` (`{value,label,isDisabled?}`), `placeholder?`, `disabled?`, `isLoading?`, `isClearable?` (default `true`), `onChange`, `onBlur?`, `className?`, plus a discriminated `isCreatable` + `onCreateOption` / `formatCreateLabel`. Memoized.
- **Key styling:** Entirely via a `StylesConfig` object using inline `color-mix(...)` against the CSS vars (e.g. control `minHeight: 40, borderRadius: 6`, focus border `var(--color-logo-primary)`, menu `boxShadow: "0 10px 30px rgba(15,15,15,0.2)"`). `classNamePrefix: "app-select"`.
- **Note:** This is a *second*, parallel dropdown implementation alongside `Dropdown` (below) — a clear consolidation candidate.

### Dropdown
- **File:** `/Users/vabi/Dev/strat/src/components/ui/Dropdown.tsx`
- **Type:** Bespoke select (hand-built, no library). Overlaps heavily with `Select`.
- **Purpose:** Custom button + absolute-positioned menu select with click-outside and optional `onRefresh`-on-open hook (used by mic/device pickers). i18n-aware ("no options found").
- **Props:** `options: DropdownOption[]` (`{value,label,disabled?}`), `selectedValue: string | null`, `onSelect`, `placeholder?`, `disabled?`, `onRefresh?`, `className?`.
- **Key styling:** Trigger `px-2 py-[5px] text-sm font-semibold bg-mid-gray/10 border border-mid-gray/80 rounded-md min-w-[200px] grid grid-cols-[1fr_auto] ... hover:bg-logo-primary/10 hover:border-logo-primary`; chevron rotates `rotate-180` when open; menu `absolute ... bg-background border border-mid-gray/80 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto`; options `hover:bg-logo-primary/10`, selected `bg-logo-primary/20 font-semibold`.
- **Inconsistency:** `Dropdown` and `Select` solve the same problem with different markup, z-index, border weights (`border-mid-gray/80` vs react-select's `80%` mix) and behavior. **High-value merge target.**

### ToggleSwitch
- **File:** `/Users/vabi/Dev/strat/src/components/ui/ToggleSwitch.tsx`
- **Type:** Generic primitive (composes `SettingContainer`).
- **Purpose:** Labeled on/off switch row with optional updating spinner.
- **Props:** `checked`, `onChange(checked)`, `disabled?`, `isUpdating?`, `label`, `description`, `descriptionMode?`, `grouped?`, `tooltipPosition?`.
- **Key styling:** Peer-checkbox pattern: hidden `sr-only peer` input + a `relative w-11 h-6 bg-mid-gray/20 ... rounded-full peer peer-checked:after:translate-x-full ... peer-checked:bg-background-ui` track with an `after:` knob. Updating state overlays a `w-4 h-4 border-2 border-logo-primary border-t-transparent animate-spin` spinner.

### Slider
- **File:** `/Users/vabi/Dev/strat/src/components/ui/Slider.tsx`
- **Type:** Generic primitive (composes `SettingContainer`, horizontal layout).
- **Props:** `value`, `onChange(number)`, `min`, `max`, `step?` (0.01), `disabled?`, `label`, `description`, `descriptionMode?`, `grouped?`, `showValue?` (true), `formatValue?` (default `toFixed(2)`).
- **Key styling:** `<input type="range" class="strat-slider flex-grow h-2 rounded-lg appearance-none ... focus:ring-2 focus:ring-logo-primary">` with an inline `linear-gradient` fill from `var(--color-background-ui)` to `rgba(128,128,128,0.2)` based on value %; value readout `text-sm font-medium text-text/90 w-12 text-end`. The `strat-slider` thumb is themed in `App.css`.
- **Note:** A near-identical range-input fill pattern is **re-implemented independently in `AudioPlayer`** (different fill color `#16B8A3`).

### Alert
- **File:** `/Users/vabi/Dev/strat/src/components/ui/Alert.tsx`
- **Type:** Generic primitive. Uses `lucide-react` icons.
- **Props:** `variant?: "error" | "warning" | "info" | "success"` (default `error`), `contained?: boolean` (drops rounding for in-container use), `children`, `className?`.
- **Key styling:** `flex items-start gap-3 p-4` + per-variant `container`/`icon`/`text` tints (e.g. error `bg-red-500/10` / `text-red-500` / `text-red-400`). Icon `w-5 h-5 shrink-0 mt-0.5`.

### Badge
- **File:** `/Users/vabi/Dev/strat/src/components/ui/Badge.tsx`
- **Type:** Generic primitive (**default export** — inconsistent with the rest, which are named exports).
- **Props:** `variant?: "primary" | "success" | "secondary"` (default `primary`), `className?`.
- **Key styling:** `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium`; `primary` `bg-logo-primary`, `success` `bg-green-500/20 text-green-400`, `secondary` `bg-mid-gray/20 text-text/70`. Used inside `ModelCard` for "Recommended / Active / Custom / Switching".

### ResetButton
- **File:** `/Users/vabi/Dev/strat/src/components/ui/ResetButton.tsx`
- **Type:** Generic icon-button primitive (memoized). Defaults to the `ResetIcon`.
- **Props:** `onClick`, `disabled?`, `className?`, `ariaLabel?`, `children?`.
- **Key styling:** `p-1 rounded-md border border-transparent transition-all duration-150 hover:bg-logo-primary/30 active:bg-logo-primary/50 active:translate-y-[1px] hover:border-logo-primary text-text/80`; disabled `opacity-50 text-text/40`.

### Tooltip
- **File:** `/Users/vabi/Dev/strat/src/components/ui/Tooltip.tsx`
- **Type:** Generic primitive — the only true overlay primitive. Renders via `createPortal` to `document.body`.
- **Purpose:** Fixed-position tooltip with viewport-collision flipping (top↔bottom) and a dynamically positioned arrow.
- **Props:** `targetRef: RefObject<HTMLElement>`, `position?: "top" | "bottom"` (default `top`), `children`.
- **Key constants:** `TOOLTIP_WIDTH = 200`, `VIEWPORT_PADDING = 12`, `GAP = 8`, `ARROW_MARGIN = 12`, `DEFAULT_HEIGHT = 60`.
- **Key styling:** `px-3 py-2 bg-background border border-mid-gray/80 rounded-lg shadow-lg whitespace-normal transition-opacity duration-150`, `zIndex: 9999`; CSS-triangle arrow `border-t-mid-gray/80`.
- **Note:** Only consumed via `SettingContainer`'s info icon. The trigger logic is *not* part of this component (it's duplicated in `SettingContainer`) — packaging a `<Tooltip>`-with-trigger wrapper would remove that duplication.

### TextDisplay
- **File:** `/Users/vabi/Dev/strat/src/components/ui/TextDisplay.tsx`
- **Type:** Bespoke read-only field (composes `SettingContainer`, stacked layout).
- **Purpose:** Display a read-only value with optional copy-to-clipboard and monospace.
- **Props:** `label`, `description`, `value`, `descriptionMode?`, `grouped?`, `placeholder?` ("Not available"), `copyable?`, `monospace?`, `onCopy?`.
- **Key styling:** Value box `px-2 min-h-8 flex items-center bg-mid-gray/10 border border-mid-gray/80 rounded-md text-xs`; mono adds `font-mono break-all`. **Copy button is a hand-rolled `<button>`** (`px-2 py-1 w-12 min-h-8 ... hover:bg-logo-primary/10 hover:border-logo-primary`) with an inline checkmark SVG and a 1.5s "copied" state — not the shared `Button`.

### PathDisplay
- **File:** `/Users/vabi/Dev/strat/src/components/ui/PathDisplay.tsx`
- **Type:** Bespoke composite (uses `Button`).
- **Purpose:** Monospace filesystem-path box + an "Open" button.
- **Props:** `path`, `onOpen`, `disabled?`.
- **Key styling:** Path cell `flex-1 min-w-0 px-2 py-2 bg-mid-gray/10 border border-mid-gray/80 rounded-lg text-xs font-mono break-all select-text cursor-text`. Note the path box re-implements the same field-shell styling as `TextDisplay` and `Input` (third copy of `bg-mid-gray/10 border border-mid-gray/80` — strong candidate for a shared `FieldShell`).

### AudioPlayer
- **File:** `/Users/vabi/Dev/strat/src/components/ui/AudioPlayer.tsx`
- **Type:** Bespoke media primitive (substantial logic). `lucide-react` Play/Pause.
- **Purpose:** Custom audio scrubber with lazy `onLoadRequest` loading, `requestAnimationFrame` playhead, drag-to-seek, blob-URL cleanup, autoplay.
- **Props:** `src?`, `onLoadRequest?: () => Promise<string|null>`, `className?`, `autoPlay?`.
- **Key styling:** Play/pause button `text-text hover:text-logo-primary`; range input with inline `linear-gradient` fill using the hard-coded hex `#16B8A3` (should reference `--color-logo-primary`); time labels `text-xs text-text/60 tabular-nums`.

---

## 2. Feature components — Settings & Onboarding

### ApiKeyField
- **File:** `/Users/vabi/Dev/strat/src/components/settings/PostProcessingSettingsApi/ApiKeyField.tsx`
- **Type:** Feature wrapper around `Input` (memoized).
- **Purpose:** Password-masked API-key input with local state that commits on blur and re-syncs to prop changes.
- **Props:** `value`, `onBlur(value)`, `disabled`, `placeholder?`, `className?`.
- **Key styling:** Renders `<Input type="password" variant="compact" className="flex-1 min-w-[320px]">`. No bespoke styling beyond the min-width — a clean example of composition.

### ProviderSelect / ModelSelect / BaseUrlField
- **Files:** `/Users/vabi/Dev/strat/src/components/settings/PostProcessingSettingsApi/{ProviderSelect,ModelSelect,BaseUrlField}.tsx`
- **Type:** Thin feature wrappers. `ProviderSelect` wraps `Dropdown` (`className="flex-1"`); the post-processing index re-exports from `../post-processing/PostProcessingSettings`. Cataloged here as the canonical "wrap a primitive for a specific field" pattern.

### ModelCard
- **File:** `/Users/vabi/Dev/strat/src/components/onboarding/ModelCard.tsx`
- **Type:** Bespoke feature card (**default export**). Heavily used in onboarding + Models settings. Uses `Badge`, `Button`, `lucide-react`, i18n.
- **Purpose:** Selectable model tile showing name/description, accuracy & speed score bars, capability tags (language/translation/size), and the full download/verify/extract/delete lifecycle.
- **Props:** `model: ModelInfo`, `variant?: "default" | "featured"`, `status?: ModelCardStatus` (`downloadable | downloading | verifying | extracting | switching | active | available`), `disabled?`, `className?`, `onSelect`, `onDownload?`, `onDelete?`, `onCancel?`, `downloadProgress?`, `downloadSpeed?`, `showRecommended?`.
- **Key styling:** Base `flex flex-col rounded-xl px-4 py-3 gap-2 text-left transition-all duration-200`. Variant logic: active `border-2 border-logo-primary/50 bg-logo-primary/10`, featured `border-2 border-logo-primary/25 bg-logo-primary/5`, default `border-2 border-mid-gray/20`. Interactive `hover:border-logo-primary/50 hover:bg-logo-primary/5 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] group`. Score bars: `w-16 h-1.5 bg-mid-gray/20 rounded-full overflow-hidden` track + `h-full bg-logo-primary` fill (inline `width: ${score*100}%`). **Re-implements its own progress bars** (download/verify/extract) instead of using the shared `ProgressBar`.

---

## 3. Feature components — Overview (home)

### SummaryCard
- **File:** `/Users/vabi/Dev/strat/src/components/settings/overview/SummaryCard.tsx`
- **Type:** Bespoke clickable card (renders a `<button>`). Uses `lucide-react` ChevronRight + the `StatusDot` from `fields.tsx`.
- **Purpose:** Read-only Overview tile that deep-links into a settings section; header icon + title + optional status dot + chevron, with arbitrary key/value children.
- **Props:** `icon: ComponentType`, `title`, `onOpen()`, `status?: ChipState`, `children?`.
- **Key styling:** `group w-full text-left p-4 rounded-xl border border-mid-gray/20 bg-background hover:bg-mid-gray/10 hover:border-logo-primary/40 transition-colors focus:ring-2 focus:ring-logo-primary`; icon `text-logo-primary`; chevron `group-hover:translate-x-0.5`.

### Overview field helpers — `fields.tsx`
- **File:** `/Users/vabi/Dev/strat/src/components/settings/overview/fields.tsx`
- **Exports three micro-primitives** (good candidates to promote into `ui/`):
  - **KeyChip** — `{ keys: string }` — keyboard-shortcut pill: `px-2 py-0.5 text-xs font-semibold bg-mid-gray/10 border border-mid-gray/30 rounded-md whitespace-nowrap`.
  - **StatusDot** — `{ state?: ChipState }` where `ChipState = "active" | "on" | "off" | "loading" | "idle"` — `h-2 w-2 rounded-full`; on/active `bg-logo-primary`, loading `bg-amber-400 animate-pulse`, else `bg-mid-gray/40`. **Note: this is a *second, differently-typed* StatusDot — the Sessions view has its own (see §4).**
  - **FieldRow** — `{ label, value }` — `flex items-center justify-between gap-2 text-sm`, label `text-mid-gray`, value `font-medium truncate max-w-[62%] text-right`.

### Overview (container)
- **File:** `/Users/vabi/Dev/strat/src/components/settings/overview/Overview.tsx`
- The grid of `SummaryCard`s. Hero banner uses a bespoke gradient: `rounded-2xl border border-logo-primary/20 bg-gradient-to-br from-logo-primary/10 to-transparent p-5`. Grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`.

---

## 4. Feature components — Sessions Observatory

**File for all of the below:** `/Users/vabi/Dev/strat/src/components/settings/sessions/SessionsView.tsx` (these are private, in-file sub-components — none are exported or reusable yet; all are strong extraction candidates). Sessions defines its own color `PALETTE` (10 hex values) and a `STATUS_META` map keyed by `SessionStatus` (`working | waiting_for_you | idle`) with `dot` / `label` / `chip` classes.

### StatusDot (Sessions)
- A `{ status: SessionStatus }` dot: `inline-block h-2.5 w-2.5 rounded-full shrink-0` + `STATUS_META[status].dot` (e.g. working `bg-emerald-500`, needs-you `bg-amber-400 animate-pulse`, idle `bg-mid-gray/40`).
- **Inconsistency:** duplicates the name and intent of Overview's `StatusDot` but uses a different type, different size (`h-2.5` vs `h-2`), and a different color vocabulary (emerald/amber vs logo-primary/amber). These should become one parameterized dot.

### SwatchPicker
- **Purpose:** Per-project color picker — a small swatch button that opens a popover grid of the 10-color `PALETTE`.
- **Props:** `color: string`, `onPick(color)`.
- **Key styling:** Trigger `h-3.5 w-3.5 rounded-full ring-2 ring-white/40 shrink-0` (inline `backgroundColor`). Popover: backdrop `fixed inset-0 z-20` + panel `absolute z-30 mt-1 left-0 flex flex-wrap gap-1.5 p-2 rounded-lg border border-mid-gray/20 bg-background shadow-lg w-[132px]`; swatches `h-5 w-5 rounded-full hover:scale-110`, selected `ring-2 ring-offset-1 ring-mid-gray/50`.

### Controls (top-bar options popover)
- **Purpose:** "Options" button that opens a checkbox popover (rolling summaries / voice alerts / show background sessions).
- **Props:** `rolling`, `voiceAlerts`, `hideBackground` + their `on*` toggle handlers.
- **Key styling:** Trigger `flex items-center gap-1.5 text-sm rounded-lg px-2.5 py-1.5 border border-mid-gray/20 hover:bg-mid-gray/15`. Panel: same backdrop-`fixed inset-0 z-20` + `absolute z-30 right-0 mt-1 w-64 p-2 rounded-xl border border-mid-gray/20 bg-background shadow-lg` pattern as `SwatchPicker`. **The popover scaffold (backdrop + absolute panel + open state) is duplicated between `SwatchPicker` and `Controls`** — a `Popover` primitive is warranted. Uses raw native `<input type="checkbox">` (not `ToggleSwitch`).

### ProjectTile
- **Purpose:** A project card grouping its sessions, with a color accent bar, name, per-status counts, and a list of `SessionRow`s.
- **Props:** `name`, `color`, `sessions: SessionInfo[]`, `selectedId`, `onSelect`, `onPin`, `onColor`.
- **Key styling:** `relative flex flex-col rounded-xl border border-mid-gray/15 bg-background`; top accent bar `absolute top-0 inset-x-0 h-[3px] rounded-t-xl` (inline color); header row `flex items-center gap-2 px-3 py-2 border-b border-mid-gray/10`; count chips colored emerald/amber/mid-gray. Title `font-semibold text-sm truncate`.

### SessionRow (within ProjectTile)
- **Props:** `session`, `active`, `onSelect`, `onPin`.
- **Key styling:** `group flex items-start gap-2 px-2 py-1.5 rounded-lg cursor-pointer`; active `bg-logo-primary/15` else `hover:bg-mid-gray/10`. Title `text-[13px] font-medium truncate`, time `text-[10px] text-mid-gray`, git branch `text-[10px]` with a `GitBranch` icon. Pin button reveals on hover (`opacity-0 group-hover:opacity-100`), pinned = `text-logo-primary`.

### Detail (chat drawer body)
- **Purpose:** The full right-drawer: header (title, status chip, branch, action icon-buttons), summary block, live transcript, and an "Ask" composer with a mic.
- **Props:** `session: SessionInfo`, `color: string`, `onClose()`.
- **Notable shared local class:** `iconBtn = "flex items-center justify-center h-8 w-8 rounded-lg border border-mid-gray/20 hover:bg-mid-gray/15 transition-colors"` — used for Refresh / Speak / Focus / Pin / Close. This **icon-button shape is re-declared in several places** (here as a local const, again inline for the mic, again in `Controls`); a real `IconButton` primitive would unify them.
- **Status chip:** `text-[11px] px-2 py-0.5 rounded-full font-medium ${meta.chip}` — yet another chip/badge style separate from `Badge`.
- **Transcript turns:** role label `text-[10px] uppercase tracking-wide font-semibold` (assistant `text-logo-primary`, user `text-mid-gray`); body `whitespace-pre-wrap break-words text-text/85 leading-snug`.

### Sessions mic button (push-to-talk)
- Inside `Detail`'s ask composer. State machine `MicState = "idle" | "listening" | "transcribing"`.
- **Key styling:** `flex items-center justify-center h-9 w-9 rounded-lg shrink-0 transition-colors`; listening = `bg-red-500 text-white animate-pulse`, idle = `border border-mid-gray/20 hover:bg-mid-gray/15`; transcribing shows `Loader2 animate-spin`. The Ask `<textarea>` and Ask/Stop buttons are all hand-rolled (textarea `rounded-lg border border-mid-gray/20 bg-background px-3 py-2 focus:ring-2 focus:ring-logo-primary resize-none`; Ask `bg-logo-primary/85 hover:bg-logo-primary text-white`) — none use `Textarea`/`Button`.

### Chat drawer shell + answer/error bubbles
- Drawer overlay: `fixed inset-0 z-40 transition-opacity` + scrim `bg-black/30` + panel `absolute top-0 right-0 h-full w-full sm:w-[460px] lg:w-[560px] bg-background border-s border-mid-gray/20 shadow-2xl transition-transform duration-300 ease-out` (slides via `translate-x-0` / `translate-x-full`). This drawer pattern is bespoke and not shared with anything.
- Answer bubble `text-sm bg-logo-primary/10 rounded-lg px-3 py-2`; error `text-xs text-red-500` (not the shared `Alert`).
- "Recently finished" report cards reuse the `ProjectTile`-style shell (`rounded-lg border border-mid-gray/15 bg-background`) inline.

---

## 5. Sidebar item

- **File:** `/Users/vabi/Dev/strat/src/components/Sidebar.tsx`
- **Type:** Bespoke navigation. The nav item is an inline `<div>` (not its own component), driven by a central `SECTIONS_CONFIG` map (`labelKey`, `icon`, `component`, `enabled(settings)`).
- **Item styling:** `flex gap-2 items-center p-2 w-full rounded-lg cursor-pointer transition-all duration-150`; active `bg-logo-primary/15 text-logo-primary font-medium`, inactive `text-text/80 hover:text-text hover:bg-mid-gray/15`. Icon `24×24 shrink-0`, label `text-sm font-medium truncate`.
- **Rail:** `flex flex-col w-40 h-full border-e border-mid-gray/20`; brand header pairs `strat-logo.png` (`w-9 h-9`) with `HandyTextLogo`.
- **Note:** The active-pill treatment (`bg-logo-primary/15 text-logo-primary`) is identical to `SessionRow`'s active state — a shared "selected list item" token.

---

## 6. Shared

### ProgressBar
- **File:** `/Users/vabi/Dev/strat/src/components/shared/ProgressBar.tsx`
- **Type:** Generic primitive (**default export**). Uses the native `<progress>` element.
- **Props:** `progress: ProgressData[]` (`{id,percentage,speed?,label?}`), `className?`, `size?: "small" | "medium" | "large"`, `showSpeed?`, `showLabel?`. Handles single vs multiple bars.
- **Key styling:** sizes `w-16 h-1` / `w-20 h-1.5` / `w-24 h-2`; `[&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-mid-gray/20 [&::-webkit-progress-value]:bg-logo-primary`.
- **Note:** Despite existing, it is **not** used by `ModelCard`, which rolls its own div-based progress bars — divergent progress styling.

---

## 7. Systematization summary (for Claude Design)

**Solid, reuse-as-is primitives:** `Button`, `Input`/`Textarea`, `Alert`, `Badge`, `ToggleSwitch`, `Slider`, `ResetButton`, `Tooltip`, `SettingsGroup`, `SettingContainer`.

**Duplicated / inconsistent — fold into shared primitives:**
1. **Two dropdowns** — `Select` (react-select) vs `Dropdown` (hand-built). Pick one API.
2. **Two `StatusDot`s** — Overview (`ChipState`, `h-2`, logo-primary) vs Sessions (`SessionStatus`, `h-2.5`, emerald). Unify into one parameterized dot.
3. **Three+ "chip/pill" styles** — `Badge`, `KeyChip`, Sessions `STATUS_META.chip`, Detail status chip. Should be one `Chip`/`Badge` with variants.
4. **Two popovers** — `SwatchPicker` and `Controls` re-implement the same backdrop+absolute-panel scaffold. Extract a `Popover`.
5. **Field-shell repetition** — `Input`, `Textarea`, `TextDisplay`, `PathDisplay` all repeat `bg-mid-gray/10 border border-mid-gray/80 rounded-md`. Extract a `FieldShell`.
6. **Icon buttons** — Sessions `iconBtn` const, the mic button, `Controls`/`Options` button, `TextDisplay`'s copy button, `AudioPlayer`'s play button each hand-roll `<button>` instead of using `Button`. Extract an `IconButton`.
7. **Progress bars** — `ProgressBar` exists but `ModelCard` reimplements its own. Standardize.
8. **Range-input fill** — `Slider` and `AudioPlayer` independently build gradient-fill ranges (and `AudioPlayer` hard-codes `#16B8A3` instead of the token).
9. **Native controls bypassing primitives** — Sessions uses raw `<input type="checkbox">`/`<textarea>` and the Read-Aloud voice picker (`/Users/vabi/Dev/strat/src/components/settings/read-aloud/ReadAloudSettings.tsx`) uses a raw native `<select>` instead of `Select`/`Dropdown`.
10. **Export inconsistency** — mixed default vs named exports (`Badge`, `ModelCard`, `ProgressBar` are default; everything else named) and an incomplete `ui/index.ts` barrel (half the primitives are imported by deep path). Normalize to named exports + a complete barrel.

**Hard-coded values to tokenize:** the 10-color Sessions `PALETTE`, `Tooltip` width/gap constants, `AudioPlayer`'s `#16B8A3`, and the recurring `border-mid-gray/80` vs `/20` vs `/15` border-opacity drift (no consistent hairline scale).


============================================================
## ::: redesign-brief.md :::
============================================================

# Redesign Brief for Claude Design

You're being handed Murmur — a Tauri v2 desktop app (a voice-first "human layer" for Claude Code: dictation, ElevenLabs Read Aloud in the "Monoli" voice, and a Sessions observatory). It's a fork of Handy that we've branded and extended. The bones are good and the functional wiring is solid; what we need from you is a **design elevation pass** that makes it feel modular, sleek, cohesive, and unmistakably *ours* — without breaking anything.

This brief tells you exactly what to do, what not to touch, what to deliver, and how to hand it back.

---

## 1. Goals

Make Murmur **more modular, sleek, cohesive, and distinctive**. In Arshia's words: *more modular, sleek, color-coded projects, drawer-based chat — this is partially done; elevate it.*

Concretely:

- **Modular** — A real, named design system. Right now tokens live half in a Tailwind v4 `@theme` block and half in loose `:root` CSS in `src/App.css`, and components hand-roll their own class strings (e.g. the `iconBtn` constant inside `SessionsView.tsx`, the per-status `STATUS_META` map, the inline `PALETTE`). Consolidate into reusable tokens + primitives so a card, a chip, an icon-button, a status dot, a popover, and a drawer each have one canonical implementation.
- **Sleek** — Tighten spacing rhythm, typography scale, elevation, and radii into a deliberate system. Today sizes are ad hoc: `text-[13px]`, `text-[11px]`, `text-[10px]`, `h-3.5 w-3.5`, `py-1.5` appear inline all over Sessions. Replace the grab-bag with a small, intentional scale.
- **Cohesive** — One visual language across all 10 sidebar sections (`overview`, `general`, `models`, `readAloud`, `sessions`, `advanced`, `history`, `postprocessing`, `debug`, `about` — see `SECTIONS_CONFIG` in `src/components/Sidebar.tsx`). The Overview "control center" cards, the Sessions dashboard, and the settings forms currently feel like three different apps. Unify them.
- **Distinctive** — Lean into the brand. The teal is the signature: `--color-logo-primary: #16B8A3` (light) / `#2FD3BD` (dark), `--color-background-ui: #0FA697`. The app already ships a branded animated mark (`StratosMark`, `.sx-*` keyframes in `App.css`) and a "Murmur — a Stratos House product" voice. Push this into a memorable, premium macOS-native feel rather than a generic settings panel.
- **Color-coded projects** — Sessions already auto-assigns a per-project accent from a 10-swatch `PALETTE` and lets users override via a `SwatchPicker` (persisted to the `project_colors` setting). Make this the organizing visual spine of the Sessions surface — carry the project color through tiles, the drawer header, status, and transcript attribution coherently, not just as a 3px top bar.
- **Drawer-based chat** — The right-side chat drawer in Sessions (the `Detail` component, slides in at `w-[460px]`/`lg:w-[560px]`) is the product's hero interaction. Elevate its motion, hierarchy, and the mic/ask affordance.

---

## 2. Priority surfaces

Spend your effort here, in this order:

### A. Sessions — `src/components/settings/sessions/SessionsView.tsx` (the dashboard + drawer + mic)
This is the flagship. One 741-line file containing several sub-components worth extracting and restyling:
- **Top bar** — `Radio` icon + "Sessions" + a live count line (`{liveCount} live · {needCount} need you`) + an "Options" popover button.
- **Project dashboard** — responsive grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`) of `ProjectTile`s. Each tile = color accent bar, `SwatchPicker`, project name, per-status counts (working/needs-you/idle), and a list of `SessionRow`s.
- **`SessionRow`** — status dot, title, relative timestamp (`rel()` → `now/30s/5m/2h/1d`), git branch line, hover-revealed pin button.
- **The drawer (`Detail`)** — the hero. Header (project color dot, repo name, status chip, branch, "x ago", background tag) + a row of icon-buttons (refresh summary, speak summary, focus window, pin, close) + summary block + auto-scrolling transcript (Agent/You attribution) + the **Ask box**: mic button (push-to-talk: idle → listening → transcribing), textarea (⌘/Ctrl+Enter to send), Ask + Stop buttons, error/answer slots.
- **Mic states** — `MicState = "idle" | "listening" | "transcribing"`; listening turns the button `bg-red-500 ... animate-pulse`. This is the voice flow — give it a distinctive, confident treatment.
- **"Recently finished" reports** — a secondary grid of finished agent runs with a play button.
- **Empty state** — currently a faint `Radio` icon + "No live Claude Code sessions found." — needs a real, on-brand empty state.

### B. Overview — `src/components/settings/overview/Overview.tsx` (home)
The glanceable control center. A branded hero strip (`StratLogo` + `HandyTextLogo` + tagline on a `from-logo-primary/10` gradient) over a grid of read-only `SummaryCard`s (`src/components/settings/overview/SummaryCard.tsx`) that deep-link into each section (Sessions, General, Models, Read Aloud, Post-processing, History, Advanced, About). Each card shows `FieldRow` key/value pairs and a `StatusDot` (`src/components/settings/overview/fields.tsx`). This is the first thing a user sees on every launch — make it feel like a dashboard, not a link list.

### C. Onboarding — `src/components/onboarding/`
First-run flow, stepped in `App.tsx` as `welcome → accessibility → model → finish → done` (returning users with models skip straight to permissions or `done`). `WelcomeOnboarding.tsx` is full-screen: brand mark, "Your voice layer for Claude Code", "a Stratos House product", a 3-up value grid (Dictate anywhere / Hear it back / Run your sessions), and a "Get started" CTA. Also: `AccessibilityOnboarding.tsx` (macOS accessibility + mic permission gating), `Onboarding.tsx` (model pick, uses `ModelCard.tsx`), `FinishOnboarding.tsx`. This is the brand's first impression — make all four steps feel like one polished, cohesive sequence.

---

## 3. Known weaknesses / opportunities

- **Density & hierarchy** — Sessions packs a lot into small type (`text-[10px]`/`text-[11px]`/`text-[13px]`) with thin dividers (`border-mid-gray/10`, `/15`, `/20`). Headings, metadata, and counts don't have a clear hierarchy. Establish a type scale and breathing room; decide what's primary vs. ambient.
- **Motion** — There are good seeds (`--ease-out-quint`, `--ease-io`, the `.sx-*` brand keyframes, the drawer's `translate-x` slide, the listening pulse) but it's inconsistent and sparse. Most transitions are a flat `transition-colors`. Add a coherent motion language: drawer open/close, tile hover, status changes, mic state transitions, summary/answer reveal. Honor the existing `@media (prefers-reduced-motion: reduce)` block.
- **Empty / loading / error states** — Underdeveloped. Sessions empty state is a faint icon + sentence. Loading is bare `Loader2` spinners. Errors are raw red text (`askErr` → `text-xs text-red-500`; summary failure literally renders `(${error})`). Transcript empty is "No recent messages." Design proper empty/loading/error/skeleton states for: no sessions, transcript loading, summary generating, ask in-flight, ask failed, no models yet.
- **Dark mode polish** — Dark theme exists via `@media (prefers-color-scheme: dark)` with its own token overrides and elevation shadows, but it's lightly tuned. Status colors (emerald/amber/teal/the 10-swatch palette) and the gradients need to be verified and refined for contrast and richness in dark. We expect users to live in dark mode.
- **Accessibility / focus / keyboard** — Inconsistent. The app sets `select-none cursor-default` globally on the shell. Some controls are clickable `<div>`s (e.g. `SessionRow`, sidebar items) rather than buttons. Focus rings are uneven (`SummaryCard` has `focus:ring-2`, many icon-buttons have none). Escape closes the drawer; ⌘/Ctrl+Enter sends a question — but there's no visible focus management when the drawer opens, no `aria-*`, no roles. Add real keyboard nav, focus trapping in the drawer, visible focus states, and ARIA. (Note: `react-i18next` is wired throughout — keep strings translatable; many Sessions strings are still hardcoded English and could be tokenized, but that's optional.)
- **The popovers** — Two hand-rolled popovers: `SwatchPicker` (color grid) and `Controls` ("Options" menu). Both use the `fixed inset-0 z-20` scrim + `absolute z-30` panel pattern, no animation, no focus handling, no keyboard dismiss. Make a single reusable, animated, accessible Popover primitive and use it for both. The recording overlay (`src/overlay/RecordingOverlay.tsx`, styled in `RecordingOverlay.css`) is a separate Tauri window with animated mic-level bars — light touch only, but it should feel of-a-piece with the new system.
- **Native depth, currently unused (big opportunity)** — Murmur ships as a flat opaque window but the macOS shell can do real **vibrancy/translucency** (NSVisualEffectView) for free — `Sidebar` material behind the nav, `WindowBackground` for content, `HudWindow` for the recording overlay — plus an **overlay titlebar with inset traffic lights** for an edge-to-edge sidebar, and CSS `backdrop-filter` on inner panels. None of this is wired today. Designing *as if* this depth exists underneath is the single biggest "feels native and premium" upgrade. The full map of what the shell allows/forbids is in **[native-constraints.md](native-constraints.md)** — read it before designing.

---

## 4. Hard constraints (do not break these)

- **Stack is fixed:** Tauri v2 + React 18.3 + **Tailwind v4** (`@tailwindcss/vite`, configured via the `@theme` block in `src/App.css` — there is **no `tailwind.config.js`**; v4 is CSS-first) + `lucide-react` (icons) + `zustand` (state) + `sonner` (toasts) + `react-i18next` (i18n) + `react-select`. Do not introduce a new UI framework, CSS-in-JS lib, or component kit. Stay within these.
- **Preserve ALL functional wiring.** Restyle the DOM/classes; do not change behavior or the contracts below.
  - **Tauri commands** (typed in `src/bindings.ts`, called via `commands.*`) — Sessions/mic/voice depend on: `getSessions`, `getSessionTranscript`, `summarizeSession`, `askSession`, `askSessionCancel`, `toggleSessionPin`, `speakSessionSummary`, `focusSessionWindow`, `setProjectColor`, `setSessionsRolling`, `setSessionsVoiceAlerts`, `setSessionsHideBackground`, `playAgentRun`, `getAgentRuns`, and the in-app mic flow `appStartDictation` / `appStopDictation` / `appCancelDictation`. Overview uses `listElevenlabsVoices`. The overlay uses `cancelOperation`. Keep every call site and its arguments.
  - **Stores** (zustand) — `useSessionsStore` (`src/stores/sessionsStore.ts`: `sessions`, `selectedId`, `init`, `select`), `useAgentsStore`, `useSettingsStore`, `useModelStore`. Keep the selectors and the `init()` subscribe-first pattern intact.
  - **Events** — the surfaces subscribe to Tauri events: `sessions-update`, `agents-update`, `model-state-changed`, `recording-error`, `paste-error`, `mic-level`, `show-overlay`, `hide-overlay`, and more. Don't sever these listeners.
  - **Settings keys** — color-coding persists to `project_colors`; toggles to `sessions_hide_background`, `sessions_rolling_summaries`, `sessions_voice_alerts`. Read/write through the existing `useSettings` hook (`getSetting` / `refreshSettings`).
  - **Bindings/keyboard** — global hotkeys, push-to-talk, ⌘/Ctrl+Enter to send, Escape to close the drawer, ⌘/Ctrl+Shift+D debug toggle — all preserved.
- **Bundle identity is locked:** `identifier: "com.stratos.strat"`, `productName: "Murmur"` (in `src-tauri/tauri.conf.json`). Do not change these or the signing/updater config.
- **Desktop window, not mobile.** This is a macOS desktop app (also builds Windows/Linux). Design for a resizable desktop window with a hard **680×570 minimum** (not maximizable) — every layout must work at that floor and up. The `sm:`/`md:`/`lg:`/`xl:` breakpoints in the code are window-width responsive, not phone targets — keep them meaningful for a window, and remember macOS uses native overlay scrollbars (`:root[data-platform="macos"]`) so don't design custom scrollbars for Mac.
- **WKWebView, not Chromium.** On macOS the frontend renders in **WKWebView (Safari/WebKit)**, not Chromium — test in Safari, assume an older WebKit baseline (macOS 10.15 floor), and verify anything cutting-edge (`:has()` edge cases, container queries, subgrid). `backdrop-filter` is supported. The macOS **traffic-light buttons and system notifications are Apple-drawn** — don't try to restyle them. Full detail in [native-constraints.md](native-constraints.md).
- **Offline-capable.** No remote fonts, no CDN assets, no runtime web requests for styling. Bundle any font locally. Whisper/dictation runs fully offline; the design must not assume connectivity. (ElevenLabs Read Aloud is the one optional online feature — don't make core UI depend on it.)
- **Keep it light.** No heavy animation/3D dependencies. The existing brand animation is pure CSS keyframes; stay in that spirit.

---

## 5. Deliverable options (pick what fits — preferences noted)

In rough order of how useful they are to us:

1. **Updated Tailwind v4 theme tokens + restyled components (PREFERRED — drop-in).** Extend/refactor the `@theme` and `:root` token blocks in `src/App.css` (semantic color roles, type scale, spacing, radii, elevation, motion), then restyle the priority components against those tokens. This should land as edited `.tsx`/`.css` files we can build and run directly — same component APIs, same imports, same wiring; just better classes/markup. Extracting the inline sub-components (`SessionRow`, `ProjectTile`, `Detail`, `SwatchPicker`, `Controls`) and the ad-hoc primitives (icon-button, status chip, status dot, popover, drawer) into reusable pieces under `src/components/ui/` is very welcome.
2. **New component variants** — additions to the existing UI kit in `src/components/ui/` (e.g. a real `Popover`, `Drawer`, `Card`, `IconButton`, `StatusChip`, `EmptyState`, `Skeleton`), with the priority surfaces refactored to consume them. Great as a complement to (1).
3. **A Figma mock** — a high-fidelity mock of the three priority surfaces (Sessions dashboard + open drawer + mic states, Overview, Onboarding) in light *and* dark, with the token system documented. Useful if you'd rather propose the direction before we wire it. Acceptable as a standalone, but (1) is what ships.

You can combine these (e.g. Figma direction + token file + a restyled Sessions as proof). If you do only one thing, do **(1)** for Sessions.

---

## 6. Screenshots to capture (checklist for Arshia to attach)

Grab these from the running app (`bun tauri dev`) before/while Claude Design works, in **both light and dark mode**:

- [ ] **Overview / home** — full window, populated (with a model active, sessions ready, post-processing on).
- [ ] **Sidebar** — showing all enabled sections (toggle `debug_mode` via ⌘/Ctrl+Shift+D and enable post-processing so `debug` + `postprocessing` rows appear).
- [ ] **Sessions dashboard — populated** — multiple project tiles, mixed statuses (working / needs-you / idle), several with custom colors.
- [ ] **Sessions dashboard — empty state** — no live sessions.
- [ ] **`SwatchPicker` open** — the color popover on a project tile.
- [ ] **"Options" popover open** — the `Controls` menu (rolling summaries / voice alerts / show background).
- [ ] **Drawer open — full** — `Detail` with a summary, a multi-turn transcript (Agent + You), and the Ask box.
- [ ] **Drawer — mic states** — one shot mid-**listening** (red pulsing mic), one **transcribing** (spinner).
- [ ] **Drawer — ask in-flight and answer shown** — the Ask spinner + a returned answer block; plus an **error** state (`askErr`).
- [ ] **"Recently finished" reports** grid (run a session to completion so agent runs appear).
- [ ] **Onboarding** — each step: Welcome, Accessibility/permissions, Model pick, Finish.
- [ ] **Recording overlay** — the floating mic-level bar window during dictation (`show-overlay`).
- [ ] **Footer** — model selector + update status + version.
- [ ] **A toast** — e.g. a recording or paste error (sonner toast styling).
- [ ] **A settings form section** — e.g. General or Advanced, to show the form/`ToggleSwitch`/`SettingContainer` language that must stay cohesive with the new system.

---

## 7. How to hand back

- **Branch off `main`.** The repo is on `main` and the prior `feat/sessions-observatory` work is already merged into it (that branch no longer exists). Create `design/elevation-pass` from `main` and open a PR back into `main`. Keep the diff reviewable — ideally token changes in `src/App.css` as one logical group, new/refactored primitives under `src/components/ui/` as another, and per-surface restyles (Sessions, Overview, Onboarding) as their own commits.
- **Definition of Done** (self-verify before opening the PR): builds + runs via `bun tauri dev`; **light AND dark both pass**; every Tauri command / zustand store / event / settings key / hotkey named in §4 is still referenced (don't touch `bindings.ts` generation); the **680×570 floor** holds with no layout break; **no remote fonts/CDN** (fonts self-hosted, app works offline); the two-teals question is resolved into a documented `--color-accent` vs `--color-action` rule with the focus ring pinned to ONE token; every new color/component ships both theme values.
- **Verify it builds and runs:** `bun install` → `bun tauri dev` (or `bun run build` for the frontend). The wiring must still work end-to-end — list sessions, open the drawer, dictate into the ask box, ask a question, color a project. If you touched `bindings.ts` usage you did something wrong (it's generated — leave it).
- **If you can't run Tauri**, hand back the **token file + restyled component files** as a patch/branch anyway (we'll wire and verify), plus a short notes block in the PR description on token decisions, any new `ui/` primitives, and which inline pieces you extracted. A **Figma file link** (light + dark, the 3 priority surfaces) can accompany either path.
- **Don't:** rename the bundle id/product, swap the stack, remove i18n, change command/event/store names, or convert this into a mobile layout.

**TL;DR:** Give Sessions (dashboard + drawer + mic) a premium, color-coded, modular glow-up; bring Overview and Onboarding into the same language; ship it as drop-in Tailwind v4 tokens + restyled components on a `design/elevation-pass` branch off `main` — with every command, store, event, hotkey, and the `com.stratos.strat` / Murmur identity left exactly as they are.


============================================================
## ::: states.md :::
============================================================

# State matrix (empty / loading / error / skeleton)

The redesign brief *names* these states in one sentence; this doc *specifies* them so Claude Design designs them instead of leaving holes. Today these are under-built: ask-failure dumps raw `r.error`, summary-failure literally renders `(${error})`, and transcript "loading" vs "empty" share the same string. Each row below is a target spec.

**Loading taxonomy (decide once):** use a **skeleton** for content-shaped areas that will fill (transcript turns, the tile grid, a summary block); use an **inline spinner** for in-button / in-line async (Ask in-flight, summary regenerating). Don't mix.

| Surface / component | Trigger condition | Visual treatment | Exact copy (i18n key) | Primary action | Recovery / dismiss | Reduced-motion |
|---|---|---|---|---|---|---|
| **Sessions — no live sessions** | `sessions.length === 0` after load | Calm centered empty state: small line icon (not the faint `Radio`), one sentence, dim | "No live Claude Code sessions. Start one and it'll appear here." (`sessions.empty`) | (optional) link to docs / "How sessions work" | n/a (auto-fills when a session starts) | static |
| **Sessions — loading first time** | initial fetch, no cached data | **Skeleton** tile grid (2–3 ghost tiles) | — | — | — | show static ghosts, no shimmer |
| **Transcript — loading (first poll)** | drawer open, transcript not yet fetched | **Skeleton** of 2–3 message rows | — (no text) | — | — | static ghosts |
| **Transcript — genuinely empty** | fetched, zero messages | one dim line, distinct from loading | "No messages yet in this session." (`transcript.empty`) | — | — | static |
| **Summary — generating** | `summarizeSession` in flight | inline spinner in the summary block + dim placeholder text | "Summarizing…" (`summary.loading`) | — | — | spinner→static dot |
| **Summary — failed** | summarize error | inline error row (NOT raw `(${error})`) | "Couldn't summarize. (`summary.error`)" + humanized detail | **Retry** button | dismiss on retry/success | — |
| **Ask — in flight** | `askSession` pending | spinner inside the Ask button; textarea stays, **question preserved** | button: "Asking…" (`ask.loading`) | **Stop** (calls `askSessionCancel`) | — | spinner→static |
| **Ask — failed** | `askSession` error | inline error slot below the box (NOT raw red `r.error`); **keep the typed question** | "Couldn't get an answer. (`ask.error`)" + humanized detail | **Retry** (re-sends same question) | dismiss on retry/edit | — |
| **Ask — answer shown** | success | answer block with clear "Agent" attribution + subtle reveal | — | (copy / speak) | — | fade→instant |
| **Recently finished — empty** | no finished runs | hide the section entirely (don't show an empty header) | — | — | — | — |
| **Models — none downloaded** | `hasAnyModelsAvailable() === false` (NOT a Sessions state) | Models screen: prominent "download a model" zero-state; **footer ModelSelector shows the red "none" dot** with a route-to-download CTA | "No transcription model yet. Download one to start." (`models.empty`) | **Download** (routes to Models) | auto-clears on download | — |
| **Recording overlay — error** | `recording-error` / `paste-error` | overlay error tint + toast (sonner) | humanized, e.g. "Microphone unavailable." (`overlay.error.mic`) | — | auto-dismiss | — |

## Rules that apply across all states
- **Humanize errors.** Never render `r.error` / `(${error})` / a raw enum to the user. Map known error types to friendly copy; keep a generic fallback ("Something went wrong. Try again.").
- **Preserve user work.** Ask-failed and ask-cancelled must keep the typed question in the textarea.
- **Distinguish loading from empty.** They must never share a string (today transcript does).
- **i18n.** `react-i18next` is wired throughout — every string above is a key, not a hardcoded literal. Many Sessions strings are still hardcoded English; tokenize as you restyle.
- **Skeletons must match the real layout** (same row heights / tile shape) so there's no layout shift when content arrives.


============================================================
## ::: motion.md :::
============================================================

# Motion language

The brief lists motion *moments*; this maps each to a token + duration + property, so motion is a deliberate system, not ad-hoc `transition-colors`. **Temperature: calm and quiet** — motion confirms, it doesn't perform. When in doubt, less and slower-out.

**Tokens** (today these live only in `src/App.css` and are unreachable from Tailwind utilities — **expose them as Tailwind `transitionTimingFunction` tokens** so components can use brand easing):
- `--ease-out-quint` = `cubic-bezier(0.22, 1, 0.36, 1)` — entrances, hovers (the default "out" curve)
- `--ease-io` = `cubic-bezier(0.45, 0, 0.55, 1)` — symmetrical moves, ambient loops
- Durations: **fast 150ms · base 200ms · slow 300ms**
- **Animate `transform` and `opacity` only** (WKWebView compositing; never animate layout/`width`/`height` on large surfaces).

| Interaction | Property | Duration | Easing | Notes |
|---|---|---|---|---|
| **Drawer open** | `translateX` + opacity | 300ms | `ease-out-quint` | slide from right; content fades in slightly behind the slide |
| **Drawer close** | `translateX` + opacity | 200ms | `ease-io` | faster out than in |
| **Tile hover** | `transform: translateY(-1px)` + `--elev-2`→`--elev-3` | 120ms | `ease-out-quint` | matches existing button hover (App.css) |
| **Status change** (working↔needs-you↔idle) | dot color + a one-shot pulse on change | 200ms color, 1 pulse | `ease-io` | **define from scratch** — no animation today. needs-you dot keeps its standing `animate-pulse`; the *transition into* needs-you gets a single attention pulse, not a loop |
| **Mic idle→listening** | scale + color to red, then steady `animate-pulse` | 150ms in | `ease-out-quint` | confident, not bouncy; the standing pulse is the listening state |
| **Mic listening→transcribing** | red→accent + swap pulse for spinner | 150ms | `ease-io` | clear hand-off; no flicker |
| **Summary / answer reveal** | opacity 0→1 + `translateY(4px→0)` | 200ms | `ease-out-quint` | **define from scratch** — gentle settle, not a slide |
| **Popover open** (swatch / options) | opacity + `scale(0.98→1)` from trigger origin | 150ms | `ease-out-quint` | transform-origin at the trigger; close = 100ms fade |
| **Toast (sonner)** | default sonner slide | — | — | keep library default; just theme it |
| **Brand mark ambient** | existing `sx-breathe` / `sx-glow` | 3.2s loop | `ease-io` | the "murmur" pulse; only when sessions are live; already in App.css |

## Rules
- **Honor `prefers-reduced-motion: reduce`** — the App.css block exists; extend it to the **new** motions too (drawer = instant; status pulse = none; reveals = instant opacity; mic = color change only; ambient brand pulse = off).
- **No stagger** beyond ~30ms between siblings; this is a calm tool, not a showcase.
- **Don't animate on data refresh.** Sessions polls (`sessions-update`, every ~2.5s); list re-renders must not re-trigger entrance animations or the dashboard will twitch.


============================================================
## ::: a11y.md :::
============================================================

# Accessibility & keyboard requirements

The brief diagnoses the a11y debt (clickable `<div>`s, uneven focus rings, no roles/ARIA, no drawer focus management); this turns it into an acceptance spec. This is a **voice-first product for power users** — keyboard and live-region support are core, not polish.

## Roles & semantics
- **Drawer (`Detail`)** → `role="dialog"` `aria-modal="true"` `aria-labelledby` (the repo/session name). It's the hero surface; treat it as a proper modal panel.
- **Swatch picker & Options** → real popover semantics: trigger `aria-haspopup` + `aria-expanded`; panel `role="menu"`/`role="listbox"` with `role="menuitem"`/`option` children. Build ONE reusable accessible `Popover` primitive and use it for both (today both are hand-rolled scrims with no keyboard handling).
- **SessionRow / sidebar items / tiles** → must be real `<button>`s (or `role="button"` + `tabindex=0` + Enter/Space handlers), not bare clickable `<div>`s.
- **Icon-only buttons** (the 5 drawer actions: refresh summary, speak summary, focus window, pin, close; plus the mic) → each needs an `aria-label`.
- **Status dots** → not color-only: pair with the text label already in `STATUS_META` (`working` / `needs you` / `idle`) via `aria-label` or visible text, so status isn't conveyed by hue alone.

## Focus management
- **Drawer open** → move focus to the drawer (its heading or first control); **trap focus** within while open; **Escape closes** (already wired) and **returns focus to the triggering SessionRow**.
- **Popovers** → focus first item on open; Arrow keys move; Escape closes and returns focus to trigger; click-outside closes.
- **One focus-visible token.** Today focus rings are uneven (`SummaryCard` has `focus:ring-2`, most icon-buttons none) and split across two teals. Pick ONE focus token (recommend the accent teal `--color-accent`, distinct from the action teal) and apply a consistent `:focus-visible` ring to every interactive element.

## Keyboard model
- **Tile grid / SessionRows** → Tab reaches each tile; within a tile, Tab/Arrow moves through its SessionRows; Enter/Space opens the drawer for the focused row.
- **Preserve existing hotkeys** (don't regress): ⌘/Ctrl+Enter sends a question, Escape closes the drawer, push-to-talk mic, ⌘/Ctrl+Shift+D debug.
- **Ask box** → textarea is reachable; the mic button is a real button with a keyboard-operable press (push-to-talk is mouse-held today — provide a keyboard-accessible equivalent or document the limitation).

## Live regions (critical for a voice product)
The whole product is async/event-driven — announce changes:
- **Transcript updates** (polled) → an `aria-live="polite"` region so new Agent/You turns are announced without stealing focus.
- **Status → "needs you"** flips → polite announcement (this is the core "a session needs you" signal).
- **Ask answer arrives / Ask error** → polite live region (don't make the user re-find the answer).
- **Spoken alerts / degradation toasts** → already audible; ensure the visual toast is also in a live region.
- Use `aria-busy` on regions while loading (transcript first poll, summary generating, ask in-flight).

## Respect the native shell
- The shell root is `select-none cursor-default` — copyable content (transcripts, summaries, answers, paths) must opt back into `select-text` and be keyboard-selectable.
- Don't rely on hover-only affordances (the pin button is hover-revealed today) — also reveal on focus.

