# Max Postal "Grand Théâtre" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push the shipped "modern postal" design to theatrical extremes — animated gradient ink, aurora mesh + paper grain, envelope hero, scroll-drawn flight path, 3D postcards with postmarks, magnetic buttons, stamp confetti, and cross-page view transitions — per the approved spec `superpowers/specs/2026-07-19-max-postal-visual-design.md`.

**Architecture:** CSS-first: every ambient effect lives in `docs/css/main.css` behind `@supports`/media guards and degrades to today's design. One new dependency-free file `docs/js/theatre.js` adds the four JS-only effects (tilt, magnet, confetti, count-up) and is loaded by all 19 pages. `quiz.js` talks to it only via `bwb:quiz:*` CustomEvents. No build step, no external requests, no inline-script changes (so no CSP hash churn).

**Tech Stack:** Plain HTML/CSS/ES5-style JS. Python 3.12 + pytest 8.4.1 (validation only, venv `.env.local/`). Modern CSS: `color-mix()`, `:has()`, `background-clip: text`, `animation-timeline`, `offset-path`, `@view-transition`, CSS `mask`.

## Global Constraints

- **No external requests** — every asset self-hosted under `docs/`; new SVGs are real files in `docs/assets/` (NOT `data:` URIs — the CSP is `img-src 'self'`, which blocks `data:` images).
- **No build step** — files in `docs/` are the site; shared chrome is duplicated per page.
- **Progressive enhancement** — every page fully readable/navigable with JS off; JS-revealed chrome stays scoped to `html.js`.
- **Reduced motion** — the existing global kill switch (`main.css` `@media (prefers-reduced-motion: reduce)`) must neutralize every new effect; `theatre.js` additionally self-disables.
- **AA contrast** — gradient-ink stops only from AA-safe tokens: `--indigo`, `--coral-text`, `--topic-literacy` (never raw `--coral` in light scheme).
- **CSP** — `script-src 'self' + sha256` per page. Never add/edit an inline `<script>`; if you must, run `python tests\tools\update_head_meta.py` after. JS may set styles ONLY via CSSOM (`element.style.setProperty(...)`), never `setAttribute("style", ...)` (blocked by `style-src 'self'`).
- **Heavy effects gate** — animation of full-viewport layers, tilt, magnet: `min-width: 46em` (and `pointer: fine` for pointer physics), matching the shipped aurora rationale.
- **Test suite** — run as `.env.local\Scripts\python.exe -m pytest tests -q` from the repo root. 34 tests before this plan, 36 after Task 2. Never commit red.
- **Preview** — `python -m http.server 8000 -d docs` (or reuse a running server); the server sends no Cache-Control, so HARD-REFRESH (Ctrl+F5) when checking CSS changes.
- **Git** — commit per task with descriptive messages; NEVER push. Work happens on branch `max-postal` (created in Task 1).
- **Copy rules** — any new *visible* string must resolve through i18n (`docs/locales/en.json` + `es.json`, key parity is suite-enforced). Decorative text that screen readers must not see is `aria-hidden` (elements) or `content: attr(x) / ""` (pseudo-elements).

**Magic numbers note:** Envelope/flight-path/watermark geometry values (clamp sizes, SVG path `d`, offsets) are starting points. Visual-check steps may nudge them; everything else (guards, selectors, event contracts, test code) is exact.

---

### Task 1: Branch + checkpoint pre-existing doc edits

The working tree starts dirty with leftover doc edits from prior sessions (`README.md`, `.claude/agent-memory/context.md`, `.claude/agent-memory/decisions.md`, `.claude/skills/draft-a-readme/references/reference-README.md`, `superpowers/architecture.md`). Check them in as their own commit on `main` so every later commit is clean, then branch.

**Files:**
- Modify: none (commits existing state)

**Interfaces:**
- Consumes: nothing
- Produces: branch `max-postal` that all later tasks commit to

- [ ] **Step 1: Inspect what's pending**

Run: `git status --short` and `git diff --stat`
Expected: only the five doc files above (all docs/memory — no `docs/` site files). If a `docs/` site file shows up modified, STOP and report to the user instead of committing it.

- [ ] **Step 2: Checkpoint commit on main**

```powershell
git add README.md .claude/agent-memory/context.md .claude/agent-memory/decisions.md .claude/skills/draft-a-readme/references/reference-README.md superpowers/architecture.md
git commit -m @'
chore: check in pending doc edits from prior sessions

Leftover uncommitted documentation/memory edits (README polish, agent
memory updates, architecture notes) checkpointed as-is so the Max Postal
visual work starts from a clean tree.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

- [ ] **Step 3: Create the feature branch**

Run: `git checkout -b max-postal`
Expected: `Switched to a new branch 'max-postal'`

- [ ] **Step 4: Verify the suite is green before any change**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `34 passed`

---

### Task 2: Suite guards + theatre.js stub wired into all 19 pages (TDD)

**Files:**
- Modify: `tests/test_site.py` (append two tests at end of file)
- Create: `docs/js/theatre.js`
- Modify: all 19 `docs/**/*.html` (one script tag each, via script)

**Interfaces:**
- Consumes: `scan()`, `html_files()`, `SRC`, `SITE_BASE`, `urlsplit` — already in `tests/test_site.py`
- Produces: `docs/js/theatre.js` IIFE with `reduce` and `desktopFine` matchMedia vars that Tasks 6/11/12/13 extend by inserting modules before the closing `})();`; a `<script src="<root>js/theatre.js" defer>` line after `main.js` on every page

- [ ] **Step 1: Write the failing tests** — append to `tests/test_site.py`:

```python
def test_theatre_js_referenced_everywhere():
    """theatre.js is the decorative enhancement layer; every page loads it
    exactly once with a depth-correct relative path so no page (or future
    copied page) silently loses it."""
    assert (SRC / "js" / "theatre.js").is_file(), "docs/js/theatre.js does not exist"
    problems = []
    for path in html_files():
        s = scan(path)
        rel = path.relative_to(SRC)
        root = s.body_attrs.get("data-root", "./")
        refs = [link for link in s.links if link.endswith("js/theatre.js")]
        if len(refs) != 1:
            problems.append(f"{rel}: expected exactly one theatre.js script, found {len(refs)}")
        elif refs[0] != f"{root}js/theatre.js":
            problems.append(f"{rel}: theatre.js src {refs[0]!r} != {root!r} + 'js/theatre.js'")
    assert not problems, "theatre.js reference problems:\n" + "\n".join(problems)


def test_no_external_runtime_requests():
    """The site promises zero external requests at runtime: no http(s) URL
    may appear as an href/src/data-src except SITE_BASE self-references
    (hreflang alternates)."""
    problems = []
    for f in html_files():
        for link in scan(f).links:
            if urlsplit(link).scheme in ("http", "https") and not link.startswith(SITE_BASE):
                problems.append(f"{f.relative_to(SRC)}: {link}")
    assert not problems, "external runtime URLs found:\n" + "\n".join(problems)
```

- [ ] **Step 2: Run to verify the right one fails**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: 1 failed (`test_theatre_js_referenced_everywhere`, "docs/js/theatre.js does not exist"), 35 passed. If `test_no_external_runtime_requests` fails, an external URL already exists — investigate before proceeding.

- [ ] **Step 3: Create the stub** — `docs/js/theatre.js`:

```js
/* Bytes Without Borders — theatre.js: the theatrical enhancement layer.
   Everything here is decorative garnish; every page is complete without
   this file (and without JavaScript entirely). Modules guard themselves:
   reduced motion disables everything, tilt/magnet additionally require a
   fine pointer on a desktop viewport. Styling happens only through CSSOM
   custom properties (style.setProperty) — the CSP forbids style attrs. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var desktopFine = window.matchMedia("(pointer: fine) and (min-width: 46em)");

  /* modules land here in later tasks */
  void reduce; void desktopFine;
})();
```

- [ ] **Step 4: Insert the script tag on all 19 pages** — write this to the scratchpad as `add_theatre_tag.py` and run it from the repo root:

```python
import re
from pathlib import Path

PATTERN = re.compile(r'(<script src="(?P<root>(?:\.\./)+|\./)js/main\.js" defer></script>)')

