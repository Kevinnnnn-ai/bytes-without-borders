# Bytes Without Borders — "Max Postal, Grand Théâtre" Visual Design

**Date:** 2026-07-19
**Status:** Approved by user
**Scope:** Site-wide maximal visual enhancement — ambient background system, gradient
typography, postal set-pieces, interactive physics, quiz celebration, cross-page
transitions. No content, structure, or i18n changes.

## Purpose

Push the existing "modern postal" identity to theatrical extremes: over-the-top
animation, animated gradients, gradient text, and postal set-pieces — while preserving
every project guardrail (no external requests, no build step, progressive enhancement,
reduced-motion respect, AA contrast, green pytest suite).

## Decisions (user-confirmed)

| Decision | Choice |
|---|---|
| Direction | **Max Postal** — deepen the airmail/stamp identity, existing palette |
| Scope | **Site-wide, tiered** — home = full spectacle; hub/quizzes = interactive juice; lessons = calm tier |
| Engine | **Hybrid** — CSS-first ambient layer + one new self-hosted `docs/js/theatre.js` for the JS-only set-pieces |

## Tiering

| Tier | Pages | Treatment |
|---|---|---|
| Spectacle | `index.html` | Envelope hero, flight path, marquee proof strip, 3D postcards, ghost watermarks |
| Juice | `lessons/index.html`, 3 quiz pages | Card tilt/glare/postmark, magnetic filter chips, stamp-confetti, count-up score |
| Calm | 9 articles (+2 `es/` copies), about, get-involved, 404 | Gradient-ink `h1`, topic-tinted aurora, magnetic share/to-top; prose untouched |
| Everywhere | all 19 pages | Aurora 2.0, paper grain, torn edges, gradient ink, view transitions |

## Design

### 1 · Tokens & palette evolution
- Palette unchanged: indigo `#4f46e5`, coral `#f0654f`, amber/emerald topic accents.
- New `:root` tokens: `--ink-gradient` (indigo→coral→amber linear pan),
  `--grain` (inline SVG `feTurbulence` data-URI), `--glow` (color-mix shadow for dark).
- Dark scheme becomes "night flight": same tokens plus soft glow text-shadow on
  gradient ink and a slightly brighter aurora (`--blob-alpha` up).

### 2 · Ambient layer (all pages, pure CSS)
- **Aurora 2.0**: `body::before` adds a conic mesh-gradient layer over the existing
  radials and a ~90s `hue-rotate` drift. On lesson pages the aurora tints toward the
  page's topic color via `body:has(main[data-topic="…"])` (the attribute lives on
  `<main>`; `:has()` needs no markup change and old browsers keep the default aurora).
- **Paper grain**: `--grain` tiled across `body::before` as an extra background layer,
  ~4% opacity, `multiply` in light / `overlay` in dark.
- **Gradient ink**: all `h1` + home `.section-title` get animated
  `background-clip: text` gradient (8s background-position pan). Guarded by
  `@supports (-webkit-background-clip: text)`; fallback is today's solid ink.
- **Ghost watermarks**: home sections get oversized outline words (`PRIVACY`,
  `LITERACY`, `INCLUSION`) as `::before` pseudo-content, `-webkit-text-stroke`,
  ~5% opacity, drifting via scroll-driven `animation-timeline: view()`.
- **Torn-paper edges**: repeating-triangle CSS `mask` on `.band` top/bottom and the
  footer's top edge.

### 3 · Home set-pieces (spectacle tier)
- **Envelope hero**: hero content becomes a letter rising out of a decorative SVG
  envelope on load (CSS keyframes scoped to `html.js`; no-JS and reduced-motion see
  the composed final state — letter out, envelope behind).
- **Flight path**: an absolute SVG dashed route across the page, drawn on scroll via
  `stroke-dashoffset` with `animation-timeline: scroll()`; a small plane rides it via
  `offset-path: path(...)` on the same timeline. `min-width: 46em` only, `aria-hidden`.
- **Marquee proof strip**: the three `.stamp` chips loop as a slow infinite marquee
  (content duplicated once, duplicate `aria-hidden="true"`; pauses on hover/focus).
- **3D postcards** (shared with hub): pointer-tracked tilt ±8° + glare sheen following
  the cursor (JS writes `--rx/--ry/--mx/--my`; CSS renders) + a rubber postmark SVG
  that stamps in on hover with overshoot easing (pure CSS).

### 4 · Hub & quizzes (juice tier)
- Hub postcards inherit tilt/glare/postmark; `.filter-btn` chips get magnetic pull
  (translate toward cursor inside a small radius, spring back on leave).
