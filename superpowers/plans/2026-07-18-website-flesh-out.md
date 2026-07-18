# Website Flesh-Out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the site to a 12-lesson shelf, prove the i18n pipeline with Spanish (chrome/UI + two translated lesson pages), and close launch gaps (README, hero proof strip, hub counts, robots/sitemap), per `superpowers/specs/2026-07-18-website-flesh-out-design.md`.

**Architecture:** Grow in place — extend the exact patterns in `superpowers/architecture.md`. Plain multi-page static site in `docs/`; every page is a complete document with duplicated chrome; JS is progressive enhancement only. Validation-suite-first: Task 1 extends the pytest suite (new checks red), later tasks turn it green.

**Tech Stack:** HTML/CSS/JS (no build), Python 3 venv (`.env.local/`) + pytest for validation, Playwright MCP for visual verification.

## Global Constraints

- Run tests as `.env.local\Scripts\python.exe -m pytest tests -q` from the repo root — never a global python.
- After editing ANY inline `<script>` or adding ANY page: run `.env.local\Scripts\python.exe tests\tools\update_head_meta.py` (CSP hash pinning). It rewrites files with LF newlines.
- Never use root-relative `/...` URLs. All links relative, exact-case.
- Commit small, per task, with what+why descriptions. **Never push.**
- Never edit `CLAUDE.md`, `AGENTS.md`, `settings.json`, `settings.local.json`.
- CSS: tokens only in `:root`; `--line` decorative, `--line-strong` interactive borders; `--space-1..5` within a group, `--section-pad` between sections; body copy reads lighter via `--ink-body`, never a sub-400 font-weight; any display-styled element that can carry `hidden` needs an explicit `[hidden] { display: none; }` guard.
- Voice: plain language, one idea per lesson, no unintroduced acronyms, no fear-based framing, em-dash style matches existing copy.
- i18n contract: inline English is authored in the HTML; `data-i18n` nodes must contain TEXT ONLY (the dictionary swap sets `textContent` and would destroy child elements).
- Site base URL (sitemap/hreflang): `https://kevinnnnn-ai.github.io/bytes-without-borders/`.
- **Article prose:** this plan locks each article's head, chrome, structure (h2 sections), key claims, length, and CTA. The paragraph prose itself is authored at execution against that brief and MUST then pass the Task 11 adversarial accuracy review before the shelf is considered done. (Conscious deviation from full-content-in-plan: the review gate is the quality control.)

---

### Task 1: Extend the validation suite (red first)

**Files:**
- Modify: `tests/test_site.py`

**Interfaces:**
- Produces: constants `SITE_BASE`, updated `REQUIRED_PAGES`; `PageScan` gains `.options`, `.body_attrs`, `.alternates`. Later tasks turn these tests green; no task may weaken them.

- [ ] **Step 1: Extend `PageScan`** — in `tests/test_site.py`, add to `__init__`:

```python
        self.options: list[str] = []
        self.body_attrs: dict = {}
        self.alternates: list[dict] = []
```

and inside `handle_starttag`, after the `elif tag == "link"...` branch, add:

```python
        elif tag == "option" and "value" in a:
            self.options.append(a["value"])
        elif tag == "body":
            self.body_attrs = a
        if tag == "link" and a.get("rel") == "alternate" and a.get("hreflang"):
            self.alternates.append(a)
```

- [ ] **Step 2: Update constants** — replace the `REQUIRED_PAGES` list with:

```python
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
    "lessons/two-factor-authentication.html",
    "lessons/what-cookies-know.html",
    "lessons/how-the-internet-reaches-you.html",
    "lessons/why-updates-matter.html",
    "lessons/designing-for-slow-connections.html",
    "lessons/accessibility-for-everyone.html",
    "lessons/quiz-spot-the-scam.html",
    "lessons/quiz-getting-online.html",
    "lessons/es/understanding-passwords.html",
    "lessons/es/spotting-misinformation.html",
]
```

and below `TOPICS` add:

```python
SITE_BASE = "https://kevinnnnn-ai.github.io/bytes-without-borders/"
```

- [ ] **Step 3: Per-page language rule** — in `test_page_basics_all_pages`, replace the `if s.lang != "en":` check with:

```python
        expected_lang = "es" if rel.parts[:2] == ("lessons", "es") else "en"
        if s.lang != expected_lang:
            problems.append(f"{rel}: <html lang> must be {expected_lang!r}, got {s.lang!r}")
```

- [ ] **Step 4: Append the new tests** at the end of the file:

```python
def site_url_to_path(url: str) -> Path | None:
    """Map an absolute SITE_BASE url to its file under docs/, else None."""
    if not url.startswith(SITE_BASE):
        return None
    return SRC / unquote(urlsplit(url).path[len(urlsplit(SITE_BASE).path):])


def test_locale_key_parity():
    en = flatten(json.loads((SRC / "locales" / "en.json").read_text(encoding="utf-8")))
    es_path = SRC / "locales" / "es.json"
    assert es_path.is_file(), "docs/locales/es.json does not exist"
    es = flatten(json.loads(es_path.read_text(encoding="utf-8")))
    assert set(en) == set(es), (
        "en/es key mismatch:\n  only en: %s\n  only es: %s"
        % (sorted(set(en) - set(es)), sorted(set(es) - set(en)))
    )
    empty = [k for k, v in es.items() if not v.strip()]
    assert not empty, f"es.json has empty values: {empty}"


def test_lang_switcher_options():
    problems = []
    for path in html_files():
        opts = scan(path).options
        for code in ("en", "es"):
            if code not in opts:
                problems.append(f"{path.relative_to(SRC)}: switcher missing option {code!r}")
    assert not problems, "language switcher problems:\n" + "\n".join(problems)


def test_translation_pages_cross_linked():
    es_dir = SRC / "lessons" / "es"
    assert es_dir.is_dir() and list(es_dir.glob("*.html")), "no Spanish lesson pages"
    problems = []
    for es_page in sorted(es_dir.glob("*.html")):
        en_page = SRC / "lessons" / es_page.name
        if not en_page.is_file():
            problems.append(f"{es_page.name}: no English counterpart")
            continue
        s_es, s_en = scan(es_page), scan(en_page)
        alt_en = s_es.body_attrs.get("data-alt-en")
        alt_es = s_en.body_attrs.get("data-alt-es")
        if not alt_en or not (es_page.parent / alt_en).resolve() == en_page.resolve():
            problems.append(f"lessons/es/{es_page.name}: bad data-alt-en {alt_en!r}")
        if not alt_es or not (en_page.parent / alt_es).resolve() == es_page.resolve():
            problems.append(f"lessons/{en_page.name}: bad data-alt-es {alt_es!r}")
        for page, s, needed in ((es_page, s_es, {"en", "es"}), (en_page, s_en, {"en", "es", "x-default"})):
            langs = {a["hreflang"] for a in s.alternates}
            if langs != needed:
                problems.append(f"{page.relative_to(SRC)}: hreflang set {sorted(langs)} != {sorted(needed)}")
            for a in s.alternates:
                target = site_url_to_path(a.get("href", ""))
                if target is None or not exists_exact(target.resolve()):
                    problems.append(f"{page.relative_to(SRC)}: hreflang href does not resolve: {a.get('href')}")
    assert not problems, "translation cross-link problems:\n" + "\n".join(problems)


def test_sitemap_covers_site():
    import xml.etree.ElementTree as ET
    path = SRC / "sitemap.xml"
    assert path.is_file(), "docs/sitemap.xml does not exist"
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [el.text for el in ET.parse(path).getroot().findall("sm:url/sm:loc", ns)]
    assert len(locs) == len(set(locs)), "duplicate sitemap entries"
    expected = {p for p in html_files() if p.name != "404.html"}
    actual = set()
    for loc in locs:
        target = site_url_to_path(loc or "")
        assert target is not None, f"sitemap url not under SITE_BASE: {loc}"
        actual.add(target)
    assert actual == expected, (
        "sitemap mismatch:\n  missing: %s\n  extra: %s"
        % (sorted(str(p.relative_to(SRC)) for p in expected - actual),
           sorted(str(p.relative_to(SRC)) for p in actual - expected))
    )


def test_robots_txt():
    path = SRC / "robots.txt"
    assert path.is_file(), "docs/robots.txt does not exist"
    text = path.read_text(encoding="utf-8")
    assert f"Sitemap: {SITE_BASE}sitemap.xml" in text
```

- [ ] **Step 5: Run the suite; verify exactly the intended failures**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: FAIL on `test_required_page_exists` (10 new pages), `test_locale_key_parity`, `test_lang_switcher_options`, `test_translation_pages_cross_linked`, `test_sitemap_covers_site`, `test_robots_txt`. All pre-existing tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/test_site.py
git commit -m "test: extend suite for 12-lesson shelf, Spanish, sitemap (red)

New invariants ahead of the flesh-out build: required-page list grows to
19 pages, locale key parity en<->es, both switcher options on every page,
hreflang + data-alt-* symmetry for translated pages, sitemap coverage,
robots.txt. Per-page lang rule now expects es under lessons/es/."
```

---

### Task 2: JS engine i18n (i18n.js, quiz.js, main.js) + en.json UI keys + es option on existing pages

**Files:**
- Modify: `docs/js/i18n.js` (full replacement below)
- Modify: `docs/js/quiz.js`, `docs/js/main.js`, `docs/locales/en.json`
- Modify: all 9 existing pages' `#lang-switch` (`docs/index.html`, `docs/about.html`, `docs/get-involved.html`, `docs/404.html`, `docs/lessons/index.html`, `docs/lessons/understanding-passwords.html`, `docs/lessons/spotting-misinformation.html`, `docs/lessons/bridging-the-digital-divide.html`, `docs/lessons/quiz-data-privacy.html`)

**Interfaces:**
- Produces: `window.bwbDict` (flattened active dictionary; `{}` when English), CustomEvent `"bwb:langchange"` on `document`, `data-alt-<code>` body-attribute navigation, locale keys `quiz.*`, `ui.*`, `hub.showing`. Tasks 13–15 rely on all of these exactly as named.

- [ ] **Step 1: Replace `docs/js/i18n.js` with:**

