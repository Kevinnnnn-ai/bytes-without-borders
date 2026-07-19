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
