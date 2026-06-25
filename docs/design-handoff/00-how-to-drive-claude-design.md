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
