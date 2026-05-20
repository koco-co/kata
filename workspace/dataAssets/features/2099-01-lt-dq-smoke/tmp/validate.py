"""Validate rebuilt LTQC archives (md + xmind)."""
from __future__ import annotations

import json
import re
import sys
import zipfile
from collections import Counter
from pathlib import Path

CASE_RE = re.compile(r"^##### 【P\d】", re.MULTILINE)
PRIORITY_RE = re.compile(r"^##### 【(P\d)】", re.MULTILINE)
COUNT_RE = re.compile(r"^case_count:\s*(\d+)\s*$", re.MULTILINE)
PLACEHOLDER_RE = re.compile(r"TODO|待补充|待确认|FIXME")
OLD_MENUS = ("规则任务配置", "任务实例查询", "概览")
MAX_XMIND_TITLE_LEN = 1800
MAX_XMIND_NOTE_LEN = 12000
ONLINE_MARKER_MAP = {"P0": "priority-1", "P1": "priority-2", "P2": "priority-3", "P3": "priority-4"}
MAINFLOW_MARKER_MAP = {"P0": "priority-1", "P1": "priority-1", "P2": "priority-2", "P3": "priority-3"}
PRIORITY_MARKERS = set(ONLINE_MARKER_MAP.values()) | set(MAINFLOW_MARKER_MAP.values())
MAINFLOW_HIERARCHY = {
    "资产盘点": [],
    "元数据": ["数据地图", "元数据同步", "元模型管理", "元数据管理", "订阅的数据", "元数据质量"],
    "数据标准": ["标准统计", "标准管理", "落标检查", "标准基础"],
    "数据模型": ["规范建表", "授权与审批"],
    "数据质量": ["总览", "规则库配置", "规则集管理", "规则任务管理", "校验结果查询", "数据质量报告", "通用配置", "项目管理"],
    "数据安全": ["数据权限管理", "数据脱敏管理", "数据分级分类"],
    "平台管理": ["数据源管理", "用户角色管理", "通知中心"],
}


