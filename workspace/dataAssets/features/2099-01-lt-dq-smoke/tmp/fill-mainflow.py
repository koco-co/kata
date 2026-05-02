#!/usr/bin/env python3
"""Fill LTQC main-flow archive/XMind target leaves from the approved online cases.

This script intentionally edits only the Phase 3 target scope:
- 岚图主流程用例整理.md: 数据质量 section and 数据标准 -> 落标检查 section
- 岚图主流程用例整理.xmind: the 9 previously empty target leaves

It preserves the existing XMind workbook outside those paths.
"""

from __future__ import annotations

from collections import OrderedDict
from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZIP_DEFLATED, ZipFile
import json
import re
import shutil
import uuid

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "tmp"
ARCHIVE = ROOT / "岚图主流程用例整理.md"
XMIND = ROOT / "岚图主流程用例整理.xmind"
BUCKETS_OUT = TMP / "mainflow-buckets.md"

ONLINE_MD_CANDIDATES = [
    ROOT / "岚图已上线需求主流程用例.md",
]


BUCKETS: "OrderedDict[str, dict]" = OrderedDict(
    [
        (
            "数据质量 → 规则库配置",
            {
                "xmind_path": ["数据质量", "规则库配置"],
                "archive_heading": ["数据质量", "规则库配置"],
                "cases": [
                    ("【岚图】质量内置规则库管理(#9410)", "【P1】验证「格式-自定义正则-xxx(规则名称)」规则功能正确（占比）"),
                    ("【岚图】质量内置规则库管理(#9410)", "【P1】验证「内置规则」页面「导出规则库」功能正确"),
                    ("【规则库管理】支持自定义sql模版(#10205)", "【P1】验证列表展示"),
                    ("【规则库管理】支持自定义sql模版(#10205)", "【P1】验证自定义sql-sql面板"),
                    ("【质量规则库】内置规则增加规则项(#10191)", "【P1】验证【内置规则-多字段时间差校验&单字段时间差校验】规则状态变更正常"),
                ],
            },
        ),
        (
            "数据质量 → 规则集管理",
            {
                "xmind_path": ["数据质量", "规则集管理"],
                "archive_heading": ["数据质量", "规则集管理"],
                "cases": [
                    ("【岚图】【规则集管理】支持每个数据表的规则集管理(#10193)", "【P1】验证新建规则集配置页面"),
                    ("【岚图】【规则集管理】支持每个数据表的规则集管理(#10193)", "【P1】验证规则集管理页面"),
                    ("【岚图】【规则集管理】支持每个数据表的规则集管理(#10193)", "【P1】验证规则集详情数据正确"),
                    ("【岚图】【规则集管理】支持每个数据表的规则集管理(#10193)", "【P1】验证规则集引用功能正常(规则包单选)"),
                    ("【岚图】【规则集管理】支持每个数据表的规则集管理(#10193)", "【P1】验证规则任务配置规则包后校验正常(1规则包 * 10校验规则)"),
                ],
            },
        ),
        (
            "数据质量 → 规则任务管理",
            {
                "xmind_path": ["数据质量", "规则任务管理"],
                "archive_heading": ["数据质量", "规则任务管理"],
                "cases": [
                    ("【规则任务配置优化】一个数据表支持创建多个质量规则任务(#10188)", "【P1】验证同一张表，不同任务名，相同规则，任务创建成功"),
                    ("【规则任务配置优化】一个数据表支持创建多个质量规则任务(#10188)", "【P1】验证同一张表，不同任务，运行结果正确"),
                    ("【规则任务配置优化】质量规则任务支持编辑分区信息(#10192)", "【P1】验证分区信息改变, 任务实例信息改变(手动输入分区 ❯ 选择动态分区)"),
                    ("【规则任务配置优化】质量规则任务支持编辑分区信息(#10192)", "【P1】验证规则任务支持「实例生成方式」"),
                    ("【规则调度设置】spark任务调参(#10190)", "【P1】验证Spark环境参数配置生效(spark.executor.instances)"),
                    ("【规则调度设置】任务时长限制(#10220)", "【P1】验证编辑不限制「超时时间」为自定义，功能正确"),
                    ("质量任务调度支持跟随离线任务调度设置周期(#9692)", "【P1】验证离线「天任务」-质量「天任务」-质量任务运行逻辑正确"),
                ],
            },
        ),
        (
            "数据质量 → 校验结果查询",
            {
                "xmind_path": ["数据质量", "校验结果查询"],
                "archive_heading": ["数据质量", "校验结果查询"],
                "cases": [
                    ("规则校验详细结果表(#9334)", "【P1】验证「校验异常」逻辑正确（唯一性校验-重复数）"),
                    ("规则校验详细结果表(#9334)", "【P1】验证「校验异常」逻辑正确（有效性校验-数值取值范围检测）"),
                    ("规则校验详细结果表(#9334)", "【P1】验证「校验异常」逻辑正确（完整性校验-多表数据内容比对）"),
                    ("规则校验详细结果表(#9334)", "【P1】验证「校验异常」逻辑正确（完整性校验-多表行数比对）"),
                    ("规则校验详细结果表(#9334)", "【P1】验证「校验通过」逻辑正确（完整性校验-表级表行数）"),
                ],
            },
        ),
        (
            "数据质量 → 数据质量报告",
            {
                "xmind_path": ["数据质量", "数据质量报告"],
                "archive_heading": ["数据质量", "数据质量报告"],
                "cases": [
                    ("质量报告管理(#9341)", "【P1】验证「已配置报告」-同一张表同时配置自定义报告+单表报告"),
                    ("质量报告管理(#9341)", "【P1】验证「新建报告」-功能配置正常(月)"),
                    ("质量报告管理(#9341)", "【P1】验证「新建报告」-功能配置正常(自定义调度)"),
                    ("质检式质量报告查看、下载(#9342)", "【P1】验证查看详情功能正常"),
                    ("质检式质量报告查看、下载(#9342)", "【P1】验证查看日志功能正常"),
                    ("报告支持持续生成(#9693)", "【P1】验证「持续生成中报告」状态流程正确"),
                    ("明细数据下载支持100W条数据(#9697)", "【P1】验证「质量报告」详情-明细数据支持下载1万条数据"),
                    ("【数据质量】报告搜索优化(#10474)", "【P1】验证已生成报告列表页支持报告名称与数据表模糊搜索"),
                ],
            },
        ),
        (
            "数据质量 → 通用配置 → 报告关联维表设置",
            {
                "xmind_path": ["数据质量", "通用配置", "报告关联维表设置"],
                "archive_heading": ["数据质量", "通用配置", "报告关联维表设置"],
                "cases": [
                    ("通用配置，报告关联维表设置(#9336)", "【P1】「报告关联维表设置Doris」配置全流程校验"),
                    ("通用配置，报告关联维表设置(#9336)", "【P1】「报告关联维表设置Hive」配置全流程校验"),
                ],
            },
        ),
        (
            "数据质量 → 通用配置 → json格式校验管理",
            {
                "xmind_path": ["数据质量", "通用配置", "json格式校验管理"],
                "archive_heading": ["数据质量", "通用配置", "json格式校验管理"],
                "cases": [
                    ("【通用配置】json格式配置(#10458)", "【P1】验证新增子层级完整流程"),
                    ("【通用配置】json格式配置(#10458)", "【P1】验证编辑key名称、value格式、数据源类型并保存生效"),
                    ("【通用配置】json格式配置(#10458)", "【P1】验证key名模糊搜索功能（含子层级key命中）"),
                    ("【通用配置】json格式配置(#10458)", "【P1】验证value格式有内容时正则测试控件显示及匹配通过失败场景"),
                    ("【通用配置】json格式配置(#10458)", "【P1】验证5层层级展开下钻及展开图标显示逻辑"),
                    ("【通用配置】json格式配置(#10458)", "【P1】验证重复处理规则「重复则跳过」对已存在key不覆盖"),
                    ("【通用配置】json格式配置(#10458)", "【P1】验证重复处理规则「重复则覆盖更新」生效"),
                    ("【通用配置】json格式配置(#10458)", "【P1】验证导入文件二层key上一层级key名无法匹配时标红并批注提示"),
                ],
            },
        ),
        (
            "数据质量 → 项目管理 → 项目信息",
            {
                "xmind_path": ["数据质量", "项目管理", "项目信息"],
                "archive_heading": ["数据质量", "项目管理", "项目信息"],
                "cases": [
                    ("【数据质量】菜单名称修改(#10221)", "【P1】验证新建项目菜单名称正确修改"),
                ],
            },
        ),
        (
            "数据标准 → 落标检查",
            {
                "xmind_path": ["数据标准", "落标检查"],
                "archive_heading": ["数据标准", "落标检查"],
                "cases": [
                    ("【数据标准】支持dbc标准落标检查(#9918)", "【P1】验证【标准管理】-【落标检查】-【落标检查任务】-【新建检查任务】页面交互"),
                    ("【数据标准】支持dbc标准落标检查(#9918)", "【P1】验证【标准管理】-【落标检查】-【落标检查结果】页面交互"),
                    ("【数据标准】支持dbc标准落标检查(#9918)", "【P1】验证【标准管理】-【落标检查】-【落标检查结果】-【查看详情】页面内容"),
                    ("【数据标准】支持dbc标准落标检查(#9918)", "【P1】验证标准达标率、不达标字段数/检查失败数取最新一次任务运行的结果"),
                    ("【数据标准】支持dbc标准落标检查(#9918)", "【P1】验证【标准管理】-【标准映射】-【映射目标】支持选择到数据表"),
                    ("【数据标准】支持dbc标准落标检查(#9918)", "【P1】验证【数据标准】-【标准定义】标准进行“下线”操作时页面测试"),
                    ("【数据资产】落标检查任务、元数据同步任务支持配置环境参数(#10454)", "【P1】验证编辑落标检查任务支持配置环境参数，功能正确"),
                ],
            },
        ),
    ]
)


