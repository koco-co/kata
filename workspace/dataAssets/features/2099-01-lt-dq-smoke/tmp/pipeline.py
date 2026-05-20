"""LTQC case pipeline: CSV -> normalized model -> A.md/B.md + xmind."""
from __future__ import annotations

import importlib.util
import re
from dataclasses import dataclass, field
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("rules", _HERE / "rules.py")
assert _spec is not None and _spec.loader is not None
rules = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rules)

# Title prefixes to strip (module / submodule words seen as redundant leads).
TITLE_PREFIXES = {
    "数据质量", "质量报告", "数据质量报告", "规则任务配置", "规则任务管理",
    "任务实例查询", "校验结果查询", "规则集管理", "规则库管理", "通用配置",
    "数据标准", "元数据", "数据模型", "数据安全", "资产盘点", "平台管理",
}


@dataclass
class Step:
    idx: int
    step: str
    expected: str


@dataclass
class Case:
    version: str
    requirement_id: str
    requirement_name: str
    module: str
    submodule: str
    title: str
    priority: str
    preconditions: str
    steps: list[Step] = field(default_factory=list)


_DIGIT_TO_P = {"1": "P0", "2": "P1", "3": "P2", "4": "P3"}


def _priority(raw: str) -> str:
    raw = (raw or "").strip().upper()
    m = re.search(r"P([0-9])", raw)
    if m:
        return "P" + m.group(1)
    if raw in _DIGIT_TO_P:
        return _DIGIT_TO_P[raw]
    return "P2"


def _split_protected(s: str) -> list[str]:
    """Split on '/' but treat anything inside () as opaque."""
    parts, buf, depth = [], [], 0
    for ch in s:
        if ch == "(":
            depth += 1
            buf.append(ch)
        elif ch == ")":
            depth = max(0, depth - 1)
            buf.append(ch)
        elif ch == "/" and depth == 0:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    parts.append("".join(buf))
    return [p for p in parts if p]


def row_to_case(row: dict[str, str], version: str) -> Case | None:
    raw_title = (row.get("用例标题") or "").strip()
    if not raw_title:
        return None

    # Extract requirement from 所属模块 path
    module_path = (row.get("所属模块") or "").strip()
    rid_m = re.search(r"\(#(\d+)\)\s*$", module_path)
    req_id = rid_m.group(1) if rid_m else ""
    clean_path = re.sub(r"\s*\(#\d+\)\s*$", "", module_path)
    segs = _split_protected(clean_path)
    # Drop leading "版本迭代测试用例" and version-like segments (vX.Y.Z)
    filtered = [
        s for s in segs
        if s != "版本迭代测试用例" and not re.fullmatch(r"v\d+(\.\d+)*", s)
    ]
    req_name = filtered[-1] if filtered else ""
    req_name = rules.apply_menu_rename(rules.strip_requirement_id(req_name))

    pairs = rules.pair_steps(row.get("步骤", ""), row.get("预期", ""))
    pairs = rules.fill_empty_expected(pairs)
    pairs = [
        (i, rules.apply_menu_rename(s), rules.apply_menu_rename(e))
        for i, s, e in pairs
    ]
    steps = [Step(i, s, e) for i, s, e in pairs]

    title = rules.strip_title_prefix(raw_title, TITLE_PREFIXES)
    title = rules.apply_menu_rename(title)

    # module/submodule: use filtered path segments if available, else fallback
    module = rules.apply_menu_rename(filtered[0]) if len(filtered) >= 2 else "数据质量"
    submodule = rules.apply_menu_rename(filtered[1]) if len(filtered) >= 3 else ""

    return Case(
        version=version,
        requirement_id=req_id,
        requirement_name=req_name,
        module=module,
        submodule=submodule,
        title=title,
        priority=_priority(row.get("优先级", "")),
        preconditions=rules.apply_menu_rename((row.get("前置条件") or "").strip()),
        steps=steps,
    )


import csv as _csv
import copy as _copy

CSV_GLOB = "v*.csv"
EMPTY_STEP_TEXT = "（步骤为空）"
EMPTY_EXPECTED_TEXT = "（预期为空）"


def _content_len(c: Case) -> int:
    return len(c.preconditions) + sum(len(s.step) + len(s.expected) for s in c.steps)