def normalize_field(text: str) -> str:
    return (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()


def split_md_table_row(line: str) -> list[str]:
    s = line.strip().strip("|")
    cells: list[str] = []
    buf: list[str] = []
    i = 0
    while i < len(s):
        ch = s[i]
        if ch == "|" and (i == 0 or s[i - 1] != "\\"):
            cells.append("".join(buf).replace("\\|", "|").strip())
            buf = []
        else:
            buf.append(ch)
        i += 1
    cells.append("".join(buf).replace("\\|", "|").strip())
    return cells


def md_cell_text(text: str) -> str:
    return normalize_field(text.replace("<br>", "\n"))


def has_priority_marker(node: dict) -> bool:
    return any(
        marker.get("markerId") in PRIORITY_MARKERS
        for marker in node.get("markers", []) or []
    )


def has_any_marker(node: dict) -> bool:
    return bool(node.get("markers"))


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
        if has_priority_marker(node):
            return 1
        return sum(count(k) for k in kids)

    return sum(count(s["rootTopic"]) for s in content)


def xmind_marker_distribution(path: Path) -> dict[str, int]:
    with zipfile.ZipFile(path) as z:
        content = json.loads(z.read("content.json"))
    counts: dict[str, int] = {}

    def walk(node: dict) -> None:
        for marker in node.get("markers", []) or []:
            marker_id = marker.get("markerId")
            if marker_id in PRIORITY_MARKERS:
                counts[marker_id] = counts.get(marker_id, 0) + 1
        for child in node.get("children", {}).get("attached", []) or []:
            walk(child)

    for sheet in content:
        walk(sheet["rootTopic"])
    return counts


def expected_marker_distribution(md: str, md_name: str) -> dict[str, int]:
    marker_map = MAINFLOW_MARKER_MAP if "主流程用例整理" in md_name else ONLINE_MARKER_MAP
    counts: dict[str, int] = {}
    for priority in PRIORITY_RE.findall(md):
        marker = marker_map.get(priority)
        if marker:
            counts[marker] = counts.get(marker, 0) + 1
    return counts


def check_marker_distribution(md: str, md_name: str, xmind: Path) -> list[str]:
    expected = expected_marker_distribution(md, md_name)
    actual = xmind_marker_distribution(xmind)
    return [] if actual == expected else [
        f"xmind marker distribution mismatch: expected {expected}, actual {actual}"
    ]


def xmind_directory_skeleton(path: Path) -> list[tuple[str, ...]]:
    with zipfile.ZipFile(path) as z:
        content = json.loads(z.read("content.json"))
    root = content[0]["rootTopic"]
    skeleton: list[tuple[str, ...]] = []

    def walk(node: dict, parents: tuple[str, ...]) -> None:
        if has_any_marker(node):
            return
        current = parents + (node.get("title", "") or "",)
        skeleton.append(current)
        for child in node.get("children", {}).get("attached", []) or []:
            walk(child, current)

    walk(root, ())
    return skeleton


def reference_mainflow_xmind(path: Path) -> Path | None:
    name = "岚图主流程用例整理.xmind"
    candidates = [
        path.parent.parent / name,
        path.parent.parent.parent / name,
        path.parent / "tmp" / "ltqc-csv" / name,
    ]
    for candidate in candidates:
        if candidate.exists() and candidate.resolve() != path.resolve():
            return candidate
    return None


def check_mainflow_hierarchy(path: Path) -> list[str]:
    reference = reference_mainflow_xmind(path)
    if reference is not None:
        expected = xmind_directory_skeleton(reference)
        actual = xmind_directory_skeleton(path)
        return [] if actual == expected else [
            f"mainflow directory skeleton mismatch against {reference}: "
            f"expected {len(expected)} nodes, actual {len(actual)} nodes"
        ]

    with zipfile.ZipFile(path) as z:
        content = json.loads(z.read("content.json"))
    root = content[0]["rootTopic"]
    modules = root.get("children", {}).get("attached", []) or []
    issues: list[str] = []
    module_titles = [m.get("title") for m in modules]
    expected_modules = list(MAINFLOW_HIERARCHY)
    if module_titles != expected_modules:
        issues.append(f"mainflow module hierarchy mismatch: expected {expected_modules}, actual {module_titles}")
    for module in modules:
        title = module.get("title")
        expected_children = MAINFLOW_HIERARCHY.get(title)
        if expected_children is None:
            continue
        children = module.get("children", {}).get("attached", []) or []
        direct_cases = [c.get("title", "") for c in children if has_any_marker(c)]
        if title != "资产盘点" and direct_cases:
            issues.append(f"mainflow module {title} has direct case nodes: {direct_cases[:5]}")
        group_titles = [c.get("title") for c in children if not has_any_marker(c)]
        if expected_children and group_titles[:len(expected_children)] != expected_children:
            issues.append(
                f"mainflow {title} menu hierarchy mismatch: expected prefix {expected_children}, actual {group_titles[:len(expected_children)]}"
            )
    return issues


def xmind_structure_issues(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as z:
        names = set(z.namelist())
        content = json.loads(z.read("content.json"))

    issues: list[str] = []
    if "resources/" not in names:
        issues.append("missing resources/ directory in xmind package")

    missing_class = 0
    max_title = 0
    max_note = 0

    def walk(node: dict) -> None:
        nonlocal missing_class, max_title, max_note
        if node.get("class") != "topic":
            missing_class += 1
        max_title = max(max_title, len(node.get("title", "") or ""))
        note = ((node.get("notes") or {}).get("plain") or {}).get("content", "") or ""
        max_note = max(max_note, len(note))
        for child in node.get("children", {}).get("attached", []) or []:
            walk(child)

    for sheet in content:
        walk(sheet["rootTopic"])

    if missing_class:
        issues.append(f"xmind topics missing class=topic: {missing_class}")
    if max_title > MAX_XMIND_TITLE_LEN:
        issues.append(f"xmind title too long: max {max_title} > {MAX_XMIND_TITLE_LEN}")
    if max_note > MAX_XMIND_NOTE_LEN:
        issues.append(f"xmind note too long: max {max_note} > {MAX_XMIND_NOTE_LEN}")
    return issues


def check_md_xmind_consistency(md: str, xmind: Path) -> list[str]:
    md_count = len(CASE_RE.findall(md))
    x_count = xmind_case_count(xmind)
    return [] if md_count == x_count else [
        f"md/xmind case count mismatch: md {md_count}, xmind {x_count}"
    ]


def md_case_records(md: str, md_name: str) -> Counter:
    marker_map = MAINFLOW_MARKER_MAP if "主流程用例整理" in md_name else ONLINE_MARKER_MAP
    records = []
    cur: dict | None = None
    section = None
    in_fence = False
    fence_marker = ""
    pre: list[str] = []
    rows: list[tuple[str, str]] = []
    header_seen = False

    def flush() -> None:
        nonlocal cur, pre, rows, header_seen, in_fence, fence_marker
        if cur is not None:
            records.append((
                cur["marker"],
                cur["title"],
                normalize_field("\n".join(pre)) or "无",
                tuple(rows),
            ))
        cur, pre, rows, header_seen, in_fence, fence_marker = None, [], [], False, False, ""

    for line in md.splitlines():
        m = PRIORITY_RE.match(line)
        if m:
            flush()
            title = line[m.end():].strip()
            cur = {"marker": marker_map[m.group(1)], "title": title}
            section = None
            continue
        if cur is None:
            continue
        if re.match(r"^>\s*前置条件", line):
            section, in_fence, fence_marker = "pre", False, ""
            continue
        if re.match(r"^>\s*用例步骤", line):
            section, header_seen = "steps", False
            continue
        if section == "pre":
            fence = re.match(r"^(`{3,})\s*$", line)
            if fence and not in_fence:
                fence_marker = fence.group(1)
                in_fence = True
            elif in_fence and line.strip() == fence_marker:
                in_fence = False
                fence_marker = ""
            elif in_fence:
                pre.append(line)
        elif section == "steps":
            if re.match(r"^\|\s*编号\s*\|", line) or re.match(r"^\|\s*-+\s*\|", line):
                header_seen = True
                continue
            if header_seen and line.startswith("|"):
                cells = split_md_table_row(line)
                if len(cells) >= 3:
                    rows.append((md_cell_text(cells[1]), md_cell_text(cells[2])))
    flush()
    return Counter(records)


def xmind_chunk_text(node: dict) -> str:
    parts: list[str] = []
    for child in node.get("children", {}).get("attached", []) or []:
        title = child.get("title", "") or ""
        if "\n" in title and re.match(r"^\d+/\d+\n", title):
            parts.append(title.split("\n", 1)[1])
    return normalize_field("".join(parts))


def xmind_node_text(node: dict) -> str:
    children = node.get("children", {}).get("attached", []) or []
    full = next((c for c in children if c.get("title") == "完整内容"), None)
    return xmind_chunk_text(full) if full else normalize_field(node.get("title", "") or "")


def xmind_case_records(path: Path) -> Counter:
    with zipfile.ZipFile(path) as z:
        content = json.loads(z.read("content.json"))
    records = []

    def priority_marker(node: dict) -> str:
        for marker in node.get("markers", []) or []:
            marker_id = marker.get("markerId")
            if marker_id in PRIORITY_MARKERS:
                return marker_id
        return ""

    def walk(node: dict) -> None:
        marker = priority_marker(node)
        if marker:
            pre = normalize_field(((node.get("notes") or {}).get("plain") or {}).get("content", "")) or "无"
            rows: list[tuple[str, str]] = []
            for child in node.get("children", {}).get("attached", []) or []:
                if child.get("title") == "前置条件":
                    pre = xmind_chunk_text(child) or pre
                    continue
                kids = child.get("children", {}).get("attached", []) or []
                if kids:
                    rows.append((xmind_node_text(child), xmind_node_text(kids[-1])))
            records.append((marker, node.get("title", "") or "", pre, tuple(rows)))
            return
        for child in node.get("children", {}).get("attached", []) or []:
            walk(child)

    for sheet in content:
        walk(sheet["rootTopic"])
    return Counter(records)


def check_md_xmind_field_consistency(md: str, md_name: str, xmind: Path) -> list[str]:
    missing = md_case_records(md, md_name) - xmind_case_records(xmind)
    extra = xmind_case_records(xmind) - md_case_records(md, md_name)
    if not missing and not extra:
        return []
    examples = [key[1] for key in list((missing or extra).keys())[:5]]
    return [
        "md/xmind field mismatch: "
        f"missing_in_xmind={sum(missing.values())}, "
        f"extra_in_xmind={sum(extra.values())}, examples={examples}"
    ]


def validate_pair(md_path: Path, xmind_path: Path) -> list[str]:
    md = md_path.read_text(encoding="utf-8")
    issues = check_case_count(md) + check_placeholders(md) + check_old_menu(md)
    if xmind_path.exists():
        issues += check_md_xmind_consistency(md, xmind_path)
        issues += check_marker_distribution(md, md_path.name, xmind_path)
        issues += check_md_xmind_field_consistency(md, md_path.name, xmind_path)
        if "主流程用例整理" in md_path.name:
            issues += check_mainflow_hierarchy(xmind_path)
        issues += xmind_structure_issues(xmind_path)
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