for page in sorted(Path("docs").rglob("*.html")):
    text = page.read_text(encoding="utf-8")
    if "js/theatre.js" in text:
        continue
    updated, n = PATTERN.subn(
        lambda m: m.group(1) + '\n  <script src="' + m.group("root") + 'js/theatre.js" defer></script>',
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit(f"no main.js script tag found in {page}")
    page.write_text(updated, encoding="utf-8", newline="\n")
print("tagged all pages")
```

Run: `.env.local\Scripts\python.exe <scratchpad>\add_theatre_tag.py`
Expected: `tagged all pages`. Delete the scratch script afterward.
(Load order on quiz pages becomes i18n → main → theatre → quiz; theatre registers its event listeners at eval time, quiz only dispatches on user clicks, so order between theatre and quiz is not load-bearing.)

- [ ] **Step 5: Run the suite**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `36 passed`

- [ ] **Step 6: Commit**

```powershell
git add tests/test_site.py docs/js/theatre.js docs
git commit -m @'
feat: theatre.js stub + suite guards for the theatrical layer

Two new suite invariants: every page references js/theatre.js exactly
once with a depth-correct path, and no page carries an external http(s)
URL outside SITE_BASE. theatre.js ships as a guarded no-op IIFE that
later commits fill with tilt/magnet/confetti/count-up modules.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 3: Tokens, Aurora 2.0, paper grain

**Files:**
- Create: `docs/assets/grain.svg`
- Modify: `docs/css/main.css` (`:root`, dark override, `body::before`, aurora media block, topic-theming section)

**Interfaces:**
- Consumes: existing tokens (`--indigo`, `--coral`, `--topic-*`, `--blob-alpha`)
- Produces: tokens `--aurora-a/-b/-c`, `--ink-gradient` (used by Tasks 4, 12) and `docs/assets/grain.svg`

- [ ] **Step 1: Create `docs/assets/grain.svg`** (black fractal noise at 5% alpha; real file because CSP `img-src 'self'` blocks `data:` images):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
  <filter id="n">
    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0"/>
  </filter>
  <rect width="160" height="160" filter="url(#n)"/>
</svg>
```

- [ ] **Step 2: Add tokens.** In `docs/css/main.css` `:root`, directly under the `--blob-alpha: 0.14;` line, add:

```css
  --aurora-a: var(--indigo);
  --aurora-b: var(--coral);
  --aurora-c: var(--topic-inclusion);
  --ink-gradient: linear-gradient(105deg, var(--indigo) 8%, var(--coral-text) 38%, var(--topic-literacy) 64%, var(--indigo) 92%);
```

(No dark-scheme override needed for these: the gradient re-resolves through the dark token values, which are all AA on dark paper.)

Then, in the existing `@media (prefers-color-scheme: dark)` `:root` override, change `--blob-alpha: 0.1;` to `--blob-alpha: 0.14;` — the spec's "night flight" calls for a slightly brighter dark aurora, and today's dark value sits below the light one.

- [ ] **Step 3: Rebuild the aurora.** Replace the whole `body::before` rule (the "ambient aurora" block) with:

```css
/* ambient aurora — postal-colored mesh (radials + a conic wash) under
   tiled paper grain. --aurora-a/-b/-c let topic pages retint the whole
   sky without new gradients. Grain is a real SVG file: CSP img-src
   'self' would block a data: URI. */
body::before {
  content: "";
  position: fixed;
  inset: -25%;
  z-index: -1;
  pointer-events: none;
  background:
    url("../assets/grain.svg"),
    radial-gradient(38% 34% at 22% 16%, color-mix(in srgb, var(--aurora-a) calc(var(--blob-alpha) * 100%), transparent), transparent 70%),
    radial-gradient(32% 30% at 82% 22%, color-mix(in srgb, var(--aurora-b) calc(var(--blob-alpha) * 82%), transparent), transparent 70%),
    radial-gradient(36% 32% at 58% 88%, color-mix(in srgb, var(--aurora-c) calc(var(--blob-alpha) * 64%), transparent), transparent 70%),
    conic-gradient(from 210deg at 62% 38%,
      transparent,
      color-mix(in srgb, var(--aurora-a) 9%, transparent) 18%,
      transparent 34%,
      color-mix(in srgb, var(--aurora-b) 8%, transparent) 52%,
      transparent 68%,
      color-mix(in srgb, var(--aurora-c) 7%, transparent) 84%,
      transparent);
  background-blend-mode: multiply, normal, normal, normal, normal;
}

@media (prefers-color-scheme: dark) {
  body::before { background-blend-mode: soft-light, normal, normal, normal, normal; }
}
```

- [ ] **Step 4: Add the hue drift.** In the existing `@media (min-width: 46em)` aurora block, replace the `body::before` animation line so it reads:

```css
@media (min-width: 46em) {
  body::before {
    animation:
      aurora-drift 70s ease-in-out infinite alternate,
      aurora-hue 90s linear infinite alternate;
  }
}
```

and add after the `aurora-drift` keyframes:

```css
@keyframes aurora-hue {
  to { filter: hue-rotate(18deg); }
}
```

- [ ] **Step 5: Topic tinting.** After the three `[data-topic=...]` topic-theming rules, add:

```css
/* lesson pages tint the whole sky toward their topic; :has() misses on
   old browsers, which simply keep the default aurora */
body:has(main[data-topic="data-privacy"]) { --aurora-a: var(--topic-privacy); --aurora-b: var(--topic-privacy); --aurora-c: var(--coral); }
body:has(main[data-topic="tech-literacy"]) { --aurora-a: var(--topic-literacy); --aurora-b: var(--topic-literacy); --aurora-c: var(--coral); }
body:has(main[data-topic="digital-inclusion"]) { --aurora-a: var(--topic-inclusion); --aurora-b: var(--topic-inclusion); --aurora-c: var(--indigo); }
```

- [ ] **Step 6: Run the suite** (CSS/asset changes shouldn't move it, but prove it)

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `36 passed`

- [ ] **Step 7: Visual check** — serve `docs/`, hard-refresh:
  - `http://localhost:8000/index.html`: grain texture faintly visible on the paper; aurora has an extra conic wash; hue slowly drifts (desktop width).
  - `http://localhost:8000/lessons/understanding-passwords.html`: sky tinted indigo (data-privacy).
  - `http://localhost:8000/lessons/how-the-internet-reaches-you.html`: sky tinted amber.
  - Dark scheme (emulate `prefers-color-scheme: dark`): grain not muddy, aurora brighter.

- [ ] **Step 8: Commit**

```powershell
git add docs/assets/grain.svg docs/css/main.css
git commit -m @'
feat: aurora 2.0 — conic mesh, paper grain, topic-tinted sky

body::before gains a conic wash and tiled SVG noise (real file; CSP
img-src self forbids data: URIs) plus a slow hue drift on desktop.
New --aurora-a/-b/-c tokens let lesson pages retint the whole sky via
body:has(main[data-topic]) with graceful :has() fallback. --ink-gradient
token added for the gradient-ink work that follows.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 4: Gradient ink on headlines

**Files:**
- Modify: `docs/css/main.css` (new section after the base heading rules)

**Interfaces:**
- Consumes: `--ink-gradient` (Task 3)
- Produces: the gradient-ink pattern later reused by `.quiz-finale-count` (Task 12)

- [ ] **Step 1: Add the gradient-ink section.** In `main.css`, directly after the `h1, h2, h3 { text-wrap: balance; }` line, add:

```css
/* ---------- gradient ink ---------- */

/* headline ink becomes a slowly panning postal gradient. Stops use only
   AA-safe tokens (indigo / coral-text / amber) in both schemes. Browsers
   without background-clip:text keep solid ink. Reduced motion freezes the
   pan at the indigo end — still AA. */
@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  h1,
  .section-title {
    background: var(--ink-gradient);
    background-size: 300% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: ink-pan 9s ease-in-out infinite alternate;
  }
  /* night flight: gradient ink gets a soft glow in the dark */
  @media (prefers-color-scheme: dark) {
    h1,
    .section-title { filter: drop-shadow(0 0 16px color-mix(in srgb, var(--indigo) 28%, transparent)); }
  }
}

