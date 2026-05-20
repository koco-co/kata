"""Pure helpers for the LTQC case pipeline (no file I/O)."""
from __future__ import annotations

import re

NUM_RE = re.compile(r"^\s*(\d+)\s*[\.\)、]\s*(.*)$")


def parse_numbered(cell: str) -> dict[int, str]:
    """Parse a CSV cell holding a numbered list into {index: text}.

    Items continue across lines until the next leading "<n>." marker, so
    angle brackets / quotes inside step text never break splitting.
    """
    items: dict[int, list[str]] = {}
    cur: int | None = None
    for line in (cell or "").replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        m = NUM_RE.match(line)
        if m:
            cur = int(m.group(1))
            items[cur] = [m.group(2).rstrip()]
        elif cur is not None:
            items[cur].append(line.rstrip())
    return {k: "\n".join(v).strip() for k, v in items.items()}


def pair_steps(step_cell: str, expected_cell: str) -> list[tuple[int, str, str]]:
    """Pair steps with expecteds by index. Falls back to a single row when
    neither cell is a numbered list."""
    steps = parse_numbered(step_cell)
    exps = parse_numbered(expected_cell)
    if not steps and not exps:
        s = (step_cell or "").strip()
        e = (expected_cell or "").strip()
        return [(1, s, e)] if (s or e) else []
    idxs = sorted(set(steps) | set(exps))
    return [(i, steps.get(i, "").strip(), exps.get(i, "").strip()) for i in idxs]
