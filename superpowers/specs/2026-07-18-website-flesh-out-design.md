# Website flesh-out — design spec (2026-07-18)

Approved approach: **grow in place** — extend the exact patterns documented in
`superpowers/architecture.md` (copy-page articles, quiz JSON recipe, drop-in
locale file). No build step, no templating, no new tooling. Chrome edits still
touch every page; the test suite guards the invariants. This round takes the
site to ~19 HTML pages, which is the agreed line where a partials/build
decision gets revisited before growing further.

User decisions (2026-07-18): Spanish first; full shelf of 12 lessons;
translation pilot = site chrome/UI plus two flagship lessons as full page
copies.

## Goals

1. A full lesson shelf: 3 articles + 1 quiz per topic (12 lessons, 8 new).
2. Spanish proves the i18n pipeline end to end: chrome/UI dictionary plus two
   real translated lesson pages.
3. Launch-readiness gaps closed: README, hero proof points, hub counts,
   robots.txt + sitemap.xml, refreshed docs.

## 1. Content plan — the shelf

Existing lessons keep their slugs, copy, and metadata. New lessons (all in
`docs/lessons/`, registered in `docs/data/lessons.json`, carded on the hub):

| # | Title | Slug | Topic | Min | Kind |
|---|-------|------|-------|-----|------|
| 1 | Two-factor authentication, explained | `two-factor-authentication` | data-privacy | 4 | article |
| 2 | What cookies know about you | `what-cookies-know` | data-privacy | 5 | article |
| 3 | How the internet reaches you | `how-the-internet-reaches-you` | tech-literacy | 5 | article |
| 4 | Why software updates matter | `why-updates-matter` | tech-literacy | 3 | article |
| 5 | Designing for slow connections | `designing-for-slow-connections` | digital-inclusion | 4 | article |
| 6 | Accessibility is for everyone | `accessibility-for-everyone` | digital-inclusion | 4 | article |
| 7 | Quiz: spot the scam | `quiz-spot-the-scam` | tech-literacy | 3 | interactive |
| 8 | Quiz: myths about getting online | `quiz-getting-online` | digital-inclusion | 3 | interactive |

Card summaries (used verbatim in `lessons.json`, hub cards, and any featured
card):

1. "Why a second step stops most break-ins cold, and which kind of second
   step to pick."
2. "What tracking actually looks like, and the settings that quiet it
   without breaking the web."
3. "From cables under the ocean to the bars on your phone — the trip a
   webpage takes to reach you."
4. "Updates are patches for doors you did not know were open. Why 'later'
   is the risky choice."
5. "Why heavy pages shut people out, and how lean design welcomes them
   back."
6. "Screen readers, captions, and bigger buttons help far more people than
   you think — sometimes you."
7. "Five messages. Some are real, some are bait. Test your checks before
   the scammers do."
8. "True or false: five common beliefs about who is online, who is not,
   and why."

Article requirements (per existing anatomy):

- Complete chrome copy from an existing lesson page; `data-topic` accent;
  stamp chip with minutes; one `<h1>`; meta description; `data-root="../"`.
- Voice: plain language, one idea per lesson, no unintroduced acronyms, no
  fear-based framing (matches the About page claims and the softened-2FA
  precedent in the decision log). Reading time honest to the minutes chip.
- Each article ends with one contextual CTA cross-linking a related lesson
  (pattern: `lesson.quizCta` / `lesson.involvedCta` style). New CTA strings
  get i18n keys.
- Every claim fact-checkable; content passes an adversarial accuracy review
  before commit (see §6).

Quiz requirements:

- `docs/data/quiz-spot-the-scam.json` and `docs/data/quiz-getting-online.json`
  in the exact shape of `quiz-data-privacy.json` ({title, questions:
  [{prompt, choices[], answerIndex (integer), explanation}]}), 5 questions
  each, plausible distractors, explanations that teach.
- Quiz pages are copies of `docs/lessons/quiz-data-privacy.html` with
  `#quiz[data-src]` pointed at the new JSON. `quiz.js` itself needs no
  per-quiz changes.

Home "Start with these" stays a 4-card grid, rebalanced to: Understanding
passwords (data-privacy), How the internet reaches you (tech-literacy),
Bridging the digital divide (digital-inclusion), Quiz: spot the scam
(interactive). Hub cards for all 12; hub continues to link every English
lesson.

## 2. Spanish

### Chrome/UI dictionary

- `docs/locales/es.json`: full flattened-key parity with `en.json` (same
  keys, translated values). Neutral Latin-American Spanish, `usted` avoided
  in favor of impersonal/`tú` consistent with the site's warm plain voice.
- `<option value="es">Español</option>` added to `#lang-switch` on every
  page (including 404).
- Quiz UI strings migrate out of the `STRINGS` constant in `docs/js/quiz.js`
  into a new `quiz.*` section of BOTH locale files — the exact current set:
  `progress`, `correct`, `incorrect`, `next`, `finish`, `retry`, `score`,
  `perfect`, `good`, `start`, `error`. `quiz.js` keeps English defaults
  inline so a missing locale file degrades exactly as today.