@keyframes ink-pan {
  from { background-position: 0% 50%; }
  to { background-position: 100% 50%; }
}
```

- [ ] **Step 2: Run the suite**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `36 passed`

- [ ] **Step 3: Visual check** — hard-refresh:
  - Home h1 + "What we teach"/"Start with these" titles show a panning indigo→coral→amber gradient, readable in light AND dark.
  - An article h1 (e.g., `lessons/understanding-passwords.html`) shows it too.
  - Emulate `prefers-reduced-motion: reduce`: gradient static, text readable.

- [ ] **Step 4: Commit**

```powershell
git add docs/css/main.css
git commit -m @'
feat: animated gradient ink on h1 and section titles

background-clip:text with the --ink-gradient postal ramp, panning 9s
alternate. Guarded by @supports (solid ink fallback), AA-safe stops in
both schemes, static under reduced motion, glow only in dark.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 5: Torn-paper edges (band + footer)

**Files:**
- Modify: `docs/css/main.css` (`.band`, `.site-footer`)

**Interfaces:**
- Consumes: nothing new
- Produces: `--tear` custom property pattern; Task 14 print rules reference `.band`/`.site-footer` masks

- [ ] **Step 1: Tear the band.** Replace the `.band { ... }` rule with:

```css
.band {
  --tear: 12px;
  background:
    linear-gradient(120deg,
      color-mix(in srgb, var(--indigo) 7%, var(--paper-raised)),
      color-mix(in srgb, var(--coral) 7%, var(--paper-raised)));
  border-top: 0;
  border-bottom: 0;
  padding-block: var(--tear);
  /* torn-from-an-envelope edges: zigzag teeth top and bottom */
  -webkit-mask:
    linear-gradient(#000 0 0) 0 var(--tear) / 100% calc(100% - 2 * var(--tear)) no-repeat,
    conic-gradient(from 135deg at 50% 0, #000 90deg, transparent 0) 0 0 / 28px var(--tear) repeat-x,
    conic-gradient(from -45deg at 50% 100%, #000 90deg, transparent 0) 0 100% / 28px var(--tear) repeat-x;
  mask:
    linear-gradient(#000 0 0) 0 var(--tear) / 100% calc(100% - 2 * var(--tear)) no-repeat,
    conic-gradient(from 135deg at 50% 0, #000 90deg, transparent 0) 0 0 / 28px var(--tear) repeat-x,
    conic-gradient(from -45deg at 50% 100%, #000 90deg, transparent 0) 0 100% / 28px var(--tear) repeat-x;
}
```

(The 1px borders are dropped — the mask would clip them into dashes; the teeth themselves now delineate the band.)

- [ ] **Step 2: Tear the footer's top edge.** The footer needs its own background for a mask to show. Replace `.site-footer { margin-top: var(--section-pad); }` with:

```css
.site-footer {
  --tear: 12px;
  margin-top: var(--section-pad);
  padding-top: var(--tear);
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--indigo) 5%, var(--paper)),
    var(--paper) 55%);
  -webkit-mask:
    linear-gradient(#000 0 0) 0 var(--tear) / 100% calc(100% - var(--tear)) no-repeat,
    conic-gradient(from 135deg at 50% 0, #000 90deg, transparent 0) 0 0 / 28px var(--tear) repeat-x;
  mask:
    linear-gradient(#000 0 0) 0 var(--tear) / 100% calc(100% - var(--tear)) no-repeat,
    conic-gradient(from 135deg at 50% 0, #000 90deg, transparent 0) 0 0 / 28px var(--tear) repeat-x;
}
```

- [ ] **Step 3: Run the suite**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `36 passed`

