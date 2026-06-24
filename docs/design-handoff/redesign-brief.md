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
- **Desktop window, not mobile.** This is a macOS desktop app (also builds Windows/Linux). Design for a resizable desktop window. The `sm:`/`md:`/`lg:`/`xl:` breakpoints in the code are window-width responsive, not phone targets — keep them meaningful for a window, and remember macOS uses native overlay scrollbars (`:root[data-platform="macos"]`).
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

- **Branch off `feat/sessions-observatory`** (the active feature branch this work lives on; `main` is upstream-tracking). Create something like `design/elevation-pass` from it and open a PR back into `feat/sessions-observatory`. Keep the diff reviewable — ideally token changes in `src/App.css` as one logical group, new/refactored primitives under `src/components/ui/` as another, and per-surface restyles (Sessions, Overview, Onboarding) as their own commits.
- **Verify it builds and runs:** `bun install` → `bun tauri dev` (or `bun run build` for the frontend). The wiring must still work end-to-end — list sessions, open the drawer, dictate into the ask box, ask a question, color a project. If you touched `bindings.ts` usage you did something wrong (it's generated — leave it).
- **If you can't run Tauri**, hand back the **token file + restyled component files** as a patch/branch anyway (we'll wire and verify), plus a short notes block in the PR description on token decisions, any new `ui/` primitives, and which inline pieces you extracted. A **Figma file link** (light + dark, the 3 priority surfaces) can accompany either path.
- **Don't:** rename the bundle id/product, swap the stack, remove i18n, change command/event/store names, or convert this into a mobile layout.

**TL;DR:** Give Sessions (dashboard + drawer + mic) a premium, color-coded, modular glow-up; bring Overview and Onboarding into the same language; ship it as drop-in Tailwind v4 tokens + restyled components on a branch off `feat/sessions-observatory` — with every command, store, event, hotkey, and the `com.stratos.strat` / Murmur identity left exactly as they are.
