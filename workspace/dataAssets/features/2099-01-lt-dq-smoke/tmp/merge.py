#!/usr/bin/env python3
"""Merge staging md files back into A.md / B.md."""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

FEATURE = Path(__file__).resolve().parent.parent
A_MD = FEATURE / "岚图主流程用例整理.md"
B_MD = FEATURE / "岚图已上线需求主流程用例.md"
STAGING = FEATURE / "tmp" / "staging"

B_VERSIONS = ["v6.4.3", "v6.4.4", "v6.4.5", "v6.4.6", "v6.4.8", "v6.4.10"]

A_MODULES_BEFORE_DQ = ["元数据", "数据标准", "数据模型"]
A_MODULE_DQ = "数据质量"
A_MODULES_AFTER_DQ = [
    "数据治理",
    "数据安全",
    "数据源管理",
    "用户角色管理",
    "通知中心",
    "资产盘点",
    "岚图定制模块",
]


def split_frontmatter(text: str) -> tuple[str, str]:
    if not text.startswith("---\n"):
        return "", text
    end = text.find("\n---\n", 4)
    if end == -1:
        return "", text
    fm = text[: end + len("\n---\n")]
    return fm, text[end + len("\n---\n") :]


def extract_section(text: str, heading: str) -> str:
    """Return a `##` section block up to the next `##` heading."""
    pattern = re.compile(rf"^{re.escape(heading)}\s*\n", re.MULTILINE)
    match = pattern.search(text)
    if not match:
        raise ValueError(f"section not found: {heading}")
    start = match.start()
    next_match = re.search(r"^## ", text[match.end() :], re.MULTILINE)
    end = match.end() + next_match.start() if next_match else len(text)
    return text[start:end]


def _replace_section(text: str, heading: str, new_block: str) -> str:
    old = extract_section(text, heading)
    if not new_block.endswith("\n"):
        new_block += "\n"
    return text.replace(old, new_block, 1)


def _empty_dq_placeholder(heading: str) -> str:
    return f"{heading}\n\n"


def _extract_subsection(block: str, heading: str, level: int = 3) -> str:
    prefix = "#" * level + " "
    pattern = re.compile(rf"^{re.escape(prefix + heading)}\s*\n", re.MULTILINE)
    match = pattern.search(block)
    if not match:
        return ""
    next_match = re.search(rf"^{re.escape(prefix)}", block[match.end() :], re.MULTILINE)
    end = match.end() + next_match.start() if next_match else len(block)
    return block[match.start() : end].strip() + "\n\n"


def _dq_placeholder_from_existing(text: str) -> str:
    existing = extract_section(text, f"## {A_MODULE_DQ}")
    overview = _extract_subsection(existing, "总览", level=3)
    if overview:
        return f"## {A_MODULE_DQ}\n\n{overview}"
    return _empty_dq_placeholder(f"## {A_MODULE_DQ}")


def merge_b(target: Path, staging_dir: Path, versions: list[str] | None = None) -> None:
    versions = versions or B_VERSIONS
    text = target.read_text(encoding="utf-8")
    for version in versions:
        staging = staging_dir / f"B_{version}.md"
        if not staging.exists():
            raise FileNotFoundError(f"missing staging: {staging}")
        text = _replace_section(text, f"## {version}", staging.read_text(encoding="utf-8"))
    target.write_text(text, encoding="utf-8")


def merge_a(target: Path, staging_dir: Path, modules: list[str] | None = None) -> None:
    modules = modules or (A_MODULES_BEFORE_DQ + A_MODULES_AFTER_DQ)
    text = target.read_text(encoding="utf-8")
    for module in modules:
        staging = staging_dir / f"A_{module}.md"
        if not staging.exists():
            raise FileNotFoundError(f"missing staging: {staging}")
        text = _replace_section(text, f"## {module}", staging.read_text(encoding="utf-8"))
    text = _replace_section(text, f"## {A_MODULE_DQ}", _dq_placeholder_from_existing(text))
    target.write_text(text, encoding="utf-8")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("which", choices=["A", "B", "both"])
    args = parser.parse_args(argv[1:])
    if args.which in ("B", "both"):
        merge_b(B_MD, STAGING)
        print(f"merged: {B_MD}")
    if args.which in ("A", "both"):
        merge_a(A_MD, STAGING)
        print(f"merged: {A_MD} (数据质量 段留空占位)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
