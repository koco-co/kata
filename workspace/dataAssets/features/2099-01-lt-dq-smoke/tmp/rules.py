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


def fill_empty_expected(
    pairs: list[tuple[int, str, str]],
) -> list[tuple[int, str, str]]:
    """When a non-empty step has an empty expected, default to「操作成功」."""
    out: list[tuple[int, str, str]] = []
    for idx, step, exp in pairs:
        if step.strip() and not exp.strip():
            exp = "操作成功"
        out.append((idx, step, exp))
    return out


_PREREQ_MARKER = "规则集前置（#10193 强依赖）"
_PREREQ_TEXT = (
    _PREREQ_MARKER
    + "：已在【数据资产】→【数据质量】→【规则集管理】创建规则集 ${rs_name}"
    + "（数据表 ${tableName}），规则集下含规则包 ${pkg_name}，包内已配置所需校验规则；"
    + "本用例通过【导入规则包】引用上述规则集/规则包。"
)
_TRIGGER_WORDS = ("新建监控规则", "创建规则任务", "配置监控规则")
_RULESET_FEATURE_HINTS = ("规则集详情", "规则集管理页面", "规则集引用", "规则集列表")


def needs_ruleset_prereq(steps: list[str], title: str = "") -> bool:
    if any(h in title for h in _RULESET_FEATURE_HINTS):
        return False
    joined = "".join(steps)
    if "导入规则包" in joined:
        return False
    return any(w in joined for w in _TRIGGER_WORDS)


def append_ruleset_precondition(precondition: str) -> str:
    if _PREREQ_MARKER in (precondition or ""):
        return precondition
    base = (precondition or "").strip()
    if not base or base == "无":
        return _PREREQ_TEXT
    return base + "\n" + _PREREQ_TEXT


def strip_requirement_id(name: str) -> str:
    """Drop only the trailing ZenTao id `(#12345)`; keep all other parens."""
    return re.sub(r"\s*\(#\d+\)\s*$", "", name or "").strip()


def strip_title_prefix(title: str, prefixes: set[str]) -> str:
    """Strip leading「module page」prefixes separated by spaces."""
    t = (title or "").strip()
    changed = True
    while changed:
        changed = False
        for p in prefixes:
            if t.startswith(p + " "):
                t = t[len(p) + 1 :].lstrip()
                changed = True
    return t


def normalize_title(title: str) -> str:
    """Loose key for dedup/matching."""
    t = re.sub(r"^【P\d】", "", title or "")
    t = t.replace(" ", "").replace("　", "")
    t = t.replace("（", "(").replace("）", ")")
    t = t.replace("「", "").replace("」", "").replace("【", "").replace("】", "")
    t = t.replace("(", "").replace(")", "")
    t = re.sub(r"[，,。；;：:、!！?？\"'`·~～\-_—]", "", t)
    return t.lower()


_OLD_MENUS = ("规则任务配置", "任务实例查询", "概览")
_DATASOURCES = ("sparkThrift", "hive", "doris", "Doris", "impala", "mysql", "oracle")


def scan_empty_steps(pairs: list[tuple[int, str, str]]) -> list[int]:
    return [i for i, step, _exp in pairs if not step.strip()]


def scan_residual_old_menu(text: str) -> list[str]:
    return [m for m in _OLD_MENUS if m in (text or "")]


def scan_datasource_loss(title: str, body: str) -> list[str]:
    """Datasource tokens named in title but missing from body."""
    declared = [d for d in _DATASOURCES if d in (title or "")]
    return [d for d in declared if d not in (body or "")]


def is_packed_config_line(line: str) -> bool:
    """A single line packing 3+「…」config/display items (xmind readability)."""
    return len(re.findall(r"「[^」]+」", line or "")) >= 3
