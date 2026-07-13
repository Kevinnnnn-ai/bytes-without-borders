# Bytes Without Borders — Website Skeleton Design

**Date:** 2026-07-13
**Status:** Approved by user
**Scope:** Initial website skeleton — structure, pages, styling system, interactivity patterns, i18n scaffolding, and tests.

## Purpose

Bytes Without Borders informs the broader population through localized micro-lessons.
The website hosts articles and interactive pages on three topics: **data privacy**,
**tech literacy**, and **digital inclusion**. This skeleton establishes every pattern
the site needs (article authoring, interactive lessons, localization, testing) so that
future work is "add content," not "invent structure."

## Decisions (user-confirmed)

| Decision | Choice |
|---|---|
| Stack | Plain HTML/CSS/JS, no framework, no build step |
| Hosting | GitHub Pages, deployed from `src/` via GitHub Actions |
| Sections | Home, About, Lessons hub, 3 sample articles, interactive quiz demo, Get Involved |
| Localization | Structure wired now, English-only content shipped |
| Visual direction | Warm humanist — approachable editorial, warm palette, serif/sans pairing |

## Architecture

**Approach:** plain multi-page static site. Every page is a complete HTML document with
shared header/footer markup duplicated per page (acceptable at ~9 pages; most robust —
no build step, full content without JavaScript). Vanilla JS is used only where it adds
function, always as progressive enhancement:

- Quiz engine (interactive micro-lesson)
- Language switcher (i18n)
- Lessons-hub topic filter
- Mobile navigation toggle

Rejected alternatives: JS-injected shared partials (chrome vanishes without JS, breaks
on `file://`); Jekyll (Ruby toolchain for local preview, user asked for plain HTML/CSS/JS).

## File structure

```
src/                            # everything below deploys to GitHub Pages
  index.html                    # Home: mission, topic overview, featured lessons
  about.html                    # The initiative, values, who it serves
  get-involved.html             # Volunteer/contribute + contact form stub (no backend)
  404.html                      # GitHub Pages native 404
  .nojekyll                     # disable Jekyll processing on Pages
  lessons/
    index.html                  # Lessons hub: cards, filterable by topic
    understanding-passwords.html        # sample article — data privacy
    spotting-misinformation.html        # sample article — tech literacy
    bridging-the-digital-divide.html    # sample article — digital inclusion
    quiz-data-privacy.html      # interactive micro-lesson (working quiz)
  css/
    main.css                    # design tokens, layout, components, light/dark
  js/
    main.js                     # nav toggle, lessons filter
    i18n.js                     # dictionary loader + data-i18n swap + localStorage
    quiz.js                     # quiz engine, renders from JSON
  data/
    lessons.json                # lesson metadata: slug, title, topic, summary, minutes
    quiz-data-privacy.json      # quiz questions/answers/explanations
  locales/
    en.json                     # reference dictionary for all data-i18n keys
  assets/
    logo.svg, favicon.svg       # inline-friendly SVG branding
.github/workflows/deploy-pages.yml   # actions/upload-pages-artifact + deploy-pages
tests/                          # pytest suite (run from .env.local venv)
  test_site.py                  # link checker, JSON validity, HTML sanity, i18n key coverage
docs/
  superpowers/specs/…           # this spec
  architecture.md               # how to add an article / lesson / language
README.md
requirements.txt                # pytest + test-only deps
.gitignore                      # .env.local/, stdout/ artifacts, OS noise
```

## Key patterns

### Adding an article
1. Copy an existing article HTML file in `src/lessons/`.
2. Add one entry to `src/data/lessons.json`.
The hub renders cards from static HTML; the JSON drives the filter and featured list.

### Interactive lessons
`quiz.js` reads a JSON definition (`data/quiz-*.json`) and renders question → choices →
explanation → score. A new quiz = one JSON file + one thin HTML page. `<noscript>`
fallback explains the lesson requires JavaScript and links to the article version.

### Localization
- Translatable elements carry `data-i18n="key"` attributes; English text remains inline
  as the default (no flash of empty content, no JS required for English).
- `i18n.js` fetches `locales/<lang>.json`, swaps text content, persists choice to
  `localStorage`, sets `<html lang>`.
- Adding a language = one new `locales/<lang>.json` + one `<option>` in the switcher.

### Visual system (warm humanist)
- CSS custom properties for palette/type/spacing in `:root`; `prefers-color-scheme`
  dark variant.
- Warm paper-toned background, deep warm ink, one warm accent per topic category.
- Serif display face for headings, humanist sans for body (system stacks; no webfont
  dependency for the skeleton).
- Implemented under the `frontend-design` skill per AGENTS.md.

## Error handling

- `404.html` served natively by GitHub Pages.
- All JS features are progressive enhancement; the site is fully readable with JS off.
- `i18n.js` falls back to inline English when a dictionary or key is missing.
- Quiz shows a `<noscript>` message and validates its JSON shape before rendering.

## Testing (per AGENTS.md)

- Python tooling in `.env.local/` venv; deps pinned in `requirements.txt`.
- `tests/test_site.py` (pytest, stdlib parsers — no site runtime deps):
  - every internal `href`/`src` in `src/**/*.html` resolves to a file;
  - all JSON in `data/` and `locales/` parses and matches expected shape;
  - every `data-i18n` key used in HTML exists in `locales/en.json`;
  - each page has exactly one `<h1>`, a `<title>`, and `lang` attribute.
- Test reports/artifacts go to `stdout/`; cleaned up after runs.

## Out of scope (YAGNI)

- Backend of any kind (contact form is a stub with a `mailto:` fallback).
- CMS, build pipeline, JS framework, webfonts.
- Non-English content (structure only), search, analytics, comments.

## Success criteria

- `python -m http.server` from `src/` serves a fully navigable, styled site.
- Quiz works end-to-end; filter and language switcher work; JS-off degrades gracefully.
- pytest suite passes from the `.env.local` venv.
- Pushing the repo (user action) with Pages set to "GitHub Actions" publishes the site.
