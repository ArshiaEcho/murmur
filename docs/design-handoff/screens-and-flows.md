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
