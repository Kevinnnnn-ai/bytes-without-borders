# Bytes Without Borders Website Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete static-site skeleton for byteswithoutborders — 9 pages, warm-humanist "postal" design system, JSON-driven lessons hub and quiz, i18n scaffold, pytest validation suite, and GitHub Pages deployment workflow.

**Architecture:** Plain multi-page static site in `src/`. Every page is a complete HTML document with duplicated shared chrome; vanilla JS is progressive enhancement only (nav toggle, topic filter, language switcher, quiz engine). A Python venv (`.env.local/`) powers a pytest suite that validates links, JSON shapes, i18n key coverage, and page basics.

**Tech Stack:** HTML5, CSS custom properties, vanilla ES5-compatible JS, Python 3 + pytest (validation only), GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-07-13-website-skeleton-design.md` (approved).

## Global Constraints

- No build step, no JS framework, no webfonts, no CDN/external requests — the site must be fully self-contained.
- All URLs relative (`./`, `../`) — never root-relative `/...` (GitHub Pages project sites serve under `/repo-name/`).
- Every page fully readable with JavaScript disabled; JS features are progressive enhancement.
- Python work runs from the local venv `.env.local/` (per CLAUDE.md). Test command: `.env.local\Scripts\python.exe -m pytest tests -q`.
- Test artifacts go to `stdout/` (gitignored except `.gitkeep`).
- Commit after every task with a descriptive message; **never push**.
- Topic slugs are exactly: `data-privacy`, `tech-literacy`, `digital-inclusion`.
- i18n: English inline in HTML is the source of truth; `data-i18n="dotted.key"` attributes map into `src/locales/en.json`. Every used key must exist there (test-enforced).
- Pages under `src/lessons/` use `../` link prefixes and `<body data-root="../">`; root pages use `./` and `<body data-root="./">`.
- Design tokens live only in `src/css/main.css` `:root` — no hard-coded colors elsewhere.
- Placeholder contact address is `hello@byteswithoutborders.example` (`.example` TLD, intentionally unregistrable) — README notes to replace it.

## File Map

| Path | Responsibility | Task |
|---|---|---|
| `requirements.txt` | pinned test deps | 1 |
| `tests/conftest.py` | report artifact to `stdout/` | 1 |
| `tests/test_site.py` | whole-site validation suite | 1 |
| `stdout/.gitkeep`, `src/.nojekyll` | plumbing | 1 |
| `src/css/main.css` | design system (tokens, components) | 2 |
| `src/assets/logo.svg`, `src/assets/favicon.svg` | branding | 2 |
| `src/index.html` | home | 3 |
| `src/about.html`, `src/get-involved.html`, `src/404.html` | static pages | 4 |
| `src/data/lessons.json`, `src/lessons/index.html`, 3 article pages, `src/js/main.js` | lessons section | 5 |
| `src/locales/en.json`, `src/js/i18n.js` | localization scaffold | 6 |
| `src/data/quiz-data-privacy.json`, `src/js/quiz.js`, `src/lessons/quiz-data-privacy.html` | interactive lesson | 7 |
| `.github/workflows/deploy-pages.yml` | Pages deploy | 8 |
| `README.md`, `docs/architecture.md`, `.claude/agent-memory/*` | docs + memory | 9 |
| — | full verification (pytest, server, browser) | 10 |

The pytest suite is written first (Task 1) and starts red; tasks turn it progressively green. **Full green is expected exactly at the end of Task 7.** Each task lists its expected pytest state.

---

### Task 1: Test harness + repo plumbing

**Files:**
- Create: `requirements.txt`, `tests/conftest.py`, `tests/test_site.py`, `stdout/.gitkeep`, `src/.nojekyll`

**Interfaces:**
- Produces: the pass/fail oracle every later task runs against; `REQUIRED_PAGES` list and topic-slug set that page tasks must satisfy.

- [ ] **Step 1: Create the venv and install deps**

Create `requirements.txt`:

```text
pytest==8.4.1
```

Run:

```powershell
py -m venv .env.local        # fallback: python -m venv .env.local
.env.local\Scripts\python.exe -m pip install -r requirements.txt
```

Expected: `Successfully installed ... pytest-8.4.1`.

- [ ] **Step 2: Write the plumbing files**

Create empty `stdout/.gitkeep` and empty `src/.nojekyll` (zero-byte files).

- [ ] **Step 3: Write the failing validation suite**

Create `tests/conftest.py`:

```python
"""Writes a plain-text summary of each pytest session to stdout/ (per AGENTS.md)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def pytest_sessionfinish(session, exitstatus):
    out_dir = ROOT / "stdout"
    out_dir.mkdir(exist_ok=True)
    (out_dir / "last-test-report.txt").write_text(
        "Bytes Without Borders site validation\n"
        f"collected: {session.testscollected}\n"
        f"failed: {session.testsfailed}\n"
        f"exit status: {exitstatus}\n",
        encoding="utf-8",
    )
```

Create `tests/test_site.py`:

```python
"""Static-site validation for Bytes Without Borders.

Run from the repo root:  .env.local\\Scripts\\python.exe -m pytest tests -q
Checks: required pages, internal links, JSON shapes, i18n key coverage,
and per-page basics (one h1, title, lang, meta description, viewport).
"""
from __future__ import annotations

import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

import pytest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"

REQUIRED_PAGES = [
    "index.html",
    "about.html",
    "get-involved.html",
    "404.html",
    "lessons/index.html",
    "lessons/understanding-passwords.html",
    "lessons/spotting-misinformation.html",
    "lessons/bridging-the-digital-divide.html",
    "lessons/quiz-data-privacy.html",
]

TOPICS = {"data-privacy", "tech-literacy", "digital-inclusion"}


class PageScan(HTMLParser):
    """Collects links, headings, title, lang, meta tags, data-i18n keys."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []
        self.h1_count = 0
        self._in_title = False
        self.title = ""
        self.lang = None
        self.i18n_keys: set[str] = set()
        self.metas: list[dict] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = a.get("lang")
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "title":
            self._in_title = True
        elif tag == "meta":
            self.metas.append(a)
        for key in ("href", "src"):
            if a.get(key):
                self.links.append(a[key])
        if "data-i18n" in a:
            self.i18n_keys.add(a["data-i18n"])

    def handle_data(self, data):
        if self._in_title:
            self.title += data

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False


_scan_cache: dict[Path, PageScan] = {}


def scan(path: Path) -> PageScan:
    if path not in _scan_cache:
        p = PageScan()
        p.feed(path.read_text(encoding="utf-8"))
        _scan_cache[path] = p
    return _scan_cache[path]


def html_files() -> list[Path]:
    return sorted(SRC.rglob("*.html"))


def flatten(obj, prefix=""):
    out = {}
    for k, v in obj.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = str(v)
    return out


@pytest.mark.parametrize("page", REQUIRED_PAGES)
def test_required_page_exists(page):
    assert (SRC / page).is_file(), f"missing required page: src/{page}"


@pytest.mark.parametrize("page", REQUIRED_PAGES)
def test_page_basics(page):
    path = SRC / page
    if not path.is_file():
        pytest.fail(f"src/{page} does not exist yet")
    s = scan(path)
    assert s.h1_count == 1, f"{page}: expected exactly one <h1>, found {s.h1_count}"
    assert s.title.strip(), f"{page}: empty or missing <title>"
    assert s.lang == "en", f"{page}: <html lang> must be 'en', got {s.lang!r}"
    names = {m.get("name"): m.get("content", "") for m in s.metas if m.get("name")}
    assert names.get("viewport"), f"{page}: missing viewport meta"
    assert names.get("description", "").strip(), f"{page}: missing meta description"


def test_internal_links_resolve():
    broken = []
    for f in html_files():
        for link in scan(f).links:
            parts = urlsplit(link)
            if parts.scheme or link.startswith("#") or link.startswith("//"):
                continue  # external / mailto / fragment
            path = unquote(parts.path)
            if not path:
                continue
            assert not path.startswith("/"), f"{f}: root-relative URL forbidden: {link}"
            target = (f.parent / path).resolve()
            if not target.exists():
                broken.append(f"{f.relative_to(ROOT)}: {link}")
    assert not broken, "broken internal links:\n" + "\n".join(broken)


def test_all_json_parses():
    json_files = list((SRC / "data").glob("*.json")) + list((SRC / "locales").glob("*.json"))
    assert json_files, "no JSON files found under src/data or src/locales"
    for j in json_files:
        json.loads(j.read_text(encoding="utf-8"))  # raises on invalid JSON


def test_lessons_json_shape():
    path = SRC / "data" / "lessons.json"
    if not path.is_file():
        pytest.fail("src/data/lessons.json does not exist yet")
    data = json.loads(path.read_text(encoding="utf-8"))
    lessons = data.get("lessons")
    assert isinstance(lessons, list) and lessons, "lessons.json must contain a non-empty 'lessons' list"
    required = {"slug", "href", "title", "topic", "summary", "minutes", "kind"}
    for lesson in lessons:
        missing = required - set(lesson)
        assert not missing, f"lesson {lesson.get('slug')!r} missing keys: {missing}"
        assert lesson["topic"] in TOPICS, f"unknown topic: {lesson['topic']!r}"
        assert lesson["kind"] in {"article", "interactive"}
        assert isinstance(lesson["minutes"], int) and lesson["minutes"] > 0
        assert (SRC / "lessons" / lesson["href"]).is_file(), f"lesson page missing: {lesson['href']}"


def test_quiz_json_shape():
    path = SRC / "data" / "quiz-data-privacy.json"
    if not path.is_file():
        pytest.fail("src/data/quiz-data-privacy.json does not exist yet")
    data = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(data.get("title"), str) and data["title"].strip()
    questions = data.get("questions")
    assert isinstance(questions, list) and len(questions) >= 3
    for i, q in enumerate(questions):
        assert isinstance(q.get("prompt"), str) and q["prompt"].strip(), f"q{i}: bad prompt"
        choices = q.get("choices")
        assert isinstance(choices, list) and len(choices) >= 2, f"q{i}: needs >=2 choices"
        assert all(isinstance(c, str) and c.strip() for c in choices), f"q{i}: empty choice"
        assert isinstance(q.get("answerIndex"), int) and 0 <= q["answerIndex"] < len(choices), f"q{i}: bad answerIndex"
        assert isinstance(q.get("explanation"), str) and q["explanation"].strip(), f"q{i}: bad explanation"


def test_i18n_keys_covered():
    en_path = SRC / "locales" / "en.json"
    if not en_path.is_file():
        pytest.fail("src/locales/en.json does not exist yet")
    dictionary = flatten(json.loads(en_path.read_text(encoding="utf-8")))
    used = set()
    for f in html_files():
        used |= scan(f).i18n_keys
    missing = sorted(used - set(dictionary))
    assert not missing, f"data-i18n keys missing from en.json: {missing}"


def test_hub_links_every_lesson():
    hub = SRC / "lessons" / "index.html"
    lessons_json = SRC / "data" / "lessons.json"
    if not hub.is_file() or not lessons_json.is_file():
        pytest.fail("hub page or lessons.json does not exist yet")
    hub_html = hub.read_text(encoding="utf-8")
    for lesson in json.loads(lessons_json.read_text(encoding="utf-8"))["lessons"]:
        assert lesson["href"] in hub_html, f"hub does not link {lesson['href']}"
```

- [ ] **Step 4: Run the suite — verify it fails for the right reason**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: ~22 failed, 2 passed. Failures are all "does not exist yet" / missing-page assertions. `test_internal_links_resolve` and `test_all_json_parses`... note: `test_all_json_parses` FAILS too ("no JSON files found") — that is correct behavior. Only `test_internal_links_resolve` passes vacuously.

- [ ] **Step 5: Commit**

```powershell
git add requirements.txt tests stdout/.gitkeep src/.nojekyll
git commit -m "Add site validation suite and repo plumbing

pytest suite (run from .env.local venv) validating required pages,
internal links, JSON shapes, i18n key coverage, and page basics.
Starts red by design; tasks turn it green. Session summaries are
written to stdout/ per AGENTS.md.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Design system — `main.css` + brand assets

**Files:**
- Create: `src/css/main.css`, `src/assets/logo.svg`, `src/assets/favicon.svg`

**Interfaces:**
- Produces: every class name and custom property later tasks' HTML relies on: `.skip-link`, `.site-header`, `.brand`, `.brand-mark`, `.nav-toggle`, `.site-nav`, `.lang-pick`, `.airmail-rule`, `.eyebrow`, `.hero`, `.lede`, `.hero-actions`, `.btn`, `.btn-primary`, `.section`, `.section-title`, `.topic-grid`, `.topic-card`, `.postcard-grid`, `.postcard`, `.postcard-meta`, `.stamp`, `.kind`, `.band`, `.site-footer`, `.footer-inner`, `.footer-mission`, `.footer-nav`, `.footer-note`, `.prose`, `.article-header`, `.article-meta`, `.crumb`, `.filter-bar`, `.filter-btn`, `.form-grid`, `.form-note`, `.quiz-frame`, `.quiz-progress`, `.quiz-question`, `.quiz-choices`, `.quiz-choice`, `.is-correct`, `.is-incorrect`, `.quiz-explain`, `.quiz-next`, `.quiz-score`, `.quiz-error`, `.visually-hidden`; topic theming via `[data-topic="..."]` setting `--topic`.

- [ ] **Step 1: Write `src/css/main.css`**

```css
/* Bytes Without Borders — postal warm-humanist design system.
   Tokens only in :root; components below. No external requests. */

