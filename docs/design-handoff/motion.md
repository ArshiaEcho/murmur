# Motion language

The brief lists motion *moments*; this maps each to a token + duration + property, so motion is a deliberate system, not ad-hoc `transition-colors`. **Temperature: calm and quiet** — motion confirms, it doesn't perform. When in doubt, less and slower-out.

**Tokens** (today these live only in `src/App.css` and are unreachable from Tailwind utilities — **expose them as Tailwind `transitionTimingFunction` tokens** so components can use brand easing):
- `--ease-out-quint` = `cubic-bezier(0.22, 1, 0.36, 1)` — entrances, hovers (the default "out" curve)
- `--ease-io` = `cubic-bezier(0.45, 0, 0.55, 1)` — symmetrical moves, ambient loops
- Durations: **fast 150ms · base 200ms · slow 300ms**
- **Animate `transform` and `opacity` only** (WKWebView compositing; never animate layout/`width`/`height` on large surfaces).

| Interaction | Property | Duration | Easing | Notes |
|---|---|---|---|---|
| **Drawer open** | `translateX` + opacity | 300ms | `ease-out-quint` | slide from right; content fades in slightly behind the slide |
| **Drawer close** | `translateX` + opacity | 200ms | `ease-io` | faster out than in |
| **Tile hover** | `transform: translateY(-1px)` + `--elev-2`→`--elev-3` | 120ms | `ease-out-quint` | matches existing button hover (App.css) |
| **Status change** (working↔needs-you↔idle) | dot color + a one-shot pulse on change | 200ms color, 1 pulse | `ease-io` | **define from scratch** — no animation today. needs-you dot keeps its standing `animate-pulse`; the *transition into* needs-you gets a single attention pulse, not a loop |
| **Mic idle→listening** | scale + color to red, then steady `animate-pulse` | 150ms in | `ease-out-quint` | confident, not bouncy; the standing pulse is the listening state |
| **Mic listening→transcribing** | red→accent + swap pulse for spinner | 150ms | `ease-io` | clear hand-off; no flicker |
| **Summary / answer reveal** | opacity 0→1 + `translateY(4px→0)` | 200ms | `ease-out-quint` | **define from scratch** — gentle settle, not a slide |
| **Popover open** (swatch / options) | opacity + `scale(0.98→1)` from trigger origin | 150ms | `ease-out-quint` | transform-origin at the trigger; close = 100ms fade |
| **Toast (sonner)** | default sonner slide | — | — | keep library default; just theme it |
| **Brand mark ambient** | existing `sx-breathe` / `sx-glow` | 3.2s loop | `ease-io` | the "murmur" pulse; only when sessions are live; already in App.css |

## Rules
- **Honor `prefers-reduced-motion: reduce`** — the App.css block exists; extend it to the **new** motions too (drawer = instant; status pulse = none; reveals = instant opacity; mic = color change only; ambient brand pulse = off).
- **No stagger** beyond ~30ms between siblings; this is a calm tool, not a showcase.
- **Don't animate on data refresh.** Sessions polls (`sessions-update`, every ~2.5s); list re-renders must not re-trigger entrance animations or the dashboard will twitch.