- [ ] **Step 4: Visual check** — hard-refresh home:
  - Band ("Knowledge that crosses borders") has zigzag torn edges top and bottom; footer's tinted area starts with torn teeth.
  - Check dark scheme; check 375px width (teeth still crisp, no horizontal scroll).
  - Confirm the airmail rule above the footer still renders (it sits inside `.site-footer` and must not be swallowed by the mask's top teeth — if it is, move the teeth zone down by increasing `padding-top` to `calc(var(--tear) + 5px)`).

- [ ] **Step 5: Commit**

```powershell
git add docs/css/main.css
git commit -m @'
feat: torn-paper edges on the CTA band and footer

CSS conic-gradient masks cut zigzag teeth into the band (both edges)
and the footer top. The footer gains a faint indigo-to-paper backdrop so
its tear is visible; band borders are replaced by the teeth themselves.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 6: Ghost watermarks behind home sections

**Files:**
- Modify: `docs/index.html` (three attributes), `docs/css/main.css` (new section), `docs/js/theatre.js` (watermark locale module), `docs/locales/en.json`, `docs/locales/es.json`

**Interfaces:**
- Consumes: theatre.js IIFE skeleton (Task 2)
- Produces: `[data-watermark]`/`data-watermark-key` convention; locale keys `home.wmTopics`, `home.wmFeatured`, `home.wmBand`

- [ ] **Step 1: Attribute the home sections.** In `docs/index.html`:
  - `<section class="section" aria-labelledby="topics-heading">` → `<section class="section" aria-labelledby="topics-heading" data-watermark="TEACH" data-watermark-key="home.wmTopics">`
  - `<section class="section" aria-labelledby="featured-heading">` → `<section class="section" aria-labelledby="featured-heading" data-watermark="READ" data-watermark-key="home.wmFeatured">`
  - `<section class="band">` → `<section class="band" data-watermark="SHARE" data-watermark-key="home.wmBand">`

- [ ] **Step 2: Locale keys.** In `docs/locales/en.json`, inside the `"home"` object (after the `"bandCta"` entry, keeping valid JSON commas), add:

```json
    "wmTopics": "TEACH",
    "wmFeatured": "READ",
    "wmBand": "SHARE"
```

In `docs/locales/es.json`, same position in `"home"`:

```json
    "wmTopics": "ENSEÑAR",
    "wmFeatured": "LEER",
    "wmBand": "COMPARTIR"
```

- [ ] **Step 3: Watermark CSS.** Append a new section to `main.css` (before the `/* ---------- motion ---------- */` block):

```css
/* ---------- ghost watermarks (home) ---------- */

/* oversized outline words drifting behind sections. content's "/ """
   alt-text keeps them out of the accessibility tree; browsers without
   alt syntax drop the content entirely (fine — decorative). */
[data-watermark] { position: relative; overflow: clip; }
[data-watermark]::before {
  content: attr(data-watermark) / "";
  position: absolute;
  left: 50%;
  top: 4%;
  transform: translateX(-50%);
  z-index: -1;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(6rem, 17vw, 14rem);
  letter-spacing: 0.05em;
  line-height: 1;
  white-space: nowrap;
  color: transparent;
  -webkit-text-stroke: 1.5px color-mix(in srgb, var(--ink) 11%, transparent);
  pointer-events: none;
}

@supports (animation-timeline: view()) {
  @media (min-width: 46em) {
    [data-watermark]::before {
      animation: wm-drift linear both;
      animation-timeline: view();
    }
  }
}

@keyframes wm-drift {
  from { transform: translate(-50%, 22%); }
  to { transform: translate(-50%, -18%); }
}
```

- [ ] **Step 4: Locale-aware watermark words.** In `docs/js/theatre.js`, replace the `/* modules land here in later tasks */` + `void reduce; void desktopFine;` lines with:

```js
  /* ----- watermark words resolve from the active locale ----- */
  /* English is the EMPTY dictionary (i18n.js restoreEnglish sets
     window.bwbDict = {}), so the authored English word must be stashed
     on first run and restored whenever the key is absent — mirroring
     i18n.js's own dataset.i18nOriginal pattern. */
  function applyWatermarks() {
    var dict = window.bwbDict || {};
    Array.prototype.forEach.call(document.querySelectorAll("[data-watermark][data-watermark-key]"), function (node) {
      if (!node.dataset.wmDefault) { node.dataset.wmDefault = node.getAttribute("data-watermark"); }
      var key = node.getAttribute("data-watermark-key");
      node.setAttribute("data-watermark",
        Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : node.dataset.wmDefault);
    });
  }
  document.addEventListener("bwb:langchange", applyWatermarks);
  applyWatermarks();

  /* modules land here in later tasks */
  void reduce; void desktopFine;
```

- [ ] **Step 5: Run the suite** (locale parity + i18n coverage must stay green)

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `36 passed`

- [ ] **Step 6: Visual check** — hard-refresh home (desktop):
  - Huge outlined TEACH / READ / SHARE ghosts behind the sections, drifting slowly as you scroll; no horizontal scrollbar at any width.
  - Switch language to Español: words become ENSEÑAR / LEER / COMPARTIR. Switch BACK to English: TEACH / READ / SHARE must return (round-trip is the regression the wmDefault stash exists for).
  - Card hover shadows are not clipped by the sections' `overflow: clip` (section padding absorbs them; if a shadow clips at the band, drop `overflow: clip` from `.band` only and re-check overflow).

- [ ] **Step 7: Commit**

```powershell
git add docs/index.html docs/css/main.css docs/js/theatre.js docs/locales/en.json docs/locales/es.json
git commit -m @'
feat: ghost watermark words drifting behind home sections

data-watermark attrs render as giant outlined text via CSS attr()
content with "/ """ alt text (invisible to screen readers), drifting on
a view() scroll timeline on desktop. Words are locale-aware: theatre.js
re-resolves them from data-watermark-key on bwb:langchange; en/es keys
added with suite-enforced parity.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 7: Envelope hero

**Files:**
- Modify: `docs/index.html` (hero markup), `docs/css/main.css` (hero rules)

**Interfaces:**
- Consumes: nothing new
- Produces: `.hero-letter` / `.hero-envelope` classes (Task 14 print rules reference them)

- [ ] **Step 1: Rework the hero markup.** In `docs/index.html`, wrap the hero's five children in a letter and add the envelope SVG after it. The section gains a `hero-scene` modifier because `404.html` ALSO uses `class="hero"` and must keep today's plain treatment:

```html
    <section class="hero hero-scene">
      <div class="hero-letter">
        <p class="eyebrow" data-i18n="home.eyebrow">Micro-lessons in plain language</p>
        <h1 data-i18n="home.title">Digital know-how, one byte at a time.</h1>
        <p class="lede" data-i18n="home.lede">Free five-minute lessons on data privacy, tech literacy, and digital inclusion — written in plain language and built to travel across languages.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="./lessons/index.html" data-i18n="home.ctaLessons">Browse the lessons</a>
          <a class="btn" href="./get-involved.html" data-i18n="home.ctaInvolved">Get involved</a>
        </div>
        <p class="proof-strip">
          <span class="stamp" data-i18n="home.proofLessons">12 lessons</span>
          <span class="stamp" data-i18n="home.proofLanguages">2 languages</span>
          <span class="stamp" data-i18n="home.proofPrivacy">No account, no tracking</span>
        </p>
      </div>
      <svg class="hero-envelope" viewBox="0 0 640 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path class="env-flap" d="M8 26 L320 120 L632 26 L632 20 L320 108 L8 20 Z"/>
        <path class="env-back" d="M8 26 L320 120 L632 26 L632 154 L8 154 Z"/>
      </svg>
    </section>
```

(Task 9 later replaces the `proof-strip` paragraph with the marquee structure — keep it as-is here.)

- [ ] **Step 2: Hero CSS.** In `main.css`, LEAVE the existing `.hero { ... }` rule and the five `html.js .hero > *` cascade rules untouched (`404.html` depends on them). Append a new scoped section instead:

```css
/* ---------- envelope hero (home only — .hero-scene modifier; 404 also
   uses .hero and keeps the plain treatment above) ---------- */

.hero-scene {
  position: relative;
  padding-bottom: calc(var(--section-pad) + clamp(56px, 9vw, 100px));
}

/* the letter card sits behind (z 2) the envelope band (z 3) so its
   lower edge tucks inside the envelope */
.hero-letter {
  position: relative;
  z-index: 2;
  max-width: 46rem;
  background: color-mix(in srgb, var(--paper-raised) 90%, transparent);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: var(--space-4);
  box-shadow: 0 34px 70px -38px color-mix(in srgb, var(--indigo) 35%, transparent);
}

.hero-envelope {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: min(58rem, 96%);
  height: clamp(80px, 13vw, 150px);
  z-index: 3;
  pointer-events: none;
}
.env-back { fill: color-mix(in srgb, var(--indigo) 14%, var(--paper-raised)); stroke: var(--line-strong); stroke-width: 1.5; }
.env-flap { fill: color-mix(in srgb, var(--indigo) 22%, var(--paper-raised)); stroke: var(--line-strong); stroke-width: 1.5; }

/* page-load sequence: the generic .hero > * rise (same specificity,
   this rule later in the file wins) must not grab the letter/envelope;
   the letter rises out of the envelope, then its children stagger in */
html.js .hero-scene > * { animation: none; }
html.js .hero-scene .hero-letter { animation: letter-rise 900ms var(--ease-out) backwards; }

@keyframes letter-rise {
  from { transform: translateY(14%); opacity: 0.3; }
}

html.js .hero-scene .hero-letter > * { animation: rise 700ms var(--ease-out) backwards; }
html.js .hero-scene .hero-letter > *:nth-child(2) { animation-delay: 140ms; }
html.js .hero-scene .hero-letter > *:nth-child(3) { animation-delay: 230ms; }
html.js .hero-scene .hero-letter > *:nth-child(4) { animation-delay: 320ms; }
html.js .hero-scene .hero-letter > *:nth-child(5) { animation-delay: 410ms; }
```

The existing `.hero h1 { max-width: 22ch; }` rule and `rise` keyframes still apply.

- [ ] **Step 3: Run the suite**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `36 passed`

- [ ] **Step 4: Visual check** — hard-refresh home:
  - On load: letter card rises with staggered children; envelope band sits across the hero's bottom, its top overlapping the letter's lower edge.
  - Both hero buttons clickable (envelope is `pointer-events: none`).
  - No-JS check (disable JS): composed final state, nothing hidden.
  - 375px width: letter readable, envelope not covering the CTA buttons — if it does, raise the hero's bottom padding clamp.
  - Reduced motion: no animation, composed state.
  - `http://localhost:8000/404.html`: unchanged from before this task (plain hero, child rise stagger intact, no extra bottom padding).

- [ ] **Step 5: Commit**

```powershell
git add docs/index.html docs/css/main.css
git commit -m @'
feat: envelope hero — the home page opens as a letter

Hero content wrapped in a raised letter card that rises out of a
decorative SVG envelope band on load (html.js-scoped animation with the
existing child stagger). No-JS and reduced-motion get the composed
final state; envelope is aria-hidden and pointer-transparent.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 8: Scroll-drawn flight path with plane

**Files:**
- Modify: `docs/index.html` (SVG scene after the hero section), `docs/css/main.css`

**Interfaces:**
- Consumes: nothing new
- Produces: `.flight-scene` (Task 14 print rules reference it)

- [ ] **Step 1: Add the scene markup.** In `docs/index.html`, immediately after the hero `</section>` and before `<hr class="airmail-rule">`, insert:

```html
    <svg class="flight-scene" viewBox="0 0 1200 2400" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <mask id="fp-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="2400">
          <path class="fp-cover" d="M-30 180 C 360 320, 980 240, 700 620 S 160 1080, 820 1360 S 1150 1980, 470 2300" pathLength="100" fill="none" stroke="#fff" stroke-width="60" stroke-dasharray="100" stroke-dashoffset="100"/>
        </mask>
      </defs>
      <path class="fp-dash" d="M-30 180 C 360 320, 980 240, 700 620 S 160 1080, 820 1360 S 1150 1980, 470 2300" pathLength="100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="1.1 0.7" mask="url(#fp-reveal)"/>
      <path class="fp-plane" d="M0 -7 L18 0 L0 7 L5 0 Z"/>
    </svg>
```

- [ ] **Step 2: Flight CSS.** In `main.css`, change `main { display: block; }` to `main { display: block; position: relative; }`, then append a new section:

```css
/* ---------- flight path (home) ---------- */

/* an airmail route drawn across the page as you scroll, with a paper
   plane riding it. Desktop + scroll-timeline browsers only; everyone
   else sees nothing (display: none, so no static clutter). The dashed
   route reveals through a mask whose cover path undashes on scroll. */
.flight-scene { display: none; }

@supports (animation-timeline: scroll()) {
  @media (min-width: 46em) and (prefers-reduced-motion: no-preference) {
    .flight-scene {
      display: block;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      color: color-mix(in srgb, var(--indigo) 55%, transparent);
      pointer-events: none;
    }
    .fp-cover {
      animation: fp-draw linear both;
      animation-timeline: scroll();
    }
    .fp-plane {
      fill: var(--coral);
      offset-path: path("M-30 180 C 360 320, 980 240, 700 620 S 160 1080, 820 1360 S 1150 1980, 470 2300");
      offset-rotate: auto;
      animation: fp-fly linear both;
      animation-timeline: scroll();
    }
  }
}

@keyframes fp-draw { to { stroke-dashoffset: 0; } }
@keyframes fp-fly {
  from { offset-distance: 0%; }
  to { offset-distance: 100%; }
}
```

- [ ] **Step 3: Run the suite**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `36 passed`

- [ ] **Step 4: Visual check** — hard-refresh home at desktop width:
  - Scroll slowly: dashed indigo route draws in behind content; coral plane flies along it, rotating with the curve.
  - Route must not collide badly with the topic/featured cards' readable areas — nudge the path `d` (both copies AND the `offset-path` — all three must stay identical) if it does.
  - Narrow window below 46em: no flight path. Firefox (no scroll-timeline as of the support matrix): no flight path, no errors.

- [ ] **Step 5: Commit**

```powershell
git add docs/index.html docs/css/main.css
git commit -m @'
feat: scroll-drawn airmail flight path across the home page

Absolutely-positioned SVG scene behind main content: a dashed route
revealed by a mask cover path on animation-timeline: scroll(), with a
paper plane riding the same path via offset-path. Gated to desktop +
scroll-timeline support + motion-ok; hidden entirely otherwise.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 9: Marquee proof strip

**Files:**
- Modify: `docs/index.html` (proof strip markup), `docs/css/main.css` (`.proof-strip` rules)

**Interfaces:**
- Consumes: `.hero-letter` structure (Task 7) — the marquee stays the letter's 5th child so the rise stagger keeps working
- Produces: `.proof-track` (Task 14 print rules reference the aria-hidden copy)

- [ ] **Step 1: Marquee markup.** In `docs/index.html`, replace the `<p class="proof-strip">...</p>` block with:

```html
        <div class="proof-strip">
          <p class="proof-track">
            <span class="stamp" data-i18n="home.proofLessons">12 lessons</span>
            <span class="stamp" data-i18n="home.proofLanguages">2 languages</span>
            <span class="stamp" data-i18n="home.proofPrivacy">No account, no tracking</span>
            <span class="stamp" aria-hidden="true" data-i18n="home.proofLessons">12 lessons</span>
            <span class="stamp" aria-hidden="true" data-i18n="home.proofLanguages">2 languages</span>
            <span class="stamp" aria-hidden="true" data-i18n="home.proofPrivacy">No account, no tracking</span>
          </p>
          <p class="proof-track" aria-hidden="true">
            <span class="stamp" data-i18n="home.proofLessons">12 lessons</span>
            <span class="stamp" data-i18n="home.proofLanguages">2 languages</span>
            <span class="stamp" data-i18n="home.proofPrivacy">No account, no tracking</span>
            <span class="stamp" aria-hidden="true" data-i18n="home.proofLessons">12 lessons</span>
            <span class="stamp" aria-hidden="true" data-i18n="home.proofLanguages">2 languages</span>
            <span class="stamp" aria-hidden="true" data-i18n="home.proofPrivacy">No account, no tracking</span>
          </p>
        </div>
```

(A two-track `translateX(-100%)` marquee is seamless only when each track is at least as wide as the strip; three stamps (~29rem) are narrower than the letter's content box (~41.5rem), so each track carries the three stamps TWICE — ~60rem. Screen readers get exactly one reading: the second track and every duplicate span are `aria-hidden`. Everything keeps `data-i18n` so a language switch updates all copies, and each span holds text only — the suite's `test_i18n_nodes_text_only` stays green.)

- [ ] **Step 2: Marquee CSS.** Replace the `.proof-strip { ... }` rule with:

```css
/* proof strip → infinite stamp marquee. The aria-hidden duplicate track
   provides the seamless loop; hover/focus pauses; reduced motion drops
   the duplicate and wraps statically (exactly the old strip). */
.proof-strip {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
  overflow: hidden;
  -webkit-mask: linear-gradient(90deg, transparent, #000 10% 90%, transparent);
  mask: linear-gradient(90deg, transparent, #000 10% 90%, transparent);
}
.proof-track {
  display: flex;
  flex: none;
  gap: var(--space-2);
  margin: 0;
  animation: marquee-scroll 24s linear infinite;
}
.proof-strip:hover .proof-track,
.proof-strip:focus-within .proof-track { animation-play-state: paused; }

@keyframes marquee-scroll {
  to { transform: translateX(calc(-100% - var(--space-2))); }
}

@media (prefers-reduced-motion: reduce) {
  /* display:block, not flex: a flex:none track sizes to max-content and
     would never wrap — as a block-level child it takes the strip's width */
  .proof-strip { display: block; overflow: visible; -webkit-mask: none; mask: none; }
  .proof-track { flex-wrap: wrap; }
  .proof-track[aria-hidden="true"],
  .proof-track .stamp[aria-hidden="true"] { display: none; }
}
```

- [ ] **Step 3: Run the suite**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `36 passed`

- [ ] **Step 4: Visual check** — hard-refresh home:
  - Stamps scroll in a seamless loop — let it run through at least two full cycles and confirm no blank gap ever opens at the right edge; edge fade on both sides; hover pauses.
  - Language switch (both directions): all visual copies change; screen-reader tree (accessibility inspector) shows exactly three stamps.
  - Reduced motion: exactly three static stamps, wrapped like today's strip, no duplicates visible, no horizontal scroll at 375px.

- [ ] **Step 5: Commit**

```powershell
git add docs/index.html docs/css/main.css
git commit -m @'
feat: hero proof strip becomes an infinite stamp marquee

Two flex tracks (the second aria-hidden but still i18n-keyed so language
switches stay in sync) loop with an edge-fade mask; hover/focus pauses;
reduced motion collapses back to the old static wrapped strip.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 10: 3D postcard CSS — tilt vars, glare, postmark

**Files:**
- Create: `docs/assets/postmark.svg`
- Modify: `docs/css/main.css` (`.postcard` rules + new section)

**Interfaces:**
- Consumes: nothing yet (JS lands in Task 11)
- Produces: consumes-side of custom props `--rx`, `--ry` (degrees) and `--mx`, `--my` (percentages) that Task 11's tilt module writes; `.postcard::after` postmark that Task 14 print rules hide

- [ ] **Step 1: Create `docs/assets/postmark.svg`** (rubber cancellation mark; fixed mid-tone stroke that reads in both schemes):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g fill="none" stroke="#8e8a9c" stroke-width="2">
    <circle cx="50" cy="50" r="46"/>
    <circle cx="50" cy="50" r="33"/>
  </g>
  <path id="arc" d="M50 9 a41 41 0 1 1 -0.01 0" fill="none"/>
  <text font-family="Consolas, monospace" font-size="10" letter-spacing="1.5" fill="#8e8a9c">
    <textPath href="#arc">BYTES WITHOUT BORDERS · AIR MAIL ·</textPath>
  </text>
  <g fill="none" stroke="#8e8a9c" stroke-width="2" stroke-linecap="round">
    <path d="M20 48 q 7 -5 14 0 t 14 0 t 14 0 t 14 0"/>
    <path d="M20 56 q 7 -5 14 0 t 14 0 t 14 0 t 14 0"/>
  </g>
</svg>
```

- [ ] **Step 2: Tilt-aware transforms.** In `main.css`, replace the `.postcard { transition ... }` and `.postcard:hover { ... }` rules with:

```css
/* pointer tilt: theatre.js writes --rx/--ry (deg) and --mx/--my (%);
   without JS the vars stay unset and these resolve to today's flat card */
.postcard {
  transition: transform 280ms var(--ease-out), box-shadow 280ms ease, border-color 280ms ease;
  transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
}
.postcard:hover {
  transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(-5px);
  border-color: color-mix(in srgb, var(--topic) 45%, var(--line));
  box-shadow: 0 20px 44px -18px color-mix(in srgb, var(--topic) 38%, transparent);
}
```

- [ ] **Step 3: Glare + postmark.** The stretched-link pseudo already covers the card — give it the glare. Replace the `.postcard h2 a::after, .postcard h3 a::after { content: ""; position: absolute; inset: 0; }` rule with:

```css
.postcard h2 a::after,
.postcard h3 a::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: var(--radius);
  /* glare sheen follows the pointer (--mx/--my from theatre.js) */
  background: radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%),
    color-mix(in srgb, #fff 16%, transparent), transparent 62%);
  opacity: 0;
  transition: opacity 240ms ease;
}
.postcard:hover h2 a::after,
.postcard:hover h3 a::after { opacity: 1; }
```

Then append a new section for the postmark:

```css
/* ---------- postmark: cancellation stamp thunks onto a hovered card ---------- */

.postcard::after {
  content: "";
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 72px;
  height: 72px;
  background: url("../assets/postmark.svg") center / contain no-repeat;
  opacity: 0;
  transform: rotate(-16deg) scale(1.5);
  transition: opacity 220ms ease, transform 340ms cubic-bezier(0.2, 1.4, 0.3, 1);
  pointer-events: none;
}
.postcard:hover::after {
  opacity: 0.5;
  transform: rotate(-8deg) scale(1);
}
```

- [ ] **Step 4: Run the suite**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `36 passed`

- [ ] **Step 5: Visual check** — hard-refresh home + `lessons/index.html`:
  - Hovering a card: postmark thunks in with overshoot at the top-right; a soft glare circle sits at center (it will track the pointer after Task 11).
  - Cards still filter correctly on the hub (`[hidden]` untouched); no layout shift at rest.

- [ ] **Step 6: Commit**

```powershell
git add docs/assets/postmark.svg docs/css/main.css
git commit -m @'
feat: postcard 3D groundwork — tilt vars, pointer glare, postmark

Cards read --rx/--ry/--mx/--my custom props (written by theatre.js in
the next commit; unset = flat card, so no-JS is unchanged). The
stretched-link pseudo doubles as the glare layer; a postmark SVG
cancellation stamp thunks in on hover with overshoot easing.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 11: theatre.js tilt + magnet modules

**Files:**
- Modify: `docs/js/theatre.js`, `docs/css/main.css` (magnet translate hooks)

**Interfaces:**
- Consumes: `--rx/--ry/--mx/--my` CSS contract (Task 10); `reduce`/`desktopFine` matchMedia (Task 2); `.to-top`/`.share-btn` (created synchronously by `main.js`, which runs before `theatre.js` in defer order)
- Produces: custom props `--magx`, `--magy` consumed by the CSS added below

- [ ] **Step 1: Magnet CSS.** Append to `main.css`:

```css
/* ---------- magnetic pull (theatre.js writes --magx/--magy) ---------- */

/* `translate` composes with each element's existing `transform` */
.filter-btn,
.to-top,
.share-btn {
  translate: var(--magx, 0px) var(--magy, 0px);
  transition-property: translate, transform, opacity, border-color, color, background-color, box-shadow;
  transition-duration: 300ms;
  transition-timing-function: cubic-bezier(0.3, 1.6, 0.4, 1);
}
```

- [ ] **Step 2: Add both modules.** In `docs/js/theatre.js`, replace the trailing lines

```js
  /* modules land here in later tasks */
  void reduce; void desktopFine;
```

with:

```js
  /* ----- 3D tilt + glare: postcards follow the pointer ----- */
  var MAX_TILT = 8; /* degrees */
  Array.prototype.forEach.call(document.querySelectorAll(".postcard"), function (card) {
    var rect = null;
    var frame = 0;
    card.addEventListener("pointerenter", function () {
      if (reduce.matches || !desktopFine.matches) { return; }
      rect = card.getBoundingClientRect();
    });
    card.addEventListener("pointermove", function (event) {
      if (!rect || frame) { return; }
      var x = event.clientX;
      var y = event.clientY;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        if (!rect) { return; }
        var px = (x - rect.left) / rect.width;
        var py = (y - rect.top) / rect.height;
        card.style.setProperty("--ry", ((px - 0.5) * 2 * MAX_TILT).toFixed(2) + "deg");
        card.style.setProperty("--rx", ((0.5 - py) * 2 * MAX_TILT).toFixed(2) + "deg");
        card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      });
    });
    card.addEventListener("pointerleave", function () {
      rect = null;
      if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
      card.style.removeProperty("--mx");
      card.style.removeProperty("--my");
    });
  });

  /* ----- magnetic pull: chips and floating buttons lean toward the pointer ----- */
  var MAGNET_RANGE = 0.25;
  var MAGNET_MAX = 6; /* px */
  function clampMag(value) { return Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, value)); }
  Array.prototype.forEach.call(document.querySelectorAll(".filter-btn, .to-top, .share-btn"), function (btn) {
    btn.addEventListener("pointermove", function (event) {
      if (reduce.matches || !desktopFine.matches) { return; }
      var rect = btn.getBoundingClientRect();
      btn.style.setProperty("--magx", clampMag((event.clientX - (rect.left + rect.width / 2)) * MAGNET_RANGE).toFixed(1) + "px");
      btn.style.setProperty("--magy", clampMag((event.clientY - (rect.top + rect.height / 2)) * MAGNET_RANGE).toFixed(1) + "px");
    });
    btn.addEventListener("pointerleave", function () {
      btn.style.removeProperty("--magx");
      btn.style.removeProperty("--magy");
    });
  });
