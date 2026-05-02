#!/usr/bin/env python3
"""Mechanical format normalization for LTQC main-flow md files.

Idempotent: running twice produces the same result as running once.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# Repo root resolves relative to this script (tmp/normalize-format.py).
FEATURE_DIR = Path(__file__).resolve().parent.parent

DEFAULT_TARGETS = [
    FEATURE_DIR / "岚图主流程用例整理.md",
    FEATURE_DIR / "岚图已上线需求主流程用例.md",
]

def normalize_cell(text: str) -> str:
    """Normalize a single markdown table cell.

    Rules:
    - Convert "<digit>)" inline patterns (when preceded by non-whitespace
      and not already preceded by <br>) to "<br><digit>)".
    - Convert CRLF / LF / CR to <br>.
    - Idempotent: if cell already contains <br>, only do the newline pass.
    """
    # Always normalize newlines first (idempotent)
    text = text.replace("\r\n", "<br>").replace("\n", "<br>").replace("\r", "<br>")

    def _split(s: str) -> str:
        out: list[str] = []
        i = 0
        while i < len(s):
            ch = s[i]
            if ch.isdigit() and i + 1 < len(s) and s[i + 1] == ")":
                if s[i + 2 :].startswith("中的"):
                    out.append(ch)
                    out.append(")")
                    i += 2
                    continue
                if i > 0:
                    prev = s[i - 1]
                    # Prev must be non-space and not code/math syntax or a <br>'s ">"
                    if prev not in (" ", "\t", ">", "(") and not prev.isdigit():
                        # Skip insertion if already preceded by <br>
                        if not s[:i].endswith("<br>"):
                            out.append("<br>")
                out.append(ch)
                out.append(")")
                i += 2
            else:
                out.append(ch)
                i += 1
        return "".join(out)

    return _split(text)


def _normalize_table_row(line: str) -> str:
    if not line.startswith("|"):
        return line
    parts = line.split("|")
    # parts looks like ['', cell1, cell2, ..., '']
    new = []
    for p in parts:
        stripped = p.strip()
        if stripped == "" or set(stripped) <= set("-: "):
            new.append(p)
        else:
            new.append(normalize_cell(p))
    return "|".join(new)


SQL_FENCE_RE = re.compile(
    r"(> 前置条件\s*\n\s*\n)```\w+\n",
    re.MULTILINE,
)

BULLET_PRECOND_RE = re.compile(
    r"(> 前置条件\n)\n?(- [^\n]*\n(?:(?:- |  )[^\n]*\n)*)\n",
    re.MULTILINE,
)


def _wrap_bullets(match: re.Match[str]) -> str:
    bullets = match.group(2).strip("\n")
    lines: list[str] = []
    for raw in bullets.split("\n"):
        raw = raw.rstrip()
        if raw.startswith("- "):
            lines.append(raw[2:])
        elif raw.startswith("  "):
            lines.append(raw[2:])
        elif raw:
            lines.append(raw)
    body = "\n".join(lines)
    return f"{match.group(1)}\n```\n{body}\n```\n\n"


def normalize_file(path: Path) -> None:
    content = path.read_text(encoding="utf-8")

    # Full-width space -> ASCII space
    content = content.replace("　", " ")

    # Per-line normalization for table rows
    out_lines: list[str] = []
    for line in content.split("\n"):
        out_lines.append(_normalize_table_row(line))
    content = "\n".join(out_lines)

    # ```sql / ```python / ```yaml etc. -> ``` (only inside 前置条件)
    content = SQL_FENCE_RE.sub(lambda m: m.group(1) + "```\n", content)

    # bullet-style 前置条件 -> fenced block (only when there is no existing fence)
    content = BULLET_PRECOND_RE.sub(_wrap_bullets, content)

    path.write_text(content, encoding="utf-8")


def main(argv: list[str]) -> int:
    targets: list[Path] = [Path(a) for a in argv[1:]] or DEFAULT_TARGETS
    for t in targets:
        if not t.exists():
            print(f"skip (missing): {t}", file=sys.stderr)
            continue
        normalize_file(t)
        print(f"normalized: {t}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
