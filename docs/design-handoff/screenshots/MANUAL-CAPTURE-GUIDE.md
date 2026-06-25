# Manual capture guide — the last few shots

22 screenshots are already captured (all sections + Welcome + Model onboarding, light & dark). These last 6 couldn't be automated (Murmur's WebView doesn't expose its DOM to macOS accessibility, so synthetic clicks can't reliably hit small in-content controls, and the live dashboard reshuffles). For a human they're ~5 minutes total.

## How to capture any window cleanly
Press **Cmd-Shift-4 → Space → click the Murmur window**. macOS saves a clean PNG (with rounded corners) to your Desktop. Then move/rename it into this `screenshots/` folder with the filename listed below.
To get both themes, toggle **System Settings → Appearance → Light/Dark** (or Control Center) and re-capture.

## The shots

### 1–4. The Sessions hero (most important)
Open Murmur, click **Sessions**, then **click a project tile/session row** to open the right-side drawer.
- `sessions-drawer-dark.png` / `sessions-drawer-light.png` — drawer open showing the summary block, a multi-turn transcript (Agent + You), and the Ask box with the mic button.
- `sessions-mic-listening.png` — in the drawer, **press and hold** the mic (push-to-talk) so it turns red/pulsing, capture mid-hold.
- `sessions-mic-transcribing.png` — release the mic; capture the brief "transcribing" spinner state (have the screenshot crosshair ready before releasing).

### 5. Popovers (quick)
- `swatch-open.png` — on a project tile, click the small **color dot** to open the swatch color picker; capture with it open.
- `options-popover-open.png` — click **Options** (top-right of Sessions) to open the menu (Rolling summaries / Voice alerts / Show background); capture with it open.

### 6. Recording overlay
- `overlay.png` — trigger dictation with your hotkey (the floating mic-level bar appears, by default near the bottom of the screen). Capture it with **Cmd-Shift-4 → Space** and click the little overlay window. (It's small and transparent — that's correct.)

## Optional (lower priority — need special states)
- `onboarding-accessibility.png` — only appears when a permission is **missing**. To force it: System Settings → Privacy & Security → **Accessibility**, toggle Murmur OFF, relaunch Murmur → the accessibility step shows → capture → toggle it back ON. (Skip unless you want full onboarding coverage.)
- `onboarding-finish.png` — the final tips screen, shown only after completing a model download during a true first run. Lower design value; skip unless convenient.

That's everything. Once these land here, the package is 100% visually complete for Claude Design.