```js
/* Dictionary-swap localization.
   English is authored inline in the HTML and is always complete;
   other languages are drop-in files at locales/<code>.json plus an
   <option> in the switcher. Missing file or key: inline English stays.
   Switching applies in place (no reload); the original English text is
   stashed on each node so switching back needs no fetch.
   Extras for JS-created UI and full page translations:
   - window.bwbDict always holds the active flattened dictionary ({} for
     English); "bwb:langchange" fires on document after every change.
   - A body[data-alt-<code>] attribute marks a real translated copy of
     this page; choosing that language NAVIGATES there instead of
     swapping. Translated pages (html[lang] != "en") never dictionary-swap
     — they only navigate back, but still load their locale file so
     JS-created UI (share, quiz labels) speaks their language. */
(function () {
  "use strict";

  var STORAGE_KEY = "bwb-lang";
  var root = document.body.getAttribute("data-root") || "./";
  var select = document.getElementById("lang-switch");
  var pageLang = document.documentElement.getAttribute("lang") || "en";

  window.bwbDict = {};

  function announce() {
    document.dispatchEvent(new CustomEvent("bwb:langchange"));
  }

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

  function nodes() {
    return document.querySelectorAll("[data-i18n]");
  }

  function apply(dict) {
    Array.prototype.forEach.call(nodes(), function (node) {
      var key = node.getAttribute("data-i18n");
      if (Object.prototype.hasOwnProperty.call(dict, key)) {
        if (node.dataset.i18nOriginal === undefined) {
          node.dataset.i18nOriginal = node.textContent;
        }
        node.textContent = dict[key];
      }
    });
  }

  function restoreEnglish() {
    Array.prototype.forEach.call(nodes(), function (node) {
      if (node.dataset.i18nOriginal !== undefined) {
        node.textContent = node.dataset.i18nOriginal;
      }
    });
    document.documentElement.lang = "en";
    window.bwbDict = {};
    announce();
  }

  function load(lang) {
    if (lang === "en") { return; } /* English lives inline */
    fetch(root + "locales/" + lang + ".json")
      .then(function (response) {
        if (!response.ok) { throw new Error("HTTP " + response.status); }
        return response.json();
      })
      .then(function (data) {
        var dict = flatten(data, "", {});
        window.bwbDict = dict;
        if (pageLang === "en") {
          apply(dict);
          document.documentElement.lang = lang;
        }
        announce();
      })
      .catch(function () { /* fall back silently to inline English */ });
  }

  function store(choice) {
    /* persistence is best-effort; the switch works either way */
    try { localStorage.setItem(STORAGE_KEY, choice); } catch (e) { /* ignore */ }
  }

  var saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* private mode */ }
  var lang = saved || "en";

  if (select) {
    var known = Array.prototype.some.call(select.options, function (option) {
      return option.value === lang;
    });
    if (!known) { lang = "en"; }
    /* a translated page shows itself in the switcher, whatever is stored */
    select.value = pageLang === "en" ? lang : pageLang;
    select.addEventListener("change", function () {
      var choice = select.value;
      store(choice);
      var alt = document.body.getAttribute("data-alt-" + choice);
      if (alt) { window.location.href = alt; return; }
      if (pageLang !== "en") { return; } /* translated page, no swap */
      if (choice === "en") {
        restoreEnglish();
      } else {
        load(choice);
      }
    });
  }

  /* no auto-redirect on load — data-alt-* only acts on an explicit switch */
  load(pageLang === "en" ? lang : pageLang);
})();
```

- [ ] **Step 2: quiz.js — localizable strings + generalized start**

In `docs/js/quiz.js`: replace the header comment lines 1–3 with:

```js
/* Quiz engine: renders a JSON-defined micro-quiz into #quiz.
   STRINGS below are English defaults; the active locale overrides them
   via window.bwbDict ("quiz.*" keys, see js/i18n.js). */
```

Replace the `start` value inside `STRINGS` with:

```js
    start: "Good start — reread the explanations you missed, then try again.",
```

After the `STRINGS` object, add:

```js
  function t(key) {
    var dict = window.bwbDict || {};
    return Object.prototype.hasOwnProperty.call(dict, "quiz." + key) ? dict["quiz." + key] : STRINGS[key];
  }

  /* redraws the current screen when the language changes; null while an
     explanation is open (a redraw would erase the marked answer) */
  var rerender = null;
  document.addEventListener("bwb:langchange", function () {
    if (rerender) { rerender(); }
  });
```

Then replace every `STRINGS.x` read with `t("x")` — the seven sites: `STRINGS.error` → `t("error")` (in `fail`), `STRINGS.progress` → `t("progress")`, `STRINGS.correct`/`STRINGS.incorrect` → `t("correct")`/`t("incorrect")`, `STRINGS.finish`/`STRINGS.next` → `t("finish")`/`t("next")`, `STRINGS.score` → `t("score")`, `STRINGS.perfect`/`STRINGS.good`/`STRINGS.start` → `t("perfect")`/`t("good")`/`t("start")`, `STRINGS.retry` → `t("retry")`.

Wire `rerender`: first line of `renderQuestion` body add `rerender = function () { renderQuestion(false); };` — first line of `answer` add `rerender = null;` — give `renderScore` a `moveFocus` parameter, first line `rerender = function () { renderScore(false); };`, wrap its final `focusInto(scoreLine);` in `if (moveFocus) { ... }`, and update the two callers: `renderScore()` in `answer` becomes `renderScore(true)`; in `fail` add `rerender = fail;` as its first line.

- [ ] **Step 3: main.js — localizable UI strings**

In `docs/js/main.js`, after `"use strict";` add:

```js
  /* English defaults for JS-created UI; locale overrides via window.bwbDict */
  var UI = {
    "ui.share": "Share this lesson",
    "ui.shareCopied": "Link copied ✓",
    "ui.toTop": "Back to top",
    "hub.showing": "Showing {shown} of {total} lessons"
  };
  function t(key) {
    var dict = window.bwbDict || {};
    return Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : UI[key];
  }
```

In the filter block, replace the announcer line with:

```js
        filterStatus.textContent = t("hub.showing").replace("{shown}", String(shown)).replace("{total}", String(cards.length));
```

In the back-to-top block, replace `toTop.setAttribute("aria-label", "Back to top");` with `toTop.setAttribute("aria-label", t("ui.toTop"));`.

In the share block: delete `var SHARE_LABEL = "Share this lesson";`, replace `share.textContent = SHARE_LABEL;` with `share.textContent = t("ui.share");`, replace `share.textContent = "Link copied ✓";` with `share.textContent = t("ui.shareCopied");`, and replace the reset line with `setTimeout(function () { share.textContent = t("ui.share"); }, 2000);`.

At the end of the IIFE (before the closing `})();`), add:

```js
  /* JS-created labels re-resolve when the language changes */
  document.addEventListener("bwb:langchange", function () {
    toTop.setAttribute("aria-label", t("ui.toTop"));
    var shareBtn = document.querySelector(".share-btn");
    if (shareBtn && shareBtn.textContent !== t("ui.shareCopied")) {
      shareBtn.textContent = t("ui.share");
    }
  });
```

(Note: the copied-state guard compares against the ALREADY-active dict, which is fine — worst case the label resets 2s later via the timeout.)

- [ ] **Step 4: en.json — add the UI sections**

In `docs/locales/en.json`: add `"showing": "Showing {shown} of {total} lessons"` to the `hub` object, and append two new top-level sections before the closing brace:

```json
  "quiz": {
    "progress": "Question {current} of {total}",
    "correct": "Correct.",
    "incorrect": "Not quite.",
    "next": "Next question",
    "finish": "See your score",
    "retry": "Try again",
    "score": "You got {score} of {total}.",
    "perfect": "Perfect — your instincts are sharp.",
    "good": "Solid — worth rereading the explanations you missed.",
    "start": "Good start — reread the explanations you missed, then try again.",
    "error": "This lesson could not load. Refresh the page to try again."
  },
  "ui": {
    "share": "Share this lesson",
    "shareCopied": "Link copied ✓",
    "toTop": "Back to top"
  }
```

- [ ] **Step 5: Add the Spanish option to all 9 existing pages** — in each file listed above, replace

```html
        <select id="lang-switch">
          <option value="en" selected>English</option>
        </select>
```

with

```html
        <select id="lang-switch">
          <option value="en" selected>English</option>
          <option value="es">Español</option>
        </select>
```

- [ ] **Step 6: Verify**

Run: `.env.local\Scripts\python.exe tests\tools\update_head_meta.py` (no inline scripts changed — expect no diff beyond regeneration; safe either way)
Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `test_lang_switcher_options` now PASSES; same remaining failures as Task 1 minus it. Manually: serve `docs/` and confirm the quiz still runs and the switcher shows Español (selecting it silently stays English — es.json arrives in Task 14).

- [ ] **Step 7: Commit**

```bash
git add docs/js/i18n.js docs/js/quiz.js docs/js/main.js docs/locales/en.json docs/index.html docs/about.html docs/get-involved.html docs/404.html docs/lessons
git commit -m "feat: i18n plumbing for a second language

i18n.js now exposes window.bwbDict, fires bwb:langchange, and navigates
via body[data-alt-<code>] when a real translated page exists; translated
pages keep their own language in the switcher and load their dictionary
for JS-created UI. quiz.js/main.js strings resolve through the dict with
inline English defaults (quiz.start no longer names a specific lesson).
Every page's switcher gains the Español option; en.json gains quiz/ui
sections. Spec: superpowers/specs/2026-07-18-website-flesh-out-design.md"
```

---

### Task 3: Article — Two-factor authentication, explained

**Files:**
- Create: `docs/lessons/two-factor-authentication.html`
- Modify: `docs/data/lessons.json`, `docs/lessons/index.html`

**Interfaces:**
- Consumes: chrome pattern from `docs/lessons/understanding-passwords.html`.
- Produces: page at `lessons/two-factor-authentication.html` (Tasks 12/16 link/list it).

- [ ] **Step 1: Create the page.** Copy `docs/lessons/understanding-passwords.html` verbatim, then change ONLY: `<title>Two-factor authentication, explained — Bytes Without Borders</title>`; `<meta name="description" content="What that second sign-in code actually does, which kind to pick, and the one rule that keeps it working — a four-minute lesson.">`; keep `<main id="main" data-topic="data-privacy">`; article header eyebrow `Data privacy`, `<h1>Two-factor authentication, explained</h1>`, meta `<span class="stamp">≈ 4 min</span><span class="kind">Article</span>`; replace the article body per this brief and end with the existing CTA paragraph unchanged (`lesson.quizCta` → `./quiz-data-privacy.html`).

