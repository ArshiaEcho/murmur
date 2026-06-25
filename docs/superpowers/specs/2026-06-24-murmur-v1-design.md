# Murmur V1 — design + plan

Date: 2026-06-24. Owner: Arshia. Builds on the VoiceBox UI adoption
(`docs/2026-06-24-voicebox-ui-adoption.md`) and feature catalog
(`docs/2026-06-24-voicebox-feature-catalog.md`).

**Goal:** ship a polished, downloadable **V1.0** of Murmur (Stratos House's
voice layer for Claude Code) and fast-follow the deep features via auto-update.

## Locked decisions
- **Phased release.** V1.0 = UI/polish + onboarding + the solid/quick features +
  landing + notarized download. Deep backend features auto-update as V1.1 / V1.2.
- **Distribution:** signed + Apple-**notarized** `.dmg` on **GitHub Releases**;
  Tauri auto-updater wired; landing Download button points at the latest asset.
  Notarization creds: `~/Dev/strat/.env.notarize.local`.
- **Landing:** `murmur.stratosagency.ai` on Vercel (Arshia delegated DNS to me).
- **Repo:** keep private `github.com/ArshiaEcho/murmur`.
- **Branch:** continue on `design/elevation-pass` (rename/PR at release).
- **Group C dropped.**

## UX quality bar — "absolutely perfect, buttery-smooth" (Arshia, hard requirement)
Cross-cutting, applies to every surface, plus a final dedicated QA pass:
- **One easing language.** Use the existing `--ease-out-quint` / `--ease-io` tokens
  everywhere; no ad-hoc cubic-beziers. Standard durations: 120ms (hover/press),
  180–220ms (panel/drawer/sidebar), 300ms (drawer slide).
- **Animate only cheap properties** (transform, opacity, and width where already
  in use). Avoid animating layout-affecting properties that cause reflow jank.
- **No layout jank / content jumps.** Hover-peek sidebar overlays (doesn't push
  content); fixed-height regions scroll internally; skeletons reserve space.
- **Respect `prefers-reduced-motion`** (the global block in App.css already kills
  animation; verify new motion honors it).
- **60fps target**, GPU-friendly transforms, `will-change` only where it pays.
- **Consistent focus rings, hover states, and active states** on every interactive
  element; pointer cursors; no dead clicks.
- Final QA: drive each surface and confirm transitions are smooth, nothing flashes,
  nothing reflows on hover, theme/sidebar/drawer toggles are fluid.

## Non-negotiable constraints (from STATE + prior learnings)
- Theme/UI prefs stay **frontend-only** (localStorage), never through `bindings.ts`
  (specta regen breaks tsc).
- New Rust commands DO touch `bindings.ts` via specta on a debug build — back up
  `src/bindings.ts` before `bun tauri dev`; the committed copy is canonical.
- Build gate: `bun run build` (tsc && vite build) green + `bunx eslint <changed>` clean.
- No em dashes in product copy where the brand voice matters (vault rule is for the vault; app copy can use normal punctuation).
- Preserve the Sessions tree layout. Gold `--signal` = primary, teal `--live` = live/recording.

---

# Wave 1 — V1.0 (release-blocking)

