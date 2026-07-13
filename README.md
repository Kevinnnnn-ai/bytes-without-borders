# Bytes Without Borders — website

Static website for the Bytes Without Borders initiative: free, plain-language
micro-lessons on **data privacy**, **tech literacy**, and **digital inclusion**,
written to be localized and taught anywhere.

Plain HTML/CSS/JS — no framework, no build step, no external requests.

## Quickstart

```powershell
# serve the site locally
python -m http.server 8000 -d docs
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
| `docs/` | the entire publishable site (GitHub Pages serves exactly this) |
| `docs/lessons/` | lesson hub, article pages, interactive quizzes |
| `docs/data/` | lesson index + quiz definitions (JSON) |
| `docs/locales/` | i18n dictionaries (`en.json` is the reference) |
| `tests/` | pytest suite: links, JSON shapes, i18n coverage, page basics |
| `superpowers/architecture.md` | how to add an article, a quiz, or a language |
| `.github/workflows/tests.yml` | runs the validation suite on every push |

## Deploying

1. In repo settings → Pages, set **Source: Deploy from a branch**,
   branch `main`, folder `/docs` (one-time).
2. Push to `main`. GitHub Pages publishes `docs/` directly — no build,
   no Actions dependency. The `tests.yml` workflow still runs the validation
   suite on every push so a broken link or malformed JSON shows as a red X
   (branch publishing itself cannot be blocked by CI).

## Before going live

- Replace the placeholder contact address `hello@byteswithoutborders.example`
  (it appears in the page footers, the get-involved form, and `docs/js/main.js`).

## Contributing

See `superpowers/architecture.md` for the three supported extension paths:
new article, new interactive lesson, new language.