```

(Keep the watermark module from Task 6 above these — order inside the IIFE doesn't matter, but the file must stay one IIFE.)

- [ ] **Step 3: Run the suite**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `36 passed`

- [ ] **Step 4: Visual check** — hard-refresh:
  - Home/hub cards tilt toward the pointer (≤8°), glare follows it, everything springs flat on leave.
  - Hub filter chips and an article's share/back-to-top buttons lean toward the pointer and spring back.
  - Touch emulation (pointer: coarse): no tilt/magnet. Reduced motion: none. Browser console: no errors on any page (theatre.js runs on pages with zero postcards too).

- [ ] **Step 5: Commit**

```powershell
git add docs/js/theatre.js docs/css/main.css
git commit -m @'
feat: pointer physics — postcard tilt/glare and magnetic buttons

theatre.js gains its first two modules: rAF-throttled pointer tilt
(±8°, rect cached on enter, CSSOM custom props only) and magnetic pull
for filter chips / share / back-to-top (translate composes with each
element's transform, springy overshoot transition). Both bail under
reduced motion or without a fine pointer on a desktop viewport.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 12: Quiz theatrics — events, stamp confetti, count-up finale

**Files:**
- Modify: `docs/js/quiz.js` (two dispatches), `docs/js/theatre.js` (confetti + finale modules), `docs/css/main.css` (quiz bar + finale styles), `docs/locales/en.json`, `docs/locales/es.json` (`quiz.delivered`)

**Interfaces:**
- Consumes: `burst()` colors from computed `--indigo/--coral/--topic-*`; gradient-ink pattern (Task 4)
- Produces: CustomEvents `bwb:quiz:correct` (detail: `{ button }`) and `bwb:quiz:done` (detail: `{ host, scoreLine, score, total }`); `.quiz-finale` DOM contract

- [ ] **Step 1: Dispatch from quiz.js.** In `docs/js/quiz.js` function `answer()`, replace:

```js
      if (right) {
        score += 1;
      } else {
```

with:

```js
      if (right) {
        score += 1;
        document.dispatchEvent(new CustomEvent("bwb:quiz:correct", { detail: { button: buttons[chosen] } }));
      } else {
```

In `renderScore()`, after the `host.appendChild(scoreLine);` line, add:

```js
      document.dispatchEvent(new CustomEvent("bwb:quiz:done", { detail: { host: host, scoreLine: scoreLine, score: score, total: total } }));
```

- [ ] **Step 2: Locale key.** In `docs/locales/en.json` `"quiz"` object, after `"error": "..."` add (with a comma on the preceding line):

```json
    "delivered": "DELIVERED"
```

In `docs/locales/es.json`, same position:

```json
    "delivered": "ENTREGADO"
```

- [ ] **Step 3: Confetti + finale modules.** In `docs/js/theatre.js`, append inside the IIFE (after the magnet module):

```js
  /* ----- stamp confetti: celebrate correct quiz answers ----- */
  function themeColors() {
    var styles = window.getComputedStyle(document.documentElement);
    return ["--indigo", "--coral", "--topic-literacy", "--topic-inclusion"].map(function (name) {
      return styles.getPropertyValue(name).trim() || "#4f46e5";
    });
  }

  function burst(origin, count) {
    var canvas = document.createElement("canvas");
    try {
      var rect = origin.getBoundingClientRect();
      var scale = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * scale;
      canvas.height = window.innerHeight * scale;
      canvas.style.position = "fixed";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "90";
      canvas.setAttribute("aria-hidden", "true");
      var context = canvas.getContext("2d");
      if (!context) { return; }
      document.body.appendChild(canvas);
      context.scale(scale, scale);
      var colors = themeColors();
      var particles = [];
      var originX = rect.left + rect.width / 2;
      var originY = rect.top + rect.height / 2;
      for (var i = 0; i < count; i++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = 3 + Math.random() * 7;
        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          w: 10 + Math.random() * 8,
          h: 7 + Math.random() * 5,
          color: colors[i % colors.length]
        });
      }
      var started = null;
      function tick(now) {
        try {
          if (!started) { started = now; }
          var life = now - started;
          context.clearRect(0, 0, window.innerWidth, window.innerHeight);
          particles.forEach(function (p) {
            p.vy += 0.16;
            p.vx *= 0.992;
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vr;
            context.save();
            context.translate(p.x, p.y);
            context.rotate(p.rot);
            context.globalAlpha = Math.max(0, 1 - life / 1600);
            context.fillStyle = p.color;
            context.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            /* perforated stamp edge */
            context.strokeStyle = "rgba(255, 255, 255, 0.85)";
            context.setLineDash([2, 2]);
            context.strokeRect(-p.w / 2 + 1.5, -p.h / 2 + 1.5, p.w - 3, p.h - 3);
            context.restore();
          });
          if (life < 1600) {
            window.requestAnimationFrame(tick);
          } else {
            canvas.remove();
          }
        } catch (error) {
          canvas.remove();
        }
      }
      window.requestAnimationFrame(tick);
    } catch (error) {
      canvas.remove();
    }
  }

  document.addEventListener("bwb:quiz:correct", function (event) {
    if (reduce.matches || !event.detail || !event.detail.button) { return; }
    burst(event.detail.button, 90);
  });

  /* ----- score finale: decorative count-up + DELIVERED postmark ----- */
  document.addEventListener("bwb:quiz:done", function (event) {
    var detail = event.detail || {};
    if (!detail.scoreLine || !detail.scoreLine.parentNode || reduce.matches) { return; }
    var dict = window.bwbDict || {};
    var word = Object.prototype.hasOwnProperty.call(dict, "quiz.delivered") ? dict["quiz.delivered"] : "DELIVERED";
    var finale = document.createElement("div");
    finale.className = "quiz-finale";
    finale.setAttribute("aria-hidden", "true");
    var count = document.createElement("span");
    count.className = "quiz-finale-count";
    count.textContent = "0";
    var mark = document.createElement("span");
    mark.className = "quiz-finale-mark";
    mark.textContent = word;
    finale.appendChild(count);
    finale.appendChild(mark);
    detail.scoreLine.parentNode.insertBefore(finale, detail.scoreLine);
    var start = null;
    function step(now) {
      if (!start) { start = now; }
      var t = Math.min(1, (now - start) / 900);
      var eased = 1 - Math.pow(1 - t, 3);
      count.textContent = String(Math.round(eased * detail.score));
      if (t < 1) {
        window.requestAnimationFrame(step);
      } else {
        mark.classList.add("is-stamped");
        if (detail.score === detail.total) { burst(count, 140); }
      }
    }
    window.requestAnimationFrame(step);
  });
```

(The finale is `aria-hidden`: screen readers get quiz.js's plain score sentence, which renders immediately and receives focus as before. Re-renders — retry or language change — clear the host, so stale finales cannot pile up.)

- [ ] **Step 4: Quiz CSS.** In `main.css`, change `.quiz-bar`'s `height: 4px;` to `height: 6px;`, then replace `.quiz-bar-fill { ... }` with:

```css
.quiz-bar-fill {
  display: block;
  height: 100%;
  width: 0;
  border-radius: inherit;
  background-color: color-mix(in srgb, var(--indigo) 14%, transparent);
  background-image: repeating-linear-gradient(90deg, var(--indigo) 0 14px, transparent 14px 18px, var(--coral) 18px 32px, transparent 32px 36px);
  background-size: 36px 100%;
  transition: width 450ms var(--ease-out);
  animation: stripe-march 1.6s linear infinite;
}

@keyframes stripe-march {
  to { background-position-x: -36px; }
}
```

and append the finale styles (near the other quiz rules):

```css
/* decorative score finale (theatre.js): giant count-up + postmark */
.quiz-finale {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-1);
}
.quiz-finale-count {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--step-4);
  line-height: 1;
  color: var(--ink);
}
@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .quiz-finale-count {
    background: var(--ink-gradient);
    background-size: 300% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: ink-pan 9s ease-in-out infinite alternate;
  }
}
.quiz-finale-mark {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--coral-text);
  border: 2px solid var(--coral-text);
  border-radius: 999px;
  padding: 0.3rem 0.9rem;
  transform: rotate(-14deg) scale(1.6);
  opacity: 0;
  transition: transform 380ms cubic-bezier(0.2, 1.4, 0.3, 1), opacity 200ms ease;
}
.quiz-finale-mark.is-stamped {
  opacity: 0.85;
  transform: rotate(-8deg) scale(1);
}
```

- [ ] **Step 5: Run the suite** (locale parity must stay green)

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `36 passed`

- [ ] **Step 6: Visual check** — `http://localhost:8000/lessons/quiz-spot-the-scam.html`, hard-refresh:
  - Progress bar: marching airmail stripes.
  - Correct answer: stamp confetti bursts from the chosen button; canvas disappears after ~1.6s (check Elements panel — no orphan canvases).
  - Finish the quiz: big gradient number counts up beside a thunking DELIVERED mark; perfect score adds a second, bigger burst.
  - Switch to Español before finishing: mark says ENTREGADO.
  - Reduced motion: no confetti, no finale, plain score. Retry: no duplicate finales.

- [ ] **Step 7: Commit**

```powershell
git add docs/js/quiz.js docs/js/theatre.js docs/css/main.css docs/locales/en.json docs/locales/es.json
git commit -m @'
feat: quiz theatrics — stamp confetti, count-up finale, striped bar

quiz.js dispatches bwb:quiz:correct / bwb:quiz:done CustomEvents (its
only coupling to the theatre layer). theatre.js answers with a
self-removing canvas burst of perforated stamp particles in theme
colors and an aria-hidden gradient-ink count-up plus localized
DELIVERED/ENTREGADO postmark. Quiz progress bar becomes marching
airmail stripes. All of it inert under reduced motion.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 13: Cross-document view transitions

**Files:**
- Modify: `docs/css/main.css` (new section), `docs/js/theatre.js` (pageswap promotion)

**Interfaces:**
- Consumes: `reduce` matchMedia (Task 2)
- Produces: view-transition names `brand` and `page-title`

- [ ] **Step 1: View-transition CSS.** Append to `main.css`:

```css
/* ---------- cross-page view transitions ---------- */

/* same-origin navigations morph instead of flashing white: the brand
   persists, the single h1 morphs into the next page's h1 (the suite
   guarantees exactly one h1 per page), everything else slide-fades.
   Browsers without @view-transition simply navigate. */
@media (prefers-reduced-motion: no-preference) {
  @view-transition { navigation: auto; }

  .brand { view-transition-name: brand; }
  h1 { view-transition-name: page-title; }

  ::view-transition-old(root) { animation: vt-leave 220ms ease both; }
  ::view-transition-new(root) { animation: vt-enter 340ms var(--ease-out) both; }
}

@keyframes vt-leave {
  to { opacity: 0; transform: translateY(-12px); }
}
@keyframes vt-enter {
  from { opacity: 0; transform: translateY(16px); }
}
```

- [ ] **Step 2: Clicked-card promotion.** Append inside the theatre.js IIFE:

```js
  /* ----- view-transition handoff: the clicked card's title (not the
     hub h1) morphs into the next page's h1 ----- */
  window.addEventListener("pageswap", function (event) {
    if (!event.viewTransition || reduce.matches) { return; }
    var entry = event.activation && event.activation.entry;
    var url = entry ? entry.url : null;
    if (!url) { return; }
    var links = document.querySelectorAll(".postcard h2 a, .postcard h3 a");
    for (var i = 0; i < links.length; i++) {
      if (links[i].href === url) {
        var heading = links[i].closest("h2, h3");
        var pageTitle = document.querySelector("h1");
        if (heading && pageTitle) {
          pageTitle.style.viewTransitionName = "none";
          heading.style.viewTransitionName = "page-title";
        }
        break;
      }
    }
  });

  /* a BFCache restore would resurrect the inline promotions above,
     leaving two elements named page-title (which skips every later
     transition) — clear them when the page returns from the cache */
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) { return; }
    Array.prototype.forEach.call(document.querySelectorAll(".postcard h2, .postcard h3, h1"), function (node) {
      node.style.removeProperty("view-transition-name");
    });
  });
