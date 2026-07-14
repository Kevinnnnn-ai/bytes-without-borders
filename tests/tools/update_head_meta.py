"""Regenerate the Content-Security-Policy meta on every site page.

Run this after ANY edit to an inline <script> in docs/ — the CSP pins
sha256 hashes of the exact script text, and a stale hash silently drops
the page to its no-JS fallback. The suite (test_head_security_meta)
fails on drift; this script fixes it:

    .env.local\\Scripts\\python.exe tests\\tools\\update_head_meta.py
"""
import base64
import hashlib
import re
from pathlib import Path

DOCS = Path(__file__).resolve().parents[2] / "docs"
CHARSET = '<meta charset="utf-8">'
CSP_META_RE = re.compile(r'\n  <meta http-equiv="Content-Security-Policy" content="[^"]*">')
INLINE_RE = re.compile(r"<script>(.*?)</script>", re.DOTALL)


def build_csp(html: str) -> str:
    hashes = " ".join(
        "'sha256-" + base64.b64encode(hashlib.sha256(s.encode("utf-8")).digest()).decode() + "'"
        for s in INLINE_RE.findall(html)
    )
    return (
        "default-src 'self'; "
        f"script-src 'self' {hashes}; "
        "style-src 'self'; img-src 'self'; font-src 'self'; "
        "connect-src 'self'; object-src 'none'; base-uri 'self'; "
        "form-action 'self'"
    )


def main():
    for page in sorted(DOCS.rglob("*.html")):
        text = CSP_META_RE.sub("", page.read_text(encoding="utf-8"))
        csp = build_csp(text)
        text = text.replace(
            CHARSET,
            CHARSET + f'\n  <meta http-equiv="Content-Security-Policy" content="{csp}">',
            1,
        )
        page.write_text(text, encoding="utf-8", newline="\n")
        print("regenerated CSP:", page.relative_to(DOCS))


if __name__ == "__main__":
    main()
