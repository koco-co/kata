#!/usr/bin/env python3
"""Bucket B's selected cases into A's main-flow markdown only.

This is the Phase 4 markdown-only variant of fill-mainflow.py:
- Reads the already-merged B.md.
- Fills A.md's empty 数据质量 section.
- Replaces A.md 数据标准 -> 落标检查 with the selected B cases.
- Does not touch XMind files.
"""
from __future__ import annotations

import importlib.util
import re
import sys
from collections import OrderedDict
from pathlib import Path

FEATURE = Path(__file__).resolve().parent.parent
TMP = FEATURE / "tmp"
A_MD = FEATURE / "岚图主流程用例整理.md"
B_MD = FEATURE / "岚图已上线需求主流程用例.md"
LEGACY_SCRIPT = TMP / "fill-mainflow.py"


def _load_legacy():
    spec = importlib.util.spec_from_file_location("fill_mainflow_legacy", LEGACY_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {LEGACY_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_legacy = _load_legacy()
BUCKETS: "OrderedDict[str, dict]" = _legacy.BUCKETS


def trim_blank(lines: list[str]) -> list[str]:
    while lines and lines[0].strip() == "":
        lines = lines[1:]
    while lines and lines[-1].strip() == "":
        lines = lines[:-1]
    return lines


def parse_cases(path: Path) -> dict[tuple[str, str], list[str]]:
    return _legacy.parse_cases(path)


def selected_blocks(
    cases: dict[tuple[str, str], list[str]],
) -> "OrderedDict[str, list[tuple[str, str, list[str]]]]":
    return _legacy.selected_blocks(cases)


def render_cases(entries: list[tuple[str, str, list[str]]]) -> list[str]:
    return _legacy.render_cases(entries)


def section_bounds(lines: list[str], heading: str, level: int) -> tuple[int, int]:
    prefix = "#" * level + " "
    start = next(i for i, line in enumerate(lines) if line == prefix + heading)
    end = len(lines)
    for i in range(start + 1, len(lines)):
        if lines[i].startswith(prefix):
            end = i
            break
    return start, end


def subsection_bounds(
    lines: list[str],
    parent_start: int,
    parent_end: int,
    heading: str,
    level: int,
) -> tuple[int, int] | None:
    prefix = "#" * level + " "
    start = None
    for i in range(parent_start + 1, parent_end):
        if lines[i] == prefix + heading:
            start = i
            break
    if start is None:
        return None
    end = parent_end
    for i in range(start + 1, parent_end):
        if lines[i].startswith(prefix):
            end = i
            break
    return start, end


def render_dq_section(
    selected: "OrderedDict[str, list[tuple[str, str, list[str]]]]",
    overview: list[str] | None = None,
) -> list[str]:
    lines: list[str] = ["## 数据质量", ""]
    if overview:
        lines.extend(trim_blank(overview))
        lines.append("")

    for heading in ["规则库配置", "规则集管理", "规则任务管理", "校验结果查询", "数据质量报告"]:
        bucket = f"数据质量 → {heading}"
        lines.extend([f"### {heading}", ""])
        lines.extend(render_cases(selected[bucket]))
        lines.append("")

    lines.extend(["### 通用配置", "", "#### 报告关联维表设置", ""])
    lines.extend(render_cases(selected["数据质量 → 通用配置 → 报告关联维表设置"]))
    lines.extend(["", "#### json格式校验管理", ""])
    lines.extend(render_cases(selected["数据质量 → 通用配置 → json格式校验管理"]))
    lines.append("")

    lines.extend(["### 项目管理", "", "#### 项目信息", ""])
    lines.extend(render_cases(selected["数据质量 → 项目管理 → 项目信息"]))
    return trim_blank(lines)


def replace_section(lines: list[str], heading: str, level: int, replacement: list[str]) -> list[str]:
    start, end = section_bounds(lines, heading, level)
    return lines[:start] + trim_blank(replacement) + lines[end:]


def replace_drop_check(
    lines: list[str],
    selected: "OrderedDict[str, list[tuple[str, str, list[str]]]]",
) -> list[str]:
    ds_start, ds_end = section_bounds(lines, "数据标准", 2)
    replacement = ["### 落标检查", "", *render_cases(selected["数据标准 → 落标检查"])]
    bounds = subsection_bounds(lines, ds_start, ds_end, "落标检查", 3)
    if bounds is None:
        insertion = ds_end
        return lines[:insertion] + ["", *trim_blank(replacement)] + lines[insertion:]
    start, end = bounds
    return lines[:start] + trim_blank(replacement) + lines[end:]


def fill_dq(a_md: Path = A_MD, b_md: Path = B_MD) -> None:
    cases = parse_cases(b_md)
    selected = selected_blocks(cases)

    lines = a_md.read_text(encoding="utf-8").splitlines()
    dq_start, dq_end = section_bounds(lines, "数据质量", 2)
    overview_bounds = subsection_bounds(lines, dq_start, dq_end, "总览", 3)
    overview = lines[overview_bounds[0] : overview_bounds[1]] if overview_bounds else []
    lines = replace_section(lines, "数据质量", 2, render_dq_section(selected, overview))
    lines = replace_drop_check(lines, selected)
    a_md.write_text("\n".join(trim_blank(lines)).rstrip() + "\n", encoding="utf-8")
    total = sum(len(entries) for entries in selected.values())
    print(f"filled: {a_md} ({total} bucketed cases)")


def main(argv: list[str]) -> int:
    if len(argv) > 2:
        print("usage: fill-mainflow-v2.py [A.md]", file=sys.stderr)
        return 2
    target = Path(argv[1]) if len(argv) == 2 else A_MD
    fill_dq(target, B_MD)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
