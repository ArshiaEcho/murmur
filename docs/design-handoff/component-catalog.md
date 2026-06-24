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