def source_md_path() -> Path:
    for path in ONLINE_MD_CANDIDATES:
        if path.exists():
            return path
    raise SystemExit("Cannot find approved online case markdown")


def normalize_title(title: str) -> str:
    return re.sub(r"\s+", "", title.strip())


def parse_cases(path: Path) -> dict[tuple[str, str], list[str]]:
    lines = path.read_text().splitlines()
    requirement = ""
    cases: dict[tuple[str, str], list[str]] = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("### "):
            requirement = line[4:].strip()
            i += 1
            continue
        if line.startswith("##### "):
            title = line[6:].strip()
            j = i + 1
            while j < len(lines):
                nxt = lines[j]
                if nxt.startswith("##### ") or nxt.startswith("### ") or nxt.startswith("## "):
                    break
                j += 1
            cases[(requirement, title)] = lines[i:j]
            i = j
            continue
        i += 1
    return cases


def find_case(cases: dict[tuple[str, str], list[str]], requirement_hint: str, title: str) -> tuple[str, list[str]]:
    wanted = normalize_title(title)
    candidates = [
        (req, block)
        for (req, block_title), block in cases.items()
        if requirement_hint in req and normalize_title(block_title) == wanted
    ]
    if len(candidates) == 1:
        return candidates[0]
    if not candidates:
        raise SystemExit(f"Case not found: {requirement_hint} | {title}")
    raise SystemExit(f"Ambiguous case: {requirement_hint} | {title}")