:root {
  color-scheme: light dark;

  /* paper & ink */
  --paper: #faf5eb;
  --paper-raised: #fffdf6;
  --ink: #2e2418;
  --ink-soft: #6d5f4b;
  --line: #e3d8c2;

  /* postal duotone + topic accents */
  --postal-blue: #33608f;
  --postal-red: #b3402e;
  --topic-privacy: #33608f;
  --topic-literacy: #8f6110;
  --topic-inclusion: #37725a;
  --topic: var(--postal-blue);

  /* type */
  --font-display: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
  --font-body: Seravek, 'Segoe UI', Ubuntu, Calibri, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', Consolas, Menlo, monospace;
  --step--1: 0.875rem;
  --step-0: 1.0625rem;
  --step-1: 1.375rem;
  --step-2: 1.75rem;
  --step-3: clamp(2rem, 4.5vw, 2.75rem);
  --step-4: clamp(2.5rem, 7vw, 4rem);

  /* rhythm */
  --space-1: 0.5rem;
  --space-2: 1rem;
  --space-3: 1.5rem;
  --space-4: 2.5rem;
  --space-5: 4rem;
  --measure: 66ch;
  --radius: 6px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --paper: #211a10;
    --paper-raised: #2b2316;
    --ink: #f0e7d4;
    --ink-soft: #b9aa8f;
    --line: #463a26;
    --postal-blue: #85aede;
    --postal-red: #e2836e;
    --topic-privacy: #85aede;
    --topic-literacy: #d9a54a;
    --topic-inclusion: #83bd9e;
  }
}

/* ---------- base ---------- */

*,
*::before,
*::after { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: var(--step-0);
  line-height: 1.6;
}

h1, h2, h3 {
  font-family: var(--font-display);
  line-height: 1.12;
  margin: 0 0 var(--space-2);
}

h1 { font-size: var(--step-4); letter-spacing: -0.01em; }
h2 { font-size: var(--step-3); }
h3 { font-size: var(--step-1); }

p { margin: 0 0 var(--space-2); }

a { color: var(--postal-blue); text-underline-offset: 0.15em; }
a:hover { color: var(--postal-red); }

img, svg { max-width: 100%; height: auto; }

code {
  font-family: var(--font-mono);
  font-size: 0.92em;
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 0.05em 0.35em;
}

:focus-visible {
  outline: 3px solid var(--postal-blue);
  outline-offset: 2px;
  border-radius: 2px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* ---------- signature: airmail rule + stamp ---------- */

.airmail-rule {
  height: 8px;
  border: 0;
  margin: 0;
  background: repeating-linear-gradient(
    135deg,
    var(--postal-red) 0 12px,
    transparent 12px 20px,
    var(--postal-blue) 20px 32px,
    transparent 32px 40px
  );
}

.stamp {
  display: inline-block;
  padding: 0.1rem 0.55rem;
  border: 1.5px dashed var(--topic);
  border-radius: 3px;
  color: var(--topic);
  font-family: var(--font-mono);
  font-size: var(--step--1);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.eyebrow {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--topic);
  margin: 0 0 var(--space-1);
}

/* topic theming: containers set --topic for their children */
[data-topic="data-privacy"] { --topic: var(--topic-privacy); }
[data-topic="tech-literacy"] { --topic: var(--topic-literacy); }
[data-topic="digital-inclusion"] { --topic: var(--topic-inclusion); }

/* ---------- header & nav ---------- */

.skip-link {
  position: absolute;
  left: var(--space-2);
  top: -3rem;
  z-index: 10;
  background: var(--paper-raised);
  color: var(--ink);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  transition: top 120ms ease;
}
.skip-link:focus { top: var(--space-2); }

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--line);
  position: relative;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--step-1);
  color: var(--ink);
  text-decoration: none;
}
.brand:hover { color: var(--postal-red); }
.brand-mark { color: var(--postal-red); flex: none; }

.nav-toggle {
  font: inherit;
  background: none;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--ink);
  padding: var(--space-1) var(--space-2);
  cursor: pointer;
}

.site-nav { display: none; }
.site-nav.is-open {
  display: block;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 5;
  background: var(--paper-raised);
  border-bottom: 1px solid var(--line);
  padding: var(--space-2) var(--space-3) var(--space-3);
}

.site-nav ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.site-nav a {
  color: var(--ink);
  text-decoration: none;
  font-weight: 500;
}
.site-nav a:hover { color: var(--postal-red); }
.site-nav a[aria-current="page"] {
  color: var(--postal-red);
  border-bottom: 2px solid var(--postal-red);
}

.lang-pick {
  margin-top: var(--space-2);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--step--1);
}
.lang-pick select {
  font: inherit;
  color: var(--ink);
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 0.2rem 0.4rem;
}

@media (min-width: 46em) {
  .nav-toggle { display: none; }
  .site-nav,
  .site-nav.is-open {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    position: static;
    background: none;
    border: 0;
    padding: 0;
  }
  .site-nav ul { flex-direction: row; gap: var(--space-3); }
  .lang-pick { margin-top: 0; }
}

/* ---------- layout ---------- */

main { display: block; }

.section {
  padding: var(--space-4) var(--space-3);
  max-width: 72rem;
  margin: 0 auto;
}

.section-title { margin-bottom: var(--space-3); }

.hero {
  padding: var(--space-5) var(--space-3);
  max-width: 72rem;
  margin: 0 auto;
}

.hero h1 { max-width: 22ch; }

.lede {
  font-size: var(--step-1);
  color: var(--ink-soft);
  max-width: 52ch;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.btn {
  display: inline-block;
  padding: 0.65rem 1.4rem;
  border: 1.5px solid var(--ink);
  border-radius: var(--radius);
  color: var(--ink);
  font-weight: 600;
  text-decoration: none;
  background: none;
  font: inherit;
  cursor: pointer;
  transition: transform 120ms ease, background-color 120ms ease, color 120ms ease;
}
.btn:hover { transform: translateY(-2px); color: var(--ink); }

.btn-primary {
  background: var(--postal-red);
  border-color: var(--postal-red);
  color: var(--paper-raised);
}
.btn-primary:hover { color: var(--paper-raised); }

/* ---------- cards ---------- */

.topic-grid,
.postcard-grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  padding: 0;
  margin: 0;
  list-style: none;
}

.topic-card,
.postcard {
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: var(--space-3);
  position: relative;
  overflow: hidden;
}

.topic-card::before,
.postcard::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: repeating-linear-gradient(
    135deg,
    var(--topic) 0 10px,
    transparent 10px 16px
  );
}

.postcard {
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.postcard:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 18px rgba(46, 36, 24, 0.12);
}

.postcard h3 { margin-bottom: var(--space-1); }
.postcard h3 a { color: var(--ink); text-decoration: none; }
.postcard h3 a:hover { color: var(--postal-red); }
.postcard h3 a::after { content: ""; position: absolute; inset: 0; }