**Content brief (author prose to fit; ≈450–550 words):**
- Intro ¶: a password can be stolen without you doing anything wrong (leaks, phishing); 2FA means a stolen password alone is not enough. Introduce the acronym before using it.
- `<h2>What the second step proves</h2>` — factor = something you know (password) + something you have (your phone). A thief across the world usually has neither your phone nor your fingerprint.
- `<h2>Pick your second step</h2>` — kinds, plainly: codes by text message (weakest but far better than nothing), authenticator apps (codes that live on your phone, work offline), and prompts/keys built into phones. Advice: use the app kind when offered; any kind beats none.
- `<h2>The one rule</h2>` — never tell anyone a code — not "your bank", not "support", nobody; real organizations never ask. A code spoken aloud is a door held open. (Must stay consistent with the softened-2FA precedent: calm, not scary.)
- `<h2>Where to turn it on first</h2>` — email first (it resets everything else), then banking, then social accounts. Mention it usually lives in settings under "security" or "two-step verification".
- `<h2>Try it today</h2>` — `<ul>` of 3–4 concrete actions mirroring the sections.

- [ ] **Step 2: Register the lesson.** In `docs/data/lessons.json`, append to the `lessons` array:

```json
    {
      "slug": "two-factor-authentication",
      "href": "two-factor-authentication.html",
      "title": "Two-factor authentication, explained",
      "topic": "data-privacy",
      "summary": "Why a second step stops most break-ins cold, and which kind of second step to pick.",
      "minutes": 4,
      "kind": "article"
    }
```

- [ ] **Step 3: Hub card.** In `docs/lessons/index.html`, append to the `<ul class="postcard-grid">` (after the last existing `<li>`):

```html
        <li class="postcard" data-lesson-card data-topic="data-privacy">
          <p class="eyebrow">Data privacy</p>
          <h2><a href="./two-factor-authentication.html">Two-factor authentication, explained</a></h2>
          <p>Why a second step stops most break-ins cold, and which kind of second step to pick.</p>
          <p class="postcard-meta"><span class="stamp">≈ 4 min</span><span class="kind">Article</span></p>
        </li>
```

- [ ] **Step 4: Regenerate heads + run suite**

Run: `.env.local\Scripts\python.exe tests\tools\update_head_meta.py`
Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `test_required_page_exists[lessons/two-factor-authentication.html]` PASSES; all content-page invariants pass; remaining reds unchanged.

- [ ] **Step 5: Commit**

```bash
git add docs/lessons/two-factor-authentication.html docs/data/lessons.json docs/lessons/index.html
git commit -m "feat: lesson — Two-factor authentication, explained

Second data-privacy article: what the second step proves, which kind to
pick, the never-share-a-code rule, and where to enable it first. Registered
in lessons.json and carded on the hub."
```

---

### Task 4: Article — What cookies know about you

**Files:**
- Create: `docs/lessons/what-cookies-know.html`
- Modify: `docs/data/lessons.json`, `docs/lessons/index.html`, `docs/locales/en.json`

**Interfaces:**
- Produces: locale key `lesson.cta2fa` (Task 14 translates it).

- [ ] **Step 1: Create the page.** Copy chrome from `docs/lessons/understanding-passwords.html`; change: `<title>What cookies know about you — Bytes Without Borders</title>`; `<meta name="description" content="What tracking actually looks like, which cookies are useful, and the settings that quiet the rest — a five-minute lesson.">`; `data-topic="data-privacy"`; h1 `What cookies know about you`; meta `≈ 5 min` / `Article`. End the article with:

```html
      <p><a class="btn btn-primary" href="./two-factor-authentication.html" data-i18n="lesson.cta2fa">Next: Two-factor authentication, explained</a></p>
```

**Content brief (≈550–650 words):**
- Intro ¶: cookies are small notes a website leaves in your browser; some are genuinely useful, some follow you around. This lesson sorts them.
- `<h2>The useful kind</h2>` — remembering your login, your cart, your language: first-party cookies working for you.
- `<h2>The following kind</h2>` — third-party/tracking cookies: the same advertising company present on many sites can connect your visits into a profile (interests, location, habits). Plain example: ads that "follow" you after you look at shoes.
- `<h2>What a profile is used for</h2>` — mostly ad targeting; matter-of-fact tone, no conspiracies: the trade is your attention, the cost is your privacy.
- `<h2>Quiet them without breaking the web</h2>` — concrete, product-neutral steps: cookie banners — "reject" is usually one click more than "accept" and worth it; browser settings block third-party cookies (many browsers now default to this); private/incognito windows forget cookies when closed (say plainly what incognito does NOT hide — your activity from the sites themselves or your network); clearing cookies logs you out — expected, not broken.
- `<h2>Try it today</h2>` — `<ul>`: find the third-party cookie setting in your browser; reject once where you'd normally accept; open one site you use in a private window and notice what changes.

- [ ] **Step 2: Register.** Append to `lessons.json`:

```json
    {
      "slug": "what-cookies-know",
      "href": "what-cookies-know.html",
      "title": "What cookies know about you",
      "topic": "data-privacy",
      "summary": "What tracking actually looks like, and the settings that quiet it without breaking the web.",
      "minutes": 5,
      "kind": "article"
    }
```

- [ ] **Step 3: Hub card.** Append to the hub grid:

```html
        <li class="postcard" data-lesson-card data-topic="data-privacy">
          <p class="eyebrow">Data privacy</p>
          <h2><a href="./what-cookies-know.html">What cookies know about you</a></h2>
          <p>What tracking actually looks like, and the settings that quiet it without breaking the web.</p>
          <p class="postcard-meta"><span class="stamp">≈ 5 min</span><span class="kind">Article</span></p>
        </li>
```

- [ ] **Step 4: Locale key.** In `docs/locales/en.json` `lesson` section, after `"involvedCta"`, add:

```json
    "cta2fa": "Next: Two-factor authentication, explained"
```

- [ ] **Step 5: Regenerate heads, run suite** (same commands as Task 3 Step 4; the new required-page test passes).

- [ ] **Step 6: Commit**

```bash
git add docs/lessons/what-cookies-know.html docs/data/lessons.json docs/lessons/index.html docs/locales/en.json
git commit -m "feat: lesson — What cookies know about you

Third data-privacy article: useful vs tracking cookies, what a profile is
for, and product-neutral settings that quiet tracking. Adds lesson.cta2fa
key; registered and carded."
```

---

### Task 5: Article — How the internet reaches you

**Files:**
- Create: `docs/lessons/how-the-internet-reaches-you.html`
- Modify: `docs/data/lessons.json`, `docs/lessons/index.html`, `docs/locales/en.json`

**Interfaces:**
- Produces: locale key `lesson.ctaSlow`; page referenced by Task 12's featured grid.

- [ ] **Step 1: Create the page.** Chrome from `understanding-passwords.html`; `<title>How the internet reaches you — Bytes Without Borders</title>`; `<meta name="description" content="From cables under the ocean to the bars on your phone — the trip a webpage takes, in five plain minutes.">`; `data-topic="tech-literacy"`; eyebrow `Tech literacy`; h1 `How the internet reaches you`; meta `≈ 5 min` / `Article`. End with:

```html
      <p><a class="btn btn-primary" href="./designing-for-slow-connections.html" data-i18n="lesson.ctaSlow">Related: Designing for slow connections</a></p>
```

(The target page arrives in Task 7; the link checker passes once both exist — Tasks 3–10 run in order.)

**Content brief (≈550–650 words):**
- Intro ¶: the internet feels like air, but it is physical — cables, computers, and agreements. Knowing the trip makes outages, slowness, and "why is this blocked" less mysterious.
- `<h2>A request leaves your hands</h2>` — tapping a link asks a faraway computer (a server) for the page; your device, the router, your internet provider.
- `<h2>Mostly cables, not satellites</h2>` — the long haul is fiber underground and under oceans; wireless is usually only the last hop (your phone to a tower, your laptop to the router). Correct the common satellite assumption calmly.
- `<h2>Addresses and the phone book</h2>` — every server has a numeric address; DNS introduced as the internet's phone book turning names into numbers. Introduce the acronym properly.
- `<h2>Why it slows or breaks</h2>` — distance, congestion, a weak last hop; a site "down" can be the server, the path, or your own connection — and which one changes who can fix it.
- `<h2>Why this matters</h2>` — tie to mission: where cables and towers don't reach, people don't get online — the digital divide is partly a geography of infrastructure.
- `<h2>Try it today</h2>` — `<ul>`: notice bars vs Wi-Fi as "last hop"; next outage, check another site/device to locate the break; look up a map of undersea cables once — it changes how the internet looks.

- [ ] **Step 2: Register.** Append to `lessons.json`:

```json
    {
      "slug": "how-the-internet-reaches-you",
      "href": "how-the-internet-reaches-you.html",
      "title": "How the internet reaches you",
      "topic": "tech-literacy",
      "summary": "From cables under the ocean to the bars on your phone — the trip a webpage takes to reach you.",
      "minutes": 5,
      "kind": "article"
    }
```

- [ ] **Step 3: Hub card.** Append:

```html
        <li class="postcard" data-lesson-card data-topic="tech-literacy">
          <p class="eyebrow">Tech literacy</p>
          <h2><a href="./how-the-internet-reaches-you.html">How the internet reaches you</a></h2>
          <p>From cables under the ocean to the bars on your phone — the trip a webpage takes to reach you.</p>
          <p class="postcard-meta"><span class="stamp">≈ 5 min</span><span class="kind">Article</span></p>
        </li>
```

- [ ] **Step 4: Locale key.** In `en.json` `lesson`, add:

```json
    "ctaSlow": "Related: Designing for slow connections"
```

- [ ] **Step 5: Heads + suite.** As Task 3 Step 4. NOTE: `test_internal_links_resolve` will be RED until Task 7 creates `designing-for-slow-connections.html` — acceptable only if Tasks 5–7 land in the same working session; otherwise create Task 7's file first.

- [ ] **Step 6: Commit**

```bash
git add docs/lessons/how-the-internet-reaches-you.html docs/data/lessons.json docs/lessons/index.html docs/locales/en.json
git commit -m "feat: lesson — How the internet reaches you

Tech-literacy article on the physical internet: request, cables, DNS,
failure modes, and the infrastructure side of the digital divide. Adds
lesson.ctaSlow key; registered and carded."
```

---

### Task 6: Article — Why software updates matter

**Files:**
- Create: `docs/lessons/why-updates-matter.html`
- Modify: `docs/data/lessons.json`, `docs/lessons/index.html`, `docs/locales/en.json`

