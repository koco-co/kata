#!/usr/bin/env python3
"""
Render the user-approved semantic candidate list into the final online main-flow archive.

Selection has already been decided by the user: every row in
一级用例候选-语义精选.md is locked as yes. This script only maps those rows back to
the full source blocks in all-p1.md and writes the final markdown archive.
"""

from __future__ import annotations

from collections import OrderedDict
from difflib import SequenceMatcher
from pathlib import Path
import re

ROOT = Path(__file__).parent
CAND = ROOT / "一级用例候选-语义精选.md"
INCLUDE_PATHS = ROOT / "include-paths.txt"
SRC = ROOT / "all-p1.md"
OUT = ROOT.parent / "岚图已上线需求主流程用例.md"


def split_md_row(line: str) -> list[str]:
    cells: list[str] = []
    current: list[str] = []
    escaped = False
    for ch in line.strip():
        if ch == "\\" and not escaped:
            escaped = True
            current.append(ch)
            continue
        if ch == "|" and not escaped:
            cells.append("".join(current).strip())
            current = []
        else:
            current.append(ch)
        escaped = False
    cells.append("".join(current).strip())
    if cells and cells[0] == "":
        cells = cells[1:]
    if cells and cells[-1] == "":
        cells = cells[:-1]
    return cells


def normalize(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^【P\d】", "", text)
    text = text.replace(" ", "").replace("\u3000", "")
    text = text.replace("（", "(").replace("）", ")")
    text = text.replace("“", "\"").replace("”", "\"").replace("‘", "'").replace("’", "'")
    text = re.sub(r"[，,。；;：:、!！?？\"'`·~～\-_—]", "", text)
    return text.lower()


def include_path_requirement_names() -> dict[str, str]:
    names: dict[str, str] = {}
    if not INCLUDE_PATHS.exists():
        return names
    for raw in INCLUDE_PATHS.read_text().splitlines():
        path = raw.strip()
        if not path:
            continue
        m = re.search(r"/(v\d+\.\d+\.\d+)/(.*)$", path)
        if not m:
            continue
        tail = m.group(2)
        if tail.startswith("岚图/"):
            tail = tail[len("岚图/") :]
        req_id = re.search(r"\(#(\d+)\)", tail)
        if req_id:
            names[req_id.group(1)] = tail
    return names


def display_requirement(source_requirement: str, id_to_name: dict[str, str]) -> str:
    req_id = re.search(r"\(#(\d+)\)", source_requirement)
    if req_id and req_id.group(1) in id_to_name:
        return id_to_name[req_id.group(1)]
    return source_requirement


def display_case_title(candidate_title: str) -> str:
    title = candidate_title.strip()
    if title.startswith("【P"):
        return title
    return f"【P1】{title}"


def read_locked_rows() -> list[tuple[str, str, str, str, str]]:
    id_to_name = include_path_requirement_names()
    locked: list[tuple[str, str, str, str, str]] = []
    for line in CAND.read_text().splitlines():
        if not line.startswith("| "):
            continue
        cells = split_md_row(line)
        if len(cells) < 8 or cells[0] in {"#", "---"} or cells[0].startswith("---"):
            continue
        context = " ".join(cells[3:7])
        locked.append((cells[1], cells[2], display_requirement(cells[2], id_to_name), cells[3], context))
    return locked


def parse_source_blocks() -> tuple[
    OrderedDict[str, OrderedDict[str, list[str]]],
    list[tuple[int, str, str, str, list[str]]],
]:
    grouped: OrderedDict[str, OrderedDict[str, list[str]]] = OrderedDict()
    blocks: list[tuple[int, str, str, str, list[str]]] = []
    lines = SRC.read_text().splitlines()
    version: str | None = None
    requirement: str | None = None
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("## v"):
            version = line[3:].strip()
            grouped.setdefault(version, OrderedDict())
            i += 1
            continue
        if line.startswith("### "):
            requirement = line[4:].strip()
            if version:
                grouped.setdefault(version, OrderedDict()).setdefault(requirement, [])
            i += 1
            continue
        if line.startswith("##### ") and version and requirement:
            title = line[6:].strip()
            j = i + 1
            while j < len(lines):
                nxt = lines[j]
                if nxt.startswith("##### ") or nxt.startswith("### ") or nxt.startswith("## "):
                    break
                j += 1
            block = lines[i:j]
            block_id = len(blocks)
            blocks.append((block_id, version, requirement, title, block))
            grouped.setdefault(version, OrderedDict()).setdefault(requirement, []).append(title)
            i = j
            continue
        i += 1
    return grouped, blocks


def context_tokens(text: str) -> list[str]:
    raw_tokens = re.split(r"[\s【】「」（）()，,。；;：:、/&+\-_|]+", text)
    stop = {
        "验证",
        "功能",
        "正确",
        "覆盖",
        "核心",
        "主流程",
        "入口",
        "场景",
        "链路",
        "展示",
        "配置",
        "保存",
        "执行",
        "结果",
        "无",
        "无明显",
        "标题重复",
        "需",
        "用",
        "区分",
    }
    tokens: list[str] = []
    for token in raw_tokens:
        token = token.strip()
        if len(token) < 2 or token in stop:
            continue
        tokens.append(token)
    return tokens


def context_score(context: str, block: list[str]) -> float:
    tokens = context_tokens(context)
    if not tokens:
        return 0.0
    block_text = normalize("\n".join(block))
    total = 0
    hit = 0
    for token in tokens:
        norm = normalize(token)
        if len(norm) < 2:
            continue
        weight = min(len(norm), 8)
        total += weight
        if norm in block_text:
            hit += weight
    return hit / total if total else 0.0


def sanitize_nested_fences(block: list[str]) -> list[str]:
    result = block[:]
    try:
        pre_start = result.index("> 前置条件")
        steps_start = result.index("> 用例步骤")
    except ValueError:
        return result

    fence_indexes = [
        index
        for index in range(pre_start + 1, steps_start)
        if result[index].lstrip().startswith("```")
    ]
    if len(fence_indexes) <= 2:
        return result

    for index in fence_indexes[1:-1]:
        leading = result[index][: len(result[index]) - len(result[index].lstrip())]
        stripped = result[index].lstrip()
        result[index] = leading + "~~~" + stripped[3:]
    return result


def collapse_blank_lines(block: list[str]) -> list[str]:
    result: list[str] = []
    blank_count = 0
    in_fence = False
    for line in block:
        if line.lstrip().startswith("```") or line.lstrip().startswith("~~~"):
            in_fence = not in_fence
            blank_count = 0
            result.append(line)
            continue
        if line.strip() == "" and not in_fence:
            blank_count += 1
            if blank_count > 1:
                continue
        else:
            blank_count = 0
        result.append(line)
    while result and result[-1].strip() == "":
        result.pop()
    return result


def render_source_block(block: list[str], candidate_title: str) -> list[str]:
    if not block:
        return []
    rendered = [f"##### {display_case_title(candidate_title)}", *block[1:]]
    rendered = [
        "| --- | --- | --- |" if line.strip() == "| ---- | ---- | ---- |" else line
        for line in rendered
    ]
    rendered = sanitize_nested_fences(rendered)
    return collapse_blank_lines(rendered)


def find_block(
    version: str,
    requirement: str,
    wanted_title: str,
    context: str,
    source_by_req: dict[tuple[str, str], list[tuple[int, str, list[str]]]],
    used: set[int],
) -> tuple[int, str, list[str], float] | None:
    candidates = source_by_req.get((version, requirement), [])
    candidates = [candidate for candidate in candidates if candidate[0] not in used]
    if not candidates:
        return None

    wanted = normalize(wanted_title)
    exact = [(block_id, title, block) for block_id, title, block in candidates if normalize(title) == wanted]
    if len(exact) == 1:
        block_id, title, block = exact[0]
        return block_id, title, block, 1.0

    contains = [
        (block_id, title, block)
        for block_id, title, block in candidates
        if wanted and (wanted in normalize(title) or normalize(title) in wanted)
    ]
    if len(contains) == 1:
        block_id, title, block = contains[0]
        return block_id, title, block, 0.98

    scored = [
        (
            SequenceMatcher(None, wanted, normalize(title)).ratio() * 0.65
            + context_score(context, block) * 0.35,
            SequenceMatcher(None, wanted, normalize(title)).ratio(),
            block_id,
            title,
            block,
        )
        for block_id, title, block in (contains if contains else candidates)
    ]
    scored.sort(reverse=True, key=lambda item: item[0])
    if contains and scored:
        score, _, block_id, title, block = scored[0]
        return block_id, title, block, score
    if scored and (scored[0][1] >= 0.72 or scored[0][0] >= 0.62):
        score, _, block_id, title, block = scored[0]
        return block_id, title, block, score
    return None


def main() -> None:
    locked = read_locked_rows()
    _, blocks = parse_source_blocks()

    source_by_req: dict[tuple[str, str], list[tuple[int, str, list[str]]]] = OrderedDict()
    for block_id, version, requirement, title, block in blocks:
        source_by_req.setdefault((version, requirement), []).append((block_id, title, block))

    rendered: OrderedDict[str, OrderedDict[str, list[tuple[str, list[str]]]]] = OrderedDict()
    used: set[int] = set()
    missing: list[tuple[str, str, str]] = []
    fuzzy: list[tuple[str, str, str, str, float]] = []

    for version, requirement, out_requirement, title, context in locked:
        match = find_block(version, requirement, title, context, source_by_req, used)
        if not match:
            missing.append((version, requirement, title))
            continue
        block_id, matched_title, block, score = match
        used.add(block_id)
        rendered.setdefault(version, OrderedDict()).setdefault(out_requirement, []).append(
            (matched_title, render_source_block(block, title))
        )
        if score < 1.0:
            fuzzy.append((version, requirement, title, matched_title, score))

    if missing:
        print("WARN: missing source blocks:")
        for version, requirement, title in missing:
            print(f"- {version} | {requirement} | {title}")
    if fuzzy:
        print("Fuzzy title mappings:")
        for version, requirement, wanted, matched, score in fuzzy:
            print(f"- {version} | {requirement} | {wanted} -> {matched} ({score:.2f})")

    out: list[str] = [
        "---",
        'suite_name: "岚图已上线需求主流程用例"',
        'description: "从 ltqc 历史用例中语义精选的岚图已上线需求主流程用例"',
        "tags:",
        '  - "主流程"',
        '  - "岚图"',
        '  - "数据质量"',
        'create_at: "2026-05-18"',
        'status: "草稿"',
        f"case_count: {len(used)}",
        "---",
        "",
    ]

    for version, reqs in rendered.items():
        out.extend([f"## {version}", ""])
        for requirement, cases in reqs.items():
            out.extend([f"### {requirement}", ""])
            for _, block in cases:
                out.extend(block)
                out.append("")

    OUT.write_text("\n".join(out).rstrip() + "\n")
    print(f"Locked {len(locked)} candidate rows")
    print(f"Rendered {len(used)} source case blocks")
    print(f"Wrote {OUT}")
    if missing:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