## 1. App icon fix ("?" in dock)
The dev/installed app shows a `?` icon. Diagnose: check `src-tauri/tauri.conf.json`
`bundle.icon` list and whether `src-tauri/icons/icon.icns` + `icon.ico` + the PNG
set exist and are valid (a `?` = macOS couldn't load a valid `.icns`). Fix by
regenerating the full icon set from a 1024² master of the **Stratos House** mark
via `bun tauri icon <master.png>` (or the repo's `scripts/update-icons.sh` if
present), then confirm `tauri.conf.json` references them. Verify the dock icon in
a fresh `bun tauri dev`.

## 2. Real Stratos House logo
The rail uses the stylized nested-diamond `BrandMark` in `Sidebar.tsx`. Replace
with the **actual** Stratos House logo. Source: `src/assets/strat-logo.png` (repo)
/ the canonical `stratos-logo.png` used across vault client docs. Prefer an SVG
(crisp + theme-tintable); if only PNG exists, use the highest-res and request/derive
an SVG later. Keep the dark-mode gold glow (`.sidebar-logo`). The logo also feeds
the app icon (item 1) and the landing page.

## 3. Collapsible + lockable sidebar (icons + text)
Today the rail is icon-only (60px). New behavior:
- **Expanded** (default): ~212px, icon **+ text label** per nav row (the pre-existing
  labeled style), brand lockup with wordmark on top.
- **Collapsed:** the 60px icon rail (current look), labels via tooltip.
- **Toggle:** a collapse/expand control at the rail top or bottom (chevron). 
- **Lock/pin:** when locked, the chosen state is sticky; when unlocked, the rail can
  auto-collapse (hover-to-expand optional, V1.1). V1.0: a persisted expanded/collapsed
  state + a lock toggle that prevents accidental collapse.
- **Persistence:** `localStorage` (`murmur-sidebar` = `{expanded, locked}`), same
  pattern as the theme store. New `src/stores/sidebarStore.ts`.
- Content area shifts with the rail width; sessions tree + settings unaffected.

## 4. Features (solid/quick)
Brief specs; detailed rationale in the feature catalog.

- **A4 — LLM transcript refinement flags.** Murmur already has post-processing +
  an LLM client. Add refine *flags* (remove fillers, remove self-corrections,
  preserve technical terms) and keep raw + refined. Mostly a settings + prompt
  addition; reuse existing provider plumbing. Effort S.
- **A5 — target-aware paste hardening.** Snapshot the focused element at capture
  start; consume-once on paste so a late refine can't paste after focus moved.
  Touches Rust `output.rs`/`actions.rs`. Effort S–M.
- **A6 — permission gate + readiness checklist.** Add an Input-Monitoring gate
  alongside the existing accessibility gate, plus a "dictation readiness" checklist
  that disables Dictate when prerequisites are unmet. Frontend + macos-permissions
  API. Effort S.
- **A7 — per-agent voice binding + last_seen_at.** `AppSettings` already has
  `session_voices`. Extend to a per-agent/project binding table with resolution
  (explicit → per-agent → global) and a `last_seen_at` confirmation. Settings UI in
  the Sessions/Read-Aloud area. Effort M (touches Rust settings + bindings).
- **A9 — captures library.** Upgrade `history/` into a searchable captures view:
  replay, re-transcribe at higher quality, re-refine, inline edit, export txt/md,
  "play as voice". Reuses existing TTS + history store. Effort M.
- **B6 — chunk + crossfade long-form Read-Aloud.** Murmur already sentence-chunks;
  add a smarter splitter (abbrev/CJK/tag-aware) + crossfade between chunks +
  configurable chunk limit. Rust `tts.rs` pipeline. Effort S–M.
- **B9 — in-app logs + changelog pages.** A Logs viewer (tail `handy.log`) and a
  Changelog page (render bundled CHANGELOG). New settings sections. Effort S.

## 5. Polish
- Onboarding pass (restyle to the new tokens, ensure light-first, the new logo).
- Light-mode shadow/spacing polish using `--shadow*`.
- Toaster/empty-states/focus-ring audit.

## 6. Release engineering
- `tauri.conf.json`: version → `1.0.0`, updater endpoint (GitHub Releases
  `latest.json`), bundle config.
- Build signed + notarized `.dmg` (creds from `.env.notarize.local`); `ditto`/staple.
- GitHub Release on `ArshiaEcho/murmur` with the DMG + `latest.json` for the updater.
- Auto-updater plugin already in deps (`@tauri-apps/plugin-updater`); wire endpoint + pubkey.

## 7. Landing page — murmur.stratosagency.ai
- Vite/Next static landing (lift Murmur's tokens for brand consistency): hero with
  the product line, the both-theme screenshots, feature highlights, a single
  **Download for macOS** button → latest GitHub Release DMG, and a "what is Murmur"
  section. Deploy to a new Vercel project; wire the `murmur` subdomain + CNAME.
- Keep it one page, fast, on-brand (gold/teal, Stratos House logo).

## 8. Review + tests (gate before publishing V1.0)
- `bun run build` green, eslint clean, translations check.
- Playwright smoke (the repo has `test:playwright`).
- Live `bun tauri dev` smoke: theme toggle persists, sidebar collapse/lock persists,
  icon correct, logo correct, each new feature exercised once.
- Multi-agent review pass on the diff (correctness + silent-failure + type design).

---

# Wave 2 — V1.1 (fast-follow, auto-update)
- **A1/A2 unified bidirectional pill** — one overlay state machine (recording /
  transcribing / refining / speaking / done / error) for dictation AND agent speech,
  with show-on-play + stale-cycle guards.
- **A3 rebindable chord picker** — PTT + tap-toggle, hold→toggle upgrade.
- **A10 async speak queue + crash recovery** — serial exec, live status, retry,
  auto-recover stale tasks on startup; the engine behind the Sessions Control Center.
- **B8 re-transcribe** at higher Whisper quality.

# Wave 3 — V1.2
- **A8 expose Murmur TTS as an MCP `speak` tool** (+ optional `transcribe`) so agents
  voice themselves — turns Murmur bidirectional.
- **B3 voice personas** — persona prompt rewrites text before TTS, per voice/agent.

---

## Execution order (Wave 1)
1. App icon fix + real logo (visible wins; dev server hot-reloads). 
2. Collapsible/lockable sidebar.
3. B9 logs/changelog (cheap), A6 readiness gate, A4 refinement flags (frontend-leaning).
4. B6 chunk+crossfade, A5 paste hardening (Rust).
5. A7 per-agent voice binding, A9 captures library (bigger).
6. Onboarding + light polish.
7. Review + tests.
8. Release (notarized DMG + GitHub Release + updater).
9. Landing page + subdomain.

Each step: keep build green, lint clean, commit logically. Push + release only in
steps 8–9.