- The current `start` string hardcodes "read 'Understanding passwords'
  next" — wrong for the two new quizzes. It is generalized to
  quiz-agnostic advice ("Good start — reread the explanations you missed,
  then try again.") in both the inline default and the locale files.

### i18n.js mechanics (small extension)

- `i18n.js` keeps the current dictionary-swap behavior and adds:
  - Exposes the active flattened dictionary (e.g. `window.bwbDict`) and
    fires a `bwb:langchange` CustomEvent after apply/restore. `quiz.js`
    listens and re-labels its JS-created UI.
  - Before dictionary-swapping, checks `document.body` for a
    `data-alt-<code>` attribute (e.g. `data-alt-es="es/understanding-passwords.html"`).
    If the chosen language has one, **navigate** to that URL instead of
    swapping. localStorage persistence unchanged. No auto-redirect on page
    load — navigation only on an explicit switcher change.

### Pilot lesson copies

- `docs/lessons/es/understanding-passwords.html` and
  `docs/lessons/es/spotting-misinformation.html`.
- Fully Spanish inline: chrome, body, meta, `<html lang="es">`,
  `data-root="../../"`. No `data-i18n` attributes on the Spanish copies —
  the page IS the translation; the switcher's English option navigates back
  via `data-alt-en="../understanding-passwords.html"` (resp. spotting).
- `<link rel="alternate" hreflang="es|en">` pairs on both directions, plus
  `hreflang="x-default"` on the English originals.
- The two English originals get a postal-styled "Disponible en español"
  stamp-link under the meta row; Spanish copies get the mirror ("Read in
  English"). These links work with JS off.
- Spanish pages carry the same CSP/head treatment; `update_head_meta.py`
  runs over them like any page.

Out of pilot scope: quiz content JSON stays English (quiz UI strings do
switch); the other 10 lessons localize only their chrome via the dictionary.

## 3. Home + hub upgrades

- **Hero proof strip** under the CTAs: three stamp-style facts —
  "12 lessons", "2 languages", "No account, no tracking" — using existing
  `.stamp` tokens, i18n-keyed (`home.proofLessons`, `home.proofLanguages`,
  `home.proofPrivacy`). Static markup (correct with JS off).
- **Hub filter counts**: chips show a count derived at runtime from the
  rendered cards (e.g. "Data privacy · 4"). JS-added text inside the
  existing chip buttons, scoped to `html.js`; no-JS visitors see today's
  plain labels. Counts recompute from the DOM, never hardcoded.
- **Mission band** copy on Home updated to say lessons are available in
  English and Spanish (i18n-keyed like the rest).

## 4. README + small wins

- Root `README.md`: what Bytes Without Borders is; the deliberately boring
  stack (static `docs/`, GitHub Pages branch publishing); how to preview
  (`python -m http.server 8000 -d docs`) and test
  (`.env.local\Scripts\python.exe -m pytest tests -q`); how to add a
  lesson/quiz/language (deep-links into `superpowers/architecture.md`); how
  to volunteer (translate/write/teach + placeholder contact note).
- `docs/robots.txt`: allow all, point at sitemap.
- `docs/sitemap.xml`: hand-maintained list of every published page
  (root pages + all lesson pages + Spanish copies; excludes 404).
  Absolute URLs on the base
  `https://kevinnnnn-ai.github.io/bytes-without-borders/` (derived from the
  `origin` remote; recorded once in the sitemap test so a future custom
  domain is a one-line change).
- Docs refresh: `superpowers/architecture.md` (Spanish recipe marked
  demonstrated, `data-alt-*` pattern, `bwb:langchange`, page inventory,
  sitemap maintenance note), agent-memory `context.md` / `notes.md` /
  `decisions.md` entries.

## 5. Testing & guardrails

New suite checks (extend `tests/test_site.py`):

- Locale parity: flattened key set of `es.json` equals `en.json` exactly.
- hreflang: every `rel="alternate"` hreflang URL resolves inside `docs/`;
  pairs are symmetric (en page points to es and vice versa).
- Sitemap: every HTML page under `docs/` except `404.html` appears exactly
  once in `sitemap.xml`, and every sitemap URL resolves.
- Hub coverage: hub links every lesson in `lessons.json` (unchanged);
  `docs/lessons/es/` copies are exempt from hub coverage but included in
  every link/head/lang/meta check. Spanish pages must have
  `<html lang="es">`.
- Language switcher: every page's `#lang-switch` contains both `en` and
  `es` options.
- Existing checks (links, JSON shapes for every `quiz-*.json`, single h1,
  CSP hash freshness) apply to all new pages automatically.

Process guardrails (from `notes.md`):

- Rerun `tests/tools/update_head_meta.py` after any inline-script edit.
- Playwright verification with cache-busted CSS on: home, hub, one new
  article, one new quiz, one Spanish copy — desktop and a mobile width.
- Any new element that can carry `hidden` and receives a `display` rule
  gets an explicit `[hidden]` guard.

## 6. Accuracy review

Every new lesson and quiz passes an adversarial fact-check (security and
education lenses, multi-reviewer) before commit; factual corrections beat
style preferences. This mirrors the About page's "reviewed for accuracy"
claim. Spanish translations get a faithfulness+register review against
their originals.

## Out of scope (deliberate)

- Contact backend — `hello@byteswithoutborders.example` placeholder stays.
- Arabic/RTL, additional languages beyond Spanish.
- Translating quiz question JSON (UI strings only this round).
- Any build tooling, partials system, or framework.
- Homepage featured-grid redesign beyond the 4-card rebalance.

## Acceptance

- 12 lessons live, hub filters meaningful, all tests green (including the
  new ones), CSP heads regenerated, Playwright passes on the sampled pages,
  README present, sitemap/robots served, Spanish switcher works with JS on
  and both pilot pages readable with JS off, docs and agent memory updated,
  work committed in small described commits (never pushed).
