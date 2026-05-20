"""Validate rebuilt LTQC archives (md + xmind)."""
from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path

CASE_RE = re.compile(r"^##### 【P\d】", re.MULTILINE)
COUNT_RE = re.compile(r"^case_count:\s*(\d+)\s*$", re.MULTILINE)
PLACEHOLDER_RE = re.compile(r"TODO|待补充|待确认|FIXME")
OLD_MENUS = ("规则任务配置", "任务实例查询", "概览")


def check_case_count(md: str) -> list[str]:
    m = COUNT_RE.search(md)
    if not m:
        return ["missing case_count frontmatter"]
    declared = int(m.group(1))
    actual = len(CASE_RE.findall(md))
    return [] if declared == actual else [f"case count mismatch: declared {declared}, actual {actual}"]


def check_placeholders(md: str) -> list[str]:
    return [f"placeholder at offset {m.start()}: {m.group(0)}"
            for m in PLACEHOLDER_RE.finditer(md)]


def check_old_menu(md: str) -> list[str]:
    return [f"residual old menu: {name}" for name in OLD_MENUS if name in md]


def xmind_case_count(path: Path) -> int:
    with zipfile.ZipFile(path) as z:
        content = json.loads(z.read("content.json"))

    def count(node) -> int:
        kids = node.get("children", {}).get("attached", []) or []
        if node.get("markers"):
            return 1
        return sum(count(k) for k in kids)

    return sum(count(s["rootTopic"]) for s in content)


def check_md_xmind_consistency(md: str, xmind: Path) -> list[str]:
    md_count = len(CASE_RE.findall(md))
    x_count = xmind_case_count(xmind)
    return [] if md_count == x_count else [
        f"md/xmind case count mismatch: md {md_count}, xmind {x_count}"
    ]


def validate_pair(md_path: Path, xmind_path: Path) -> list[str]:
    md = md_path.read_text(encoding="utf-8")
    issues = check_case_count(md) + check_placeholders(md) + check_old_menu(md)
    if xmind_path.exists():
        issues += check_md_xmind_consistency(md, xmind_path)
    return [f"{md_path.name}: {i}" for i in issues]


def main(argv: list[str]) -> int:
    feat = Path(argv[1]) if len(argv) > 1 else Path(__file__).resolve().parent.parent
    pairs = [
        ("岚图主流程用例整理.md", "岚图主流程用例整理.xmind"),
        ("岚图已上线需求主流程用例.md", "岚图已上线需求主流程用例.xmind"),
    ]
    all_issues: list[str] = []
    for md_name, x_name in pairs:
        md_p, x_p = feat / md_name, feat / x_name
        if md_p.exists():
            all_issues += validate_pair(md_p, x_p)
    for i in all_issues:
        print(i, file=sys.stderr)
    print(f"issues={len(all_issues)}")
    return 1 if all_issues else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
