# Site architecture

Plain multi-page static site in `docs/` (published directly by GitHub Pages
branch publishing). Every page is a complete HTML document with duplicated
shared chrome (header/nav/footer); JavaScript is progressive enhancement
only — the site is fully readable and navigable with JS off.

## Page anatomy

- Root pages use `./`-relative URLs and `<body data-root="./">`; pages in
  `docs/lessons/` use `../` and `<body data-root="../">`; the Spanish
  pilot pages in `docs/lessons/es/` are one level deeper and use `../../`.
  `data-root` tells `i18n.js` where `locales/` lives.
- Every page's `<head>` carries a one-line inline script that adds the `js`
  class to `<html>`. CSS that hides content pending a JS reveal (mobile nav,
  contact form, hub filter) is scoped to `html.js` so no-JS visitors get the
  open, static fallback instead of hidden content and dead buttons.
- Every page's `<head>` also carries: a Content-Security-Policy meta locked
  to `'self'` plus sha256 hashes of that page's exact inline scripts, a
  referrer policy, light/dark `theme-color` metas, and crossorigin preloads
  for the two font files. **If you edit any inline `<script>`, rerun
  `tests/tools/update_head_meta.py`** — a stale hash silently drops the
  page to its no-JS fallback, and `test_head_security_meta` fails on drift.
- JS-created UI (never in markup, so it costs no-JS visitors nothing):
  back-to-top button, article share button, filter result announcer
  (`aria-live`), hub filter count chips, quiz progress bar. Their
  user-facing strings are authored as English defaults inline in
  `main.js` (`ui.*`, `hub.showing`) and `quiz.js` (`quiz.*`), and resolve
  against `window.bwbDict` — the active flattened locale dictionary that
  `i18n.js` always exposes (`{}` for English) — falling back to the inline
  default on a missing file or key.
- `i18n.js` fires a `bwb:langchange` CustomEvent on `document` after every
  dictionary apply/restore; `quiz.js` listens and re-renders its current
  screen so in-progress quiz UI relabels without losing state.
- Translated page pairs (English original + `docs/lessons/<code>/` copy)
  cross-link via a `data-alt-<code>` attribute on `<body>` (e.g.
  `data-alt-es="./es/understanding-passwords.html"` on the English page,
  `data-alt-en="../understanding-passwords.html"` on the Spanish copy).
  `i18n.js` checks for this attribute before dictionary-swapping and
  navigates there instead when that language is chosen — a translated page
  (`html[lang]` != `en`) never dictionary-swaps, it only navigates back.
  Both pages also carry reciprocal `<link rel="alternate" hreflang="...">`
  blocks (the pair, e.g. `en`+`es`; English originals additionally list
  `x-default`) as absolute URLs under `SITE_BASE`. `test_translation_pages_
  cross_linked` resolves every hreflang href and checks the `data-alt-*`
  pair points at the real sibling file.
- Shared chrome is copied per page. When editing nav or footer, update
  every page (19 files) — the link/i18n tests catch misses. 19 HTML pages
  is the agreed line where a partials/build-step decision gets revisited
  before the site grows further (see `decisions.md`, 2026-07-13).
- All URLs are relative. Never use root-relative `/...` paths — GitHub Pages
  project sites serve under `/<repo>/`. The one exception is `404.html`,
  which GitHub Pages serves at arbitrary missing paths: an inline script
  injects a `<base>` tag pointing at the site root when running on
  `*.github.io`.

## Design system

All tokens live in `docs/css/main.css` `:root` (palette, type scale,
spacing). Topic accents switch via `data-topic="data-privacy | tech-literacy
| digital-inclusion"` on a container, which sets `--topic` for its children.
Signature elements: airmail stripe (`.airmail-rule`, card `::before`) and the
dashed `.stamp` chip showing lesson minutes. Dark scheme comes from
`prefers-color-scheme`; fonts are self-hosted variable woff2 (Bricolage
Grotesque display 200–800, Instrument Sans body 400–700). `--line` is for
decorative hairlines; interactive control borders (form fields, quiz
choices) use `--line-strong`, which meets WCAG non-text contrast in both
themes.

Type and rhythm conventions:

- Instrument Sans has no weight below 400. Copy that should read lighter
  uses the `--ink-body` token (paragraph default), never a sub-400
  `font-weight`. Paragraphs that act as headings (`.footer-mission`,
  `.quiz-question`, `.quiz-score`) re-assert `--ink`.
- `--space-1`–`--space-5` space content *within* a group; `--section-pad`
  (a viewport clamp) is the only between-section unit — section paddings,
  hero/article-header tops, footer offset. Keeping the two tiers apart is
  what makes the spacing read intentional; don't use `--space-*` to
  separate sections or `--section-pad` inside a component.
- Cards (`.topic-card`, `.postcard`) are flex columns; `.postcard-meta`
  pins to the card floor with `margin-top: auto` so meta rows align across
  a grid row, and the cards' last child drops its bottom margin.

## Lessons hub filter

`docs/lessons/index.html` ships its filter bar `hidden` and `main.js`
reveals it. Each filter button's visible label sits in a nested
`<span data-i18n="hub.filter*">`, never as text directly on the `<button>`:
`i18n.js`'s dictionary swap replaces a node's `textContent` wholesale, which
would silently delete any sibling content the label shared a text node
with. That inner span is what lets `main.js` safely append a sibling
`<span class="filter-count">· n</span>` next to the label — the count is
computed once from the rendered `[data-lesson-card]` elements at load time
(never hardcoded), so it always matches the actual card set. Clicking a
button hides/shows cards by topic and announces the result through an
`aria-live` region using the `hub.showing` string.

