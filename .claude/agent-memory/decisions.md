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
- 2026-07-13 (human): Redesign directive — more modern, more animation,
  animated backgrounds, scroll-driven UI, new fonts, lighter theme, modern
  color pairings. Agent kept the postal identity but moved to near-white
  paper + indigo/coral, self-hosted variable webfonts (relaxing the
  original no-webfonts spec line; no-external-requests still holds), and a
  motion system (aurora blobs, scroll reveals, progress bar). The original
  spec/plan under superpowers/ describe the v1 look — main.css is now the
  design source of truth.
