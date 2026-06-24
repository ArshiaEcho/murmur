# Murmur screenshot capture — RUNBOOK (for the next session)

**Why this exists:** the design-handoff package needs real screenshots (highest-leverage input to Claude Design). They couldn't be captured on 2026-06-23 because the host app (VS Code) lacked **Screen Recording** permission and capture needs a relaunch to take effect. Arshia agreed to grant it. This runbook makes the capture turnkey.

## Preconditions
1. **Screen Recording** granted to *Visual Studio Code* (System Settings → Privacy & Security → Screen Recording) AND VS Code relaunched. Verify first: `source ~/Dev/strat/scripts/shots/cap.sh && permcheck` → must say OK.
2. **Accessibility** already granted (window resize/click works).
3. Murmur running (`/Applications/Murmur.app`; relaunch if needed). Process name in System Events = `handy`; CGWindow owner shows as `Murmur`.

## Helpers (`source ~/Dev/strat/scripts/shots/cap.sh`)
- `permcheck` — confirm Screen Recording works.
- `setwin` — front + move to **(100,33) size 1280×860** on the primary display (all coords below assume this).
- `theme light|dark` — set macOS appearance (app follows `prefers-color-scheme`).
- `click X Y` — synthetic click at global coords (Swift CGEvent; ~0.7s settle).
- `shot NAME` — capture the Murmur window (no shadow) → `docs/design-handoff/screenshots/NAME.png`.
- `winid` — print the Murmur CGWindow id.

## The method (DON'T fly blind — calibrate first)
The WebView exposes **no DOM to accessibility**, so navigation is coordinate clicks and you cannot self-verify without looking. So:
1. `setwin`, then `theme dark`, then `shot _cal-overview` and **Read the PNG**.
2. From that image, read the actual pixel Y of each sidebar row (rows are full-width in the left **160px** sidebar; click X≈**170**). Correct the estimates below if needed.
3. Then loop: `click 170 <Y>` → `shot <name>` for each section. Re-`shot` and Read periodically to confirm you're on the right screen.
4. Repeat the whole loop after `theme light`.

## Sidebar nav map (order is fixed; current flags: debug OFF, postprocessing ON → 9 rows)
Estimated Y at geometry (100,33)/1280×860, rows start ~y=143, pitch ~44, click X=170:
| section | est. Y | filename (capture in BOTH themes) |
|---|---|---|
| overview | 163 | `overview-{dark,light}` |
| general | 207 | `general-{dark,light}` |
| models | 251 | `models-{dark,light}` |
| readAloud | 295 | `readaloud-{dark,light}` |
| sessions | 339 | `sessions-empty-{dark,light}` (empty unless live sessions exist) |
| advanced | 383 | `advanced-{dark,light}` |
| history | 427 | `history-{dark,light}` |
| postprocessing | 471 | `postprocessing-{dark,light}` |
| about | 515 | `about-{dark,light}` |

To also show **debug** + the full sidebar: enable debug via the in-app hotkey **⌘/Ctrl+Shift+D** (or set `settings.debug_mode=true` in the store while app is quit), then capture `sidebar-full-{dark,light}` and `debug-{dark,light}`. Debug inserts a row before `about` (about shifts down ~+44).

## Recording overlay (capturable without live sessions)
Trigger dictation so the floating overlay window appears, then capture it by its own window id:
- Start the app's dictation hotkey (push-to-talk) or call the in-app mic. The overlay is a separate NSPanel window — re-run `winid`/`winlist.swift` to find the overlay window id (it'll be a small ~172×36 window, owner Murmur) and `screencapture -o -l <thatId> overlay-{dark,light}.png`. The `-o`/no-shadow flag matters (it's transparent).

## Onboarding (the tricky one — needs runtime-state, not a stored flag)
There is **no persisted `onboarding_done` flag**; App.tsx derives the step from runtime state (`welcome → accessibility → model → finish → done`, returning users skip). Options, in order of cleanliness:
1. Read `~/Dev/strat/src/App.tsx` to find the exact gate, then drive the app into each step (e.g. temporarily move the models out of `~/Library/Application Support/com.stratos.strat/models/` so it shows the model-pick step — **back them up first, restore after**).
2. Or run a throwaway `bun tauri dev` build pointed at a clean data dir if feasible.
3. Filenames: `onboarding-welcome`, `onboarding-accessibility`, `onboarding-model`, `onboarding-finish` (dark at minimum; light if quick).
**Always back up `settings_store.json` + `models/` before touching, and restore after.**

## Still needs Arshia to stage (can't fabricate)
- **Populated Sessions** (mixed working/needs-you/idle, a few custom colors), the **open drawer** with a real transcript + summary, and **mic mid-listening / transcribing**: these need real Claude Code sessions running. Ask Arshia to start 2–3 Claude Code sessions in different repos, then capture `sessions-dashboard-{dark,light}`, `sessions-drawer-{dark,light}`, `sessions-mic-listening`, `sessions-mic-transcribing`, `swatch-open`, `options-popover-open`.

## Cleanup
- Delete any `_cal-*` calibration shots.
- Restore original macOS appearance (Arshia was in **Dark**).
- Restore `debug_mode` to false if you flipped it; restore moved models/settings.
- Restore the window to its prior size if desired (it was 2560×1410 on a second display before this session resized it to 1280×860).