def clean_block(block: list[str]) -> list[str]:
    result = []
    blank = 0
    in_fence = False
    for line in block:
        if line.lstrip().startswith("```") or line.lstrip().startswith("~~~"):
            in_fence = not in_fence
        if not in_fence and line.strip() == "":
            blank += 1
            if blank > 1:
                continue
        else:
            blank = 0
        result.append(line)
    while result and result[-1].strip() == "":
        result.pop()
    return result


def strip_priority(title: str) -> str:
    return re.sub(r"^【P\d】", "", title).strip()


def parse_block_parts(block: list[str]) -> tuple[str, str, list[tuple[str, str]]]:
    title = strip_priority(block[0].replace("##### ", "", 1).strip())
    preconditions: list[str] = []
    steps: list[tuple[str, str]] = []
    section = ""
    in_fence = False
    header_seen = False
    for line in block[1:]:
        if line == "> 前置条件":
            section = "pre"
            in_fence = False
            continue
        if line == "> 用例步骤":
            section = "steps"
            header_seen = False
            continue
        if section == "pre":
            if line.startswith("```") or line.startswith("~~~"):
                in_fence = not in_fence
                continue
            if in_fence:
                preconditions.append(line)
            continue
        if section == "steps":
            if line.startswith("| 编号 |") or re.match(r"^\|\s*-+\s*\|", line):
                header_seen = True
                continue
            if header_seen and line.startswith("|"):
                cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
                if len(cells) >= 3:
                    steps.append((cells[1], cells[2]))
    return title, "\n".join(preconditions).strip(), steps