- Quiz:
  - correct answer → **stamp-confetti burst** from the chosen button (canvas layer
    created on demand, ~100 stamp/envelope-shaped particles in topic colors, canvas
    removed when settled);
  - `.quiz-bar-fill` becomes marching airmail stripes;
  - score screen: number counts up in giant gradient ink, then a "DELIVERED"
    postmark stamps in.
- Coupling: `quiz.js` dispatches `bwb:quiz:correct` and `bwb:quiz:done` CustomEvents
  (with the source element in `detail`); `theatre.js` subscribes if loaded. `quiz.js`
  never references theatre directly.

### 5 · Lessons (calm tier)
- Gradient-ink `h1`, topic-tinted aurora via `body:has(main[data-topic])`,
  magnetic share/back-to-top buttons. The prose column is not touched.

### 6 · Cross-document view transitions (all pages)
- `@view-transition { navigation: auto; }` plus named pairs:
  `.brand` persists; hub card `h2 a` ↔ article `h1` morph; `main` cross-fades.
- Pure CSS, works on a static MPA, no build step. Unsupported browsers navigate
  normally; disabled under `prefers-reduced-motion`.

### 7 · `docs/js/theatre.js` (the one new file)
- Deferred, dependency-free, ~250 lines. Modules: **tilt**, **magnet**, **confetti**,
  **countup**. Each bails early when its guard fails:
  - global: `prefers-reduced-motion: reduce` → no-op module registry;
  - tilt/magnet: require `(pointer: fine)` and `min-width: 46em`;
  - confetti: requires canvas; caps particles; removes its canvas after the burst.
- rAF-driven, passive listeners, no layout reads in the pointer handlers (cached rects).
- JS styles only via CSSOM `style.setProperty` (custom props) — permitted under the
  existing `style-src 'self'` CSP; **no** `setAttribute("style", …)`.
- Loaded with `<script src="./js/theatre.js" defer>` (path-adjusted per depth) on all
  19 pages. External file ⇒ no CSP hash changes from the script tag itself; hashes are
  regenerated (`tests/tools/update_head_meta.py`) only if an inline script changes.

### 8 · Guardrails (unchanged invariants)
- Zero external requests; no build step; every page fully readable with JS off.
- `prefers-reduced-motion`: the existing global kill switch
  (`* { animation/transition: none !important }`) covers all new CSS; `theatre.js`
  additionally self-disables. Result: today's calm site.
- Print: new chrome (aurora layers, watermarks, flight path, marquee, postmarks)
  added to the existing print-strip block.
- AA contrast: every gradient-ink stop ≥ 4.5:1 against paper in both schemes
  (light scheme uses `--indigo`/`--coral-text`-range stops, not raw coral).
- Heavy effects gated to `min-width: 46em`, matching today's aurora rationale
  (backdrop-blur re-render cost on mobile GPUs).

## Error handling

- Every effect is additive: removal of `theatre.js` or an unsupported CSS feature
  leaves the current (already-shipped) design intact — `@supports` guards on
  `background-clip: text`, `animation-timeline`, `offset-path`, `@view-transition`.
- Confetti wraps its canvas work in try/catch and removes the canvas on any error.
- CustomEvents fire regardless of listeners; no coupling failure mode.

## Testing (per AGENTS.md)

- Full pytest suite stays green (`python -m pytest tests -q`, 34 tests).
- Suite additions:
  - every page references `js/theatre.js` exactly once with a depth-correct path;
  - no new external URLs introduced in `docs/` (self-containment check, if not
    already covered);
  - CSP hash drift check (existing `test_head_security_meta`) after any inline edit.
- Manual verification: Playwright pass over home/hub/quiz/article in light + dark,
  desktop + 375px mobile, plus a reduced-motion run showing the calm fallback.
- Artifacts to `stdout/`; cleaned up after runs.

## Out of scope (YAGNI)

- New pages, content, or i18n keys beyond what set-pieces need (decorative elements
  are `aria-hidden` and text-free where possible; any visible new string gets a
  `data-i18n` key in both locales).
- Canvas scene-graph / persistent particle background (rejected as approach C).
- Cursor-replacement effects, sound, third-party libraries.
- Lesson prose redesign.

## Success criteria

- Home reads as a theatrical postal showpiece; hub/quizzes feel physically playful;
  articles stay calm and readable; all 19 pages share the ambient system.
- JS-off, reduced-motion, and print each degrade to (at least) today's experience.
- No external requests in DevTools network panel on any page.
- `python -m pytest tests -q` passes, including the new theatre.js reference test.