.postcard-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.kind {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  color: var(--ink-soft);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* ---------- CTA band ---------- */

.band {
  background: var(--paper-raised);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.band .section { text-align: center; }
.band p { max-width: 52ch; margin-left: auto; margin-right: auto; }

/* ---------- footer ---------- */

.site-footer { margin-top: var(--space-5); }

.footer-inner {
  max-width: 72rem;
  margin: 0 auto;
  padding: var(--space-4) var(--space-3);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: baseline;
}

.footer-mission {
  font-family: var(--font-display);
  font-size: var(--step-1);
  max-width: 30ch;
  margin: 0;
}

.footer-nav {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.footer-nav a { color: var(--ink-soft); }

.footer-note { color: var(--ink-soft); font-size: var(--step--1); margin: 0; }

/* ---------- article prose ---------- */

.article-header { max-width: var(--measure); margin: 0 auto; padding-top: var(--space-4); }

.crumb {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-decoration: none;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-2) 0 var(--space-3);
}

.prose { max-width: var(--measure); margin: 0 auto; }
.prose h2 { margin-top: var(--space-4); }
.prose ul { padding-left: 1.2rem; }
.prose li { margin-bottom: var(--space-1); }
.prose strong { color: var(--topic); }

/* ---------- lessons hub filter ---------- */

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.filter-btn {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: none;
  border: 1.5px dashed var(--line);
  border-radius: 999px;
  color: var(--ink-soft);
  padding: 0.3rem 0.9rem;
  cursor: pointer;
}
.filter-btn[aria-pressed="true"] {
  border-color: var(--postal-red);
  border-style: solid;
  color: var(--postal-red);
}

/* ---------- forms ---------- */

.form-grid {
  display: grid;
  gap: var(--space-2);
  max-width: 36rem;
}

.form-grid label {
  font-weight: 600;
  display: block;
  margin-bottom: 0.25rem;
}

.form-grid input,
.form-grid textarea {
  width: 100%;
  font: inherit;
  color: var(--ink);
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 0.6rem 0.8rem;
}

.form-note { color: var(--ink-soft); font-size: var(--step--1); }

/* ---------- quiz ---------- */

.quiz-frame {
  max-width: var(--measure);
  margin: 0 auto var(--space-4);
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: var(--space-3);
}

.quiz-progress {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.quiz-question { font-family: var(--font-display); font-size: var(--step-1); }

.quiz-choices {
  list-style: none;
  margin: var(--space-2) 0 0;
  padding: 0;
  display: grid;
  gap: var(--space-1);
}

.quiz-choice {
  width: 100%;
  text-align: left;
  font: inherit;
  color: var(--ink);
  background: none;
  border: 1.5px solid var(--line);
  border-radius: var(--radius);
  padding: 0.7rem 1rem;
  cursor: pointer;
}
.quiz-choice:hover:enabled { border-color: var(--postal-blue); }
.quiz-choice:disabled { cursor: default; opacity: 0.75; }
.quiz-choice.is-correct {
  border-color: var(--topic-inclusion);
  color: var(--topic-inclusion);
  font-weight: 600;
  opacity: 1;
}
.quiz-choice.is-incorrect {
  border-color: var(--postal-red);
  color: var(--postal-red);
  opacity: 1;
}

.quiz-explain {
  margin-top: var(--space-2);
  padding: var(--space-2);
  border-left: 3px solid var(--postal-blue);
  background: var(--paper);
}

.quiz-next { margin-top: var(--space-2); }

.quiz-score {
  font-family: var(--font-display);
  font-size: var(--step-2);
  margin-bottom: var(--space-1);
}

.quiz-error { color: var(--postal-red); font-weight: 600; }

/* ---------- motion ---------- */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition: none !important;
    animation: none !important;
  }
}
```

- [ ] **Step 2: Write `src/assets/logo.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Bytes Without Borders</title>
  <rect x="2" y="6" width="28" height="20" rx="2" fill="none" stroke="#b3402e" stroke-width="2"/>
  <path d="M3 8l13 9 13-9" fill="none" stroke="#b3402e" stroke-width="2" stroke-linecap="round"/>
  <circle cx="25" cy="21" r="3" fill="#33608f"/>
</svg>
```

- [ ] **Step 3: Write `src/assets/favicon.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect x="1" y="1" width="30" height="30" rx="4" fill="#faf5eb" stroke="#b3402e" stroke-width="2" stroke-dasharray="4 3"/>
  <text x="16" y="22" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="17" fill="#33608f">B</text>
</svg>
```

- [ ] **Step 4: Run the suite — no change expected**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: same as Task 1 (~22 failed, 2 passed) — CSS/assets are not directly tested; visual verification happens in Task 10.

- [ ] **Step 5: Commit**

```powershell
git add src/css src/assets
git commit -m "Add postal warm-humanist design system and brand assets

Design tokens (paper/ink palette, postal red+blue duotone, per-topic
accents), airmail-stripe and stamp signature elements, full component
set for header/nav, cards, prose, filter, form, and quiz. Dark scheme
via prefers-color-scheme; reduced motion respected; system font
stacks only (no external requests).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Home page

**Files:**
- Create: `src/index.html`

**Interfaces:**
- Consumes: Task 2 class names/tokens.
- Produces: the canonical shared-chrome pattern (skip link → header → main → footer → deferred scripts) that Tasks 4–7 replicate. Root pages use `data-root="./"` and `./`-prefixed URLs.
- References `js/i18n.js` + `js/main.js` (land in Tasks 5–6) and lesson pages (land in Tasks 5, 7) — link failures expected until then.

- [ ] **Step 1: Write `src/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bytes Without Borders — Digital know-how, one byte at a time</title>
  <meta name="description" content="Free five-minute lessons on data privacy, tech literacy, and digital inclusion — written in plain language and built to be translated.">
  <link rel="icon" href="./assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="./css/main.css">
</head>
<body data-root="./">
  <a class="skip-link" href="#main" data-i18n="nav.skip">Skip to main content</a>

  <header class="site-header">
    <a class="brand" href="./index.html">
      <svg class="brand-mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false">
        <rect x="2" y="6" width="28" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M3 8l13 9 13-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="25" cy="21" r="3" fill="currentColor"/>
      </svg>
      <span>Bytes Without Borders</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
      <span data-i18n="nav.menu">Menu</span>
    </button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul>
        <li><a href="./index.html" aria-current="page" data-i18n="nav.home">Home</a></li>
        <li><a href="./lessons/index.html" data-i18n="nav.lessons">Lessons</a></li>
        <li><a href="./about.html" data-i18n="nav.about">About</a></li>
        <li><a href="./get-involved.html" data-i18n="nav.getInvolved">Get involved</a></li>
      </ul>
      <div class="lang-pick">
        <label for="lang-switch" data-i18n="nav.language">Language</label>
        <select id="lang-switch">
          <option value="en" selected>English</option>
        </select>
      </div>
    </nav>
  </header>

  <main id="main">
    <section class="hero">
      <p class="eyebrow" data-i18n="home.eyebrow">Micro-lessons in plain language</p>
      <h1 data-i18n="home.title">Digital know-how, one byte at a time.</h1>
      <p class="lede" data-i18n="home.lede">Free five-minute lessons on data privacy, tech literacy, and digital inclusion — written in plain language and built to travel across languages.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="./lessons/index.html" data-i18n="home.ctaLessons">Browse the lessons</a>
        <a class="btn" href="./get-involved.html" data-i18n="home.ctaInvolved">Get involved</a>
      </div>
    </section>

    <hr class="airmail-rule">

    <section class="section" aria-labelledby="topics-heading">
      <h2 class="section-title" id="topics-heading" data-i18n="home.topicsHeading">What we teach</h2>
      <ul class="topic-grid">
        <li class="topic-card" data-topic="data-privacy">
          <p class="eyebrow" data-i18n="home.topicPrivacyTitle">Data privacy</p>
          <p data-i18n="home.topicPrivacyBody">Who can see what you do online, and the small habits that keep your accounts and identity yours.</p>
        </li>
        <li class="topic-card" data-topic="tech-literacy">
          <p class="eyebrow" data-i18n="home.topicLiteracyTitle">Tech literacy</p>
          <p data-i18n="home.topicLiteracyBody">How the everyday internet actually works, so headlines, scams, and settings stop being mysteries.</p>
        </li>
        <li class="topic-card" data-topic="digital-inclusion">
          <p class="eyebrow" data-i18n="home.topicInclusionTitle">Digital inclusion</p>
          <p data-i18n="home.topicInclusionBody">Why millions are still offline or underserved, and what communities can do about it.</p>
        </li>
      </ul>
    </section>

    <section class="section" aria-labelledby="featured-heading">
      <h2 class="section-title" id="featured-heading" data-i18n="home.featuredHeading">Start with these</h2>
      <ul class="postcard-grid">
        <li class="postcard" data-topic="data-privacy">
          <p class="eyebrow">Data privacy</p>
          <h3><a href="./lessons/understanding-passwords.html">Understanding passwords</a></h3>
          <p>Why one strong, unique password per account beats a clever one used everywhere.</p>
          <p class="postcard-meta"><span class="stamp">≈ 4 min</span><span class="kind">Article</span></p>
        </li>
        <li class="postcard" data-topic="tech-literacy">
          <p class="eyebrow">Tech literacy</p>
          <h3><a href="./lessons/spotting-misinformation.html">Spotting misinformation</a></h3>
          <p>Five quick checks that separate reliable reporting from manufactured outrage.</p>
          <p class="postcard-meta"><span class="stamp">≈ 5 min</span><span class="kind">Article</span></p>
        </li>
        <li class="postcard" data-topic="digital-inclusion">
          <p class="eyebrow">Digital inclusion</p>
          <h3><a href="./lessons/bridging-the-digital-divide.html">Bridging the digital divide</a></h3>
          <p>Who gets left offline, why it matters, and what actually helps.</p>
          <p class="postcard-meta"><span class="stamp">≈ 4 min</span><span class="kind">Article</span></p>
        </li>
        <li class="postcard" data-topic="data-privacy">
          <p class="eyebrow">Data privacy</p>
          <h3><a href="./lessons/quiz-data-privacy.html">Quiz: data privacy basics</a></h3>
          <p>Five scenarios to test your instincts before the scammers do.</p>
          <p class="postcard-meta"><span class="stamp">≈ 3 min</span><span class="kind">Interactive</span></p>
        </li>
      </ul>
    </section>

    <section class="band">
      <div class="section">
        <h2 data-i18n="home.bandTitle">Knowledge that crosses borders.</h2>
        <p data-i18n="home.bandBody">Every lesson is written to be translated, adapted, and taught anywhere. Help us carry it further — translate a lesson, write one, or run a workshop in your community.</p>
        <a class="btn btn-primary" href="./get-involved.html" data-i18n="home.bandCta">See how to help</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <hr class="airmail-rule">
    <div class="footer-inner">
      <p class="footer-mission" data-i18n="footer.mission">Plain-language digital education. Free to share, built to be translated.</p>
      <nav aria-label="Footer">
        <ul class="footer-nav">
          <li><a href="./index.html" data-i18n="nav.home">Home</a></li>
          <li><a href="./lessons/index.html" data-i18n="nav.lessons">Lessons</a></li>
          <li><a href="./about.html" data-i18n="nav.about">About</a></li>
          <li><a href="./get-involved.html" data-i18n="nav.getInvolved">Get involved</a></li>
        </ul>
      </nav>
      <p class="footer-note"><span data-i18n="footer.contact">Write to us:</span> <a href="mailto:hello@byteswithoutborders.example">hello@byteswithoutborders.example</a></p>
    </div>
  </footer>

  <script src="./js/i18n.js" defer></script>
  <script src="./js/main.js" defer></script>
</body>
</html>
```

- [ ] **Step 2: Run the suite**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `test_required_page_exists[index.html]` and `test_page_basics[index.html]` now PASS. `test_internal_links_resolve` now FAILS (home links to pages/scripts from Tasks 4–7) — expected until Task 7.

- [ ] **Step 3: Commit**

```powershell
git add src/index.html
git commit -m "Add home page

Hero, three topic cards, four featured lesson postcards, and a
get-involved band. Establishes the shared chrome pattern (skip link,
header/nav with language switcher, footer) and data-i18n keys that
all other pages replicate. Links to lesson pages and JS land in
later tasks, so the link-resolution test stays red for now.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: About, Get involved, and 404 pages

**Files:**
- Create: `src/about.html`, `src/get-involved.html`, `src/404.html`

**Interfaces:**
- Consumes: Task 3 chrome pattern (copied verbatim, only `aria-current` moves), Task 2 classes.
- Produces: `#contact-form` with `input#c-name`, `input#c-email`, `textarea#c-message` — `js/main.js` (Task 5) attaches a mailto handler to exactly these IDs.

- [ ] **Step 1: Write `src/about.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>About — Bytes Without Borders</title>
  <meta name="description" content="Bytes Without Borders writes free, plain-language micro-lessons on data privacy, tech literacy, and digital inclusion — built to be translated and taught anywhere.">
  <link rel="icon" href="./assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="./css/main.css">
</head>
<body data-root="./">
  <a class="skip-link" href="#main" data-i18n="nav.skip">Skip to main content</a>

  <header class="site-header">
    <a class="brand" href="./index.html">
      <svg class="brand-mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false">
        <rect x="2" y="6" width="28" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M3 8l13 9 13-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="25" cy="21" r="3" fill="currentColor"/>
      </svg>
      <span>Bytes Without Borders</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
      <span data-i18n="nav.menu">Menu</span>
    </button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul>
        <li><a href="./index.html" data-i18n="nav.home">Home</a></li>
        <li><a href="./lessons/index.html" data-i18n="nav.lessons">Lessons</a></li>
        <li><a href="./about.html" aria-current="page" data-i18n="nav.about">About</a></li>
        <li><a href="./get-involved.html" data-i18n="nav.getInvolved">Get involved</a></li>
      </ul>
      <div class="lang-pick">
        <label for="lang-switch" data-i18n="nav.language">Language</label>
        <select id="lang-switch">
          <option value="en" selected>English</option>
        </select>
      </div>
    </nav>
  </header>

  <main id="main">
    <header class="article-header">
      <p class="eyebrow" data-i18n="about.eyebrow">The initiative</p>
      <h1 data-i18n="about.title">Education that travels like a letter.</h1>
      <p class="lede" data-i18n="about.lede">Bytes Without Borders is a volunteer initiative informing the broader population through localized micro-lessons — short, practical, and free.</p>
    </header>

    <div class="prose">
      <h2 data-i18n="about.missionHeading">Why micro-lessons</h2>
      <p data-i18n="about.missionBody1">Most guides about staying safe and capable online are long, technical, and written in one language for one audience. The people with the most to lose — new internet users, older adults, communities getting connected for the first time — rarely get materials written for them.</p>
      <p data-i18n="about.missionBody2">So we keep every lesson under five minutes, in plain language, free of jargon and fear. Like a correspondence course, each one is designed to be passed along: translated, printed, taught out loud, or read on a cheap phone over a slow connection.</p>

      <h2 data-i18n="about.howHeading">How a lesson is made</h2>
      <ul>
        <li><strong data-i18n="about.how1Title">Written plainly.</strong> <span data-i18n="about.how1Body">One idea per lesson, everyday words, real examples — no acronyms without introductions.</span></li>
        <li><strong data-i18n="about.how2Title">Reviewed for accuracy.</strong> <span data-i18n="about.how2Body">Volunteers with security and education backgrounds check every claim before it ships.</span></li>
        <li><strong data-i18n="about.how3Title">Built to localize.</strong> <span data-i18n="about.how3Body">Lessons avoid culture-bound references so translators adapt meaning, not just words.</span></li>
      </ul>

      <h2 data-i18n="about.valuesHeading">What we believe</h2>
      <ul>
        <li data-i18n="about.value1">Digital skills are civic skills — everyone deserves them, in their own language.</li>
        <li data-i18n="about.value2">Clarity is respect. If a lesson confuses its reader, the lesson is wrong.</li>
        <li data-i18n="about.value3">Knowledge should be free to share, adapt, and teach onward.</li>
      </ul>
    </div>
  </main>

  <footer class="site-footer">
    <hr class="airmail-rule">
    <div class="footer-inner">
      <p class="footer-mission" data-i18n="footer.mission">Plain-language digital education. Free to share, built to be translated.</p>
      <nav aria-label="Footer">
        <ul class="footer-nav">
          <li><a href="./index.html" data-i18n="nav.home">Home</a></li>
          <li><a href="./lessons/index.html" data-i18n="nav.lessons">Lessons</a></li>
          <li><a href="./about.html" data-i18n="nav.about">About</a></li>
          <li><a href="./get-involved.html" data-i18n="nav.getInvolved">Get involved</a></li>
        </ul>
      </nav>
      <p class="footer-note"><span data-i18n="footer.contact">Write to us:</span> <a href="mailto:hello@byteswithoutborders.example">hello@byteswithoutborders.example</a></p>
    </div>
  </footer>

  <script src="./js/i18n.js" defer></script>
  <script src="./js/main.js" defer></script>
</body>
</html>
```

- [ ] **Step 2: Write `src/get-involved.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Get involved — Bytes Without Borders</title>
  <meta name="description" content="Translate a lesson, write one, or run a workshop — how to volunteer with Bytes Without Borders.">
  <link rel="icon" href="./assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="./css/main.css">
</head>
<body data-root="./">
  <a class="skip-link" href="#main" data-i18n="nav.skip">Skip to main content</a>

  <header class="site-header">
    <a class="brand" href="./index.html">
      <svg class="brand-mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false">
        <rect x="2" y="6" width="28" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M3 8l13 9 13-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="25" cy="21" r="3" fill="currentColor"/>
      </svg>
      <span>Bytes Without Borders</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
      <span data-i18n="nav.menu">Menu</span>
    </button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul>
        <li><a href="./index.html" data-i18n="nav.home">Home</a></li>
        <li><a href="./lessons/index.html" data-i18n="nav.lessons">Lessons</a></li>
        <li><a href="./about.html" data-i18n="nav.about">About</a></li>
        <li><a href="./get-involved.html" aria-current="page" data-i18n="nav.getInvolved">Get involved</a></li>
      </ul>
      <div class="lang-pick">
        <label for="lang-switch" data-i18n="nav.language">Language</label>
        <select id="lang-switch">
          <option value="en" selected>English</option>
        </select>
      </div>
    </nav>
  </header>

  <main id="main">
    <header class="article-header">
      <p class="eyebrow" data-i18n="involved.eyebrow">Volunteer</p>
      <h1 data-i18n="involved.title">Carry a lesson further.</h1>
      <p class="lede" data-i18n="involved.lede">Everything here is made by volunteers. Pick the way that fits the time and skills you have.</p>
    </header>

    <section class="section" aria-labelledby="ways-heading">
      <h2 class="section-title" id="ways-heading" data-i18n="involved.waysHeading">Three ways to help</h2>
      <ul class="topic-grid">
        <li class="topic-card" data-topic="data-privacy">
          <p class="eyebrow" data-i18n="involved.way1Title">Translate</p>
          <p data-i18n="involved.way1Body">Bring a lesson into your language. Our lessons avoid idioms and culture-bound examples, so a careful translation usually takes under an hour.</p>
        </li>
        <li class="topic-card" data-topic="tech-literacy">
          <p class="eyebrow" data-i18n="involved.way2Title">Write</p>
          <p data-i18n="involved.way2Body">Know a topic well? Draft a five-minute lesson in plain words. Volunteer reviewers help you fact-check and tighten it.</p>
        </li>
        <li class="topic-card" data-topic="digital-inclusion">
          <p class="eyebrow" data-i18n="involved.way3Title">Teach</p>
          <p data-i18n="involved.way3Body">Run a lesson at a library, community center, or kitchen table. Every lesson works printed, projected, or read aloud.</p>
        </li>
      </ul>
    </section>

    <section class="section" aria-labelledby="contact-heading">
      <h2 class="section-title" id="contact-heading" data-i18n="involved.formHeading">Write to us</h2>
      <form id="contact-form" class="form-grid">
        <div>
          <label for="c-name" data-i18n="involved.formName">Your name</label>
          <input id="c-name" name="name" type="text" autocomplete="name" required>
        </div>
        <div>
          <label for="c-email" data-i18n="involved.formEmail">Your email</label>
          <input id="c-email" name="email" type="email" autocomplete="email" required>
        </div>
        <div>
          <label for="c-message" data-i18n="involved.formMessage">How would you like to help?</label>
          <textarea id="c-message" name="message" rows="5" required></textarea>
        </div>
        <div>
          <button class="btn btn-primary" type="submit" data-i18n="involved.formSend">Send</button>
        </div>
        <p class="form-note"><span data-i18n="involved.formNote">Sending opens your email app addressed to</span> <a href="mailto:hello@byteswithoutborders.example">hello@byteswithoutborders.example</a>.</p>
      </form>
    </section>
  </main>

  <footer class="site-footer">
    <hr class="airmail-rule">
    <div class="footer-inner">
      <p class="footer-mission" data-i18n="footer.mission">Plain-language digital education. Free to share, built to be translated.</p>
      <nav aria-label="Footer">
        <ul class="footer-nav">
          <li><a href="./index.html" data-i18n="nav.home">Home</a></li>
          <li><a href="./lessons/index.html" data-i18n="nav.lessons">Lessons</a></li>
          <li><a href="./about.html" data-i18n="nav.about">About</a></li>
          <li><a href="./get-involved.html" data-i18n="nav.getInvolved">Get involved</a></li>
        </ul>
      </nav>
      <p class="footer-note"><span data-i18n="footer.contact">Write to us:</span> <a href="mailto:hello@byteswithoutborders.example">hello@byteswithoutborders.example</a></p>
    </div>
  </footer>

  <script src="./js/i18n.js" defer></script>
  <script src="./js/main.js" defer></script>
</body>
</html>
```

- [ ] **Step 3: Write `src/404.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found — Bytes Without Borders</title>
  <meta name="description" content="This page could not be delivered. Find your way back to the lessons.">
  <link rel="icon" href="./assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="./css/main.css">
</head>
<body data-root="./">
  <a class="skip-link" href="#main" data-i18n="nav.skip">Skip to main content</a>

  <header class="site-header">
    <a class="brand" href="./index.html">
      <svg class="brand-mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false">
        <rect x="2" y="6" width="28" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M3 8l13 9 13-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="25" cy="21" r="3" fill="currentColor"/>
      </svg>
      <span>Bytes Without Borders</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
      <span data-i18n="nav.menu">Menu</span>
    </button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul>
        <li><a href="./index.html" data-i18n="nav.home">Home</a></li>
        <li><a href="./lessons/index.html" data-i18n="nav.lessons">Lessons</a></li>
        <li><a href="./about.html" data-i18n="nav.about">About</a></li>
        <li><a href="./get-involved.html" data-i18n="nav.getInvolved">Get involved</a></li>
      </ul>
      <div class="lang-pick">
        <label for="lang-switch" data-i18n="nav.language">Language</label>
        <select id="lang-switch">
          <option value="en" selected>English</option>
        </select>
      </div>
    </nav>
  </header>

  <main id="main">
    <section class="hero">
      <p class="eyebrow">404</p>
      <h1 data-i18n="notfound.title">Lost in transit.</h1>
      <p class="lede" data-i18n="notfound.body">This page could not be delivered — it may have moved or never existed. The lessons are all still where they should be.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="./index.html" data-i18n="notfound.ctaHome">Back to the start</a>
        <a class="btn" href="./lessons/index.html" data-i18n="notfound.ctaLessons">Browse the lessons</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <hr class="airmail-rule">
    <div class="footer-inner">
      <p class="footer-mission" data-i18n="footer.mission">Plain-language digital education. Free to share, built to be translated.</p>
      <nav aria-label="Footer">
        <ul class="footer-nav">
          <li><a href="./index.html" data-i18n="nav.home">Home</a></li>
          <li><a href="./lessons/index.html" data-i18n="nav.lessons">Lessons</a></li>
          <li><a href="./about.html" data-i18n="nav.about">About</a></li>
          <li><a href="./get-involved.html" data-i18n="nav.getInvolved">Get involved</a></li>
        </ul>
      </nav>
      <p class="footer-note"><span data-i18n="footer.contact">Write to us:</span> <a href="mailto:hello@byteswithoutborders.example">hello@byteswithoutborders.example</a></p>
    </div>
  </footer>

  <script src="./js/i18n.js" defer></script>
  <script src="./js/main.js" defer></script>
</body>
</html>
```

Note: the 404 page's `404` eyebrow carries no `data-i18n` — the number is universal.

- [ ] **Step 4: Run the suite**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: existence + basics now pass for `about.html`, `get-involved.html`, `404.html` (8 tests green so far). Link resolution, JSON, i18n, hub tests still red.

- [ ] **Step 5: Commit**

```powershell
git add src/about.html src/get-involved.html src/404.html
git commit -m "Add about, get-involved, and 404 pages

About: mission, lesson-making process, values. Get involved: three
volunteer paths and a contact form stub whose IDs (c-name, c-email,
c-message) main.js will wire to a mailto handler. 404: postal 'lost
in transit' page with recovery links.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Lessons section — data, hub, three articles, `main.js`

**Files:**
- Create: `src/data/lessons.json`, `src/lessons/index.html`, `src/lessons/understanding-passwords.html`, `src/lessons/spotting-misinformation.html`, `src/lessons/bridging-the-digital-divide.html`, `src/js/main.js`

**Interfaces:**
- Consumes: chrome pattern (Task 3, with `../` prefixes and `data-root="../"`), form IDs (Task 4).
- Produces: `lessons.json` shape `{lessons: [{slug, href, title, topic, summary, minutes, kind}]}`; hub filter contract: `[data-filter-bar]` bar (HTML-hidden, JS-revealed) with `button[data-topic]`, cards carry `data-lesson-card data-topic="..."`. `main.js` handles nav toggle, filter, and contact-form mailto on every page.

- [ ] **Step 1: Write `src/data/lessons.json`**

```json
{
  "lessons": [
    {
      "slug": "understanding-passwords",
      "href": "understanding-passwords.html",
      "title": "Understanding passwords",
      "topic": "data-privacy",
      "summary": "Why one strong, unique password per account beats a clever one used everywhere.",
      "minutes": 4,
      "kind": "article"
    },
    {
      "slug": "spotting-misinformation",
      "href": "spotting-misinformation.html",
      "title": "Spotting misinformation",
      "topic": "tech-literacy",
      "summary": "Five quick checks that separate reliable reporting from manufactured outrage.",
      "minutes": 5,
      "kind": "article"
    },
    {
      "slug": "bridging-the-digital-divide",
      "href": "bridging-the-digital-divide.html",
      "title": "Bridging the digital divide",
      "topic": "digital-inclusion",
      "summary": "Who gets left offline, why it matters, and what actually helps.",
      "minutes": 4,
      "kind": "article"
    },
    {
      "slug": "quiz-data-privacy",
      "href": "quiz-data-privacy.html",
      "title": "Quiz: data privacy basics",
      "topic": "data-privacy",
      "summary": "Five scenarios to test your instincts before the scammers do.",
      "minutes": 3,
      "kind": "interactive"
    }
  ]
}
```

- [ ] **Step 2: Write `src/js/main.js`**

```js
/* Bytes Without Borders — progressive enhancement only.
   Everything on the site works without this file. */
(function () {
  "use strict";

  /* Mobile navigation toggle */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
  }

  /* Lessons hub topic filter — the bar ships hidden; JS reveals it */
  var filterBar = document.querySelector("[data-filter-bar]");
  if (filterBar) {
    filterBar.hidden = false;
    var buttons = filterBar.querySelectorAll("button[data-topic]");
    var cards = document.querySelectorAll("[data-lesson-card]");
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener("click", function () {
        Array.prototype.forEach.call(buttons, function (other) {
          other.setAttribute("aria-pressed", String(other === btn));
        });
        var topic = btn.getAttribute("data-topic");
        Array.prototype.forEach.call(cards, function (card) {
          card.hidden = topic !== "all" && card.getAttribute("data-topic") !== topic;
        });
      });
    });
  }

  /* Contact form: no backend — sending composes an email instead */
  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = document.getElementById("c-name").value;
      var email = document.getElementById("c-email").value;
      var message = document.getElementById("c-message").value;
      var body = message + "\n\n— " + name + " (" + email + ")";
      window.location.href =
        "mailto:hello@byteswithoutborders.example" +
        "?subject=" + encodeURIComponent("I want to help — " + name) +
        "&body=" + encodeURIComponent(body);
    });
  }
})();
```

- [ ] **Step 3: Write `src/lessons/index.html`** (note `../` prefixes, `data-root="../"`, `aria-current` on Lessons)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lessons — Bytes Without Borders</title>
  <meta name="description" content="All Bytes Without Borders micro-lessons: data privacy, tech literacy, and digital inclusion, each under five minutes.">
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../css/main.css">
</head>
<body data-root="../">
  <a class="skip-link" href="#main" data-i18n="nav.skip">Skip to main content</a>

  <header class="site-header">
    <a class="brand" href="../index.html">
      <svg class="brand-mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false">
        <rect x="2" y="6" width="28" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M3 8l13 9 13-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="25" cy="21" r="3" fill="currentColor"/>
      </svg>
      <span>Bytes Without Borders</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
      <span data-i18n="nav.menu">Menu</span>
    </button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul>
        <li><a href="../index.html" data-i18n="nav.home">Home</a></li>
        <li><a href="./index.html" aria-current="page" data-i18n="nav.lessons">Lessons</a></li>
        <li><a href="../about.html" data-i18n="nav.about">About</a></li>
        <li><a href="../get-involved.html" data-i18n="nav.getInvolved">Get involved</a></li>
      </ul>
      <div class="lang-pick">
        <label for="lang-switch" data-i18n="nav.language">Language</label>
        <select id="lang-switch">
          <option value="en" selected>English</option>
        </select>
      </div>
    </nav>
  </header>

  <main id="main">
    <header class="article-header">
      <p class="eyebrow" data-i18n="hub.eyebrow">The lesson shelf</p>
      <h1 data-i18n="hub.title">Every lesson, five minutes or less.</h1>
      <p class="lede" data-i18n="hub.lede">Short, practical, and jargon-free. Read them in any order — each one stands alone.</p>
    </header>

    <section class="section" aria-label="Lessons">
      <div class="filter-bar" data-filter-bar hidden>
        <button class="filter-btn" type="button" data-topic="all" aria-pressed="true" data-i18n="hub.filterAll">All topics</button>
        <button class="filter-btn" type="button" data-topic="data-privacy" aria-pressed="false" data-i18n="hub.filterPrivacy">Data privacy</button>
        <button class="filter-btn" type="button" data-topic="tech-literacy" aria-pressed="false" data-i18n="hub.filterLiteracy">Tech literacy</button>
        <button class="filter-btn" type="button" data-topic="digital-inclusion" aria-pressed="false" data-i18n="hub.filterInclusion">Digital inclusion</button>
      </div>

      <ul class="postcard-grid">
        <li class="postcard" data-lesson-card data-topic="data-privacy">
          <p class="eyebrow">Data privacy</p>
          <h3><a href="./understanding-passwords.html">Understanding passwords</a></h3>
          <p>Why one strong, unique password per account beats a clever one used everywhere.</p>
          <p class="postcard-meta"><span class="stamp">≈ 4 min</span><span class="kind">Article</span></p>
        </li>
        <li class="postcard" data-lesson-card data-topic="tech-literacy">
          <p class="eyebrow">Tech literacy</p>
          <h3><a href="./spotting-misinformation.html">Spotting misinformation</a></h3>
          <p>Five quick checks that separate reliable reporting from manufactured outrage.</p>
          <p class="postcard-meta"><span class="stamp">≈ 5 min</span><span class="kind">Article</span></p>
        </li>
        <li class="postcard" data-lesson-card data-topic="digital-inclusion">
          <p class="eyebrow">Digital inclusion</p>
          <h3><a href="./bridging-the-digital-divide.html">Bridging the digital divide</a></h3>
          <p>Who gets left offline, why it matters, and what actually helps.</p>
          <p class="postcard-meta"><span class="stamp">≈ 4 min</span><span class="kind">Article</span></p>
        </li>
        <li class="postcard" data-lesson-card data-topic="data-privacy">
          <p class="eyebrow">Data privacy</p>
          <h3><a href="./quiz-data-privacy.html">Quiz: data privacy basics</a></h3>
          <p>Five scenarios to test your instincts before the scammers do.</p>
          <p class="postcard-meta"><span class="stamp">≈ 3 min</span><span class="kind">Interactive</span></p>
        </li>
      </ul>
    </section>
  </main>

  <footer class="site-footer">
    <hr class="airmail-rule">
    <div class="footer-inner">
      <p class="footer-mission" data-i18n="footer.mission">Plain-language digital education. Free to share, built to be translated.</p>
      <nav aria-label="Footer">
        <ul class="footer-nav">
          <li><a href="../index.html" data-i18n="nav.home">Home</a></li>
          <li><a href="./index.html" data-i18n="nav.lessons">Lessons</a></li>
          <li><a href="../about.html" data-i18n="nav.about">About</a></li>
          <li><a href="../get-involved.html" data-i18n="nav.getInvolved">Get involved</a></li>
        </ul>
      </nav>
      <p class="footer-note"><span data-i18n="footer.contact">Write to us:</span> <a href="mailto:hello@byteswithoutborders.example">hello@byteswithoutborders.example</a></p>
    </div>
  </footer>

  <script src="../js/i18n.js" defer></script>
  <script src="../js/main.js" defer></script>
</body>
</html>
```

