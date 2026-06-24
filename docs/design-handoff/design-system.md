# Design System (current)

This section documents the **actual** tokens and conventions in the Murmur codebase as of the current `cleanup/brain-optimization` working tree. Everything below was extracted from real files — primarily `src/App.css` (the project's only global stylesheet; there is no `index.css`), `tailwind.config.js`, `src/overlay/RecordingOverlay.css`, and component source. Where the code is inconsistent (hardcoded hex vs. tokens, undocumented scales, dead/commented values), it is flagged explicitly. This is the raw material Claude Design should **formalize and extend** into a real system.

The app is Tailwind **v4** (`@import "tailwindcss"` + `@theme {}` in `src/App.css`) with a **v3-style `tailwind.config.js` shim** that re-exposes the same tokens under `theme.extend.colors`. Both must be kept in sync by hand today — that duplication is itself a gap (see Inconsistencies).

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
