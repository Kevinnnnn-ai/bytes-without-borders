"""Static-site validation for Bytes Without Borders.

Run from the repo root:  .env.local\\Scripts\\python.exe -m pytest tests -q
The publishable site lives in docs/ (GitHub Pages branch publishing).
Checks: required pages, internal links (exact-case, inside docs/), JSON
shapes, i18n key coverage, and per-page basics on every HTML page.
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

import pytest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs"

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
        self._in_inline_script = False
        self._script_buf = ""
        self.inline_scripts: list[str] = []
        self.font_preloads = 0

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
        elif tag == "script" and not a.get("src"):
            self._in_inline_script = True
            self._script_buf = ""
        elif tag == "link" and a.get("rel") == "preload" and a.get("as") == "font":
            self.font_preloads += 1
        # data-src is the quiz engine's fetch target — a broken one is a broken page
        for key in ("href", "src", "data-src"):
            if a.get(key):
                self.links.append(a[key])
        if "data-i18n" in a:
            self.i18n_keys.add(a["data-i18n"])

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if self._in_inline_script:
            self._script_buf += data

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "script" and self._in_inline_script:
            self._in_inline_script = False
            self.inline_scripts.append(self._script_buf)


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


def exists_exact(target: Path) -> bool:
    """True if target exists under docs/ with exact-case path components.

    Windows resolves links case-insensitively, but GitHub Pages serves from
    a case-sensitive filesystem — a case mismatch would 404 in production.
    """
    try:
        rel = target.relative_to(SRC)
    except ValueError:
        return False  # escapes the published tree entirely
    current = SRC
    for part in rel.parts:
        if not current.is_dir() or part not in {p.name for p in current.iterdir()}:
            return False
        current = current / part
    return True


@pytest.mark.parametrize("page", REQUIRED_PAGES)
def test_required_page_exists(page):
    assert (SRC / page).is_file(), f"missing required page: docs/{page}"


def test_page_basics_all_pages():
    pages = html_files()
    assert pages, "no HTML pages found under docs/"
    problems = []
    for path in pages:
        s = scan(path)
        rel = path.relative_to(SRC)
        if s.h1_count != 1:
            problems.append(f"{rel}: expected exactly one <h1>, found {s.h1_count}")
        if not s.title.strip():
            problems.append(f"{rel}: empty or missing <title>")
        if s.lang != "en":
            problems.append(f"{rel}: <html lang> must be 'en', got {s.lang!r}")
        names = {m.get("name"): m.get("content", "") for m in s.metas if m.get("name")}
        if not names.get("viewport"):
            problems.append(f"{rel}: missing viewport meta")
        if not names.get("description", "").strip():
            problems.append(f"{rel}: missing meta description")
    assert not problems, "page basics failed:\n" + "\n".join(problems)


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
            if not exists_exact(target):
                broken.append(f"{f.relative_to(ROOT)}: {link}")
    assert not broken, "broken internal links (missing, wrong case, or outside docs/):\n" + "\n".join(broken)


def test_all_json_parses():
    json_files = list((SRC / "data").glob("*.json")) + list((SRC / "locales").glob("*.json"))
    assert json_files, "no JSON files found under docs/data or docs/locales"
    for j in json_files:
        json.loads(j.read_text(encoding="utf-8"))  # raises on invalid JSON


def test_lessons_json_shape():
    path = SRC / "data" / "lessons.json"
    if not path.is_file():
        pytest.fail("docs/data/lessons.json does not exist")
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


def test_quiz_json_shapes():
    quiz_files = list((SRC / "data").glob("quiz-*.json"))
    assert quiz_files, "no quiz JSON found under docs/data"
    for path in quiz_files:
        data = json.loads(path.read_text(encoding="utf-8"))
        assert isinstance(data.get("title"), str) and data["title"].strip(), f"{path.name}: bad title"
        questions = data.get("questions")
        assert isinstance(questions, list) and len(questions) >= 3, f"{path.name}: needs >=3 questions"
        for i, q in enumerate(questions):
            assert isinstance(q.get("prompt"), str) and q["prompt"].strip(), f"{path.name} q{i}: bad prompt"
            choices = q.get("choices")
            assert isinstance(choices, list) and len(choices) >= 2, f"{path.name} q{i}: needs >=2 choices"
            assert all(isinstance(c, str) and c.strip() for c in choices), f"{path.name} q{i}: empty choice"
            assert (
                isinstance(q.get("answerIndex"), int)
                and not isinstance(q["answerIndex"], bool)
                and 0 <= q["answerIndex"] < len(choices)
            ), f"{path.name} q{i}: bad answerIndex"
            assert isinstance(q.get("explanation"), str) and q["explanation"].strip(), f"{path.name} q{i}: bad explanation"


def test_i18n_keys_covered():
    en_path = SRC / "locales" / "en.json"
    if not en_path.is_file():
        pytest.fail("docs/locales/en.json does not exist")
    dictionary = flatten(json.loads(en_path.read_text(encoding="utf-8")))
    used = set()
    for f in html_files():
        used |= scan(f).i18n_keys
    missing = sorted(used - set(dictionary))
    assert not missing, f"data-i18n keys missing from en.json: {missing}"


def test_head_security_meta():
    """Every page carries a CSP whose script hashes match its actual inline
    scripts, plus referrer policy, theme-colors, and the two font preloads.
    A drifted hash would silently drop the page to its no-JS fallback."""
    problems = []
    for path in html_files():
        s = scan(path)
        rel = path.relative_to(SRC)
        csp = [m for m in s.metas if m.get("http-equiv") == "Content-Security-Policy"]
        if len(csp) != 1:
            problems.append(f"{rel}: expected exactly one CSP meta, found {len(csp)}")
            continue
        content = csp[0].get("content", "")
        for directive in ("default-src 'self'", "object-src 'none'", "base-uri 'self'"):
            if directive not in content:
                problems.append(f"{rel}: CSP missing {directive}")
        declared = sorted(re.findall(r"'sha256-([A-Za-z0-9+/=]+)'", content))
        actual = sorted(
            base64.b64encode(hashlib.sha256(script.encode("utf-8")).digest()).decode()
            for script in s.inline_scripts
        )
        if declared != actual:
            problems.append(f"{rel}: CSP script hashes do not match inline scripts")
        if sum(1 for m in s.metas if m.get("name") == "theme-color") != 2:
            problems.append(f"{rel}: expected two theme-color metas (light + dark)")
        if not any(m.get("name") == "referrer" for m in s.metas):
            problems.append(f"{rel}: missing referrer meta")
        if s.font_preloads != 2:
            problems.append(f"{rel}: expected 2 font preloads, found {s.font_preloads}")
    assert not problems, "head metadata problems:\n" + "\n".join(problems)


def test_hub_links_every_lesson():
    hub = SRC / "lessons" / "index.html"
    lessons_json = SRC / "data" / "lessons.json"
    if not hub.is_file() or not lessons_json.is_file():
        pytest.fail("hub page or lessons.json does not exist")
    hub_html = hub.read_text(encoding="utf-8")
    for lesson in json.loads(lessons_json.read_text(encoding="utf-8"))["lessons"]:
        assert lesson["href"] in hub_html, f"hub does not link {lesson['href']}"
