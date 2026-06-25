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
