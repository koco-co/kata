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


def _priority(raw: str) -> str:
    m = re.search(r"P\d", (raw or "").upper())
    return m.group(0) if m else "P2"


def row_to_case(row: dict[str, str], version: str) -> Case | None:
    raw_title = (row.get("用例标题") or "").strip()
    if not raw_title:
        return None
    req_raw = (row.get("相关需求") or "").strip()
    rid_m = re.search(r"\(#(\d+)\)", req_raw)
    req_id = rid_m.group(1) if rid_m else ""
    req_name = rules.strip_requirement_id(req_raw)

    pairs = rules.pair_steps(row.get("步骤", ""), row.get("预期", ""))
    pairs = rules.fill_empty_expected(pairs)
    pairs = [
        (i, rules.apply_menu_rename(s), rules.apply_menu_rename(e))
        for i, s, e in pairs
    ]
    steps = [Step(i, s, e) for i, s, e in pairs]

    title = rules.strip_title_prefix(raw_title, TITLE_PREFIXES)
    title = rules.apply_menu_rename(title)

    module_raw = (row.get("所属模块") or "").strip()
    parts = re.split(r"[\/>，,]", module_raw)
    module = rules.apply_menu_rename(parts[0].strip()) if parts else ""
    submodule = rules.apply_menu_rename(parts[1].strip()) if len(parts) > 1 else ""

    return Case(
        version=version,
        requirement_id=req_id,
        requirement_name=rules.apply_menu_rename(req_name),
        module=module,
        submodule=submodule,
        title=title,
        priority=_priority(row.get("优先级", "")),
        preconditions=(row.get("前置条件") or "").strip(),
        steps=steps,
    )


import csv as _csv

CSV_GLOB = "v*.csv"


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


def render_case_md(c: Case) -> str:
    lines = [f"##### 【{c.priority}】{c.title}", "", "> 前置条件", "", "```"]
    lines.append((c.preconditions or "无").strip() or "无")
    lines += ["```", "", "> 用例步骤", "", "| 编号 | 步骤 | 预期 |", "| --- | --- | --- |"]
    for s in c.steps:
        lines.append(
            f"| {s.idx} | {rules.cell_to_md(s.step.strip())} | {rules.cell_to_md(s.expected.strip())} |"
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
    by_sub: "OrderedDict[str, list[Case]]" = OrderedDict()
    for c in cases:
        by_sub.setdefault(c.submodule or "总览", []).append(c)
    out = ["## 数据质量", ""]
    for sub, items in by_sub.items():
        out += [f"### {sub}", ""]
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

MARKER_MAP = {"P0": "priority-1", "P1": "priority-2", "P2": "priority-3", "P3": "priority-4"}
_METADATA = {"dataStructureVersion": "3",
             "creator": {"name": "kata-ltqc", "version": "1"},
             "layoutEngineVersion": "5"}
_MANIFEST = {"file-entries": {"content.json": {}, "metadata.json": {}}}


def _nid() -> str:
    return uuid.uuid4().hex


def _xmind_text(text: str) -> str:
    """xmind 节点文本：<br> 还原为换行；连续配置项列表（「…」三项以上）拆行。"""
    t = (text or "").replace("<br>", "\n")
    return t


def case_to_node(c: Case) -> dict:
    steps = []
    for s in c.steps:
        exp_node = {"id": _nid(), "title": _xmind_text(s.expected), "branch": "folded"}
        steps.append({"id": _nid(), "title": _xmind_text(s.step),
                      "children": {"attached": [exp_node]}})
    node = {"id": _nid(), "title": _xmind_text(c.title)}
    marker = MARKER_MAP.get(c.priority)
    if marker:
        node["markers"] = [{"markerId": marker}]
    if steps:
        node["children"] = {"attached": steps}
    return node


def write_xmind(path, root_title: str, l1_nodes: list[dict]) -> None:
    root = {"id": _nid(), "class": "topic", "title": root_title,
            "structureClass": "org.xmind.ui.logic.right",
            "children": {"attached": l1_nodes}}
    sheet = {"id": _nid(), "class": "sheet", "title": root_title, "rootTopic": root}
    content = [sheet]
    with _zip.ZipFile(path, "w", _zip.ZIP_DEFLATED) as z:
        z.writestr("content.json", _json.dumps(content, ensure_ascii=False, separators=(",", ":")))
        z.writestr("metadata.json", _json.dumps(_METADATA, ensure_ascii=False))
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
            req_nodes.append({"id": _nid(), "title": req,
                              "children": {"attached": [case_to_node(c) for c in items]}})
        nodes.append({"id": _nid(), "title": version,
                      "children": {"attached": req_nodes}})
    return nodes


def build_a_dq_node(cases: list[Case]) -> dict:
    by_sub: "OrderedDict[str, list[Case]]" = OrderedDict()
    for c in cases:
        by_sub.setdefault(c.submodule or "总览", []).append(c)
    subs = [{"id": _nid(), "title": sub,
             "children": {"attached": [case_to_node(c) for c in items]}}
            for sub, items in by_sub.items()]
    return {"id": _nid(), "title": "数据质量", "children": {"attached": subs}}


def build_a_module_node(mod_name: str, cases: list[Case]) -> dict:
    by_sub: "OrderedDict[str, list[Case]]" = OrderedDict()
    for c in cases:
        by_sub.setdefault(c.submodule, []).append(c)
    children = []
    for sub, items in by_sub.items():
        case_nodes = [case_to_node(c) for c in items]
        if sub:
            children.append({"id": _nid(), "title": sub,
                             "children": {"attached": case_nodes}})
        else:
            children.extend(case_nodes)
    return {"id": _nid(), "title": mod_name, "children": {"attached": children}}


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
        if line.startswith("## ") and not line.startswith("### "):
            mod_name = rules.apply_menu_rename(line[3:].strip())
            continue
        if line.startswith("### "):
            flush()
            submodule = rules.apply_menu_rename(line[4:].strip())
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
            if line.startswith("```"):
                in_fence = not in_fence
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
