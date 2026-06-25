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
