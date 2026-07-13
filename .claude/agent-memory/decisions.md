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
