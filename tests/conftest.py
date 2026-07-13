"""Writes a plain-text summary of each pytest session to stdout/ (per AGENTS.md)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def pytest_sessionfinish(session, exitstatus):
    out_dir = ROOT / "stdout"
    out_dir.mkdir(exist_ok=True)
    (out_dir / "last-test-report.txt").write_text(
        "Bytes Without Borders site validation\n"
        f"collected: {session.testscollected}\n"
        f"failed: {session.testsfailed}\n"
        f"exit status: {exitstatus}\n",
        encoding="utf-8",
    )
