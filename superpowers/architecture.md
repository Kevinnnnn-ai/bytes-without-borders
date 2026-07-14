# Site architecture

Plain multi-page static site in `docs/` (published directly by GitHub Pages
branch publishing). Every page is a complete HTML document with duplicated
shared chrome (header/nav/footer); JavaScript is progressive enhancement
only — the site is fully readable and navigable with JS off.

## Page anatomy

- Root pages use `./`-relative URLs and `<body data-root="./">`;
  pages in `docs/lessons/` use `../` and `<body data-root="../">`.
  `data-root` tells `i18n.js` where `locales/` lives.
- Every page's `<head>` carries a one-line inline script that adds the `js`
  class to `<html>`. CSS that hides content pending a JS reveal (mobile nav,
  contact form) is scoped to `html.js` so no-JS visitors get the open,
  static fallback instead of hidden content and dead buttons.
- Every page's `<head>` also carries: a Content-Security-Policy meta locked
  to `'self'` plus sha256 hashes of that page's exact inline scripts, a
  referrer policy, light/dark `theme-color` metas, and crossorigin preloads
  for the two font files. **If you edit any inline `<script>`, rerun
  `tests/tools/update_head_meta.py`** — a stale hash silently drops the
  page to its no-JS fallback, and `test_head_security_meta` fails on drift.
- JS-created UI (never in markup, so it costs no-JS visitors nothing):
  back-to-top button, article share button, filter result announcer
  (`aria-live`), quiz progress bar. Their user-facing strings are inline in
  `main.js`/`quiz.js` and move to locale files with the second language.
- Shared chrome is copied per page. When editing nav or footer, update every
  page (9 files) — the link/i18n tests catch misses.
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
`prefers-color-scheme`; system font stacks only. `--line` is for decorative
hairlines; interactive control borders (form fields, quiz choices) use
`--line-strong`, which meets WCAG non-text contrast in both themes.

## Add an article

1. Copy an existing article in `docs/lessons/`, keep the chrome intact.
2. Update `<title>`, meta description, `data-topic`, header, and body.
3. Add an entry to `docs/data/lessons.json` (slug, href, title, topic,
   summary, minutes, kind: "article").
4. Add a postcard card to `docs/lessons/index.html` — hub cards use `<h2>`
   (and optionally add one to the home featured grid, which uses `<h3>`
   under its section `<h2>`).
5. Run the suite — it verifies links, JSON shape, and page basics.

## Add an interactive lesson (quiz)

1. Write `docs/data/quiz-<slug>.json` in the shape of
   `quiz-data-privacy.json` ({title, questions: [{prompt, choices[],
   answerIndex, explanation}]}). All `quiz-*.json` files are shape-checked
   by the test suite; `answerIndex` must be an integer.
2. Copy `docs/lessons/quiz-data-privacy.html`, point `#quiz[data-src]` at
   the new JSON (the link checker validates `data-src` targets too).
3. Register it in `lessons.json` and the hub (kind: "interactive").

## Add a language

1. Copy `docs/locales/en.json` to `docs/locales/<code>.json` and translate
   the values (keys stay identical).
2. Add `<option value="<code>">` to the `#lang-switch` select on every page.
3. Switching languages applies the dictionary in place (no page reload);
   switching back to English restores the original inline text. Article
   bodies are not keyed — they localize by copying the page when a full
   translation program starts. Quiz UI strings currently live at the top of
   `docs/js/quiz.js` (`STRINGS`) and move to locale files with the second
   language.

## Testing

`tests/test_site.py` (run from the `.env.local` venv) validates: required
pages exist, every internal `href`/`src`/`data-src` resolves inside `docs/`
with exact-case path components (Pages serves case-sensitively), all JSON
parses with the right shape (every `quiz-*.json`, not just the first),
every `data-i18n` key exists in `en.json`, one `<h1>`/title/lang/meta on
every HTML page, and the hub links every lesson. Session summaries land in
`stdout/last-test-report.txt` (gitignored). `.github/workflows/tests.yml`
runs the same suite on every push on Linux.

## Deployment

GitHub Pages branch publishing: repo settings → Pages → Source: Deploy from
a branch, branch `main`, folder `/docs`. Every push to `main` publishes
`docs/` as-is; `docs/.nojekyll` disables Jekyll processing. CI cannot block
branch publishing — treat a red `tests.yml` run as a broken production site.