## Add an article

1. Copy an existing article in `docs/lessons/`, keep the chrome intact.
2. Update `<title>`, meta description, `data-topic`, header, and body.
3. Add an entry to `docs/data/lessons.json` (slug, href, title, topic,
   summary, minutes, kind: "article").
4. Add a postcard card to `docs/lessons/index.html` — hub cards use `<h2>`
   (and optionally add one to the home featured grid, which uses `<h3>`
   under its section `<h2>`).
5. Add the page to `docs/sitemap.xml` (one `<url><loc>...</loc></url>`,
   absolute under `SITE_BASE`) — `test_sitemap_covers_site` enforces that
   every non-`404.html` page appears exactly once and every listed URL
   resolves.
6. Run the suite — it verifies links, JSON shape, sitemap coverage, and
   page basics.

## Add an interactive lesson (quiz)

1. Write `docs/data/quiz-<slug>.json` in the shape of
   `quiz-data-privacy.json` ({title, questions: [{prompt, choices[],
   answerIndex, explanation}]}). All `quiz-*.json` files are shape-checked
   by the test suite; `answerIndex` must be an integer.
2. Copy `docs/lessons/quiz-data-privacy.html`, point `#quiz[data-src]` at
   the new JSON (the link checker validates `data-src` targets too).
3. Register it in `lessons.json` and the hub (kind: "interactive").

## Add a language

Demonstrated end to end by Spanish (`es`): a full chrome/UI dictionary plus
two lessons translated as standalone page copies.

**Chrome/UI dictionary** (covers every page's static chrome and JS-created
UI; article bodies stay English unless also given a page copy below):

1. Copy `docs/locales/en.json` to `docs/locales/<code>.json` and translate
   every value (keys stay identical — `test_locale_key_parity` enforces an
   exact key-set match against `en.json` and rejects empty values).
2. Add `<option value="<code>">` to the `#lang-switch` select on every page,
   including `404.html` — `test_lang_switcher_options` requires both `en`
   and every other shipped code on every page.
3. Switching languages applies the dictionary in place (no page reload);
   switching back to English restores the stashed original inline text.
   `main.js` (`ui.*`, `hub.showing`) and `quiz.js` (`quiz.*`) resolve their
   own strings the same way — English default inline, override from
   `window.bwbDict` — so a missing locale file or key degrades to English
   exactly as before.

**Translated page copy** (for an individual lesson whose prose is too long
or nuanced for the dictionary-swap model):

1. Copy the English lesson to `docs/lessons/<code>/<slug>.html` with
   `data-root` one level deeper (e.g. `../../`), `<html lang="<code>">`,
   and every string — chrome and body — translated inline. No `data-i18n`
   attributes: the page itself is the translation.
2. Add `data-alt-<code>="<code>/<slug>.html"` to the English page's
   `<body>`, and `data-alt-en="../<slug>.html"` to the copy's `<body>` (see
   Page anatomy above for how the switcher uses this).
3. Add reciprocal `hreflang` alternates to both pages' `<head>` (absolute
   URLs under `SITE_BASE`); the English original also lists `x-default`.
4. Add a small stamp-styled cross-link near the meta row on both pages
   (e.g. "Disponible en español →" / "In English →") so the pairing
   works with JS off.
5. Add the new page to `docs/sitemap.xml`.

Quiz question JSON is out of scope for a translated-page pass — only the
quiz UI strings (`quiz.*`) come from the chrome dictionary; the linked quiz
pages stay in whatever language their question JSON is written in.

## Testing

`tests/test_site.py` (run from the `.env.local` venv, 32 tests, fully
green) validates: required pages exist, every internal `href`/`src`/
`data-src` resolves inside `docs/` with exact-case path components (Pages
serves case-sensitively), all JSON parses with the right shape (every
`quiz-*.json`, not just the first), every `data-i18n` key exists in
`en.json`, one `<h1>`/title/meta/viewport and correct `<html lang>` on
every HTML page, and the hub links every lesson. Plus, from the flesh-out
round:

- **Locale parity**: `es.json`'s flattened key set matches `en.json`
  exactly, with no empty values.
- **Switcher options**: every page's `#lang-switch` offers both `en` and
  `es`.
- **Translation cross-links**: every Spanish/English lesson pair has
  matching, resolvable `data-alt-*` attributes and a symmetric, resolvable
  `hreflang` alternate set.
- **Sitemap coverage**: every HTML page except `404.html` appears exactly
  once in `docs/sitemap.xml`, with no duplicates, and every sitemap URL
  resolves inside `docs/`.
- **Robots**: `docs/robots.txt` exists and points at the sitemap.

Session summaries land in `stdout/last-test-report.txt` (gitignored).
`.github/workflows/tests.yml` runs the same suite on every push on Linux.

## Deployment

GitHub Pages branch publishing: repo settings → Pages → Source: Deploy from
a branch, branch `main`, folder `/docs`. Every push to `main` publishes
`docs/` as-is; `docs/.nojekyll` disables Jekyll processing. CI cannot block
branch publishing — treat a red `tests.yml` run as a broken production site.
