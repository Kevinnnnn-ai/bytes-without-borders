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
  Multi-agent effort was spent on post-build review instead. Built directly
  on `main`: greenfield repo, user pre-approved a one-pass build.
- 2026-07-13 (human): Site moved from `src/` to `docs/` to use GitHub Pages
  branch publishing (no Actions dependency); project docs moved to
  `superpowers/`. Actions deploy workflow deleted; a test-only tests.yml
  keeps CI signal (branch publishing cannot be gated).
- 2026-07-13 (agent): Adversarial review confirmed 6 defects; all fixed.
  Key pattern adopted: `html.js` class hook so JS-dependent chrome only
  hides when JS runs (mobile nav, contact form). Quiz got integer
  answerIndex validation, focus management, and glyph+text correctness
  marking; 2FA copy softened with the never-share-a-code rule; i18n now
  switches in place without reloads; interactive borders use --line-strong
  for WCAG non-text contrast; 404.html injects <base> on github.io.
- 2026-07-14 (human): Directive — smaller text, thinner paragraphs, clear
  intentional spacing. Agent reduced the whole type scale one notch (body
  16px, h1 cap 4rem), opened line-height to 1.7, and — because Instrument
  Sans' wght axis bottoms out at 400 (verified via fonttools fvar) — made
  paragraphs read lighter with a new --ink-body token instead of a font
  weight. Spacing became two-tier: --space-1..5 within groups, new
  --section-pad clamp as the only between-section unit; cards became flex
  columns with meta pinned to the card floor. A 3-lens adversarial review
  workflow (17 agents) confirmed 3 regressions pre-commit — flex defeating
  [hidden] on filtered cards, .prose .btn out-specifying .share-btn, lost
  margin-collapse doubling the card meta gap — all fixed and re-verified
  live before committing (491b38d).
- 2026-07-18 (agent): Spanish pilot (Task 15) — the first real translated
  pages ship as full standalone copies under `docs/lessons/es/`
  (`html lang="es"`, `data-root="../../"`, NO `data-i18n`, Spanish chrome),
  not dictionary-swapped English. Rationale: article prose is too long/nuanced
  for the `data-i18n` node-swap model, which is reserved for chrome + JS UI.
  Cross-linking uses `body[data-alt-es]`/`[data-alt-en]` (switcher NAVIGATES
  instead of swapping on a translated page) plus per-page `hreflang` links —
  es pages carry the `en`/`es` pair, English originals carry `en`/`es`/
  `x-default`, all absolute under the SITE_BASE constant. es pages still load
  their locale file so JS-created UI (quiz/share) speaks Spanish; the linked
  quiz pages stay English-question this round. New `a.stamp` CSS lets the
  cross-link reuse stamp-chip styling. Committed 6b4e6fd.
- 2026-07-13 (human): Redesign directive — more modern, more animation,
  animated backgrounds, scroll-driven UI, new fonts, lighter theme, modern
  color pairings. Agent kept the postal identity but moved to near-white
  paper + indigo/coral, self-hosted variable webfonts (relaxing the
  original no-webfonts spec line; no-external-requests still holds), and a
  motion system (aurora blobs, scroll reveals, progress bar). The original
  spec/plan under superpowers/ describe the v1 look — main.css is now the
  design source of truth.
- 2026-07-18 (human): Approved the website flesh-out design spec
  (`superpowers/specs/2026-07-18-website-flesh-out-design.md`) — Spanish
  first (over other candidate languages), a full 12-lesson shelf (3
  articles + 1 quiz per topic, 8 new lessons), and a 2-page translation
  pilot (full standalone copies, not dictionary-swapped chrome only).
  Executed task-by-task on a dedicated `flesh-out` feature branch (commits
  never pushed), unlike the v1 build which was built and committed directly
  on `main`.
- 2026-07-18 (agent): Quiz (`quiz.js` STRINGS) and hub/share UI (`main.js`)
  strings moved out of hardcoded English into `quiz.*`/`ui.*`/`hub.showing`
  keys in both locale files, with the same strings kept inline as defaults
  in each JS file. Chosen so a missing/incomplete locale file degrades to
  the exact current English behavior rather than a blank or broken label,
  and so `window.bwbDict` stays the single source both files read from.
- 2026-07-18 (agent): The Task 11 adversarial accuracy pass ran as a
  multi-lens workflow: 2 lenses (security + education) across 8 new
  lessons/quizzes with each finding verified by 3 adversarial votes,
  109 agents total per the orchestration telemetry. It confirmed 16
  defensible findings, all fixed and the quizzes' answer positions reshuffled
  to remove positional bias before commit (see `.superpowers/sdd/task-11-report.md`).