def dedup(cases: list[Case]) -> list[Case]:
    """Drop cross-version duplicates by normalized title,
    keeping the richest variant. Cases with same title but different step
    sequences are still merged (richer wins)."""
    best: dict[str, Case] = {}
    order: list[str] = []
    for c in cases:
        key = rules.normalize_title(c.title)
        if key not in best:
            best[key] = c
            order.append(key)
        elif _content_len(c) > _content_len(best[key]):
            best[key] = c
    return [best[k] for k in order]


def extract_dir(csv_dir: Path) -> list[Case]:
    cases: list[Case] = []
    for path in sorted(Path(csv_dir).glob(CSV_GLOB)):
        version = "v" + re.sub(r"^v", "", path.stem).replace("64", "6.4.", 1) \
            if re.fullmatch(r"v\d+", path.stem) else path.stem
        with path.open(newline="", encoding="utf-8") as f:
            for row in _csv.DictReader(f):
                c = row_to_case(row, version)
                if c is not None:
                    cases.append(c)
    return cases


def _md_block_text(text: str) -> str:
    normalized = (
        (text or "无")
        .replace("\r\n", "\n")
        .replace("\r", "\n")
    )
    normalized = re.sub(r"<br\s*/?>", "\n", normalized, flags=re.I)
    return normalized.strip() or "无"


def _md_code_fence(text: str) -> str:
    runs = [len(m.group(0)) for m in re.finditer(r"`{3,}", text or "")]
    return "`" * max(3, max(runs, default=2) + 1)


def render_case_md(c: Case) -> str:
    pre_text = _md_block_text(c.preconditions)
    fence = _md_code_fence(pre_text)
    lines = [f"##### 【{c.priority}】{c.title}", "", "> 前置条件", "", fence]
    lines.append(pre_text)
    lines += [fence, "", "> 用例步骤", "", "| 编号 | 步骤 | 预期 |", "| --- | --- | --- |"]
    for s in c.steps:
        step_text = s.step.strip() or EMPTY_STEP_TEXT
        expected_text = s.expected.strip() or EMPTY_EXPECTED_TEXT
        lines.append(
            f"| {s.idx} | {rules.cell_to_md(step_text)} | {rules.cell_to_md(expected_text)} |"
        )
    return "\n".join(lines)


from collections import OrderedDict


def _frontmatter(suite_name: str, description: str, tags: list[str], count: int) -> list[str]:
    out = ["---", f'suite_name: "{suite_name}"', f'description: "{description}"', "tags:"]
    out += [f'  - "{t}"' for t in tags]
    out += ['create_at: "2026-05-20"', 'status: "草稿"', f"case_count: {count}", "---", ""]
    return out


def render_b_md(cases: list[Case], suite_name: str) -> str:
    grouped: "OrderedDict[str, OrderedDict[str, list[Case]]]" = OrderedDict()
    for c in cases:
        grouped.setdefault(c.version, OrderedDict()).setdefault(
            c.requirement_name, []
        ).append(c)
    out = _frontmatter(
        suite_name,
        "从 ltqc 历史用例语义精选的岚图已上线需求主流程用例（从 CSV 重抽）",
        ["主流程", "岚图", "数据质量"],
        len(cases),
    )
    for version, reqs in grouped.items():
        out += [f"## {version}", ""]
        for req, items in reqs.items():
            out += [f"### {req}", ""]
            for c in items:
                out += [render_case_md(c), ""]
    return "\n".join(out).rstrip() + "\n"


def render_dq_module_md(cases: list[Case]) -> str:
    by_req: "OrderedDict[str, list[Case]]" = OrderedDict()
    for c in cases:
        by_req.setdefault(c.requirement_name or "未分组", []).append(c)
    out = ["### 数据质量", ""]
    for req, items in by_req.items():
        out += [f"#### {req}", ""]
        for c in items:
            out += [render_case_md(c), ""]
    return "\n".join(out).rstrip() + "\n"


def render_a_md(cases: list[Case], kept_modules_md: list[str]) -> str:
    total = sum(m.count("\n##### ") + m.startswith("##### ") for m in kept_modules_md)
    total += len(cases)
    out = _frontmatter(
        "岚图主流程用例集合",
        "数据资产岚图定制版主流程回归测试用例（数据质量从 CSV 重抽富化）",
        ["主流程", "回归", "岚图", "定制"],
        total,
    )
    for m in kept_modules_md:
        out += [m.rstrip(), ""]
    out += [render_dq_module_md(cases), ""]
    return "\n".join(out).rstrip() + "\n"


import json as _json
import uuid
import zipfile as _zip