```

- [ ] **Step 3: Run the suite**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `36 passed`

- [ ] **Step 4: Visual check** (Chromium-family browser):
  - Home → Lessons: page slide-fades, brand stays put, h1 morphs into h1.
  - Hub → click a card: the card's title morphs into the article h1.
  - Article → back: reverse morph. Reduced motion: instant navigation. Firefox/older: plain navigation, no errors.

- [ ] **Step 5: Commit**

```powershell
git add docs/css/main.css docs/js/theatre.js
git commit -m @'
feat: cross-document view transitions between all pages

Pure-CSS @view-transition navigation: persistent brand, h1-to-h1
page-title morph (one h1 per page is suite-enforced), slide-fade root.
theatre.js promotes a clicked postcard title to the page-title name at
pageswap so hub-to-lesson morphs start from the card. Motion-gated;
unsupported browsers just navigate.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 14: Print/reduced-motion audit, docs, final verification

**Files:**
- Modify: `docs/css/main.css` (print block), `superpowers/architecture.md`, `README.md`, `.claude/agent-memory/context.md`, `.claude/agent-memory/decisions.md`

**Interfaces:**
- Consumes: every class this plan introduced
- Produces: shipped, documented feature

- [ ] **Step 1: Extend the print block.** Inside the existing `@media print { ... }` in `main.css`, add before its closing brace:

```css
  /* theatrical layer: none of it belongs on paper */
  h1, .section-title, .quiz-finale-count {
    background: none;
    color: var(--ink);
    animation: none;
    filter: none;
  }
  [data-watermark]::before,
  .flight-scene,
  .hero-envelope,
  .postcard::after,
  .quiz-finale,
  .proof-track[aria-hidden="true"],
  .proof-track .stamp[aria-hidden="true"] { display: none !important; }
  .hero-letter {
    box-shadow: none;
    border: 0;
    padding: 0;
    animation: none;
    background: none;
  }
  /* the marquee must print as today's plain wrapped strip: kill the
     edge-fade mask (masks alpha-fade printed text) and let it wrap */
  .proof-strip { display: block; overflow: visible; -webkit-mask: none; mask: none; }
  .proof-track { flex-wrap: wrap; animation: none; }
  .band,
  .site-footer {
    -webkit-mask: none;
    mask: none;
    background: none;
  }
```

- [ ] **Step 2: Reduced-motion sweep** (verification, no code expected): emulate `prefers-reduced-motion: reduce` and walk home, hub, a quiz, an article. Expect: no aurora drift/hue, static gradient ink, no watermark drift, composed hero, no flight path, static wrapped proof strip, no tilt/magnet/confetti/finale, no view transitions, no marching stripes. Any motion found = a bug; fix it in the offending rule (the global kill switch should already cover CSS animations/transitions).

