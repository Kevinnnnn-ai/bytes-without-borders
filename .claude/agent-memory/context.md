# Project Context

- Bytes Without Borders: initiative informing the broader population through
  localized micro-lessons; this repo is the website (articles + interactive
  pages on data privacy, tech literacy, digital inclusion).
- Stack (user-decided 2026-07-13): plain HTML/CSS/JS, no framework, no build
  step; site lives entirely in `src/`; deployed to GitHub Pages via
  `.github/workflows/deploy-pages.yml` (user pushes; agents never push).
- Python is used only for validation: venv `.env.local/`, pytest suite in
  `tests/`, artifacts to `stdout/`.
- i18n: inline English + `data-i18n` keys resolved against
  `src/locales/en.json`; add a language = one JSON + one `<option>` per page.
- Design system: postal warm-humanist (airmail stripes, stamp chips, postal
  red/blue duotone, per-topic accents) — tokens only in `src/css/main.css`.
- Contact address is a placeholder: `hello@byteswithoutborders.example`
  (footers, get-involved form, `src/js/main.js`) — must be replaced before
  launch.
- Stated direction: more lessons and languages over time; a real contact
  backend eventually; extension recipes live in `docs/architecture.md`.