ONLINE_MARKER_MAP = {"P0": "priority-1", "P1": "priority-2", "P2": "priority-3", "P3": "priority-4"}
MAINFLOW_MARKER_MAP = {"P0": "priority-1", "P1": "priority-1", "P2": "priority-2", "P3": "priority-3"}
MARKER_MAP = ONLINE_MARKER_MAP
PRIORITY_MARKERS = set(ONLINE_MARKER_MAP.values()) | set(MAINFLOW_MARKER_MAP.values())
_METADATA = {"dataStructureVersion": "3",
             "creator": {"name": "kata-ltqc", "version": "1"},
             "layoutEngineVersion": "5"}
_MANIFEST = {"file-entries": {"content.json": {}, "metadata.json": {}}}
XMIND_NOTE_INLINE_LIMIT = 12000
XMIND_TITLE_LIMIT = 1800
XMIND_CHUNK_LIMIT = 900


def _nid() -> str:
    return uuid.uuid4().hex


def _xmind_text(text: str) -> str:
    """xmind 节点文本：<br> 还原为换行；连续配置项列表（「…」三项以上）拆行。"""
    t = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"<br\s*/?>", "\n", t, flags=re.I)
    return t


def _chunk_text(text: str, limit: int = XMIND_CHUNK_LIMIT) -> list[str]:
    t = _xmind_text(text).strip()
    if not t:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(t):
        end = min(start + limit, len(t))
        if end < len(t):
            newline = t.rfind("\n", start + 1, end + 1)
            if newline > start:
                end = newline + 1
        chunks.append(t[start:end])
        start = end
    return chunks


def _topic(title: str, children: list[dict] | None = None, branch: str = "folded") -> dict:
    node: dict = {
        "id": _nid(),
        "class": "topic",
        "title": _xmind_text(title),
        "branch": branch,
    }
    if children:
        node["children"] = {"attached": children}
    return node


def _chunk_parent(title: str, text: str) -> dict:
    chunks = _chunk_text(text)
    children = [
        _topic(f"{idx}/{len(chunks)}\n{chunk}")
        for idx, chunk in enumerate(chunks, start=1)
    ]
    return _topic(title, children)


def _text_topic(text: str, label: str) -> dict:
    t = _xmind_text(text).strip()
    if len(t) <= XMIND_TITLE_LIMIT:
        return _topic(t or label)
    summary = t[:240].rstrip() + "..."
    return _topic(
        f"{label}（内容较长，展开查看完整内容）\n{summary}",
        [_chunk_parent("完整内容", t)],
    )


def _ensure_topic_class(node: dict) -> dict:
    node.setdefault("class", "topic")
    for child in node.get("children", {}).get("attached", []) or []:
        _ensure_topic_class(child)
    return node


def _is_priority_case_node(node: dict) -> bool:
    return any(
        marker.get("markerId") in PRIORITY_MARKERS
        for marker in node.get("markers", []) or []
    )


def _clone_reference_node(node: dict, clear_priority_cases: bool = False) -> dict:
    cloned = _copy.deepcopy(node)
    cloned.setdefault("class", "topic")
    children = []
    for child in node.get("children", {}).get("attached", []) or []:
        if clear_priority_cases and _is_priority_case_node(child):
            continue
        children.append(_clone_reference_node(child, clear_priority_cases))
    if children:
        cloned["children"] = {"attached": children}
    else:
        cloned.pop("children", None)
    return cloned


def _reference_case_paths(reference_xmind: Path) -> dict[str, list[str]]:
    with _zip.ZipFile(reference_xmind) as z:
        content = _json.loads(z.read("content.json"))
    root = content[0]["rootTopic"]
    paths: dict[str, list[str]] = {}

    def walk(node: dict, parents: list[str]) -> None:
        if _is_priority_case_node(node):
            title = node.get("title", "") or ""
            paths.setdefault(title, parents)
            return
        current = parents
        if node is not root:
            current = parents + [node.get("title", "") or ""]
        for child in node.get("children", {}).get("attached", []) or []:
            walk(child, current)

    walk(root, [])
    return paths