- [ ] **Step 3: Mobile sweep**: 375px viewport, JS on — no horizontal scroll on any page; hero readable; teeth/marquee behave; touch shows no tilt/magnet.

- [ ] **Step 4: Update `superpowers/architecture.md`.** In the design-system section, append this subsection:

```markdown
### Theatrical layer (2026-07-19, Max Postal spec)

- `docs/js/theatre.js` — decorative-only enhancement layer on every page
  (suite-enforced): locale-aware watermark words, postcard tilt/glare
  (±8°, writes `--rx/--ry/--mx/--my`), magnetic buttons
  (`--magx/--magy`), stamp-confetti canvas, quiz count-up finale,
  view-transition title promotion. Guards: reduced motion disables all;
  tilt/magnet also need `(pointer: fine)` + `min-width: 46em`. Styling
  via CSSOM `setProperty` only (CSP forbids style attributes).
- Quiz coupling is one-way: `quiz.js` dispatches `bwb:quiz:correct`
  ({button}) and `bwb:quiz:done` ({host, scoreLine, score, total});
  theatre.js listens if present.
- Ambient CSS: aurora mesh + grain (`docs/assets/grain.svg` — real file,
  CSP img-src 'self' blocks data: URIs) with topic tinting via
  `body:has(main[data-topic])`; gradient ink (`--ink-gradient`,
  AA-safe stops) behind `@supports background-clip: text`; torn-edge
  masks; ghost watermarks (`data-watermark` + `data-watermark-key`);
  scroll-driven flight path + `@view-transition` (progressive, gated).
- New-page recipe unchanged: copying an existing page carries the
  theatre.js tag; `test_theatre_js_referenced_everywhere` fails the
  build if a page loses it, `test_no_external_runtime_requests` guards
  self-containment.
```

- [ ] **Step 5: Update `README.md`**: in the Features list add one bullet:

```markdown
- **Theatrical layer**: site-wide ambient system (aurora mesh, paper grain, animated gradient ink, torn-paper edges, cross-page view transitions) with per-tier set-pieces — envelope hero, scroll-drawn flight path and stamp marquee on the home page; 3D postcard tilt, postmarks and magnetic chips on the hub; stamp-confetti and a count-up finale in quizzes — all in [`docs/css/main.css`](docs/css/main.css) plus one dependency-free [`docs/js/theatre.js`](docs/js/theatre.js), fully degrading for no-JS, reduced-motion, print, and mobile.
```

Update both test counts `34` → `36` (Features bullet on the validation suite, Demonstration output block, and the `collected: 34` sample), and add `theatre.js` to the project-layout `js/` line. Re-run the suite and paste the REAL output into the Demonstration block (verification-before-completion: never fabricate output).

- [ ] **Step 6: Update agent memory.** `.claude/agent-memory/context.md`: extend the design-system bullet with the theatrical layer summary (theatre.js contract, guards, 36 tests). `.claude/agent-memory/decisions.md`: append a dated `(agent)` entry recording implementation decisions (real SVG assets over data: URIs because of CSP img-src; `translate` for magnet so it composes with `transform`; aria-hidden finale so screen readers keep the plain score; h1↔h1 morph with pageswap promotion).

- [ ] **Step 7: Full verification**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `36 passed`
Then a last look at home + hub + quiz + article in light AND dark schemes.

- [ ] **Step 8: Commit**

```powershell
git add docs/css/main.css superpowers/architecture.md README.md .claude/agent-memory/context.md .claude/agent-memory/decisions.md
git commit -m @'
docs: print-proof the theatrical layer and document it

Print block strips every new decorative surface (watermarks, flight
path, envelope, postmarks, finale, marquee duplicate, masks) and
restores solid ink for gradient headlines. Architecture, README
(36 tests), and agent memory updated to describe the Max Postal layer.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

- [ ] **Step 9: Hand off** — implementation complete; use superpowers:finishing-a-development-branch (user decides merge of `max-postal`; agents never push).