def xmind_id() -> str:
    return uuid.uuid4().hex[:26]


def make_case_node(block: list[str]) -> dict:
    title, preconditions, steps = parse_block_parts(block)
    children = []
    for step, expected in steps:
        children.append(
            {
                "id": xmind_id(),
                "title": step,
                "children": {"attached": [{"id": xmind_id(), "title": expected, "branch": "folded"}]},
            }
        )
    node = {
        "id": xmind_id(),
        "title": title,
        "markers": [{"markerId": "priority-1"}],
    }
    if preconditions:
        node["notes"] = {"plain": {"content": preconditions}}
    if children:
        node["children"] = {"attached": children}
    return node


def selected_blocks(cases: dict[tuple[str, str], list[str]]) -> "OrderedDict[str, list[tuple[str, str, list[str]]]]":
    selected: OrderedDict[str, list[tuple[str, str, list[str]]]] = OrderedDict()
    for bucket, config in BUCKETS.items():
        selected[bucket] = []
        for requirement_hint, title in config["cases"]:
            requirement, block = find_case(cases, requirement_hint, title)
            selected[bucket].append((requirement, title, clean_block(block)))
    return selected


def render_bucket_file(selected: "OrderedDict[str, list[tuple[str, str, list[str]]]]") -> None:
    lines = [
        "# 主流程补强分桶建议",
        "",
        "> 来源：已确认的岚图已上线需求主流程用例；本文件用于记录 Phase 3 写入主流程 Markdown 和主流程 XMind 的目标节点。",
        "",
    ]
    total = 0
    for bucket, entries in selected.items():
        lines.extend([f"## {bucket}", ""])
        for requirement, title, _ in entries:
            total += 1
            lines.append(f"- 来自 `{requirement}`：{title}")
        lines.append("")
    lines.insert(3, f"> 合计 {total} 条，覆盖 {len(selected)} 个目标叶子节点。")
    BUCKETS_OUT.write_text("\n".join(lines).rstrip() + "\n")
    print(f"Wrote {BUCKETS_OUT}")


def section_bounds(lines: list[str], heading: str, level: int = 2) -> tuple[int, int]:
    prefix = "#" * level + " "
    start = next(i for i, line in enumerate(lines) if line == prefix + heading)
    end = len(lines)
    for i in range(start + 1, len(lines)):
        if lines[i].startswith(prefix):
            end = i
            break
    return start, end


def subsection(lines: list[str], start: int, end: int, heading: str, level: int) -> list[str]:
    prefix = "#" * level + " "
    sub_start = None
    for i in range(start + 1, end):
        if lines[i] == prefix + heading:
            sub_start = i
            break
    if sub_start is None:
        return []
    sub_end = end
    for i in range(sub_start + 1, end):
        if lines[i].startswith(prefix):
            sub_end = i
            break
    return trim_blank(lines[sub_start:sub_end])


def trim_blank(lines: list[str]) -> list[str]:
    while lines and lines[0].strip() == "":
        lines = lines[1:]
    while lines and lines[-1].strip() == "":
        lines = lines[:-1]
    return lines


def render_cases(entries: list[tuple[str, str, list[str]]]) -> list[str]:
    lines: list[str] = []
    for _, _, block in entries:
        lines.extend(block)
        lines.append("")
    return trim_blank(lines)