def case_to_node(c: Case, marker_map: dict[str, str] | None = None) -> dict:
    marker_map = marker_map or MARKER_MAP
    steps = []
    for s in c.steps:
        exp_node = _text_topic(s.expected.strip() or EMPTY_EXPECTED_TEXT, f"预期 {s.idx}")
        step_node = _text_topic(s.step.strip() or EMPTY_STEP_TEXT, f"步骤 {s.idx}")
        step_node["children"] = {
            "attached": step_node.get("children", {}).get("attached", []) + [exp_node]
        }
        steps.append(step_node)
    node: dict = _topic(c.title)
    pre = (c.preconditions or "").strip()
    pre_children: list[dict] = []
    if pre and pre != "无":
        pre_text = _xmind_text(pre)
        if len(pre_text) <= XMIND_NOTE_INLINE_LIMIT:
            node["notes"] = {"plain": {"content": pre_text}}
        else:
            pre_children.append(_chunk_parent("前置条件", pre_text))
    marker = marker_map.get(c.priority)
    if marker:
        node["markers"] = [{"markerId": marker}]
    children = pre_children + steps
    if children:
        node["children"] = {"attached": children}
    return node


def _find_child(node: dict, title: str) -> dict | None:
    for child in node.get("children", {}).get("attached", []) or []:
        if child.get("title") == title:
            return child
    return None


def _ensure_child(node: dict, title: str) -> dict:
    child = _find_child(node, title)
    if child is not None:
        return child
    child = _topic(title)
    node.setdefault("children", {}).setdefault("attached", []).append(child)
    return child


def _ensure_path(l1_nodes: list[dict], path: list[str]) -> dict:
    node = None
    for child in l1_nodes:
        if child.get("title") == path[0]:
            node = child
            break
    if node is None:
        node = _topic(path[0])
        l1_nodes.append(node)
    for title in path[1:]:
        node = _ensure_child(node, title)
    return node


def _mainflow_bucket_path(c: Case) -> list[str]:
    text = f"{c.requirement_name} {c.title}"
    if "元数据同步" in text:
        return ["元数据", "元数据同步"]
    if "数据地图" in text or "标签结果页" in text or "指标结果页" in text or "字段结果页" in text:
        return ["元数据", "数据地图"]
    if "落标" in text or "数据标准" in c.requirement_name:
        return ["数据标准", "落标检查"]
    if "总览" in text or "看板" in text:
        return ["数据质量", "总览"]
    if "通用配置" in text or "json格式" in text or "报告关联维表" in text:
        if "报告关联维表" in text:
            return ["数据质量", "通用配置", "报告关联维表设置"]
        return ["数据质量", "通用配置", "json格式校验管理"]
    if "项目" in text or "菜单名称" in text or "权限点" in text:
        return ["数据质量", "项目管理", "项目信息"]
    if "报告" in text or "已生成报告" in text or "已配置报告" in text:
        return ["数据质量", "数据质量报告"]
    if "校验结果" in text or "明细" in text or "日志" in text or "实例详情" in text or "结果详情" in text:
        return ["数据质量", "校验结果查询"]
    if "规则任务" in text or "监控规则" in text or "调度" in text or "分区" in text or "抽样" in text or "离线任务" in text or "导入规则包" in text:
        return ["数据质量", "规则任务管理"]
    if "规则集" in text or "规则配置" in text:
        return ["数据质量", "规则集管理"]
    if "规则库" in text or "内置规则" in text or "自定义sql" in text or "自定义SQL" in text or "自定义正则" in text:
        return ["数据质量", "规则库配置"]
    return ["数据质量", "规则任务管理"]


def build_a_l1_nodes_from_reference(
    reference_xmind: Path,
    cases: list[Case],
    kept_cases: list[Case] | None = None,
) -> list[dict]:
    with _zip.ZipFile(reference_xmind) as z:
        content = _json.loads(z.read("content.json"))
    ref_root = content[0]["rootTopic"]
    ref_paths = _reference_case_paths(reference_xmind)
    l1_nodes = []
    for child in ref_root.get("children", {}).get("attached", []) or []:
        l1_nodes.append(_clone_reference_node(child, clear_priority_cases=True))
    for c in kept_cases or []:
        target = _ensure_path(l1_nodes, ref_paths.get(c.title, [c.module or "未分组"]))
        target.setdefault("children", {}).setdefault("attached", []).append(
            case_to_node(c, MAINFLOW_MARKER_MAP)
        )
    for c in cases:
        target = _ensure_path(l1_nodes, _mainflow_bucket_path(c))
        target.setdefault("children", {}).setdefault("attached", []).append(
            case_to_node(c, MAINFLOW_MARKER_MAP)
        )
    return [_ensure_topic_class(node) for node in l1_nodes]