- 2026-07-19 (agent): Root `README.md` (found empty) regenerated via
  `/draft-a-readme` in the skill's roman-numeral format. All facts sourced
  from the working tree: 34-test suite output captured live for the
  Demonstration section, `kevinwjie@gmail.com` as contact, pytest 8.4.1 as
  the only dependency, no-LICENSE stated as all-rights-reserved. Stale
  "32 tests" counts in `agent-memory/context.md` and
  `superpowers/architecture.md` corrected to 34 in the same pass.
- 2026-07-19 (human): Site contact email set to `kevinwjie@gmail.com`, replacing
  the `hello@byteswithoutborders.example` launch placeholder across all 20
  `docs/` files that carried it (page footers, get-involved form, and the
  `mailto:` builder in `docs/js/main.js`). Historical plans/specs under
  `superpowers/` intentionally left unchanged.
- 2026-07-19 (human): Approved the "Max Postal, Grand Théâtre" visual design
  spec (`superpowers/specs/2026-07-19-max-postal-visual-design.md`) — extreme
  visual enhancement, chosen over a new "night flight" identity and over an
  ambient-only overlay. Site-wide but tiered (home = spectacle, hub/quizzes =
  interactive juice, articles = calm) on a hybrid engine: CSS-first ambient
  layer (aurora mesh + grain, gradient ink, ghost watermarks, torn edges,
  cross-document view transitions) plus one new self-hosted
  `docs/js/theatre.js` (tilt, magnet, confetti, count-up) coupled to `quiz.js`
  only via `bwb:quiz:*` CustomEvents. All existing guardrails retained:
  no external requests, no build step, progressive enhancement, reduced-motion
  kill switch, AA gradient-ink stops, ≥46em gates for heavy effects.
- 2026-07-20 (agent): Task 12 (quiz theatrics) implemented the `bwb:quiz:*`
  coupling promised above: `quiz.js` gained two `CustomEvent` dispatches
  (`bwb:quiz:correct` on a right answer, `bwb:quiz:done` after the score line
  renders) and otherwise stayed untouched — it has zero references to
  `theatre.js`, confirmed by grep. `theatre.js` answers with a self-removing
  canvas confetti burst (perforated "stamp" particles in theme colors,
  reduced-motion-gated, try/catch-wrapped, canvas always removed on settle or
  error) and an `aria-hidden` count-up finale with a localized DELIVERED/
  ENTREGADO postmark (`quiz.delivered` key added to both locale files); a
  second bigger burst fires only on a perfect score. The quiz progress bar
  became a marching indigo/coral airmail stripe. No quiz-page markup changes
  were needed — all three quiz pages already loaded `theatre.js` before
  `quiz.js`. Verified live via Playwright: canvas lifecycle has no leak under
  rapid repeated correct answers, reduced motion fully no-ops confetti and
  finale while the plain score sentence still renders, and retry clears the
  finale (it lives inside `#quiz`, wiped by the next `renderQuestion()`).
  Commit e2c58d9 on `max-postal`; see `.superpowers/sdd/task-12-report.md`.
