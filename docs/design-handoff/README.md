# Murmur — Claude Design Handoff Package

Everything Claude Design needs to elevate the UI of **Murmur** (a Stratos House product) —
the voice-first "human layer" for Claude Code. Read in this order:

1. **[product-and-brand.md](product-and-brand.md)** — what Murmur is, who it's for, positioning,
   the brand (name rationale, logo, teal, tone), and brand guardrails (what NOT to change).
2. **[design-system.md](design-system.md)** — the *current* system extracted from the code:
   color tokens, typography, spacing/radius, surfaces, status colors, the project palette. The
   thing to formalize and extend.
3. **[screens-and-flows.md](screens-and-flows.md)** — every screen/section + the onboarding flow
   + global chrome, with current layout and rough edges. Priority surfaces are flagged.
4. **[component-catalog.md](component-catalog.md)** — the reusable components that exist today
   (paths, props, styling, duplication) — the primitives to systematize.
5. **[redesign-brief.md](redesign-brief.md)** — **the actual ask**: goals, priority surfaces,
   weaknesses/opportunities, hard constraints, deliverable options, and the screenshot checklist.

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
Updated **Tailwind theme tokens + restyled components** as a drop-in PR/branch against
`feat/sessions-observatory` (so it merges into the live app). A Figma mock and/or new component
variants are also welcome. See `redesign-brief.md` → "How to hand back."

## Screenshots (TODO before handing over)
This package is text-complete but needs visuals. Capture from the running Murmur app (light +
dark) and drop into [`screenshots/`](screenshots/): the Sessions dashboard, an open chat drawer
(with the mic), Overview, and the 4 onboarding screens (Welcome / Accessibility / Model / Finish).
The exact list is in `redesign-brief.md` → "Screenshots to capture."

## Source of truth
The app lives at `~/Dev/strat` (branch `feat/sessions-observatory`). The product spec +
3-phase roadmap: `~/Dev/strat/docs/superpowers/specs/2026-06-23-sessions-observatory-design.md`.