def write_xmind(path, root_title: str, l1_nodes: list[dict]) -> None:
    root_id = _nid()
    right_n = (len(l1_nodes) + 1) // 2
    root = {
        "id": root_id, "class": "topic", "title": root_title,
        "structureClass": "org.xmind.ui.map.unbalanced",
        "extensions": [{
            "provider": "org.xmind.ui.map.unbalanced",
            "content": [{"name": "right-number", "content": str(right_n)}],
        }],
        "children": {"attached": [_ensure_topic_class(n) for n in l1_nodes]},
    }
    sheet = {
        "id": _nid(), "revisionId": _nid(), "class": "sheet",
        "title": "画布 1", "rootTopic": root,
        "arrangeableLayerOrder": [root_id],
        "zones": [], "theme": {},
    }
    content = [sheet]
    with _zip.ZipFile(path, "w", _zip.ZIP_STORED) as z:
        z.writestr("content.json", _json.dumps(content, ensure_ascii=False, separators=(",", ":")))
        z.writestr("metadata.json", _json.dumps(_METADATA, ensure_ascii=False))
        z.writestr("resources/", "")
        z.writestr("manifest.json", _json.dumps(_MANIFEST, ensure_ascii=False))


def build_b_l1_nodes(cases: list[Case]) -> list[dict]:
    grouped: "OrderedDict[str, OrderedDict[str, list[Case]]]" = OrderedDict()
    for c in cases:
        grouped.setdefault(c.version, OrderedDict()).setdefault(
            c.requirement_name, []).append(c)
    nodes = []
    for version, reqs in grouped.items():
        req_nodes = []
        for req, items in reqs.items():
            req_nodes.append(_topic(req, [case_to_node(c, ONLINE_MARKER_MAP) for c in items]))
        nodes.append(_topic(version, req_nodes))
    return nodes


def build_a_dq_node(cases: list[Case]) -> dict:
    by_req: "OrderedDict[str, list[Case]]" = OrderedDict()
    for c in cases:
        by_req.setdefault(c.requirement_name or "未分组", []).append(c)
    subs = [_topic(req, [case_to_node(c, MAINFLOW_MARKER_MAP) for c in items]) for req, items in by_req.items()]
    return _topic("数据质量", subs)


def build_a_module_node(mod_name: str, cases: list[Case]) -> dict:
    by_sub: "OrderedDict[str, list[Case]]" = OrderedDict()
    for c in cases:
        by_sub.setdefault(c.submodule, []).append(c)
    children = []
    for sub, items in by_sub.items():
        case_nodes = [case_to_node(c, MAINFLOW_MARKER_MAP) for c in items]
        if sub:
            children.append(_topic(sub, case_nodes))
        else:
            children.extend(case_nodes)
    return _topic(mod_name, children)


_CASE_HEAD = re.compile(r"^##### 【(P\d)】(.+)$")


def parse_existing_module(block: str) -> tuple[str, list[Case]]:
    """Parse one `## 模块` block of the existing A.md into Case objects,
    re-applying menu rename so output is normalized."""
    lines = block.split("\n")
    mod_name = ""
    cases: list[Case] = []
    cur: Case | None = None
    section = None
    in_fence = False
    fence_marker = ""
    pre: list[str] = []
    rows: list[Step] = []
    header_seen = False
    submodule = ""

    def flush():
        nonlocal cur, pre, rows, header_seen
        if cur is not None:
            cur.preconditions = "\n".join(pre).strip() or "无"
            cur.steps = rows
            cases.append(cur)
        cur, pre, rows, header_seen = None, [], [], False

    for line in lines:
        if line.startswith("### ") and not line.startswith("#### "):
            flush()
            mod_name = rules.apply_menu_rename(line[4:].strip())
            submodule = ""
            continue
        if line.startswith("#### "):
            flush()
            submodule = rules.apply_menu_rename(line[5:].strip())
            continue
        m = _CASE_HEAD.match(line)
        if m:
            flush()
            cur = Case("", "", "", mod_name, submodule,
                       rules.apply_menu_rename(m.group(2).strip()), m.group(1),
                       "无", [])
            section = None
            continue
        if cur is None:
            continue
        if re.match(r"^>\s*前置条件", line):
            section, in_fence = "pre", False
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
                cells = [c.strip() for c in line.strip().strip("|").split("|")]
                if len(cells) >= 3:
                    rows.append(Step(len(rows) + 1,
                                     rules.apply_menu_rename(cells[1].replace("\\|", "|")),
                                     rules.apply_menu_rename(cells[2].replace("\\|", "|"))))
    flush()
    return mod_name, cases


