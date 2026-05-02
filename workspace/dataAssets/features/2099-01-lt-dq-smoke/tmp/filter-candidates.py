#!/usr/bin/env python3
"""
从 all-p1.md 抽取每个需求下 1-3 条主流程候选用例，输出候选表格 MD。

启发式：
  1. 主功能动词：新建/创建/配置/展示/列表/校验/启动/调度/导入/导出/生成/发布
  2. 步骤数 >= 3（步骤表行数）
  3. 标题不含：异常/边界/非法/重复/校验失败/缺省
  4. 多条满足时按步骤数降序，取前 3
"""
import re
from pathlib import Path

SRC = Path(__file__).parent / "all-p1.md"
OUT = Path(__file__).parent / "一级用例候选.md"
INCLUDE_PATHS = Path(__file__).parent / "include-paths.txt"

MAIN_VERBS = ["新建", "创建", "配置", "展示", "列表", "校验", "启动", "调度", "导入", "导出", "生成", "发布"]
EXCLUDE_KW = ["异常", "边界", "非法", "重复", "校验失败", "缺省"]
STALE_TERMS = ["质量任务管理"]
NO_P1_REQUIREMENTS = ["#9698"]


def parse(md_text):
    lines = md_text.split("\n")
    version = None
    requirement = None
    cases = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("## v"):
            version = line[3:].strip()
        elif line.startswith("### "):
            requirement = line[4:].strip()
        elif line.startswith("##### "):
            title = line[6:].strip()
            step_count = 0
            j = i + 1
            while j < len(lines):
                next_line = lines[j]
                if next_line.startswith("##### ") or next_line.startswith("### ") or next_line.startswith("## "):
                    break
                if re.match(r"^\| \d+ \|", next_line):
                    step_count += 1
                j += 1
            cases.append((version, requirement, title, step_count))
            i = j
            continue
        i += 1
    return cases


def has_main_verb(title):
    return any(verb in title for verb in MAIN_VERBS)


def has_exclude_kw(title):
    return any(keyword in title for keyword in EXCLUDE_KW)


def dedupe_cases(cases):
    deduped = {}
    for case in cases:
        key = case[:3]
        existing = deduped.get(key)
        if existing is None or case[3] > existing[3]:
            deduped[key] = case
    return list(deduped.values())


def pick(cases_by_req):
    primary = [
        case
        for case in cases_by_req
        if has_main_verb(case[2]) and not has_exclude_kw(case[2]) and case[3] >= 3
    ]
    primary.sort(key=lambda case: -case[3])
    if primary:
        return primary[:3]

    fallback = sorted(cases_by_req, key=lambda case: -case[3])
    return fallback[:1] if fallback else []


def table_cell(value):
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def main():
    md_text = SRC.read_text()
    cases = parse(md_text)
    deduped_cases = dedupe_cases(cases)
    by_req = {}
    for case in deduped_cases:
        by_req.setdefault((case[0], case[1]), []).append(case)

    rows = []
    for case_list in by_req.values():
        for case in pick(case_list):
            version, requirement, title, step_count = case
            reason = []
            if has_main_verb(title):
                reason.append("含主功能动词")
            if step_count >= 3:
                reason.append(f"{step_count} 步")
            reason_text = "+".join(reason) if reason else "fallback"
            rows.append((version, requirement, title, step_count, reason_text))

    out_lines = [
        "# 岚图已上线需求一级用例候选表格",
        "",
        f"> 来源：`tmp/all-p1.md`（{len(cases)} 个 P1 用例，去重后 {len(deduped_cases)} 个，覆盖 {len(by_req)} 个需求）",
        f"> 白名单共 {len(INCLUDE_PATHS.read_text().splitlines())} 个路径；其中 {'、'.join(NO_P1_REQUIREMENTS)} 无 P1 行，未纳入本 P1 候选表。",
        f"> 候选共 {len(rows)} 条；请逐行在「你的决策」列填 `yes` / `no` / `换为：用例标题` / `新鲜度风险`",
        "",
        "| # | 版本 | 需求 | 候选用例标题 | 步骤数 | 推荐理由 | 新鲜度风险 | 你的决策 |",
        "|---|---|---|---|---:|---|---|---|",
    ]

    for idx, (version, requirement, title, step_count, reason) in enumerate(rows, start=1):
        stale = "是（旧菜单名）" if any(term in title for term in STALE_TERMS) else ""
        out_lines.append(
            "| "
            + " | ".join(
                [
                    str(idx),
                    table_cell(version),
                    table_cell(requirement),
                    table_cell(title),
                    str(step_count),
                    table_cell(reason),
                    stale,
                    "",
                ]
            )
            + " |"
        )

    OUT.write_text("\n".join(out_lines) + "\n")
    print(f"Wrote {OUT} with {len(rows)} candidates from {len(by_req)} requirements")


if __name__ == "__main__":
    main()
