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


def cell_to_md(text: str) -> str:
    """Render a step/expected/precondition value into a single md table cell."""
    if not text:
        return ""
    return (
        text.replace("|", "\\|")
        .replace("\r\n", "\n")
        .replace("\r", "\n")
        .replace("\n", "<br>")
    )


def apply_menu_rename(text: str) -> str:
    """Apply context-guarded menu renames to standardize terminology.

    Guards prevent incorrect replacements:
    - 质量报告 → 数据质量报告: only when not already prefixed and not part of "管理"
    """
    if not text:
        return text
    # 质量报告 → 数据质量报告：不在「数据质量报告」之中、不在「质量报告管理」之中时才改
    text = re.sub(r"(?<!数据)质量报告(?!管理)", "数据质量报告", text)
    text = text.replace("规则任务配置", "规则任务管理")
    text = text.replace("任务实例查询", "校验结果查询")
    text = text.replace("概览", "总览")
    return text