def apply_selection(cases: list[Case], selection: dict) -> list[Case]:
    """selection: {requirement_name: "*" | [case_title, ...]}.
    Returns selected cases preserving the order within `cases`."""
    wanted: dict[str, set[str] | str] = {}
    for req, val in selection.items():
        wanted[req] = "*" if val == "*" else {rules.normalize_title(t) for t in val}
    out = []
    for c in cases:
        sel = wanted.get(c.requirement_name)
        if sel is None:
            continue
        if sel == "*" or rules.normalize_title(c.title) in sel:
            out.append(c)
    return out


def load_yaml(path) -> dict:
    import yaml
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def reference_mainflow_xmind(feat: Path) -> Path | None:
    name = "岚图主流程用例整理.xmind"
    candidates = [
        feat.parent / name,
        feat.parent.parent / name,
        feat / "tmp" / "ltqc-csv" / name,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def _split_modules(md_body: str) -> "OrderedDict[str, str]":
    """Split an A.md body into {module_name: block} by `### ` module headers."""
    blocks: "OrderedDict[str, str]" = OrderedDict()
    cur_name: str | None = None
    cur: list[str] = []
    for line in md_body.split("\n"):
        if line.startswith("### ") and not line.startswith("#### "):
            if cur_name is not None:
                blocks[cur_name] = "\n".join(cur)
            cur_name, cur = line[4:].strip(), [line]
        elif cur_name is not None:
            cur.append(line)
    if cur_name is not None:
        blocks[cur_name] = "\n".join(cur)
    return blocks


def build_all(feat: Path) -> dict:
    csv_dir = feat / "tmp" / "assets-csv"
    all_cases = dedup(extract_dir(csv_dir))

    b_sel = load_yaml(feat / "tmp" / "selection" / "b-select.yaml")
    b_cases = apply_selection(all_cases, b_sel) if b_sel else all_cases
    b_md = render_b_md(b_cases, "岚图已上线需求主流程用例")
    (feat / "岚图已上线需求主流程用例.md").write_text(b_md, encoding="utf-8")
    write_xmind(feat / "岚图已上线需求主流程用例.xmind",
                "岚图已上线需求主流程用例", build_b_l1_nodes(b_cases))

    existing = (feat / "岚图主流程用例整理.md").read_text(encoding="utf-8")
    body = existing.split("\n---\n", 1)[-1]
    kept_md: list[str] = []
    kept_cases: list[Case] = []
    for name, block in _split_modules(body).items():
        if name == "数据质量":
            continue
        mod_name, cases = parse_existing_module(block)
        kept_cases.extend(cases)
        kept_md.append("\n".join(
            [f"### {mod_name}", ""] + sum(([render_case_md(c), ""] for c in cases), [])
        ).rstrip() + "\n")

    a_pick = load_yaml(feat / "tmp" / "selection" / "a-dq-pick.yaml")
    raw_dq = apply_selection(all_cases, a_pick) if a_pick else []
    # A target: 150–300 cases. Filter to P0 (highest priority), then cap N per requirement.
    A_PER_REQ_CAP = 5
    p0_only = [c for c in raw_dq if c.priority == "P0"]
    from collections import Counter
    seen: Counter = Counter()
    dq_cases = []
    for c in p0_only:
        if seen[c.requirement_name] < A_PER_REQ_CAP:
            dq_cases.append(c)
            seen[c.requirement_name] += 1
    a_md = render_a_md(dq_cases, kept_md)
    (feat / "岚图主流程用例整理.md").write_text(a_md, encoding="utf-8")
    reference_xmind = reference_mainflow_xmind(feat)
    if reference_xmind is not None:
        a_l1_nodes = build_a_l1_nodes_from_reference(reference_xmind, dq_cases, kept_cases)
    else:
        a_l1_nodes = [build_a_dq_node(dq_cases)]
    write_xmind(feat / "岚图主流程用例整理.xmind",
                "岚图主流程用例集合", a_l1_nodes)

    return {"b_cases": len(b_cases), "a_dq_cases": len(dq_cases)}


def main(argv: list[str]) -> int:
    feat = Path(argv[1]) if len(argv) > 1 else Path(__file__).resolve().parent.parent
    result = build_all(feat)
    print(result)
    return 0


if __name__ == "__main__":
    import sys
    raise SystemExit(main(sys.argv))
