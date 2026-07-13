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