def rewrite_archive(selected: "OrderedDict[str, list[tuple[str, str, list[str]]]]") -> None:
    lines = ARCHIVE.read_text().splitlines()
    dq_start, dq_end = section_bounds(lines, "数据质量", 2)
    ds_start, ds_end = section_bounds(lines, "数据标准", 2)

    overview = subsection(lines, dq_start, dq_end, "总览", 3)
    if not overview:
        overview = ["### 总览", ""]

    data_quality: list[str] = ["## 数据质量", ""]
    data_quality.extend(overview)
    data_quality.append("")

    for heading in ["规则库配置", "规则集管理", "规则任务管理", "校验结果查询", "数据质量报告"]:
        bucket = f"数据质量 → {heading}"
        data_quality.extend([f"### {heading}", ""])
        data_quality.extend(render_cases(selected[bucket]))
        data_quality.append("")

    data_quality.extend(["### 通用配置", "", "#### 报告关联维表设置", ""])
    data_quality.extend(render_cases(selected["数据质量 → 通用配置 → 报告关联维表设置"]))
    data_quality.extend(["", "#### json格式校验管理", ""])
    data_quality.extend(render_cases(selected["数据质量 → 通用配置 → json格式校验管理"]))
    data_quality.append("")

    data_quality.extend(["### 项目管理", "", "#### 项目信息", ""])
    data_quality.extend(render_cases(selected["数据质量 → 项目管理 → 项目信息"]))
    data_quality.append("")
    data_quality = trim_blank(data_quality)

    data_standard = lines[ds_start:ds_end]
    # Replace existing top-level 落标检查 under 数据标准 if present; otherwise append it.
    existing_start = None
    for i, line in enumerate(data_standard):
        if line == "### 落标检查":
            existing_start = i
            break
    new_drop = ["### 落标检查", "", *render_cases(selected["数据标准 → 落标检查"])]
    if existing_start is None:
        data_standard = trim_blank(data_standard) + ["", *new_drop]
    else:
        existing_end = len(data_standard)
        for i in range(existing_start + 1, len(data_standard)):
            if data_standard[i].startswith("### "):
                existing_end = i
                break
        data_standard = data_standard[:existing_start] + new_drop + data_standard[existing_end:]
    data_standard = trim_blank(data_standard)

    # Recompute bounds after replacing the earlier 数据标准 block may shift indices.
    updated = lines[:ds_start] + data_standard + lines[ds_end:]
    dq_start, dq_end = section_bounds(updated, "数据质量", 2)
    updated = updated[:dq_start] + data_quality + updated[dq_end:]
    ARCHIVE.write_text("\n".join(updated).rstrip() + "\n")
    print(f"Wrote {ARCHIVE}")


def find_topic(root: dict, path: list[str]) -> dict:
    node = root
    for part in path:
        for child in node.get("children", {}).get("attached", []) or []:
            if child.get("title") == part:
                node = child
                break
        else:
            raise SystemExit(f"Missing XMind path: {' -> '.join(path)}")
    return node


def rewrite_xmind(selected: "OrderedDict[str, list[tuple[str, str, list[str]]]]") -> None:
    with ZipFile(XMIND, "r") as zin:
        content = json.loads(zin.read("content.json").decode("utf-8"))
        root = content[0]["rootTopic"]
        for bucket, entries in selected.items():
            target = find_topic(root, BUCKETS[bucket]["xmind_path"])
            target["children"] = {"attached": [make_case_node(block) for _, _, block in entries]}
            target.pop("branch", None)

        with NamedTemporaryFile(delete=False) as tmp:
            tmp_path = Path(tmp.name)

        with ZipFile(tmp_path, "w", ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == "content.json":
                    zout.writestr(item, json.dumps(content, ensure_ascii=False, separators=(",", ":")))
                else:
                    zout.writestr(item, zin.read(item.filename))
    shutil.move(tmp_path, XMIND)
    print(f"Wrote {XMIND}")


def main() -> None:
    cases = parse_cases(source_md_path())
    selected = selected_blocks(cases)
    render_bucket_file(selected)
    rewrite_archive(selected)
    rewrite_xmind(selected)
    total = sum(len(entries) for entries in selected.values())
    print(f"Filled {len(selected)} buckets with {total} cases")


if __name__ == "__main__":
    main()
