# Site architecture

Plain multi-page static site in `src/`. Every page is a complete HTML document
with duplicated shared chrome (header/nav/footer); JavaScript is progressive
enhancement only — the site is fully readable with JS off.

## Page anatomy

- Root pages use `./`-relative URLs and `<body data-root="./">`;
  pages in `src/lessons/` use `../` and `<body data-root="../">`.
  `data-root` tells `i18n.js` where `locales/` lives.
- Shared chrome is copied per page. When editing nav or footer, update every
  page (9 files) — the link/i18n tests catch misses.
- All URLs are relative. Never use root-relative `/...` paths — GitHub Pages
  project sites serve under `/<repo>/`.

## Design system

All tokens live in `src/css/main.css` `:root` (palette, type scale, spacing).
Topic accents switch via `data-topic="data-privacy | tech-literacy |
digital-inclusion"` on a container, which sets `--topic` for its children.
Signature elements: airmail stripe (`.airmail-rule`, card `::before`) and the
dashed `.stamp` chip showing lesson minutes. Dark scheme comes from
`prefers-color-scheme`; system font stacks only.

## Add an article

1. Copy an existing article in `src/lessons/`, keep the chrome intact.
2. Update `<title>`, meta description, `data-topic`, header, and body.
3. Add an entry to `src/data/lessons.json` (slug, href, title, topic,
   summary, minutes, kind: "article").
4. Add a postcard card to `src/lessons/index.html` (and optionally to the
   home featured grid).
5. Run the suite — it verifies links, JSON shape, and page basics.

## Add an interactive lesson (quiz)

1. Write `src/data/quiz-<slug>.json` in the shape of `quiz-data-privacy.json`
   ({title, questions: [{prompt, choices[], answerIndex, explanation}]}).
2. Copy `src/lessons/quiz-data-privacy.html`, point `#quiz[data-src]` at the
   new JSON.
3. Register it in `lessons.json` and the hub (kind: "interactive").

## Add a language

1. Copy `src/locales/en.json` to `src/locales/<code>.json` and translate the
   values (keys stay identical).
2. Add `<option value="<code>">` to the `#lang-switch` select on every page.
3. Article bodies are not keyed — they localize by copying the page when a
   full translation program starts. Quiz UI strings currently live at the top
   of `src/js/quiz.js` (`STRINGS`) and move to locale files with the second
   language.

## Testing

`tests/test_site.py` (run from the `.env.local` venv) validates: required
pages exist, every internal href/src resolves, all JSON parses with the right
shape, every `data-i18n` key exists in `en.json`, one `<h1>`/title/lang/meta
per page, and the hub links every lesson. Session summaries land in
`stdout/last-test-report.txt` (gitignored).

## Deployment

`.github/workflows/deploy-pages.yml` uploads `src/` as the Pages artifact on
push to `main`. Pages source must be set to "GitHub Actions" once in repo
settings.