- 2026-07-20 (agent): Task 13 (cross-document view transitions) added a pure-CSS
  `@view-transition { navigation: auto; }` block to `main.css`, gated by
  `@media (prefers-reduced-motion: no-preference)` — the site's global reduced-
  motion kill switch (`*,*::before,*::after { transition/animation: none }`)
  does not match `::view-transition-*` pseudo-elements, so this explicit gate
  is the real off-switch. `.brand` persists (`view-transition-name: brand`)
  and `h1` is the default page-title morph target, relying on the suite's
  existing one-`h1`-per-page invariant for uniqueness. `theatre.js` gained a
  `pageswap` listener that promotes the clicked `.postcard h2/h3` heading to
  `page-title` (demoting the hub's own h1 to `none` in the same tick) so
  hub-to-article morphs start from the card, not the static heading, plus a
  `pageshow`/`event.persisted` listener that strips those inline overrides on
  BFCache restore — without it a cached hub page would carry two elements
  named `page-title` and silently break every later transition. Verified live
  via Playwright (Chromium): zero console errors across a hub-click-back round
  trip, and zero leftover inline `view-transition-name` overrides after the
  BFCache restore. Commit a54d449 on `max-postal`; see
  `.superpowers/sdd/task-13-report.md`.
- 2026-07-20 (agent): Task 14 (print audit, docs, final verification) closed
  out the Max Postal branch. Implementation decisions carried forward from
  earlier tasks and reconfirmed here: real SVG assets (`grain.svg`,
  `postmark.svg`) over `data:` URIs, because the per-page CSP's `img-src
  'self'` blocks `data:` — a data-URI background would silently fail closed
  rather than degrade; `translate` (not `transform`) for the magnet effect
  so `--magx/--magy` composes with each element's own `transform` (tilt,
  hover lift) instead of clobbering it; the quiz count-up finale is
  `aria-hidden` so screen readers keep hearing the plain score sentence
  underneath rather than a giant duplicated number; view transitions use an
  h1-to-h1 morph by default with a `pageswap` promotion of the clicked
  `.postcard` heading to `page-title`, so hub-to-article navigations morph
  from the card the visitor clicked rather than snapping to the static hub
  h1. Print block (`@media print` in `main.css`) neutralizes every new
  decorative surface — gradient ink, watermarks, flight path, envelope,
  postmark stamp, quiz finale, and the marquee's duplicate/mask — restoring
  the pre-theatrics plain-paper output. Verification sweep bumped the
  ghost-watermark `wm-drift` keyframe's translateY range from 22%/-18% to
  55%/-45% (measured extra parallax rose from ~63px to ~180px against
  ~450px-tall glyphs) — the original range was too subtle to read as motion
  on a normal scroll pass, per binding user feedback that scroll-driven
  effects must be obviously visible. The mobile sweep also caught a real,
  pre-existing (non-Max-Postal) horizontal-scroll bug: `.article-meta`
  lacked `flex-wrap`, so the long `a.stamp` translation cross-link
  ("Disponible en español →") pushed the two Spanish-pilot article pages
  24px past the 375px viewport; fixed with `flex-wrap: wrap` on
  `.article-meta`. Postmark scale(1.5) entrance and the flight-path/
  watermark overlap were both screenshot-checked and found fine as-is, no
  nudge needed. See `.superpowers/sdd/task-14-report.md` for the full sweep
  results. README/agent-memory test counts corrected
  34 → 36 throughout (not just the three spots the task brief named) to
  avoid leaving stale counts alongside corrected ones in the same doc,
  matching the precedent set 2026-07-19 when stale "32" counts were
  corrected in the same pass as the README regeneration.
- 2026-07-20 (human+agent): Envelope-hero composition bug ("ugly crown"):
  user flagged the hero envelope reading as a detached V-notched band. Root
  causes: hero padding-bottom exceeded envelope height (letter never tucked)
  and the envelope centered on the section while the letter is start-aligned.
  Fixed geometry-only in main.css: tuck depth clamp(26px,4vw,44px), envelope
  anchored to the letter center via min(calc(var(--space-3) + 23rem), 50%),
  3rem wings, and a new .hero-scene::before interior back wall (z1) so the
  pocket notch shows envelope inside rather than the sky (also added to the
  print neutralization list). Lesson: "no overlap" was verified as a PASS in
  earlier checks when overlap was the design intent — composition checks must
  assert what SHOULD overlap, not only what should not.
- 2026-07-20 (human+agent): Rewrote `.claude/skills/draft-a-readme/SKILL.md`
  because its spec had drifted from `references/reference-README.md`: the
  skill dictated Unicode-numeral `## Ⅱ • Features` headers while the
  reference uses ASCII `## II - Features`, and the repo README generated
  2026-07-19 inherited the divergence (including `#ⅱ--features` anchors,
  which Unicode-break GitHub anchor linking). Baseline failure was
  wrong-shaped output with the reference available — the inline spec
  overrode it — so per superpowers:writing-skills the fix is a positive
  template contract: the new SKILL.md carries a literal fill-in skeleton,
  an Exact Mechanics list (ASCII numerals, `#ii--features` anchor rule,
  blank/`<br>`/3-blank section breaks, 3-space div indent, for-the-badge
  badge grammar, footer date format), declares the reference the format
  oracle on any conflict, and keeps the old accuracy/overwrite/em-dash
  Never-Do rules. Added `scripts/verify-format.py` (structural checker the
  skill now requires to PASS before finishing; calibrated against the
  reference itself). GREEN-tested: a fresh subagent ran the new skill on a
  scratchpad fixture project and its README passed every structural check
  with zero reference-fact leakage. Note: the repo's own README.md still
  carries the old Ⅱ• style; the next `/draft-a-readme` run will regenerate
  it in the reference-true ASCII format.
