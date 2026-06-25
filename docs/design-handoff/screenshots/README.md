# Screenshots

Real captures of the running Murmur app (v0.9.0), window sized to 1280×860, **both light and dark**. These are the highest-leverage input to Claude Design — feed them alongside the docs.

## Captured (22 — all 9 sidebar sections + 2 onboarding screens, ×light/dark)
| screen | files |
|---|---|
| Overview / home | `overview-{dark,light}.png` |
| General settings | `general-{dark,light}.png` |
| Models (transcription) | `models-{dark,light}.png` |
| Read Aloud | `readaloud-{dark,light}.png` |
| **Sessions dashboard (populated, live)** | `sessions-dashboard-{dark,light}.png` |
| Advanced | `advanced-{dark,light}.png` |
| History | `history-{dark,light}.png` |
| Post Process | `postprocessing-{dark,light}.png` |
| About | `about-{dark,light}.png` |
| Onboarding — Welcome | `onboarding-welcome-{dark,light}.png` |
| Onboarding — Model pick | `onboarding-model-{dark,light}.png` |

The Sessions shots are the **live, populated** dashboard (multiple real Claude Code sessions, mixed statuses, color-coded tiles) — the flagship surface.

## Still to capture (need live interaction — quickest by hand)
These couldn't be automated: Murmur's WebView doesn't expose its DOM to macOS accessibility, so only the full-width sidebar responds to synthetic clicks — the smaller in-content controls (session rows, the Options button, the swatch dots) don't, and the dashboard reshuffles live. They're fast to grab manually:

1. Open the app on **Sessions**, click a session tile to open the **right-side drawer**.
2. Use **Cmd-Shift-4 → Space → click the Murmur window** for each (saves a clean window PNG to the Desktop), or run `screencapture -o -w out.png`.

Capture, ideally in both themes (toggle macOS appearance). Step-by-step recipe with exact clicks: see [`MANUAL-CAPTURE-GUIDE.md`](MANUAL-CAPTURE-GUIDE.md).
- `sessions-drawer-{dark,light}` — a session open in the drawer (summary + transcript + Ask box + mic).
- `sessions-mic-listening` — mic mid-listening (red pulse) · `sessions-mic-transcribing` — spinner.
- `swatch-open` — a project tile's color picker open.
- `options-popover-open` — the top-right "Options" menu open.
- `overlay` — the floating recording overlay (press the dictation hotkey to show it).
- `onboarding-accessibility` — the macOS permissions step (only shows when a permission is NOT granted).
- `onboarding-finish` — the final tips screen (shows after completing a model download in first-run).

## Tooling
The automated kit that produced the 18 captures lives at `~/Dev/strat/scripts/shots/` (`cap.sh`, `click.swift`, `winlist.swift`, `RUNBOOK.md`). Re-run any section: `source ~/Dev/strat/scripts/shots/cap.sh && permcheck && setwin`, then `theme dark|light`, navigate, `shot <name>`.