- [ ] **Step 4: Write `src/lessons/understanding-passwords.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Understanding passwords — Bytes Without Borders</title>
  <meta name="description" content="Why one strong, unique password per account beats a clever one used everywhere — a four-minute lesson on passwords, passphrases, managers, and 2FA.">
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../css/main.css">
</head>
<body data-root="../">
  <a class="skip-link" href="#main" data-i18n="nav.skip">Skip to main content</a>

  <header class="site-header">
    <a class="brand" href="../index.html">
      <svg class="brand-mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false">
        <rect x="2" y="6" width="28" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M3 8l13 9 13-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="25" cy="21" r="3" fill="currentColor"/>
      </svg>
      <span>Bytes Without Borders</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
      <span data-i18n="nav.menu">Menu</span>
    </button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul>
        <li><a href="../index.html" data-i18n="nav.home">Home</a></li>
        <li><a href="./index.html" data-i18n="nav.lessons">Lessons</a></li>
        <li><a href="../about.html" data-i18n="nav.about">About</a></li>
        <li><a href="../get-involved.html" data-i18n="nav.getInvolved">Get involved</a></li>
      </ul>
      <div class="lang-pick">
        <label for="lang-switch" data-i18n="nav.language">Language</label>
        <select id="lang-switch">
          <option value="en" selected>English</option>
        </select>
      </div>
    </nav>
  </header>

  <main id="main" data-topic="data-privacy">
    <header class="article-header">
      <a class="crumb" href="./index.html" data-i18n="lesson.back">← All lessons</a>
      <p class="eyebrow">Data privacy</p>
      <h1>Understanding passwords</h1>
      <p class="article-meta"><span class="stamp">≈ 4 min</span><span class="kind">Article</span></p>
    </header>

    <article class="prose">
      <p>Your passwords are the keys to your digital life — your money, your messages, your photos, your name. This lesson covers the three habits that protect them, and the one mistake that undoes everything else.</p>

      <h2>Long beats clever</h2>
      <p>A password's strength comes mostly from its <strong>length</strong>, not from symbols or tricks. <code>Tr0ub4dor!</code> feels strong but is short and guessable by software. Four unrelated words — <code>paper kettle sunrise map</code> — are far harder to crack and far easier to remember. This is called a <strong>passphrase</strong>.</p>

      <h2>One account, one password</h2>
      <p>The most common way accounts get broken into is not clever hacking. It is <strong>reuse</strong>. When any website leaks its passwords — and websites leak all the time — criminals take that list and try the same email-and-password pair everywhere else: your email, your bank, your social accounts.</p>
      <p>A reused password means one leak anywhere unlocks everything. A unique password means a leak stays contained to that one site.</p>

      <h2>Let a manager remember them</h2>
      <p>Nobody can memorize fifty unique passphrases, and nobody should try. A <strong>password manager</strong> is an app that creates and remembers them for you, locked behind one strong passphrase — the only one you memorize. Reputable free options exist, and the one built into your phone or browser is far better than reuse.</p>

      <h2>Add a second lock</h2>
      <p><strong>Two-factor authentication</strong> (2FA) asks for a second proof — usually a code on your phone — whenever someone signs in from a new device. Even if your password is stolen, the thief is stopped at the door. Turn it on for your email first: whoever controls your email can reset everything else.</p>

      <h2>Try it today</h2>
      <ul>
        <li>Turn on 2FA for your main email account.</li>
        <li>Change your email password to a four-word passphrase.</li>
        <li>Stop reusing that one favorite password — start with your bank.</li>
        <li>Try the password manager already built into your phone.</li>
      </ul>

      <p><a class="btn btn-primary" href="./quiz-data-privacy.html" data-i18n="lesson.quizCta">Test yourself: the data privacy quiz</a></p>
    </article>
  </main>

  <footer class="site-footer">
    <hr class="airmail-rule">
    <div class="footer-inner">
      <p class="footer-mission" data-i18n="footer.mission">Plain-language digital education. Free to share, built to be translated.</p>
      <nav aria-label="Footer">
        <ul class="footer-nav">
          <li><a href="../index.html" data-i18n="nav.home">Home</a></li>
          <li><a href="./index.html" data-i18n="nav.lessons">Lessons</a></li>
          <li><a href="../about.html" data-i18n="nav.about">About</a></li>
          <li><a href="../get-involved.html" data-i18n="nav.getInvolved">Get involved</a></li>
        </ul>
      </nav>
      <p class="footer-note"><span data-i18n="footer.contact">Write to us:</span> <a href="mailto:hello@byteswithoutborders.example">hello@byteswithoutborders.example</a></p>
    </div>
  </footer>

  <script src="../js/i18n.js" defer></script>
  <script src="../js/main.js" defer></script>
</body>
</html>
```

