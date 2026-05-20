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