**Interfaces:**
- Produces: locale key `lesson.ctaScamQuiz` (also used by Task 9's edit to `spotting-misinformation.html`).

- [ ] **Step 1: Create the page.** Chrome from `understanding-passwords.html`; `<title>Why software updates matter — Bytes Without Borders</title>`; `<meta name="description" content="Updates are patches for doors you did not know were open. Three minutes on why 'later' is the risky choice.">`; `data-topic="tech-literacy"`; eyebrow `Tech literacy`; h1 `Why software updates matter`; meta `≈ 3 min` / `Article`. End with:

```html
      <p><a class="btn btn-primary" href="./quiz-spot-the-scam.html" data-i18n="lesson.ctaScamQuiz">Test yourself: spot the scam</a></p>
```

(Target page arrives in Task 9 — same in-order caveat as Task 5.)

**Content brief (≈350–450 words; it is the 3-minute lesson):**
- Intro ¶: the update popup always comes at the wrong moment; here is what it actually carries and why "later" quietly costs.
- `<h2>Patches for open doors</h2>` — software has flaws; when found, makers ship a fix; an update is mostly repairs, not redecorating. Criminals study fixes to attack those who haven't applied them — being behind is being exposed, no fear-mongering, just mechanics.
- `<h2>The safe habit</h2>` — turn on automatic updates for the system, the browser, and apps; let them run overnight; charging + Wi-Fi.
- `<h2>When a device stops getting updates</h2>` — old devices eventually lose support; that is the honest end of their safe life for sensitive things (banking) even if they still turn on; gentle, budget-aware framing (use it offline, or for low-stakes things).
- `<h2>Try it today</h2>` — `<ul>`: check for pending system updates now; switch the app store to automatic; find your device's support end date once.

- [ ] **Step 2: Register.** Append to `lessons.json`:

```json
    {
      "slug": "why-updates-matter",
      "href": "why-updates-matter.html",
      "title": "Why software updates matter",
      "topic": "tech-literacy",
      "summary": "Updates are patches for doors you did not know were open. Why 'later' is the risky choice.",
      "minutes": 3,
      "kind": "article"
    }
```

- [ ] **Step 3: Hub card.** Append:

```html
        <li class="postcard" data-lesson-card data-topic="tech-literacy">
          <p class="eyebrow">Tech literacy</p>
          <h2><a href="./why-updates-matter.html">Why software updates matter</a></h2>
          <p>Updates are patches for doors you did not know were open. Why 'later' is the risky choice.</p>
          <p class="postcard-meta"><span class="stamp">≈ 3 min</span><span class="kind">Article</span></p>
        </li>
```

- [ ] **Step 4: Locale key.** In `en.json` `lesson`, add:

```json
    "ctaScamQuiz": "Test yourself: spot the scam"
```

- [ ] **Step 5: Heads + suite; commit**

```bash
git add docs/lessons/why-updates-matter.html docs/data/lessons.json docs/lessons/index.html docs/locales/en.json
git commit -m "feat: lesson — Why software updates matter

Three-minute tech-literacy article: updates as security patches, the
automatic-updates habit, and end-of-support honesty. Adds
lesson.ctaScamQuiz key; registered and carded."
```

---

### Task 7: Article — Designing for slow connections

**Files:**
- Create: `docs/lessons/designing-for-slow-connections.html`
- Modify: `docs/data/lessons.json`, `docs/lessons/index.html`

- [ ] **Step 1: Create the page.** Chrome from `understanding-passwords.html`; `<title>Designing for slow connections — Bytes Without Borders</title>`; `<meta name="description" content="Why heavy pages shut people out, and how lean design welcomes them back — a four-minute lesson for anyone who makes or shares things online.">`; `data-topic="digital-inclusion"`; eyebrow `Digital inclusion`; h1 `Designing for slow connections`; meta `≈ 4 min` / `Article`. End with the existing involved CTA:

```html
      <p><a class="btn btn-primary" href="../get-involved.html" data-i18n="lesson.involvedCta">Help close the gap — get involved</a></p>
```

**Content brief (≈450–550 words):**
- Intro ¶: much of the world reaches the internet through an older phone, a shared data plan, a patchy signal; pages built on fast office Wi-Fi can be unusable there. Audience: anyone who makes, posts, or shares things online — not just professionals.
- `<h2>Weight is a wall</h2>` — a page is downloaded before it is seen; megabytes cost real money on prepaid data and real minutes on slow links; a heavy page is a door that only opens for some. (This very site as quiet example: lessons readable on a cheap phone.)
- `<h2>What makes pages heavy</h2>` — plainly: oversized images, autoplaying video, piles of scripts and trackers.
- `<h2>Lean habits</h2>` — send smaller images; make text the backbone (it is light, searchable, translatable); let pages work without every extra loading; test on a slow connection or an old phone once.
- `<h2>Sharing kindly</h2>` — non-builders too: compress before sending to a group, link instead of attaching, prefer text when it carries the meaning.
- `<h2>Try it today</h2>` — `<ul>` of 3 concrete actions mirroring the above.

- [ ] **Step 2: Register.** Append to `lessons.json`:

```json
    {
      "slug": "designing-for-slow-connections",
      "href": "designing-for-slow-connections.html",
      "title": "Designing for slow connections",
      "topic": "digital-inclusion",
      "summary": "Why heavy pages shut people out, and how lean design welcomes them back.",
      "minutes": 4,
      "kind": "article"
    }
```

- [ ] **Step 3: Hub card.** Append:

```html
        <li class="postcard" data-lesson-card data-topic="digital-inclusion">
          <p class="eyebrow">Digital inclusion</p>
          <h2><a href="./designing-for-slow-connections.html">Designing for slow connections</a></h2>
          <p>Why heavy pages shut people out, and how lean design welcomes them back.</p>
          <p class="postcard-meta"><span class="stamp">≈ 4 min</span><span class="kind">Article</span></p>
        </li>
```

- [ ] **Step 4: Heads + suite** — `test_internal_links_resolve` returns to green here (Task 5's CTA now resolves). **Commit:**

```bash
git add docs/lessons/designing-for-slow-connections.html docs/data/lessons.json docs/lessons/index.html
git commit -m "feat: lesson — Designing for slow connections

Digital-inclusion article: page weight as an access barrier, what makes
pages heavy, lean habits for builders and sharers. Registered and carded."
```

---

### Task 8: Article — Accessibility is for everyone

**Files:**
- Create: `docs/lessons/accessibility-for-everyone.html`
- Modify: `docs/data/lessons.json`, `docs/lessons/index.html`, `docs/locales/en.json`

**Interfaces:**
- Produces: locale key `lesson.ctaInclusionQuiz`.

- [ ] **Step 1: Create the page.** Chrome from `understanding-passwords.html`; `<title>Accessibility is for everyone — Bytes Without Borders</title>`; `<meta name="description" content="Screen readers, captions, and bigger buttons help far more people than you think — sometimes you. A four-minute lesson.">`; `data-topic="digital-inclusion"`; eyebrow `Digital inclusion`; h1 `Accessibility is for everyone`; meta `≈ 4 min` / `Article`. End with:

```html
      <p><a class="btn btn-primary" href="./quiz-getting-online.html" data-i18n="lesson.ctaInclusionQuiz">Test yourself: myths about getting online</a></p>
```

(Target page arrives in Task 10 — in-order caveat as before.)

**Content brief (≈450–550 words):**
- Intro ¶: accessibility sounds like a specialist topic; it is really the practice of not locking people out — and its features end up helping everyone.
- `<h2>Who accessibility is for</h2>` — permanent disabilities, and also temporary and situational ones: a broken arm, a bright sun, a loud bus, aging eyes. Everyone moves through these.
- `<h2>The curb-cut effect</h2>` — name and explain: ramps cut for wheelchairs ended up serving strollers, carts, and bikes; digital versions — captions in noisy rooms, dark mode, voice input while cooking.
- `<h2>What the features are</h2>` — plain tour: screen readers (page reads itself aloud — why image descriptions matter), captions, text size settings, voice control. Where they live: every phone's accessibility settings, free.
- `<h2>Small habits that include</h2>` — for everyday people, not developers: describe images when posting where alt text exists; caption your videos; don't put important text inside images; check your own phone's accessibility settings — something there will help you today.
- `<h2>Try it today</h2>` — `<ul>` of 3 actions mirroring the above.

- [ ] **Step 2: Register.** Append to `lessons.json`:

```json
    {
      "slug": "accessibility-for-everyone",
      "href": "accessibility-for-everyone.html",
      "title": "Accessibility is for everyone",
      "topic": "digital-inclusion",
      "summary": "Screen readers, captions, and bigger buttons help far more people than you think — sometimes you.",
      "minutes": 4,
      "kind": "article"
    }
```

- [ ] **Step 3: Hub card.** Append:

```html
        <li class="postcard" data-lesson-card data-topic="digital-inclusion">
          <p class="eyebrow">Digital inclusion</p>
          <h2><a href="./accessibility-for-everyone.html">Accessibility is for everyone</a></h2>
          <p>Screen readers, captions, and bigger buttons help far more people than you think — sometimes you.</p>
          <p class="postcard-meta"><span class="stamp">≈ 4 min</span><span class="kind">Article</span></p>
        </li>
```

- [ ] **Step 4: Locale key.** In `en.json` `lesson`, add:

```json
    "ctaInclusionQuiz": "Test yourself: myths about getting online"
```

- [ ] **Step 5: Heads + suite; commit**

```bash
git add docs/lessons/accessibility-for-everyone.html docs/data/lessons.json docs/lessons/index.html docs/locales/en.json
git commit -m "feat: lesson — Accessibility is for everyone

Digital-inclusion article: situational disability, the curb-cut effect,
a plain tour of assistive features, and everyday inclusive habits. Adds
lesson.ctaInclusionQuiz key; registered and carded."
```

---

### Task 9: Quiz — Spot the scam (+ CTA on Spotting misinformation)

**Files:**
- Create: `docs/data/quiz-spot-the-scam.json`, `docs/lessons/quiz-spot-the-scam.html`
- Modify: `docs/data/lessons.json`, `docs/lessons/index.html`, `docs/lessons/spotting-misinformation.html`

- [ ] **Step 1: Write `docs/data/quiz-spot-the-scam.json` exactly:**

```json
{
  "title": "Spot the scam",
  "questions": [
    {
      "prompt": "A text says a package could not be delivered — pay a small customs fee through the link within 24 hours. What gives it away?",
      "choices": [
        "Delivery companies never send texts",
        "The deadline and the tiny fee — urgency plus a small ask is the classic hook",
        "Real customs fees are always larger",
        "Nothing — it is safest to pay small fees quickly"
      ],
      "answerIndex": 1,
      "explanation": "Scams pair a countdown with an amount too small to think twice about. If you are expecting a package, check it in the courier's own app or site — never through a link in a message."
    },
    {
      "prompt": "An email from \"IT support\" says your mailbox is full and asks you to reply with your password to expand it. What should you do?",
      "choices": [
        "Reply — IT already manages your account anyway",
        "Send an older password you no longer use much",
        "Never send it — no real IT team or company asks for your password",
        "Forward the email to colleagues to see if they got it too"
      ],
      "answerIndex": 2,
      "explanation": "Anyone who genuinely runs the system can manage it without your password. A request for a password or a sign-in code is itself the proof of a scam."
    },
    {
      "prompt": "A marketplace seller offers a phone at half price, but only if you skip the site and pay by bank transfer or gift cards today. What is the tell?",
      "choices": [
        "Half price alone — good deals are always fake",
        "Leaving the platform and paying by untraceable means",
        "Selling phones online is not allowed",
        "Bank transfers are never used for shopping"
      ],
      "answerIndex": 1,
      "explanation": "The platform's payment system is what protects you. Scammers pull you off it because transfers and gift cards cannot be reversed. The discount is the bait; the payment method is the trap."
    },
    {
      "prompt": "A pop-up flashes \"VIRUS DETECTED — call this number now.\" What is really happening?",
      "choices": [
        "Your device found a virus and opened a support line",
        "It is an ad-style scare page — real security warnings do not ask you to call anyone",
        "The number is your device maker's official helpline",
        "Ignoring it will let the virus spread"
      ],
      "answerIndex": 1,
      "explanation": "Operating systems and browsers never show a phone number to call. Close the tab or restart the browser; nothing was infected by the pop-up itself. The scam happens on the phone call, where a stranger asks for remote access or payment."
    },
    {
      "prompt": "A voice message that sounds exactly like a relative asks for money urgently and begs you not to tell anyone. What is the safest response?",
      "choices": [
        "Send the money — the voice is unmistakable",
        "Reply in the same chat and ask the voice for details",
        "Contact your relative yourself on the number you already have",
        "Post about it publicly to warn others first"
      ],
      "answerIndex": 2,
      "explanation": "Voices can now be convincingly imitated. Secrecy plus urgency is the oldest pressure trick there is. Verify through a channel you already trust — call the person back on their known number."
    }
  ]
}
```

- [ ] **Step 2: Create `docs/lessons/quiz-spot-the-scam.html`.** Copy `docs/lessons/quiz-data-privacy.html` verbatim, then change ONLY: `<title>Quiz: spot the scam — Bytes Without Borders</title>`; `<meta name="description" content="Five messages. Some are real, some are bait. Test your checks before the scammers do — a three-minute interactive quiz.">`; `<main id="main" data-topic="tech-literacy">`; eyebrow `Tech literacy`; `<h1>Quiz: spot the scam</h1>`; the quiz div:

```html
    <div id="quiz" class="quiz-frame" data-src="../data/quiz-spot-the-scam.json">
      <noscript>
        <p>This interactive lesson needs JavaScript, which is turned off in your browser.</p>
        <p>No problem — the same ideas are covered in <a href="./spotting-misinformation.html">Spotting misinformation</a>.</p>
      </noscript>
    </div>
```

- [ ] **Step 3: Register.** Append to `lessons.json`:

```json
    {
      "slug": "quiz-spot-the-scam",
      "href": "quiz-spot-the-scam.html",
      "title": "Quiz: spot the scam",
      "topic": "tech-literacy",
      "summary": "Five messages. Some are real, some are bait. Test your checks before the scammers do.",
      "minutes": 3,
      "kind": "interactive"
    }
```

- [ ] **Step 4: Hub card.** Append:

```html
        <li class="postcard" data-lesson-card data-topic="tech-literacy">
          <p class="eyebrow">Tech literacy</p>
          <h2><a href="./quiz-spot-the-scam.html">Quiz: spot the scam</a></h2>
          <p>Five messages. Some are real, some are bait. Test your checks before the scammers do.</p>
          <p class="postcard-meta"><span class="stamp">≈ 3 min</span><span class="kind">Interactive</span></p>
        </li>
```

- [ ] **Step 5: Give Spotting misinformation an ending CTA.** In `docs/lessons/spotting-misinformation.html`, after the closing `</ul>` of the "Before you share" list (inside `article.prose`), add:

```html
      <p><a class="btn btn-primary" href="./quiz-spot-the-scam.html" data-i18n="lesson.ctaScamQuiz">Test yourself: spot the scam</a></p>
```

- [ ] **Step 6: Heads + suite** (Task 6's CTA link now resolves). Manually: serve `docs/`, run the quiz through all five questions and the retry loop. **Commit:**

```bash
git add docs/data/quiz-spot-the-scam.json docs/lessons/quiz-spot-the-scam.html docs/data/lessons.json docs/lessons/index.html docs/lessons/spotting-misinformation.html
git commit -m "feat: interactive lesson — Quiz: spot the scam

Five scam scenarios (delivery text, password phish, off-platform deal,
scare pop-up, imitated voice) with teaching explanations. Spotting
misinformation now ends by pointing at it."
```

---

### Task 10: Quiz — Myths about getting online

**Files:**
- Create: `docs/data/quiz-getting-online.json`, `docs/lessons/quiz-getting-online.html`
- Modify: `docs/data/lessons.json`, `docs/lessons/index.html`

- [ ] **Step 1: Write `docs/data/quiz-getting-online.json` exactly:**

```json
{
  "title": "Myths about getting online",
  "questions": [
    {
      "prompt": "\"Young people are all digital natives — they naturally know how to use technology.\" What does the evidence say?",
      "choices": [
        "True — growing up with phones teaches everything",
        "Mostly a myth — using apps fluently is not the same as judging information, managing privacy, or fixing problems",
        "True, but only for people under 20",
        "It is impossible to study"
      ],
      "answerIndex": 1,
      "explanation": "Familiarity is not literacy. Many fluent scrollers have never been shown how to check a source, recover an account, or spot a scam — those are taught skills, at any age."
    },
    {
      "prompt": "\"People who are offline just do not want the internet.\" What actually keeps most people offline?",
      "choices": [
        "Lack of interest, almost always",
        "Cost, coverage, devices, and skills — barriers more than choices",
        "A doctor's advice to avoid screens",
        "Nothing — everyone is online now"
      ],
      "answerIndex": 1,
      "explanation": "Surveys across countries keep finding the same wall: connection and device costs, weak coverage, and never having been taught. Framing it as a choice hides a solvable problem."
    },
    {
      "prompt": "\"Having a smartphone means someone is fully online.\" What does phone-only access make hard?",
      "choices": [
        "Nothing — a phone does everything a computer does",
        "Long forms, homework, job applications, and anything needing a big screen or a keyboard",
        "Only gaming",
        "Phones cannot open websites"
      ],
      "answerIndex": 1,
      "explanation": "A phone on prepaid data is a narrow doorway: fine for messages, hard for a CV, a school essay, or a government form. That gap is called smartphone-dependent access."
    },
    {
      "prompt": "\"Accessibility features only matter to a small group of people.\" Who actually uses them?",
      "choices": [
        "Only people with permanent disabilities",
        "Almost everyone at some point — captions on a bus, bigger text with aging eyes, voice input with full hands",
        "Only developers testing their apps",
        "Nobody — they are rarely switched on"
      ],
      "answerIndex": 1,
      "explanation": "Ability changes with situation and age. Features cut for disability — like captions and voice control — end up serving everyone, which is why removing them harms everyone too."
    },
    {
      "prompt": "A community wants more people online. What tends to help most?",
      "choices": [
        "Handing out devices and considering it done",
        "Affordable connections plus patient, local, hands-on teaching — libraries and community centers do this well",
        "Waiting for the next generation to grow up",
        "Making the internet a requirement for all services immediately"
      ],
      "answerIndex": 1,
      "explanation": "Devices without teaching gather dust, and requirements without access lock people out. Programs that pair affordable connections with a trusted person to learn from are the ones that stick."
    }
  ]
}
```

- [ ] **Step 2: Create `docs/lessons/quiz-getting-online.html`.** Copy `docs/lessons/quiz-data-privacy.html`; change ONLY: `<title>Quiz: myths about getting online — Bytes Without Borders</title>`; `<meta name="description" content="True or false: five common beliefs about who is online, who is not, and why — a three-minute interactive quiz.">`; `<main id="main" data-topic="digital-inclusion">`; eyebrow `Digital inclusion`; `<h1>Quiz: myths about getting online</h1>`; quiz div `data-src="../data/quiz-getting-online.json"` with noscript fallback pointing at `<a href="./bridging-the-digital-divide.html">Bridging the digital divide</a>`.

- [ ] **Step 3: Register.** Append to `lessons.json`:

```json
    {
      "slug": "quiz-getting-online",
      "href": "quiz-getting-online.html",
      "title": "Quiz: myths about getting online",
      "topic": "digital-inclusion",
      "summary": "True or false: five common beliefs about who is online, who is not, and why.",
      "minutes": 3,
      "kind": "interactive"
    }
```

- [ ] **Step 4: Hub card.** Append:

```html
        <li class="postcard" data-lesson-card data-topic="digital-inclusion">
          <p class="eyebrow">Digital inclusion</p>
          <h2><a href="./quiz-getting-online.html">Quiz: myths about getting online</a></h2>
          <p>True or false: five common beliefs about who is online, who is not, and why.</p>
          <p class="postcard-meta"><span class="stamp">≈ 3 min</span><span class="kind">Interactive</span></p>
        </li>
```

- [ ] **Step 5: Heads + suite** — all `test_required_page_exists` cases for English pages now PASS; Task 8's CTA resolves. Manually run the quiz. **Commit:**

```bash
git add docs/data/quiz-getting-online.json docs/lessons/quiz-getting-online.html docs/data/lessons.json docs/lessons/index.html
git commit -m "feat: interactive lesson — Quiz: myths about getting online

Five myth-busting scenarios on digital inclusion (digital natives,
offline-by-choice, phone-only access, accessibility reach, what helps
communities). Registered and carded; shelf reaches 12 lessons."
```

---

### Task 11: Adversarial accuracy review of all new content

**Files:**
- Possibly modify: the six new article pages, both new quiz JSONs

- [ ] **Step 1:** Review every claim in the six new articles and two quiz JSONs through two independent lenses — security accuracy and education/clarity — actively trying to REFUTE each factual claim (in ultracode execution: a Workflow with per-lesson reviewer agents + adversarial verifiers; otherwise: a systematic manual pass). Every claim must be defensible; the About page promises "reviewed for accuracy".
- [ ] **Step 2:** Check voice invariants: no unintroduced acronym, no fear framing, honest minute counts (word count / ~200wpm ≤ stamp minutes), one idea per section.
- [ ] **Step 3:** Apply corrections, rerun `update_head_meta.py` + the suite, and commit:

```bash
git add docs/lessons docs/data
git commit -m "fix: accuracy-review corrections for the new lessons

Findings from the adversarial fact-check pass (security + education
lenses) applied to article claims and quiz explanations."
```

(If zero findings: skip the commit, note the clean pass in the execution log.)

---

### Task 12: Home page — proof strip, featured rebalance, band copy

**Files:**
- Modify: `docs/index.html`, `docs/locales/en.json`, `docs/css/main.css`

- [ ] **Step 1: Proof strip.** In `docs/index.html`, inside `<section class="hero">`, after the closing `</div>` of `.hero-actions`, add:

```html
      <p class="proof-strip">
        <span class="stamp" data-i18n="home.proofLessons">12 lessons</span>
        <span class="stamp" data-i18n="home.proofLanguages">2 languages</span>
        <span class="stamp" data-i18n="home.proofPrivacy">No account, no tracking</span>
      </p>
```

- [ ] **Step 2: en.json keys.** In the `home` section, after `"bandCta"`, add:

```json
    "proofLessons": "12 lessons",
    "proofLanguages": "2 languages",
    "proofPrivacy": "No account, no tracking"
```

- [ ] **Step 3: Band copy.** In `docs/index.html`, replace the band paragraph text (keep the `data-i18n` attribute) with:

```html
        <p data-i18n="home.bandBody">Every lesson is written to be translated, adapted, and taught anywhere — and the first lessons are already available in Spanish. Help us carry them further: translate a lesson, write one, or run a workshop in your community.</p>
```

and set `home.bandBody` in `en.json` to the identical string.

- [ ] **Step 4: Featured rebalance.** In the `Start with these` grid: replace the second card (Spotting misinformation) with the same card structure for `./lessons/how-the-internet-reaches-you.html` / eyebrow `Tech literacy` / title `How the internet reaches you` / summary `From cables under the ocean to the bars on your phone — the trip a webpage takes to reach you.` / `≈ 5 min` / `Article`; replace the fourth card (Quiz: data privacy basics) with `./lessons/quiz-spot-the-scam.html` / eyebrow `Tech literacy` / title `Quiz: spot the scam` / summary `Five messages. Some are real, some are bait. Test your checks before the scammers do.` / `≈ 3 min` / `Interactive` — with `data-topic="tech-literacy"` on that `<li>`.

- [ ] **Step 5: CSS.** In `docs/css/main.css`, after the `.hero-actions` rule, add:

```css
.proof-strip {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-3);
}
```

and extend the hero load sequence below the existing nth-child(4) line:

```css
html.js .hero > *:nth-child(5) { animation-delay: 360ms; }
```

- [ ] **Step 6: Heads + suite; visual check** (Playwright, cache-busted CSS per notes.md) that the strip renders as dashed stamps under the CTAs in light and dark. **Commit:**

```bash
git add docs/index.html docs/locales/en.json docs/css/main.css
git commit -m "feat: hero proof strip, featured rebalance, band mentions Spanish

Three stamp-style facts (12 lessons / 2 languages / no account, no
tracking) under the hero CTAs; featured grid now covers each topic plus
the scam quiz; mission band notes lessons are available in Spanish."
```

---

### Task 13: Hub filter counts

**Files:**
- Modify: `docs/lessons/index.html`, `docs/js/main.js`, `docs/css/main.css`

- [ ] **Step 1: Markup — make the labels swappable without destroying counts.** The dictionary swap sets `textContent`, so the count must NOT live inside the `data-i18n` node. In `docs/lessons/index.html`, move each filter button's `data-i18n` onto an inner span:

```html
      <div class="filter-bar" data-filter-bar hidden>
        <button class="filter-btn" type="button" data-topic="all" aria-pressed="true"><span data-i18n="hub.filterAll">All topics</span></button>
        <button class="filter-btn" type="button" data-topic="data-privacy" aria-pressed="false"><span data-i18n="hub.filterPrivacy">Data privacy</span></button>
        <button class="filter-btn" type="button" data-topic="tech-literacy" aria-pressed="false"><span data-i18n="hub.filterLiteracy">Tech literacy</span></button>
        <button class="filter-btn" type="button" data-topic="digital-inclusion" aria-pressed="false"><span data-i18n="hub.filterInclusion">Digital inclusion</span></button>
      </div>
```

- [ ] **Step 2: JS.** In `docs/js/main.js`, inside the `if (filterBar) {` block, after `var cards = ...`, add:

```js
    /* count chips: derived from the rendered cards, never hardcoded */
    Array.prototype.forEach.call(buttons, function (btn) {
      var topic = btn.getAttribute("data-topic");
      var n = 0;
      Array.prototype.forEach.call(cards, function (card) {
        if (topic === "all" || card.getAttribute("data-topic") === topic) { n += 1; }
      });
      var count = document.createElement("span");
      count.className = "filter-count";
      count.textContent = String(n);
      btn.appendChild(count);
    });
```

- [ ] **Step 3: CSS.** After the `.filter-btn[aria-pressed="true"]` rule in `docs/css/main.css`, add:

```css
.filter-count { margin-left: 0.45em; opacity: 0.75; }
```

- [ ] **Step 4: Suite + manual check** — counts read All 12 / 4 / 4 / 4; filtering still hides cards (the `[hidden]` guards are untouched); no-JS view shows plain labels, no counts. **Commit:**

```bash
git add docs/lessons/index.html docs/js/main.js docs/css/main.css
git commit -m "feat: hub filter chips show live lesson counts

Counts are computed from the rendered cards at load. Labels move onto an
inner span so the i18n textContent swap cannot destroy the count node."
```

---

### Task 14: Spanish dictionary — docs/locales/es.json

**Files:**
- Create: `docs/locales/es.json`

- [ ] **Step 1: Write `docs/locales/es.json` exactly** (key-for-key mirror of the final `en.json`; neutral Latin-American Spanish, `tú` register):

```json
{
  "nav": {
    "skip": "Saltar al contenido principal",
    "menu": "Menú",
    "home": "Inicio",
    "lessons": "Lecciones",
    "about": "Acerca de",
    "getInvolved": "Participa",
    "language": "Idioma"
  },
  "footer": {
    "mission": "Educación digital en lenguaje claro. Libre para compartir, hecha para traducirse.",
    "contact": "Escríbenos:"
  },
  "home": {
    "eyebrow": "Microlecciones en lenguaje claro",
    "title": "Saber digital, byte a byte.",
    "lede": "Lecciones gratuitas de cinco minutos sobre privacidad de datos, cultura tecnológica e inclusión digital — escritas en lenguaje claro y hechas para viajar entre idiomas.",
    "ctaLessons": "Explora las lecciones",
    "ctaInvolved": "Participa",
    "topicsHeading": "Qué enseñamos",
    "topicPrivacyTitle": "Privacidad de datos",
    "topicPrivacyBody": "Quién puede ver lo que haces en línea, y los pequeños hábitos que mantienen tus cuentas y tu identidad en tus manos.",
    "topicLiteracyTitle": "Cultura tecnológica",
    "topicLiteracyBody": "Cómo funciona realmente el internet de todos los días, para que titulares, estafas y configuraciones dejen de ser un misterio.",
    "topicInclusionTitle": "Inclusión digital",
    "topicInclusionBody": "Por qué millones siguen sin conexión o mal atendidos, y qué pueden hacer las comunidades al respecto.",
    "featuredHeading": "Empieza por aquí",
    "bandTitle": "Conocimiento que cruza fronteras.",
    "bandBody": "Cada lección está escrita para traducirse, adaptarse y enseñarse en cualquier lugar — y las primeras ya están disponibles en español. Ayúdanos a llevarlas más lejos: traduce una lección, escribe una nueva u organiza un taller en tu comunidad.",
    "bandCta": "Descubre cómo ayudar",
    "proofLessons": "12 lecciones",
    "proofLanguages": "2 idiomas",
    "proofPrivacy": "Sin cuenta, sin rastreo"
  },
  "about": {
    "eyebrow": "La iniciativa",
    "title": "Educación que viaja como una carta.",
    "lede": "Bytes Without Borders es una iniciativa voluntaria que informa a la población a través de microlecciones localizadas: breves, prácticas y gratuitas.",
    "missionHeading": "Por qué microlecciones",
    "missionBody1": "La mayoría de las guías sobre seguridad y destreza en línea son largas, técnicas y están escritas en un solo idioma para un solo público. Las personas que más tienen que perder — quienes recién llegan a internet, personas mayores, comunidades que se conectan por primera vez — rara vez reciben materiales escritos para ellas.",
    "missionBody2": "Por eso cada lección dura menos de cinco minutos, en lenguaje claro, sin jerga y sin miedo. Como un curso por correspondencia, cada una está diseñada para pasarse de mano en mano: traducida, impresa, enseñada en voz alta o leída en un teléfono sencillo con una conexión lenta.",
    "howHeading": "Cómo se hace una lección",
    "how1Title": "Escrita con claridad.",
    "how1Body": "Una idea por lección, palabras cotidianas, ejemplos reales — ninguna sigla sin presentación.",
    "how2Title": "Revisada por exactitud.",
    "how2Body": "Personas voluntarias con experiencia en seguridad y educación verifican cada afirmación antes de publicarse.",
    "how3Title": "Hecha para localizarse.",
    "how3Body": "Las lecciones evitan referencias culturales cerradas para que quien traduce adapte el sentido, no solo las palabras.",
    "valuesHeading": "En qué creemos",
    "value1": "Las habilidades digitales son habilidades cívicas: todas las personas las merecen, en su propio idioma.",
    "value2": "La claridad es respeto. Si una lección confunde a quien la lee, la lección está mal.",
    "value3": "El conocimiento debe ser libre de compartirse, adaptarse y enseñarse a otros."
  },
  "involved": {
    "eyebrow": "Voluntariado",
    "title": "Lleva una lección más lejos.",
    "lede": "Todo aquí está hecho por voluntarios. Elige la forma que mejor se ajuste a tu tiempo y habilidades.",
    "waysHeading": "Tres formas de ayudar",
    "way1Title": "Traduce",
    "way1Body": "Lleva una lección a tu idioma. Nuestras lecciones evitan modismos y ejemplos culturales cerrados, así que una traducción cuidadosa suele tomar menos de una hora.",
    "way2Title": "Escribe",
    "way2Body": "¿Conoces bien un tema? Redacta una lección de cinco minutos en palabras sencillas. Revisores voluntarios te ayudan a verificar los datos y pulirla.",
    "way3Title": "Enseña",
    "way3Body": "Presenta una lección en una biblioteca, un centro comunitario o la mesa de tu cocina. Toda lección funciona impresa, proyectada o leída en voz alta.",
    "formHeading": "Escríbenos",
    "formName": "Tu nombre",
    "formEmail": "Tu correo",
    "formMessage": "¿Cómo te gustaría ayudar?",
    "formSend": "Enviar",
    "formNote": "El formulario abre tu aplicación de correo — o escríbenos directamente a"
  },
  "hub": {
    "eyebrow": "El estante de lecciones",
    "title": "Cada lección, en cinco minutos o menos.",
    "lede": "Breves, prácticas y sin jerga. Léelas en cualquier orden — cada una se sostiene por sí sola.",
    "filterAll": "Todos los temas",
    "filterPrivacy": "Privacidad de datos",
    "filterLiteracy": "Cultura tecnológica",
    "filterInclusion": "Inclusión digital",
    "showing": "Mostrando {shown} de {total} lecciones"
  },
  "lesson": {
    "back": "← Todas las lecciones",
    "quizCta": "Ponte a prueba: el quiz de privacidad de datos",
    "involvedCta": "Ayuda a cerrar la brecha — participa",
    "cta2fa": "Siguiente: La autenticación en dos pasos, explicada",
    "ctaSlow": "Relacionada: Diseñar para conexiones lentas",
    "ctaScamQuiz": "Ponte a prueba: detecta la estafa",
    "ctaInclusionQuiz": "Ponte a prueba: mitos sobre conectarse"
  },
  "notfound": {
    "title": "Perdida en el correo.",
    "body": "Esta página no pudo entregarse — quizá se movió o nunca existió. Las lecciones siguen todas donde deben estar.",
    "ctaHome": "Volver al inicio",
    "ctaLessons": "Explora las lecciones"
  },
  "quiz": {
    "progress": "Pregunta {current} de {total}",
    "correct": "Correcto.",
    "incorrect": "No exactamente.",
    "next": "Siguiente pregunta",
    "finish": "Ver tu puntaje",
    "retry": "Intentar de nuevo",
    "score": "Acertaste {score} de {total}.",
    "perfect": "Perfecto — tienes buen instinto.",
    "good": "Muy bien — vale la pena releer las explicaciones que fallaste.",
    "start": "Buen comienzo — relee las explicaciones que fallaste y vuelve a intentarlo.",
    "error": "Esta lección no pudo cargarse. Actualiza la página para intentarlo de nuevo."
  },
  "ui": {
    "share": "Compartir esta lección",
    "shareCopied": "Enlace copiado ✓",
    "toTop": "Volver arriba"
  }
}
```

- [ ] **Step 2: Verify parity + live switch**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `test_locale_key_parity` PASSES. Manually (Playwright): switch to Español on Home and on the scam quiz — chrome, filter labels, and quiz UI labels switch in place; switching back restores English.

- [ ] **Step 3: Commit**

```bash
git add docs/locales/es.json
git commit -m "feat: Spanish dictionary (es.json)

Full key-parity translation of the site chrome, quiz UI, and JS-created
labels — neutral Latin-American Spanish, tú register, matching the site's
warm plain voice."
```

---

### Task 15: Spanish pilot lesson pages + cross-links

**Files:**
- Create: `docs/lessons/es/understanding-passwords.html`, `docs/lessons/es/spotting-misinformation.html`
- Modify: `docs/lessons/understanding-passwords.html`, `docs/lessons/spotting-misinformation.html`

**Interfaces:**
- Consumes: `data-alt-*` navigation from Task 2; base URL constant from Task 1.

- [ ] **Step 1: Create `docs/lessons/es/understanding-passwords.html`** — a fully Spanish page (`<html lang="es">`, `data-root="../../"`, NO `data-i18n` attributes anywhere). Head mirrors the English original with `../../` asset paths, plus:

```html
  <title>Entender las contraseñas — Bytes Without Borders</title>
  <meta name="description" content="Por qué una contraseña fuerte y única por cuenta vale más que una ingeniosa usada en todas partes — una lección de cuatro minutos sobre contraseñas, frases de contraseña, gestores y 2FA.">
  <link rel="alternate" hreflang="en" href="https://kevinnnnn-ai.github.io/bytes-without-borders/lessons/understanding-passwords.html">
  <link rel="alternate" hreflang="es" href="https://kevinnnnn-ai.github.io/bytes-without-borders/lessons/es/understanding-passwords.html">
```

Body opens `<body data-root="../../" data-alt-en="../understanding-passwords.html">`. Chrome (used identically by both es pages — header nav, lang-pick, footer): skip link `Saltar al contenido principal`; nav links `../../index.html` → `Inicio`, `../index.html` → `Lecciones`, `../../about.html` → `Acerca de`, `../../get-involved.html` → `Participa`; toggle span `Menú`; lang-pick label `Idioma`, select options `<option value="en">English</option><option value="es" selected>Español</option>`; footer mission `Educación digital en lenguaje claro. Libre para compartir, hecha para traducirse.`, footer nav same four links/labels, footer note `Escríbenos:` + the mailto link; scripts `../../js/i18n.js`, `../../js/main.js`. Article header: crumb `<a class="crumb" href="../index.html">← Todas las lecciones</a>`, eyebrow `Privacidad de datos`, `<h1>Entender las contraseñas</h1>`, meta `<span class="stamp">≈ 4 min</span><span class="kind">Artículo</span><a class="stamp" href="../understanding-passwords.html" hreflang="en" lang="en">In English →</a>`.

Article body, exactly:

```html
      <p>Tus contraseñas son las llaves de tu vida digital: tu dinero, tus mensajes, tus fotos, tu nombre. Esta lección cubre los tres hábitos que las protegen, y el único error que deshace todo lo demás.</p>

      <h2>Larga vale más que ingeniosa</h2>
      <p>La fuerza de una contraseña viene sobre todo de su <strong>longitud</strong>, no de símbolos ni trucos. <code>Tr0ub4dor!</code> parece fuerte, pero es corta y un programa puede adivinarla. Cuatro palabras sin relación — <code>papel tetera amanecer mapa</code> — son mucho más difíciles de descifrar y mucho más fáciles de recordar. A esto se le llama una <strong>frase de contraseña</strong>.</p>

      <h2>Una cuenta, una contraseña</h2>
      <p>La forma más común en que se roban las cuentas no es un hackeo ingenioso. Es la <strong>reutilización</strong>. Cuando cualquier sitio web filtra sus contraseñas — y los sitios las filtran todo el tiempo — los criminales toman esa lista y prueban el mismo par de correo y contraseña en todas partes: tu correo, tu banco, tus redes sociales.</p>
      <p>Una contraseña reutilizada significa que una sola filtración abre todo. Una contraseña única significa que la filtración queda contenida en ese único sitio.</p>

      <h2>Deja que un gestor las recuerde</h2>
      <p>Nadie puede memorizar cincuenta frases de contraseña únicas, y nadie debería intentarlo. Un <strong>gestor de contraseñas</strong> es una aplicación que las crea y las recuerda por ti, protegida por una sola frase fuerte — la única que memorizas. Existen opciones gratuitas de confianza, y la que ya viene en tu teléfono o navegador es mucho mejor que reutilizar.</p>

      <h2>Agrega un segundo candado</h2>
      <p>La <strong>autenticación en dos pasos</strong> (2FA) pide una segunda prueba — normalmente un código en tu teléfono — cuando alguien inicia sesión desde un dispositivo nuevo. Aunque te roben la contraseña, el ladrón suele quedarse en la puerta. Una regla lo hace funcionar: <strong>nunca le digas un código a nadie</strong>, sin importar quién diga ser — tu banco jamás te lo pedirá. Activa la 2FA primero en tu correo: quien controla tu correo puede restablecer todo lo demás.</p>

      <h2>Pruébalo hoy</h2>
      <ul>
        <li>Activa la 2FA en tu cuenta de correo principal.</li>
        <li>Cambia la contraseña de tu correo por una frase de cuatro palabras.</li>
        <li>Deja de reutilizar esa contraseña favorita — empieza por tu banco.</li>
        <li>Prueba el gestor de contraseñas que ya viene en tu teléfono.</li>
      </ul>

      <p><a class="btn btn-primary" href="../quiz-data-privacy.html">Ponte a prueba: el quiz de privacidad de datos</a></p>
```

(The quiz link goes to the English quiz page — its UI will speak Spanish via `quiz.*` keys; its questions stay English this round, per spec.)

- [ ] **Step 2: Create `docs/lessons/es/spotting-misinformation.html`** — same chrome (copy from the file created in Step 1), with: `<title>Detectar la desinformación — Bytes Without Borders</title>`; `<meta name="description" content="Cinco comprobaciones rápidas que separan el periodismo confiable de la indignación fabricada — una lección de cinco minutos.">`; hreflang pair pointing at `.../lessons/spotting-misinformation.html` and `.../lessons/es/spotting-misinformation.html`; `<body data-root="../../" data-alt-en="../spotting-misinformation.html">`; `<main id="main" data-topic="tech-literacy">`; eyebrow `Cultura tecnológica`; `<h1>Detectar la desinformación</h1>`; meta `≈ 5 min` / `Artículo` / `<a class="stamp" href="../spotting-misinformation.html" hreflang="en" lang="en">In English →</a>`.

Article body, exactly:

```html
      <p>Las historias falsas se difunden más rápido que las verdaderas porque están diseñadas para eso. Apuntan a tus emociones, no a tu razón. Estas cinco comprobaciones toman menos de un minuto y atrapan la mayor parte de lo que el contenido fabricado necesita para funcionar.</p>

      <h2>1. Nota el impulso</h2>
      <p>La desinformación está hecha para provocarte algo <strong>de inmediato</strong>: indignación, miedo, la sensación de tener razón. Ese impulso es la señal. Cuando una publicación te acelera el pulso, ese es exactamente el momento de ir más despacio. La noticia real informa primero; la fabricada inflama primero.</p>

      <h2>2. Pregunta quién te lo cuenta</h2>
      <p>Baja hasta la fuente antes de creer la afirmación. ¿Hay nombre de autor? ¿Una fecha? ¿Un medio que conoces — o un sitio disfrazado para parecerlo? <strong>Sin fuente no hay fuente.</strong> «La gente dice» no es nadie.</p>

      <h2>3. Lee más allá del titular</h2>
      <p>Los titulares se escriben para compartirse, no para ser exactos. Los estudios encuentran una y otra vez que la mayoría de los artículos compartidos en línea nunca se abrieron. El titular dice lo que se difunde; el tercer párrafo suele decir <strong>lo que realmente pasó</strong>.</p>

      <h2>4. Busca un segundo testigo</h2>
      <p>Los hechos reales dejan huellas por todas partes. Si algo grande fuera cierto, varios medios sin relación lo publicarían en cuestión de horas. Un sitio desconocido con una exclusiva que nadie más tiene no llegó primero — está <strong>solo</strong>, y eso significa algo.</p>

      <h2>5. Desconfía de las fotos convenientes</h2>
      <p>La mayoría de las imágenes falsas no están retocadas: son <strong>fotos reales de otro momento u otro lugar</strong>, con un pie de foto nuevo. Una búsqueda inversa de imágenes (integrada en la mayoría de los navegadores) muestra dónde apareció primero una foto. Si una foto hace todo el trabajo de convencerte, revisa la foto.</p>

      <h2>Antes de compartir</h2>
      <ul>
        <li>¿Esto me provocó un impulso? Pausa.</li>
        <li>¿Quién lo escribió, y cuándo?</li>
        <li>¿Leí más allá del titular?</li>
        <li>¿Alguien más lo está reportando?</li>
        <li>¿La foto realmente muestra lo que dice el pie?</li>
      </ul>

      <p><a class="btn btn-primary" href="../quiz-spot-the-scam.html">Ponte a prueba: detecta la estafa</a></p>
```

- [ ] **Step 3: Wire the English originals.** In `docs/lessons/understanding-passwords.html`: change `<body data-root="../">` to `<body data-root="../" data-alt-es="./es/understanding-passwords.html">`; in the head (after the stylesheet link) add:

```html
  <link rel="alternate" hreflang="en" href="https://kevinnnnn-ai.github.io/bytes-without-borders/lessons/understanding-passwords.html">
  <link rel="alternate" hreflang="es" href="https://kevinnnnn-ai.github.io/bytes-without-borders/lessons/es/understanding-passwords.html">
  <link rel="alternate" hreflang="x-default" href="https://kevinnnnn-ai.github.io/bytes-without-borders/lessons/understanding-passwords.html">
```

and extend the article meta row with:

```html
<a class="stamp" href="./es/understanding-passwords.html" hreflang="es" lang="es">Disponible en español →</a>
```

Repeat identically for `docs/lessons/spotting-misinformation.html` (alt `./es/spotting-misinformation.html`, hreflang pair for its own slug).

- [ ] **Step 4: Stamp-link CSS.** In `docs/css/main.css`, after the `.postcard:hover .stamp` rule, add:

```css
/* stamps that are links (translation cross-links) keep stamp styling */
a.stamp { text-decoration: none; }
a.stamp:hover { color: var(--topic); transform: rotate(-2deg); }
```

- [ ] **Step 5: Faithfulness + register review** of both translations against their originals (meaning preserved, tú register consistent, no anglicisms) — in ultracode execution, independent reviewer agents; else a careful manual pass. Fix findings in place.

- [ ] **Step 6: Heads + suite**

Run: `.env.local\Scripts\python.exe tests\tools\update_head_meta.py`
Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: `test_translation_pages_cross_linked`, remaining `test_required_page_exists` cases, and the es `lang` rule all PASS. Only `test_sitemap_covers_site` + `test_robots_txt` remain red. Manually: on the English passwords page, switch to Español → navigates to the Spanish page; switch back → returns; with JS off both pages read fully.

- [ ] **Step 7: Commit**

```bash
git add docs/lessons/es docs/lessons/understanding-passwords.html docs/lessons/spotting-misinformation.html docs/css/main.css
git commit -m "feat: Spanish pilot — two fully translated lesson pages

Entender las contraseñas + Detectar la desinformación as complete Spanish
copies under lessons/es/ (Spanish chrome, lang=es, no data-i18n).
Cross-linked with hreflang pairs, data-alt-* switcher navigation, and
stamp-style 'Disponible en español' / 'In English' links; a.stamp styling
added."
```

---

### Task 16: README, robots.txt, sitemap.xml

**Files:**
- Create: `README.md`, `docs/robots.txt`, `docs/sitemap.xml`

- [ ] **Step 1: `docs/robots.txt` exactly:**

```
User-agent: *
Allow: /

Sitemap: https://kevinnnnn-ai.github.io/bytes-without-borders/sitemap.xml
```

- [ ] **Step 2: `docs/sitemap.xml`** — the 18 published pages (everything except `404.html`), each as a `<url><loc>…</loc></url>` under base `https://kevinnnnn-ai.github.io/bytes-without-borders/`: `index.html`, `about.html`, `get-involved.html`, `lessons/index.html`, `lessons/understanding-passwords.html`, `lessons/two-factor-authentication.html`, `lessons/what-cookies-know.html`, `lessons/spotting-misinformation.html`, `lessons/how-the-internet-reaches-you.html`, `lessons/why-updates-matter.html`, `lessons/bridging-the-digital-divide.html`, `lessons/designing-for-slow-connections.html`, `lessons/accessibility-for-everyone.html`, `lessons/quiz-data-privacy.html`, `lessons/quiz-spot-the-scam.html`, `lessons/quiz-getting-online.html`, `lessons/es/understanding-passwords.html`, `lessons/es/spotting-misinformation.html` — wrapped in:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://kevinnnnn-ai.github.io/bytes-without-borders/index.html</loc></url>
  ...one url element per page above...
</urlset>
```

- [ ] **Step 3: Root `README.md`** covering, in order: what Bytes Without Borders is (mission sentence from the About lede); the deliberately boring stack (static HTML/CSS/JS in `docs/`, GitHub Pages branch publishing, no build step, no external requests at runtime); local preview (`python -m http.server 8000 -d docs`) and tests (`.env.local\Scripts\python.exe -m pytest tests -q`, plus the `update_head_meta.py` rule); how to add an article / quiz / language (short summaries deep-linking to `superpowers/architecture.md`); languages available (English, Spanish pilot); how to volunteer (translate / write / teach, with the placeholder-contact caveat); license/sharing spirit line. Keep it under ~90 lines, plain voice, no badges.

- [ ] **Step 4: Suite fully green**

Run: `.env.local\Scripts\python.exe -m pytest tests -q`
Expected: ALL tests PASS (first fully green run).

- [ ] **Step 5: Commit**

```bash
git add README.md docs/robots.txt docs/sitemap.xml
git commit -m "feat: README, robots.txt, and sitemap

Root README documents the mission, the no-build stack, preview/test
commands, and contribution paths. robots.txt + hand-maintained
sitemap.xml (coverage enforced by the suite) close the launch-readiness
gaps."
```

---

### Task 17: Documentation + agent memory refresh

**Files:**
- Modify: `superpowers/architecture.md`, `.claude/agent-memory/context.md`, `.claude/agent-memory/notes.md`, `.claude/agent-memory/decisions.md`

- [ ] **Step 1: `architecture.md`** — update: page anatomy (add `data-alt-<code>` body attribute, `window.bwbDict` + `bwb:langchange`, hreflang blocks on translated pairs; "~19 pages — revisit the no-partials decision before growing past this round"); "Add a language" recipe (mark demonstrated by es; steps for adding a translated page copy under `lessons/<code>/`; note quiz/main strings now resolve `quiz.*`/`ui.*`/`hub.showing` from locale files with inline English defaults); "Add an article" (append: add the page to `docs/sitemap.xml` — the suite enforces coverage); hub section (filter labels live in an inner span; counts are JS-derived); testing section (list the new checks).
- [ ] **Step 2: `context.md`** — update concurrent facts: 12 lessons; Spanish live (chrome + 2 pilot pages); proof strip/hub counts; sitemap+robots; README exists; ~19 pages is the partials-decision line; contact address still placeholder.
- [ ] **Step 3: `notes.md`** — add: "data-i18n nodes must contain text only — the dictionary swap sets textContent and destroys child elements (this is why filter labels sit in an inner span)"; "new pages must be added to docs/sitemap.xml (test_sitemap_covers_site catches misses)". Remove entries that no longer apply, if any.
- [ ] **Step 4: `decisions.md`** — append entries: (human, 2026-07-18) approved flesh-out spec — Spanish first, 12-lesson shelf, 2-page translation pilot; (agent) translated pages as full page copies with `data-alt-*` switcher navigation, chosen over dictionary-swapping article bodies (keeps no-JS readability and honest lang attributes); (agent) quiz/main JS strings moved to locale files with inline English defaults, per the plan architecture.md scheduled.
- [ ] **Step 5: Commit**

```bash
git add superpowers/architecture.md .claude/agent-memory
git commit -m "docs: record the flesh-out — recipes, facts, decisions

architecture.md documents data-alt-* navigation, bwbDict/langchange, the
demonstrated add-a-language path, and sitemap maintenance; agent memory
updated to the 12-lesson, two-language state."
```

---

### Task 18: Full verification pass

- [ ] **Step 1:** `.env.local\Scripts\python.exe tests\tools\update_head_meta.py` then `.env.local\Scripts\python.exe -m pytest tests -q` — expect ALL PASS with zero warnings.
- [ ] **Step 2:** Serve `docs/` (`python -m http.server 8000 -d docs`) and Playwright-verify with cache-busted CSS (notes.md trap — append `?bust=<n>` to the stylesheet URL or confirm a changed computed style before trusting screenshots): Home (proof strip, featured grid, band), hub (counts, filter to each topic), one new article, the scam quiz (play through in Español — UI labels Spanish), `lessons/es/understanding-passwords.html` (Spanish chrome, In English stamp navigates back) — at desktop and a ~375px-wide viewport, light and dark scheme.
- [ ] **Step 3:** No-JS spot-check: with JavaScript disabled, the hub shows all 12 cards and plain filter labels; Spanish pilot pages fully readable; quiz pages show their noscript fallback.
- [ ] **Step 4:** `git status` clean, `git log --oneline` shows the per-task commits. Delete any stray screenshots/artifacts. Report results honestly — do not claim green without the outputs.
