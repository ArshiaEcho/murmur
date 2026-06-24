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