- [ ] **Step 5: Write `src/lessons/spotting-misinformation.html`**

Same chrome as Step 4 (copy the `<head>`…`</header>` and `<footer>`…`</html>` blocks verbatim), with these page-specific replacements — `<title>`: `Spotting misinformation — Bytes Without Borders`; meta description: `Five quick checks that separate reliable reporting from manufactured outrage — a five-minute tech literacy lesson.`; `<main>` block:

```html
  <main id="main" data-topic="tech-literacy">
    <header class="article-header">
      <a class="crumb" href="./index.html" data-i18n="lesson.back">← All lessons</a>
      <p class="eyebrow">Tech literacy</p>
      <h1>Spotting misinformation</h1>
      <p class="article-meta"><span class="stamp">≈ 5 min</span><span class="kind">Article</span></p>
    </header>

    <article class="prose">
      <p>False stories spread faster than true ones because they are engineered to. They aim at your emotions, not your reason. These five checks take under a minute and catch most of what the engineered stuff relies on.</p>

      <h2>1. Notice the surge</h2>
      <p>Misinformation is built to make you feel something <strong>immediately</strong> — outrage, fear, vindication. That surge is the tell. When a post makes your pulse jump, that is exactly the moment to slow down. Real news informs first; manufactured news inflames first.</p>

      <h2>2. Ask who is telling you</h2>
      <p>Scroll to the source before you believe the claim. Is there an author's name? A date? An outlet you have heard of — or a site dressed up to look like one? <strong>No source is a source.</strong> "People are saying" is nobody.</p>

      <h2>3. Read past the headline</h2>
      <p>Headlines are written to be shared, not to be accurate. Studies consistently find most articles shared online were never opened. The headline says what spreads; the third paragraph often says <strong>what actually happened</strong>.</p>

      <h2>4. Look for a second witness</h2>
      <p>Real events leave tracks everywhere. If something big were true, several unrelated outlets would carry it within hours. One obscure site with an exclusive nobody else has is not early — it is <strong>alone</strong>, and that means something.</p>

      <h2>5. Distrust convenient pictures</h2>
      <p>Most fake images are not doctored — they are <strong>real photos from a different time or place</strong>, re-captioned. A reverse image search (built into most browsers) shows where a picture first appeared. If a photo is doing all the convincing, check the photo.</p>

      <h2>Before you share</h2>
      <ul>
        <li>Did this make me feel a surge? Pause.</li>
        <li>Who wrote it, and when?</li>
        <li>Did I read past the headline?</li>
        <li>Is anyone else reporting it?</li>
        <li>Does the photo actually show what the caption claims?</li>
      </ul>
    </article>
  </main>
```

