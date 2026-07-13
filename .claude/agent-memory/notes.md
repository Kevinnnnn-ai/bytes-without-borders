# Notes

- 2026-07-13 (later): `superpowers` 6.1.1, `frontend-design`, `playwright`, `github`, and `context7` plugins were reinstalled at **local scope for this project** and enabled in `.claude/settings.local.json`. Superpowers skills ARE available again in sessions started from this project dir.
- 2026-07-13: Claude Code 2.1.207 stores `projectPath` in `~/.claude/plugins/installed_plugins.json` with the drive-letter case of the installing session's cwd; a lowercase `c:\` entry makes sessions launched from `C:\` silently skip local-scope plugin MCP servers/skills. Fixed by uppercasing the entries. If plugins vanish again, check that file first.
- 2026-07-13: The `github` plugin's MCP server needs `GITHUB_PERSONAL_ACCESS_TOKEN` in the environment before launch; it is currently unset, so that server fails to connect (400). Use `gh` CLI for GitHub operations instead (also the project rule).
- 2026-07-13: Run site checks with `.env.local\Scripts\python.exe -m pytest tests -q` from the repo root (do not use a global python). Preview with `python -m http.server 8000 -d src`.
- 2026-07-13: When touching nav/footer, remember chrome is duplicated across all 9 pages in `src/` — the pytest suite catches broken links and missing i18n keys but not visual drift; eyeball one root page and one lessons/ page.
