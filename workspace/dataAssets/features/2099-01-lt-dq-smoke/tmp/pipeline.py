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
    node: dict = {"id": _nid(), "title": _xmind_text(c.title)}
    pre = (c.preconditions or "").strip()
    if pre and pre != "无":
        node["notes"] = {"plain": {"content": _xmind_text(pre)}}
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
    by_req: "OrderedDict[str, list[Case]]" = OrderedDict()
    for c in cases:
        by_req.setdefault(c.requirement_name or "未分组", []).append(c)
    subs = [{"id": _nid(), "title": req,
             "children": {"attached": [case_to_node(c) for c in items]}}
            for req, items in by_req.items()]
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
    a_l1_nodes: list[dict] = []
    for name, block in _split_modules(body).items():
        if name == "数据质量":
            continue
        mod_name, cases = parse_existing_module(block)
        kept_md.append("\n".join(
            [f"### {mod_name}", ""] + sum(([render_case_md(c), ""] for c in cases), [])
        ).rstrip() + "\n")
        a_l1_nodes.append(build_a_module_node(mod_name, cases))

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
    a_l1_nodes.append(build_a_dq_node(dq_cases))
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
