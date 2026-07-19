# Project Context

- Bytes Without Borders: initiative informing the broader population through
  localized micro-lessons; this repo is the website (articles + interactive
  pages on data privacy, tech literacy, digital inclusion).
- Stack (user-decided 2026-07-13): plain HTML/CSS/JS, no framework, no build
  step. The publishable site lives entirely in `docs/`, served by GitHub
  Pages branch publishing (Settings → Pages → Deploy from a branch, `main`,
  `/docs`). No Actions deploy; `.github/workflows/tests.yml` runs the pytest
  suite on every push as a non-blocking signal. User pushes; agents never push.
- Project documentation lives in `superpowers/` (architecture.md, specs,
  plans) so it is not part of the published site. `docs/` is site-only.
- Python is used only for validation: venv `.env.local/`, pytest suite in
  `tests/`, artifacts to `stdout/`.
- Progressive enhancement contract: every page's head adds a `js` class to
  <html>; CSS that hides chrome pending a JS reveal (mobile nav, contact
  form, hub filter) is scoped to `html.js`, so no-JS visitors get open
  static fallbacks. Keep this pattern for any new JS-revealed UI.
- i18n: inline English + `data-i18n` keys resolved against
  `docs/locales/en.json`; switching applies in place (originals stashed per
  node, no reload); add a language = one JSON + one `<option>` per page.
  Full translated PAGES (long prose) live as standalone copies under
  `docs/lessons/<code>/` (`html lang="<code>"`, no `data-i18n`, translated
  chrome). The Spanish pilot (2026-07-18) covers two lessons under
  `lessons/es/`. Cross-link contract: `body[data-alt-<code>]` makes the
  switcher navigate to the sibling copy, and each page carries `hreflang`
  alternates (translated pages: the language pair; English originals also add
  `x-default`) as absolute URLs under SITE_BASE. `tests/test_site.py`
  enforces the pairing (`test_translation_pages_cross_linked`) and the
  `lessons/<code>/` lang rule.
- Design system (modernized 2026-07-13 at user request): postal identity
  (airmail stripes, stamp chips) on light near-white paper with an
  indigo + coral pairing; amber/emerald topic accents; drifting aurora
  background, scroll reveals (IntersectionObserver), scroll-driven progress
  bar, glass sticky header. Tokens only in `docs/css/main.css`; `--line`
  decorative, `--line-strong` for interactive borders. Fonts are
  SELF-HOSTED variable woff2 (Bricolage Grotesque display 200–800,
  Instrument Sans body 400–700 — no lighter body weight exists) in
  `docs/assets/fonts/` — still no external requests at runtime.
  All motion scoped to `html.js` + disabled under prefers-reduced-motion
  and print.
- Type/rhythm conventions (refined 2026-07-14 at user request, documented
  in `superpowers/architecture.md`): 16px body on `--ink-body` (softer ink
  substitutes for the unavailable sub-400 weight; heading-like paragraphs
  re-assert `--ink`); `--space-1..5` space content within a group and
  `--section-pad` (viewport clamp) is the only between-section unit; cards
  are flex columns with `.postcard-meta` pinned via `margin-top: auto`.
- Contact address is a placeholder: `hello@byteswithoutborders.example`
  (footers, get-involved form, `docs/js/main.js`) — must be replaced before
  launch.
- Stated direction: more lessons and languages over time; a real contact
  backend eventually; extension recipes live in `superpowers/architecture.md`.