- [ ] **Step 6: Write `src/lessons/bridging-the-digital-divide.html`**

Same chrome again, page-specific replacements — `<title>`: `Bridging the digital divide — Bytes Without Borders`; meta description: `Who gets left offline, why it matters, and what actually helps — a four-minute lesson on digital inclusion.`; `<main>` block:

```html
  <main id="main" data-topic="digital-inclusion">
    <header class="article-header">
      <a class="crumb" href="./index.html" data-i18n="lesson.back">← All lessons</a>
      <p class="eyebrow">Digital inclusion</p>
      <h1>Bridging the digital divide</h1>
      <p class="article-meta"><span class="stamp">≈ 4 min</span><span class="kind">Article</span></p>
    </header>

    <article class="prose">
      <p>Around a third of humanity has never been online. Many more are connected in name only — one shared phone, expensive data, no one to ask for help. The gap between the connected and everyone else is called the <strong>digital divide</strong>, and it is not one gap but three.</p>

      <h2>The connection gap</h2>
      <p>Networks reach cities first and villages last, because that is where the paying customers are. Even where coverage exists, data can cost a meaningful share of a family's income. Being "covered" is not the same as being <strong>connected</strong>.</p>

      <h2>The device gap</h2>
      <p>A cheap phone with a cracked screen, shared among a household, is how much of the world goes online. Forms that only work on desktops, apps that demand the newest hardware, videos that devour a data plan — each quietly locks people out.</p>

      <h2>The confidence gap</h2>
      <p>Hardest to see and hardest to close: the belief that "this is not for people like me." Skills come from patient practice with someone who does not sigh at questions. Shame keeps more people offline than price does.</p>

      <h2>Why it matters to everyone</h2>
      <p>Job applications, government services, banking, and schooling keep moving online — often <strong>only</strong> online. When that happens, being offline stops being an inconvenience and becomes exclusion from public life.</p>

      <h2>What actually helps</h2>
      <ul>
        <li>Public access that stays open: libraries, community centers, schools after hours.</li>
        <li>Materials in local languages, written for slow connections and old phones.</li>
        <li>Patient, repeated, judgment-free teaching — a neighbor beats a manual.</li>
        <li>Designing services so the simplest phone can still use them.</li>
      </ul>

      <p><a class="btn" href="../get-involved.html" data-i18n="lesson.involvedCta">Help close the gap — get involved</a></p>
    </article>
  </main>
```

- [ ] **Step 7: Run the suite**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: hub + 3 article pages now pass existence/basics; `test_lessons_json_shape` FAILS on `quiz-data-privacy.html` missing (Task 7); `test_internal_links_resolve` still red on `js/i18n.js` (Task 6) and `quiz-data-privacy.html`; `test_i18n_keys_covered` red until Task 6; `test_hub_links_every_lesson` PASSES.

- [ ] **Step 8: Commit**

```powershell
git add src/data/lessons.json src/lessons src/js/main.js
git commit -m "Add lessons hub, three articles, and site JS

Hub lists all lessons as postcards with a JS-revealed topic filter
(static fallback: all cards visible). Articles: passwords (data
privacy), misinformation (tech literacy), digital divide (digital
inclusion), each under five minutes in plain language. main.js adds
nav toggle, hub filter, and the contact-form mailto composer.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Localization scaffold — `en.json` + `i18n.js`

**Files:**
- Create: `src/locales/en.json`, `src/js/i18n.js`

**Interfaces:**
- Consumes: every `data-i18n` key used in Tasks 3–5 HTML (the coverage test enforces the exact set), `<body data-root>`, `select#lang-switch`.
- Produces: dictionary format for future languages — nested JSON flattened to dotted keys; `localStorage` key `bwb-lang`.

