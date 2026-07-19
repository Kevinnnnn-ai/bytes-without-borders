# Bytes Without Borders

Bytes Without Borders is a volunteer initiative informing the broader
population through localized micro-lessons — short, practical, and free.
It writes plain-language material on data privacy, tech literacy, and
digital inclusion, built to be translated and taught anywhere: on a slow
connection, on a cheap phone, or read aloud from a printout.

## The stack (deliberately boring)

The published site is plain static HTML/CSS/JS under `docs/` — no
framework, no build step, no bundler. GitHub Pages serves `docs/` directly
via branch publishing (repo settings → Pages → Deploy from a branch,
`main`, `/docs`); every push to `main` goes live as-is. JavaScript is
progressive enhancement only — every page is fully readable and navigable
with JS off — and the site makes no external requests at runtime (fonts,
styles, and scripts are all self-hosted).

## Local preview

```
python -m http.server 8000 -d docs
```

Then open `http://localhost:8000/`.

## Running the tests

Tests live in `tests/` and run from the project's local virtual
environment on Windows:

```
.env.local\Scripts\python.exe -m pytest tests -q
```

The suite checks required pages, that every internal link resolves inside
`docs/` with the right case, JSON shapes for lessons and quizzes, i18n key
coverage, per-page basics (title/lang/h1/meta), and that `docs/sitemap.xml`
matches the pages actually in `docs/`.

If you edit any inline `<script>` in a page's `<head>`, rerun:

```
.env.local\Scripts\python.exe tests\tools\update_head_meta.py
```

Every page carries a hash-pinned Content-Security-Policy meta; a stale
hash silently drops that page to its no-JS fallback, and
`test_head_security_meta` will catch the drift.

## Adding content

Full walkthroughs live in `superpowers/architecture.md`. Short version:

- **Article** — copy an existing page in `docs/lessons/`, keep the shared
  chrome, and add an entry to `docs/data/lessons.json` plus a card on the
  lessons hub. See "Add an article" in `superpowers/architecture.md`.
- **Quiz** — write a `docs/data/quiz-<slug>.json`, copy an existing quiz
  page and point it at the new JSON, then register it in `lessons.json`
  and the hub. See "Add an interactive lesson (quiz)".
- **Language** — copy `docs/locales/en.json`, translate the values, and add
  an option to the language switcher on every page. Full translated
  articles (too long/nuanced for the in-place dictionary swap) ship as
  standalone page copies instead, as the Spanish pilot lessons do. See
  "Add a language".

## Languages

English, plus a two-lesson Spanish pilot (`docs/lessons/es/`). The rest of
the site is English-only for now; more languages are a stated future goal.

## Volunteering

The initiative runs on volunteers who translate lessons, write new
material, or teach it in their own communities. Get in touch via the
"Get involved" page or `hello@byteswithoutborders.example` — note that
this address is a placeholder and will be replaced with a real contact
channel before launch.

## License and sharing

The lessons are meant to be shared, translated, and taught onward freely.
If you reuse or adapt this material, keep it free for the next reader.
