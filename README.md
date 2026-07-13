# Bytes Without Borders — website

Static website for the Bytes Without Borders initiative: free, plain-language
micro-lessons on **data privacy**, **tech literacy**, and **digital inclusion**,
written to be localized and taught anywhere.

Plain HTML/CSS/JS — no framework, no build step, no external requests.

## Quickstart

```powershell
# serve the site locally
python -m http.server 8000 -d src
# → http://localhost:8000

# set up the test venv (once)
py -m venv .env.local
.env.local\Scripts\python.exe -m pip install -r requirements.txt

# run the validation suite
.env.local\Scripts\python.exe -m pytest tests -q
```

## Structure

| Path | What it is |
|---|---|
| `src/` | the entire publishable site (GitHub Pages serves exactly this) |
| `src/lessons/` | lesson hub, article pages, interactive quizzes |
| `src/data/` | lesson index + quiz definitions (JSON) |
| `src/locales/` | i18n dictionaries (`en.json` is the reference) |
| `tests/` | pytest suite: links, JSON shapes, i18n coverage, page basics |
| `docs/architecture.md` | how to add an article, a quiz, or a language |
| `.github/workflows/deploy-pages.yml` | GitHub Pages deploy (on push to main) |

## Deploying

1. In repo settings → Pages, set **Source: GitHub Actions** (one-time).
2. Push to `main`. The workflow publishes `src/`.

## Before going live

- Replace the placeholder contact address `hello@byteswithoutborders.example`
  (it appears in the page footers, the get-involved form, and `src/js/main.js`).

## Contributing

See `docs/architecture.md` for the three supported extension paths:
new article, new interactive lesson, new language.
