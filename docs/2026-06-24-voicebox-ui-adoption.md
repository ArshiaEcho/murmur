# Murmur × VoiceBox UI adoption (2026-06-24, overnight autonomous pass)

Arshia: "fully adopt their UI with a touch of us and Handy… prioritize light mode +
a light/dark toggle… I still really like how we laid out the sessions." This pass
adopts VoiceBox's look on Murmur's existing React/Tailwind-v4 codebase, **not** a
rewrite. Build is green (`bun run build`) and lint-clean on changed files.

## What VoiceBox's look actually is
Clean near-grayscale surfaces + a single warm **gold** accent used *sparingly*
(pill primary buttons, active nav, selected states), globally hidden scrollbars,
~0.5rem radius, a narrow left **icon rail** with a glowing gold logo, a right
history panel, and a persistent bottom audio transport. Restraint with the accent
is why it reads premium.

## Decisions (made autonomously — all reversible)

1. **Re-value token NAMES, don't rename classes.** Murmur's ~30 files use
   `bg-bg` / `text-text-2` / `border-line` / `text-signal`. Changing the *values*
   of those tokens in `src/App.css` reskins the whole app for free. This is why
   most primitives needed no edit.

2. **`--signal` = gold (primary accent, app-wide). Teal becomes `--live`.**
   VoiceBox uses one gold accent everywhere, so gold-as-signal is the *faithful*
   adoption, not a compromise. Murmur's teal survives as a dedicated `--live`
   token used only for **live/recording/streaming session indicators** — the
   "touch of us", and it's exactly in the Sessions feature Arshia said he loves.
   - **One-line flip back to teal-primary** if he prefers: in `src/App.css` set
     `--signal` (light + dark) back to the teal values and `--live` to gold. Or
     swap the two. Everything follows.

3. **`--on-signal` is DARK, not white.** (Overrode the research spec, which copied
   VoiceBox's `accent-foreground: white`.) White on gold `#C49433` is ~2.1:1
   contrast (fails WCAG); dark text is ~6.7:1 and matches what VoiceBox's
   screenshots actually show on the gold pills.

4. **Class-based theming, light default, no OS auto-dark.** Converted App.css from
   `@media (prefers-color-scheme: dark)` to `:root.dark`. Default `:root` = light;
   the `.dark` class on `<html>` flips it. (Overrode the spec's OS-fallback branch:
   Arshia said *prioritize light*, so a hard light default regardless of OS is
   truer and simpler.)

5. **Theme is frontend-only (localStorage), NOT a Rust/AppSettings field.** A theme
   is a pure UI preference; routing it through `bindings.ts` would trip the
   specta-regen landmine that breaks `tsc`. Persisted at `localStorage["murmur-theme"]`.

6. **Icon rail over the 212px labeled sidebar.** Faithful to VoiceBox; labels move
   to tooltips (`title`). `SECTIONS_CONFIG` and the no-router section model are
   untouched.

## Files changed
- `src/App.css` — token re-value (light + dark), `@media`→`:root.dark`, `--live*`
  tokens + `@theme inline` aliases, dark-mode `.sidebar-logo` gold halo.
- `src/stores/themeStore.ts` *(new)* — localStorage-persisted light/dark, toggles `.dark`.
- `index.html` — anti-FOUC boot script (applies theme before first paint).
- `src/main.tsx` — `applyThemeClass(...)` before render.
- `src/components/ui/ThemeToggle.tsx` *(new)* — icon + labeled variants.
- `src/components/settings/ThemeSetting.tsx` *(new)* — Appearance row (Light/Dark segmented control).
- `src/components/settings/general/GeneralSettings.tsx` — adds the Appearance group.
- `src/components/Sidebar.tsx` — 60px icon rail, gold-glow logo, gold-tint active, rail-footer theme toggle.
- `src/App.tsx` — Toaster re-pointed to current tokens + live theme; root gets `bg-bg text-text`.
- `src/components/ui/Button.tsx` — pill (`rounded-full`), gold `primary`, new teal `live` variant.
- `src/components/ui/Badge.tsx` — new teal `live` variant.
- `src/components/settings/sessions/{SessionsView,SessionTree,StatusIcon}.tsx` — live heartbeat / "working" badge+chip / working ring → teal `--live`.
- `src/i18n/locales/en/translation.json` — `theme.*` strings (en is source; other locales fall back).

## How the theme system works
`index.html` boot script reads `localStorage["murmur-theme"]` and adds `.dark` if
dark (before paint, no flash). `main.tsx` reconciles via `applyThemeClass`. The
`useThemeStore` toggle (rail icon + Appearance segmented control) flips the class +
persists. App.css `:root` (light) / `:root.dark` token sets do the rest.

## Verified
- `bun run build` (tsc && vite build) — green, 1950 modules.
- `bunx eslint <changed files>` — clean.
- Static palette/component preview rendered in both themes via the sandboxed
  Chromium helper (scratchpad `preview.png`): gold/teal split, both themes, active
  states, segmented toggle, logo glow all correct. (Not the live Tauri app — see below.)

## Deferred / not done (be honest)
- **Bottom audio transport (Tier 2).** Read-Aloud/TTS playback is fully Rust-side
  and fire-and-forget — there is **no frontend "now playing" state, progress, or
  pause/stop events**. A transport bar would be dead chrome until the Rust TTS emits
  `tts-playback-{started,progress,stopped}` events + exposes a stop command (which
  touches `bindings.ts` → specta landmine). Spec'd in
  `2026-06-24-voicebox-feature-catalog.md`; build it once those events exist.
- **Right log panel, Tabs/segmented primitive, light-mode shadow polish** — Tier 2.
- **Live Tauri visual check** — not run (would trigger the `bun tauri dev` specta
  regen of `bindings.ts` unattended). Verified via static preview instead. To see
  it live: quit `/Applications/Murmur.app`, back up `src/bindings.ts`, then
  `PATH="$HOME/.cargo/bin:$PATH" bun tauri dev` (per STATE.md).
- Other-locale `theme.*` translations (en only; fall back automatically).

## If Arshia wants changes in the morning
- Prefer teal primary / gold-as-live: swap `--signal` and `--live` values in `App.css`.
- Warmer or cooler light surfaces: tune `--bg`/`--bg-2`/`--card` in the `:root` block.
- Bring back sidebar labels: revert the `Sidebar.tsx` rail to the 212px labeled list (git diff).