- [ ] **Step 1: Write `src/locales/en.json`** — values must match the inline English verbatim (this file is the translators' reference).

```json
{
  "nav": {
    "skip": "Skip to main content",
    "menu": "Menu",
    "home": "Home",
    "lessons": "Lessons",
    "about": "About",
    "getInvolved": "Get involved",
    "language": "Language"
  },
  "footer": {
    "mission": "Plain-language digital education. Free to share, built to be translated.",
    "contact": "Write to us:"
  },
  "home": {
    "eyebrow": "Micro-lessons in plain language",
    "title": "Digital know-how, one byte at a time.",
    "lede": "Free five-minute lessons on data privacy, tech literacy, and digital inclusion — written in plain language and built to travel across languages.",
    "ctaLessons": "Browse the lessons",
    "ctaInvolved": "Get involved",
    "topicsHeading": "What we teach",
    "topicPrivacyTitle": "Data privacy",
    "topicPrivacyBody": "Who can see what you do online, and the small habits that keep your accounts and identity yours.",
    "topicLiteracyTitle": "Tech literacy",
    "topicLiteracyBody": "How the everyday internet actually works, so headlines, scams, and settings stop being mysteries.",
    "topicInclusionTitle": "Digital inclusion",
    "topicInclusionBody": "Why millions are still offline or underserved, and what communities can do about it.",
    "featuredHeading": "Start with these",
    "bandTitle": "Knowledge that crosses borders.",
    "bandBody": "Every lesson is written to be translated, adapted, and taught anywhere. Help us carry it further — translate a lesson, write one, or run a workshop in your community.",
    "bandCta": "See how to help"
  },
  "about": {
    "eyebrow": "The initiative",
    "title": "Education that travels like a letter.",
    "lede": "Bytes Without Borders is a volunteer initiative informing the broader population through localized micro-lessons — short, practical, and free.",
    "missionHeading": "Why micro-lessons",
    "missionBody1": "Most guides about staying safe and capable online are long, technical, and written in one language for one audience. The people with the most to lose — new internet users, older adults, communities getting connected for the first time — rarely get materials written for them.",
    "missionBody2": "So we keep every lesson under five minutes, in plain language, free of jargon and fear. Like a correspondence course, each one is designed to be passed along: translated, printed, taught out loud, or read on a cheap phone over a slow connection.",
    "howHeading": "How a lesson is made",
    "how1Title": "Written plainly.",
    "how1Body": "One idea per lesson, everyday words, real examples — no acronyms without introductions.",
    "how2Title": "Reviewed for accuracy.",
    "how2Body": "Volunteers with security and education backgrounds check every claim before it ships.",
    "how3Title": "Built to localize.",
    "how3Body": "Lessons avoid culture-bound references so translators adapt meaning, not just words.",
    "valuesHeading": "What we believe",
    "value1": "Digital skills are civic skills — everyone deserves them, in their own language.",
    "value2": "Clarity is respect. If a lesson confuses its reader, the lesson is wrong.",
    "value3": "Knowledge should be free to share, adapt, and teach onward."
  },
  "involved": {
    "eyebrow": "Volunteer",
    "title": "Carry a lesson further.",
    "lede": "Everything here is made by volunteers. Pick the way that fits the time and skills you have.",
    "waysHeading": "Three ways to help",
    "way1Title": "Translate",
    "way1Body": "Bring a lesson into your language. Our lessons avoid idioms and culture-bound examples, so a careful translation usually takes under an hour.",
    "way2Title": "Write",
    "way2Body": "Know a topic well? Draft a five-minute lesson in plain words. Volunteer reviewers help you fact-check and tighten it.",
    "way3Title": "Teach",
    "way3Body": "Run a lesson at a library, community center, or kitchen table. Every lesson works printed, projected, or read aloud.",
    "formHeading": "Write to us",
    "formName": "Your name",
    "formEmail": "Your email",
    "formMessage": "How would you like to help?",
    "formSend": "Send",
    "formNote": "Sending opens your email app addressed to"
  },
  "hub": {
    "eyebrow": "The lesson shelf",
    "title": "Every lesson, five minutes or less.",
    "lede": "Short, practical, and jargon-free. Read them in any order — each one stands alone.",
    "filterAll": "All topics",
    "filterPrivacy": "Data privacy",
    "filterLiteracy": "Tech literacy",
    "filterInclusion": "Digital inclusion"
  },
  "lesson": {
    "back": "← All lessons",
    "quizCta": "Test yourself: the data privacy quiz",
    "involvedCta": "Help close the gap — get involved"
  },
  "notfound": {
    "title": "Lost in transit.",
    "body": "This page could not be delivered — it may have moved or never existed. The lessons are all still where they should be.",
    "ctaHome": "Back to the start",
    "ctaLessons": "Browse the lessons"
  }
}
```

- [ ] **Step 2: Write `src/js/i18n.js`**

```js
/* Dictionary-swap localization.
   English is authored inline in the HTML and is always complete;
   other languages are drop-in files at locales/<code>.json plus an
   <option> in the switcher. Missing file or key: inline English stays. */
(function () {
  "use strict";

  var STORAGE_KEY = "bwb-lang";
  var root = document.body.getAttribute("data-root") || "./";
  var select = document.getElementById("lang-switch");

  function flatten(obj, prefix, out) {
    Object.keys(obj).forEach(function (k) {
      var value = obj[k];
      var key = prefix ? prefix + "." + k : k;
      if (value && typeof value === "object") {
        flatten(value, key, out);
      } else {
        out[key] = String(value);
      }
    });
    return out;
  }

  function apply(dict) {
    var nodes = document.querySelectorAll("[data-i18n]");
    Array.prototype.forEach.call(nodes, function (node) {
      var key = node.getAttribute("data-i18n");
      if (Object.prototype.hasOwnProperty.call(dict, key)) {
        node.textContent = dict[key];
      }
    });
  }

  function load(lang) {
    if (lang === "en") { return; } /* English lives inline */
    fetch(root + "locales/" + lang + ".json")
      .then(function (response) {
        if (!response.ok) { throw new Error("HTTP " + response.status); }
        return response.json();
      })
      .then(function (data) {
        apply(flatten(data, "", {}));
        document.documentElement.lang = lang;
      })
      .catch(function () { /* fall back silently to inline English */ });
  }

  var saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* private mode */ }
  var lang = saved || "en";

  if (select) {
    var known = Array.prototype.some.call(select.options, function (option) {
      return option.value === lang;
    });
    if (!known) { lang = "en"; }
    select.value = lang;
    select.addEventListener("change", function () {
      try { localStorage.setItem(STORAGE_KEY, select.value); } catch (e) { /* ignore */ }
      window.location.reload();
    });
  }

  load(lang);
})();
```

- [ ] **Step 3: Run the suite**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `test_i18n_keys_covered` and `test_all_json_parses` PASS. Remaining red: quiz page existence/basics, `test_lessons_json_shape` (quiz page missing), `test_quiz_json_shape`, link resolution (`quiz-data-privacy.html`, `js/quiz.js` not yet linked — only the quiz page links quiz.js, so links may already be green; treat any remaining link failure other than quiz targets as a real bug).

- [ ] **Step 4: Commit**

```powershell
git add src/locales src/js/i18n.js
git commit -m "Add localization scaffold: en.json reference dictionary and i18n.js

data-i18n swap with dotted-key lookup into locales/<lang>.json,
persisted via localStorage (bwb-lang). English stays inline as the
always-complete fallback; a new language is one JSON file plus one
<option>. Key coverage is test-enforced against en.json.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Interactive micro-lesson — quiz JSON, engine, page

**Files:**
- Create: `src/data/quiz-data-privacy.json`, `src/js/quiz.js`, `src/lessons/quiz-data-privacy.html`

**Interfaces:**
- Consumes: quiz JSON shape enforced by `test_quiz_json_shape`: `{title, questions: [{prompt, choices[], answerIndex, explanation}]}`; host contract: `div#quiz.quiz-frame[data-src]`.
- Produces: the reusable interactive-lesson pattern — a new quiz is one JSON file + one thin page.

- [ ] **Step 1: Write `src/data/quiz-data-privacy.json`**

```json
{
  "title": "Data privacy basics",
  "questions": [
    {
      "prompt": "A website you rarely use asks you to create an account. What is the safest password habit?",
      "choices": [
        "Reuse the password from your email so you will not forget it",
        "Use a new, unique password — ideally from a password manager",
        "Use the site name followed by 123",
        "Use your birthday — it is easy to remember"
      ],
      "answerIndex": 1,
      "explanation": "Reused passwords are the biggest risk: one leaked site unlocks every account that shares the password. A password manager creates and remembers unique ones for you."
    },
    {
      "prompt": "You get an urgent text: \"Your bank account is locked — tap here to verify.\" What should you do first?",
      "choices": [
        "Tap the link quickly before the account closes",
        "Reply with your account number to prove it is you",
        "Contact your bank through its official app or the number on your card",
        "Forward the text to friends to warn them"
      ],
      "answerIndex": 2,
      "explanation": "Urgency is the classic sign of phishing. Never use the link in the message — reach the organization through a channel you already trust."
    },
    {
      "prompt": "A free flashlight app asks for access to your contacts and location. What does this suggest?",
      "choices": [
        "The app needs them to make the light brighter",
        "All apps need every permission to work",
        "The app may be collecting data it does not need — deny the request",
        "Permissions cannot be changed later, so accept now"
      ],
      "answerIndex": 2,
      "explanation": "A permission should match the job the app does. A flashlight does not need your contacts. You can review app permissions any time in your phone's settings."
    },
    {
      "prompt": "You are on café Wi-Fi and want to check your bank balance. What is the safest choice?",
      "choices": [
        "Use your mobile data or wait until you are on a network you trust",
        "Public Wi-Fi is always fine for banking",
        "Ask the café staff if the Wi-Fi is safe",
        "Use the Wi-Fi but type your password quickly"
      ],
      "answerIndex": 0,
      "explanation": "Open networks make it easier for others to snoop. Mobile data — or simply waiting — keeps sensitive logins off shared networks."
    },
    {
      "prompt": "What does two-factor authentication (2FA) add to your account?",
      "choices": [
        "A second password you must invent",
        "A backup email address",
        "A second proof of identity, like a code on your phone, so a stolen password is not enough",
        "Automatic virus scanning"
      ],
      "answerIndex": 2,
      "explanation": "With 2FA, an attacker needs both your password and your device. Turn it on for email and banking first — those unlock everything else."
    }
  ]
}
```

- [ ] **Step 2: Write `src/js/quiz.js`**

```js
/* Quiz engine: renders a JSON-defined micro-quiz into #quiz.
   UI strings live in STRINGS below; when a second language lands,
   they move to the locale files (see docs/architecture.md). */
(function () {
  "use strict";

  var host = document.getElementById("quiz");
  if (!host) { return; }

  var STRINGS = {
    progress: "Question {current} of {total}",
    next: "Next question",
    finish: "See your score",
    retry: "Try again",
    score: "You got {score} of {total}.",
    perfect: "Perfect — your instincts are sharp.",
    good: "Solid — worth rereading the explanations you missed.",
    start: "Good start — read “Understanding passwords” next, then come back.",
    error: "This lesson could not load. Refresh the page to try again."
  };

  function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, function (_, key) {
      return String(values[key]);
    });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text) { node.textContent = text; }
    return node;
  }

  function isValid(data) {
    if (!data || typeof data.title !== "string" || !Array.isArray(data.questions) || data.questions.length === 0) {
      return false;
    }
    return data.questions.every(function (q) {
      return typeof q.prompt === "string" &&
        Array.isArray(q.choices) && q.choices.length >= 2 &&
        typeof q.answerIndex === "number" &&
        q.answerIndex >= 0 && q.answerIndex < q.choices.length &&
        typeof q.explanation === "string";
    });
  }

  function fail() {
    host.textContent = "";
    host.appendChild(el("p", "quiz-error", STRINGS.error));
  }

  function start(data) {
    var index = 0;
    var score = 0;
    var total = data.questions.length;

    function renderQuestion() {
      var q = data.questions[index];
      host.textContent = "";
      host.appendChild(el("p", "quiz-progress", fill(STRINGS.progress, { current: index + 1, total: total })));
      host.appendChild(el("p", "quiz-question", q.prompt));

      var list = el("ul", "quiz-choices");
      var buttons = [];
      q.choices.forEach(function (choice, i) {
        var item = el("li");
        var button = el("button", "quiz-choice", choice);
        button.type = "button";
        button.addEventListener("click", function () { answer(i, buttons, q); });
        buttons.push(button);
        item.appendChild(button);
        list.appendChild(item);
      });
      host.appendChild(list);
    }

    function answer(chosen, buttons, q) {
      buttons.forEach(function (button) { button.disabled = true; });
      buttons[q.answerIndex].classList.add("is-correct");
      if (chosen === q.answerIndex) {
        score += 1;
      } else {
        buttons[chosen].classList.add("is-incorrect");
      }

      var explain = el("div", "quiz-explain");
      explain.appendChild(el("p", null, q.explanation));
      host.appendChild(explain);

      var last = index === total - 1;
      var next = el("button", "btn btn-primary quiz-next", last ? STRINGS.finish : STRINGS.next);
      next.type = "button";
      next.addEventListener("click", function () {
        if (last) {
          renderScore();
        } else {
          index += 1;
          renderQuestion();
        }
      });
      host.appendChild(next);
      next.focus();
    }

    function renderScore() {
      host.textContent = "";
      host.appendChild(el("p", "quiz-score", fill(STRINGS.score, { score: score, total: total })));
      var verdict = score === total ? STRINGS.perfect : (score >= Math.ceil(total * 0.6) ? STRINGS.good : STRINGS.start);
      host.appendChild(el("p", null, verdict));
      var retry = el("button", "btn quiz-next", STRINGS.retry);
      retry.type = "button";
      retry.addEventListener("click", function () {
        index = 0;
        score = 0;
        renderQuestion();
      });
      host.appendChild(retry);
    }

    renderQuestion();
  }

  fetch(host.getAttribute("data-src"))
    .then(function (response) {
      if (!response.ok) { throw new Error("HTTP " + response.status); }
      return response.json();
    })
    .then(function (data) {
      if (!isValid(data)) { throw new Error("invalid quiz data"); }
      start(data);
    })
    .catch(fail);
})();
```

- [ ] **Step 3: Write `src/lessons/quiz-data-privacy.html`** — same chrome as the other lesson pages (`../` prefixes, `data-root="../"`); page-specific parts: `<title>`: `Quiz: data privacy basics — Bytes Without Borders`; meta description: `Five scenarios to test your data privacy instincts — an interactive three-minute micro-lesson.`; extra script tag for the quiz engine; `<main>` block:

```html
  <main id="main" data-topic="data-privacy">
    <header class="article-header">
      <a class="crumb" href="./index.html" data-i18n="lesson.back">← All lessons</a>
      <p class="eyebrow">Data privacy</p>
      <h1>Quiz: data privacy basics</h1>
      <p class="article-meta"><span class="stamp">≈ 3 min</span><span class="kind">Interactive</span></p>
    </header>

    <div id="quiz" class="quiz-frame" data-src="../data/quiz-data-privacy.json">
      <noscript>
        <p>This interactive lesson needs JavaScript, which is turned off in your browser.</p>
        <p>No problem — the same ideas are covered in <a href="./understanding-passwords.html">Understanding passwords</a>.</p>
      </noscript>
    </div>
  </main>
```

and before `</body>` (note the third script):

```html
  <script src="../js/i18n.js" defer></script>
  <script src="../js/main.js" defer></script>
  <script src="../js/quiz.js" defer></script>
```

- [ ] **Step 4: Run the suite — FULL GREEN expected**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: **all tests pass** (24 passed). If anything is red, fix it now — from this task on, the suite must stay green.

- [ ] **Step 5: Commit**

```powershell
git add src/data/quiz-data-privacy.json src/js/quiz.js src/lessons/quiz-data-privacy.html
git commit -m "Add interactive data-privacy quiz — first interactive micro-lesson

quiz.js renders any JSON-defined quiz into #quiz[data-src]: one
question at a time, immediate right/wrong marking with a plain-
language explanation, score screen with retry. Validates the JSON
shape and shows a friendly error otherwise; noscript falls back to
the passwords article. Site validation suite is fully green as of
this commit.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: GitHub Pages deployment workflow

**Files:**
- Create: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Consumes: the `src/` directory as the complete publishable site.
- Produces: automatic deploy on push to `main` (user pushes; repo rule forbids the agent pushing).

- [ ] **Step 1: Write `.github/workflows/deploy-pages.yml`**

```yaml
name: Deploy site to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: src
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```powershell
git add .github/workflows/deploy-pages.yml
git commit -m "Add GitHub Pages deploy workflow

Publishes src/ via actions/upload-pages-artifact + deploy-pages on
push to main (or manual dispatch). Requires Pages source set to
'GitHub Actions' in repo settings; deploying is a user action —
this repo is never pushed by the agent.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Documentation + agent memory

**Files:**
- Create: `README.md`, `docs/architecture.md`
- Modify: `.claude/agent-memory/context.md`, `.claude/agent-memory/decisions.md`, `.claude/agent-memory/notes.md`

- [ ] **Step 1: Write `README.md`**

```markdown
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
```

- [ ] **Step 2: Write `docs/architecture.md`**

```markdown
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
```

- [ ] **Step 3: Update agent memory** (per CLAUDE.md rules)

Overwrite `.claude/agent-memory/context.md` with:

```markdown
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
```

Append to `.claude/agent-memory/decisions.md`:

```markdown
# Decisions

- 2026-07-13 (human): Stack = plain HTML/CSS/JS hosted on GitHub Pages —
  chosen over Flask/Astro/Django during brainstorming.
- 2026-07-13 (human): Skeleton scope = Home/About, lessons hub + articles,
  one interactive quiz, Get involved; i18n structure now with EN only;
  warm-humanist visual direction. Design approved as-is (site in `src/`,
  deploy via Actions).
- 2026-07-13 (agent): "Postal/correspondence-course" design concept — airmail
  duotone + stamp chips — chosen to keep warm-humanist from collapsing into
  the generic cream+terracotta template.
- 2026-07-13 (agent): Shared chrome duplicated per page instead of JS-injected
  partials (works without JS) or Jekyll (avoids Ruby toolchain); acceptable at
  ~9 pages, guarded by the link/i18n test suite.
- 2026-07-13 (agent): Validation-suite-first execution (suite written red in
  Task 1, green by Task 7) instead of per-page unit tests — the site is
  static, so whole-site invariants are the meaningful tests.
- 2026-07-13 (agent): Plan executed inline (executing-plans) rather than via
  per-task subagents: every file's full content was already locked in the
  reviewed plan, so subagent handoff added drift risk without review value.
  Multi-agent effort was spent on post-build review instead.
```

Append to `.claude/agent-memory/notes.md`:

```markdown
- 2026-07-13: Run site checks with `.env.local\Scripts\python.exe -m pytest
  tests -q` from the repo root (do not use a global python). Preview with
  `python -m http.server 8000 -d src`.
- 2026-07-13: When touching nav/footer, remember chrome is duplicated across
  all 9 pages in `src/` — the pytest suite catches broken links and missing
  i18n keys but not visual drift; eyeball one root page and one lessons/ page.
```

- [ ] **Step 4: Run the suite (must stay green), then commit**

```powershell
.env.local\Scripts\python.exe -m pytest tests -q
git add README.md docs/architecture.md .claude/agent-memory
git commit -m "Add README, architecture guide, and agent-memory records

README: quickstart, structure, deploy steps, pre-launch checklist.
architecture.md: page anatomy plus the three extension recipes
(article, quiz, language). Agent memory updated with durable project
facts and the decision log from the skeleton build.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Full verification

No new files. Evidence before completion claims (superpowers:verification-before-completion).

- [ ] **Step 1: Suite green from a clean state**

Run: `.env.local\Scripts\python.exe -m pytest tests -v`
Expected: 24 passed, 0 failed. Confirm `stdout/last-test-report.txt` says `failed: 0`.

- [ ] **Step 2: Serve and browse**

Run: `python -m http.server 8000 -d src` (background). With the browser (Playwright MCP):
- Home: hero, topic cards, featured postcards render; no console errors; screenshot.
- Nav to Lessons: filter bar visible (JS revealed); click "Data privacy" → only 2 cards remain; click "All topics" → 4 cards.
- Open the quiz: answer all 5 questions (verify right/wrong marking, explanations, score screen, retry).
- Get involved: submit the form → navigation to a `mailto:` URL is attempted (Playwright may show it blocked — attempted navigation is the pass signal).
- About + 404 (`http://localhost:8000/404.html`): render, one h1 each; screenshot.
- Resize to 375×812: nav collapses to Menu button; toggle opens/closes it.
- Language switcher: select English (only option) — persists after reload, no errors.

- [ ] **Step 3: JS-off sanity**

All content links are plain anchors and the filter bar ships `hidden` — re-verify by loading Home and the hub with JavaScript disabled in the browser context: all 4 lesson cards visible, nav links usable (desktop viewport), quiz page shows the noscript fallback paragraph.

- [ ] **Step 4: Cleanup + final state check**

Stop the server. `git status` — working tree clean (stdout artifact is gitignored). `git log --oneline` shows one commit per task. Do not push.

---

## Plan Self-Review (completed at authoring time)

- **Spec coverage:** every spec section maps to a task — pages (3–5, 7), design system (2), JS/progressive enhancement (5–7), i18n (6), data (5, 7), tests (1), deploy (8), docs + error handling (4: 404; 7: quiz error/noscript; 9: docs). Success criteria all land in Task 10.
- **Placeholders:** none — every file's complete content is inline. The word "placeholder" appears only for the intentional `.example` email, which is a documented product decision, not a plan gap.
- **Type consistency:** `data-root` / `#lang-switch` / `bwb-lang` (Tasks 3–6), form IDs `c-name`/`c-email`/`c-message` (Tasks 4–5), filter contract `[data-filter-bar]`/`[data-lesson-card]`/`data-topic` (Tasks 2, 5), quiz contract `#quiz[data-src]` + JSON shape (Tasks 1, 7 — test and engine agree), lesson JSON keys (Tasks 1, 5 agree, including `kind` ∈ {article, interactive}).

## Execution note

Executed inline in the authoring session (superpowers:executing-plans) — the user pre-approved a one-pass build and every file's content is fully specified above, so per-task subagent handoff would only re-copy locked content. Post-build quality is instead covered by a multi-agent review workflow after Task 10.



