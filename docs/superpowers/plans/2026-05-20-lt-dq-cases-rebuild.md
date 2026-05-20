# 岚图主流程用例重建管道 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把禅道 CSV 源用一条带测试的 Python 管道重抽成两份格式统一、无抽取缺陷的岚图主流程用例文档（A 跨模块回归 / B 数据质量需求全量），并生成可读 XMind。

**Architecture:** 单数据模型贯穿 extract→dedup→render(md)→render(xmind)。`rules.py` 放纯函数（按序号配对、改名、前置、补全、扫描），`pipeline.py` 放模型/抽取/渲染/CLI，`validate.py` 放校验。挑选意图固化进 `selection/*.yaml`。CSV 是唯一真源。

**Tech Stack:** Python 3（stdlib：`csv`/`zipfile`/`json`/`dataclasses`/`re`/`unittest`；第三方：`PyYAML` 已装）。测试用 `python3 -m unittest`。

**工作约定（非 worktree）：** 源 `assets-csv/` 未跟踪、无法随 worktree 携带，本任务在 `main` 直接进行。所有脚本/配置/工作文件落 `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/`（已跟踪）。交付物（A/B 的 md+xmind）在 feature 根目录（已跟踪）。下文路径以仓库根 `/Users/poco/Projects/kata` 为基准；`FEAT=workspace/dataAssets/features/2099-01-lt-dq-smoke`。

---

## File Structure

新建（均在 `$FEAT/tmp/`）：
- `rules.py` — 纯函数：序号配对、单元格转 md、菜单改名、空预期补全、规则集前置、需求名去 id、标题去前缀、扫描器。无 I/O。
- `pipeline.py` — `Step`/`Case` 模型、CSV→Case、跨版本去重、selection 应用、渲染 A.md/B.md、生成 xmind、CLI。
- `validate.py` — 校验器（case_count、md↔xmind 一致、marker 分布、占位符、残留旧菜单）。
- `test_pipeline.py` — unittest（覆盖 rules + pipeline 核心）。
- `selection/b-select.yaml` — B 的需求→用例语义挑选。
- `selection/a-dq-pick.yaml` — A 数据质量主流程挑选。

删除（管道可重生的旧中间产物/散脚本，最后一个任务执行）：`all-p1.md`、`一级用例候选*.md`、`*.json`、`fill-mainflow*.py`、`filter-candidates.py`、`merge.py`、`normalize-*.py`、`render-final.py`、`validate-staging.py`、`test_merge.py`、`test_normalize_*.py`、`test_validate_staging.py`、`include-paths.txt`、`mainflow-buckets.md`。保留并改造来源：`menu-rename-map.md`、`ruleset-prerequisite.md`、`style-guide.md` 作参考。

修改（交付物，最终由管道覆盖写）：
- `$FEAT/岚图已上线需求主流程用例.md` + `.xmind`
- `$FEAT/岚图主流程用例整理.md` + `.xmind`

约定常量（跨任务一致）：
- 优先级→marker：`P0→priority-1`、`P1→priority-2`、`P2→priority-3`、`P3→priority-4`。
- CSV 列名：`用例标题`/`相关需求`/`前置条件`/`步骤`/`预期`/`优先级`/`所属模块`。
- 菜单改名表：`概览→总览`、`规则任务配置→规则任务管理`、`任务实例查询→校验结果查询`、`质量报告→数据质量报告`（保护 `质量报告管理`、不重改 `数据质量报告`）。

---

## Phase 1 — rules.py 纯函数（TDD）

### Task 1: 序号列表配对（根治列错位）

**Files:**
- Create: `$FEAT/tmp/rules.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

在 `$FEAT/tmp/test_pipeline.py` 写入：

```python
"""LTQC pipeline unit tests (stdlib unittest)."""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

THIS = Path(__file__).resolve().parent


def _load(name: str):
    spec = importlib.util.spec_from_file_location(name, THIS / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


rules = _load("rules")


class TestPairing(unittest.TestCase):
    def test_pairs_by_index_with_angle_brackets(self):
        step = '1. 点击页码\n2. 点击"<"\n3. 点击">"\n4. 切换每页展示数量'
        exp = "1. 跳转\n2. 向前翻页\n3. 向后翻页\n4. 每页展示记录数为切换后的数量"
        pairs = rules.pair_steps(step, exp)
        self.assertEqual(len(pairs), 4)
        self.assertEqual(pairs[1], (2, '点击"<"', "向前翻页"))
        self.assertEqual(pairs[2], (3, '点击">"', "向后翻页"))

    def test_multiline_item_kept(self):
        step = "1. 进入页面\n继续说明\n2. 保存"
        exp = "1. 成功\n2. 成功"
        pairs = rules.pair_steps(step, exp)
        self.assertEqual(pairs[0], (1, "进入页面\n继续说明", "成功"))

    def test_unnumbered_single_cell_falls_back_to_one(self):
        pairs = rules.pair_steps("只有一步", "只有一个预期")
        self.assertEqual(pairs, [(1, "只有一步", "只有一个预期")])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestPairing -v`
Expected: FAIL（`ModuleNotFoundError` 或 `AttributeError: module 'rules' has no attribute 'pair_steps'`）

- [ ] **Step 3: 写最小实现**

创建 `$FEAT/tmp/rules.py`：

```python
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestPairing -v`
Expected: PASS（3 tests）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/rules.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add numbered-list step/expected pairing for lt-dq pipeline"
```

---

### Task 2: 单元格转 markdown（转义 + 换行）

**Files:**
- Modify: `$FEAT/tmp/rules.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

在 `test_pipeline.py` 追加：

```python
class TestCellToMd(unittest.TestCase):
    def test_newline_to_br_and_pipe_escape(self):
        self.assertEqual(rules.cell_to_md("a\nb|c"), "a<br>b\\|c")

    def test_angle_brackets_preserved(self):
        self.assertEqual(rules.cell_to_md('点击"<"'), '点击"<"')

    def test_empty(self):
        self.assertEqual(rules.cell_to_md(""), "")
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestCellToMd -v`
Expected: FAIL（`AttributeError: ... 'cell_to_md'`）

- [ ] **Step 3: 写最小实现**

在 `rules.py` 追加：

```python
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestCellToMd -v`
Expected: PASS（3 tests）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/rules.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add cell_to_md md-table escaping"
```

---

### Task 3: 菜单改名（带上下文保护）

**Files:**
- Modify: `$FEAT/tmp/rules.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加：

```python
class TestMenuRename(unittest.TestCase):
    def test_simple_renames(self):
        self.assertEqual(rules.apply_menu_rename("进入概览页"), "进入总览页")
        self.assertEqual(rules.apply_menu_rename("规则任务配置"), "规则任务管理")
        self.assertEqual(rules.apply_menu_rename("任务实例查询"), "校验结果查询")

    def test_report_rename_with_guards(self):
        self.assertEqual(rules.apply_menu_rename("查看质量报告"), "查看数据质量报告")
        # 不改具体页面名「质量报告管理」
        self.assertEqual(rules.apply_menu_rename("质量报告管理"), "质量报告管理")
        # 不重复加前缀
        self.assertEqual(rules.apply_menu_rename("数据质量报告"), "数据质量报告")
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestMenuRename -v`
Expected: FAIL（`AttributeError: ... 'apply_menu_rename'`）

- [ ] **Step 3: 写最小实现**

在 `rules.py` 追加：

```python
def apply_menu_rename(text: str) -> str:
    if not text:
        return text
    # 质量报告 → 数据质量报告：不在「数据质量报告」之中、不在「质量报告管理」之中时才改
    text = re.sub(r"(?<!数据)质量报告(?!管理)", "数据质量报告", text)
    text = text.replace("规则任务配置", "规则任务管理")
    text = text.replace("任务实例查询", "校验结果查询")
    text = text.replace("概览", "总览")
    return text
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestMenuRename -v`
Expected: PASS（2 tests）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/rules.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add context-guarded menu rename"
```

---

### Task 4: 空预期补全

**Files:**
- Modify: `$FEAT/tmp/rules.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加：

```python
class TestFillExpected(unittest.TestCase):
    def test_fill_default_for_step_without_expected(self):
        pairs = [(1, "查看文件类型支持提示", ""), (2, "点击确定", "弹窗关闭")]
        out = rules.fill_empty_expected(pairs)
        self.assertEqual(out[0], (1, "查看文件类型支持提示", "操作成功"))
        self.assertEqual(out[1], (2, "点击确定", "弹窗关闭"))

    def test_no_fill_when_step_empty(self):
        pairs = [(1, "", "")]
        self.assertEqual(rules.fill_empty_expected(pairs), [(1, "", "")])
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestFillExpected -v`
Expected: FAIL（`AttributeError: ... 'fill_empty_expected'`）

- [ ] **Step 3: 写最小实现**

在 `rules.py` 追加：

```python
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestFillExpected -v`
Expected: PASS（2 tests）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/rules.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add empty-expected backfill"
```

---

### Task 5: 规则任务管理强前置

**Files:**
- Modify: `$FEAT/tmp/rules.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加：

```python
class TestRulesetPrereq(unittest.TestCase):
    def test_detect_trigger(self):
        steps = ["进入规则任务管理，点击新建监控规则", "配置监控规则", "保存"]
        self.assertTrue(rules.needs_ruleset_prereq(steps))

    def test_no_trigger_when_import_present(self):
        steps = ["新建监控规则", "点击导入规则包，选择规则包", "保存"]
        self.assertFalse(rules.needs_ruleset_prereq(steps))

    def test_no_trigger_for_ruleset_feature_case(self):
        # 标题本身测规则集功能 → 不改写
        self.assertFalse(
            rules.needs_ruleset_prereq(["新建监控规则"], title="验证规则集详情数据正确")
        )

    def test_append_precondition(self):
        pre = "无"
        new_pre = rules.append_ruleset_precondition(pre)
        self.assertIn("规则集管理", new_pre)
        self.assertIn("导入规则包", new_pre)
        # 幂等：再调一次不重复追加
        self.assertEqual(rules.append_ruleset_precondition(new_pre), new_pre)
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestRulesetPrereq -v`
Expected: FAIL（`AttributeError`）

- [ ] **Step 3: 写最小实现**

在 `rules.py` 追加：

```python
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestRulesetPrereq -v`
Expected: PASS（4 tests）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/rules.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add ruleset-prerequisite detection and precondition"
```

---

### Task 6: 需求名去 id + 标题去前缀 + 归一标题

**Files:**
- Modify: `$FEAT/tmp/rules.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加：

```python
class TestTitleHelpers(unittest.TestCase):
    def test_strip_requirement_id_only_removes_zentao_id(self):
        self.assertEqual(
            rules.strip_requirement_id("内置规则丰富-准确性校验规则(#14682)"),
            "内置规则丰富-准确性校验规则",
        )
        # 不误删数据源括号（#4 防回归）
        self.assertEqual(
            rules.strip_requirement_id("分区设置(sparkThrift/hive数据源)(#9695)"),
            "分区设置(sparkThrift/hive数据源)",
        )

    def test_strip_title_prefix(self):
        prefixes = {"数据质量", "质量报告", "校验结果查询"}
        self.assertEqual(
            rules.strip_title_prefix("数据质量 质量报告 验证查询功能正常", prefixes),
            "验证查询功能正常",
        )
        self.assertEqual(
            rules.strip_title_prefix("验证查询功能正常", prefixes),
            "验证查询功能正常",
        )

    def test_normalize_title(self):
        a = rules.normalize_title("【P1】验证「数据质量报告」查询 ")
        b = rules.normalize_title("验证(数据质量报告)查询")
        self.assertEqual(a, b)
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestTitleHelpers -v`
Expected: FAIL（`AttributeError`）

- [ ] **Step 3: 写最小实现**

在 `rules.py` 追加：

```python
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestTitleHelpers -v`
Expected: PASS（3 tests）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/rules.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add requirement-id strip, title prefix strip, normalize"
```

---

### Task 7: 缺陷扫描器

**Files:**
- Modify: `$FEAT/tmp/rules.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加：

```python
class TestScanners(unittest.TestCase):
    def test_scan_empty_step(self):
        pairs = [(1, "", "某预期"), (2, "点击", "成功")]
        self.assertEqual(rules.scan_empty_steps(pairs), [1])

    def test_scan_residual_old_menu(self):
        hits = rules.scan_residual_old_menu("进入任务实例查询页面")
        self.assertIn("任务实例查询", hits)
        self.assertEqual(rules.scan_residual_old_menu("进入校验结果查询"), [])

    def test_scan_datasource_loss(self):
        # 标题声明 sparkThrift+hive，正文只剩 hive → 报缺失
        miss = rules.scan_datasource_loss(
            "分区设置(sparkThrift/hive数据源)", "仅 hive 数据源相关步骤"
        )
        self.assertEqual(miss, ["sparkThrift"])
        self.assertEqual(
            rules.scan_datasource_loss("普通标题", "无数据源声明"), []
        )

    def test_scan_packed_config_line(self):
        line = "「字段」a「统计函数」b「过滤条件」c"
        self.assertTrue(rules.is_packed_config_line(line))
        self.assertFalse(rules.is_packed_config_line("「字段」a"))
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestScanners -v`
Expected: FAIL（`AttributeError`）

- [ ] **Step 3: 写最小实现**

在 `rules.py` 追加：

```python
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestScanners -v`
Expected: PASS（4 tests）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/rules.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add defect scanners (empty step, old menu, datasource, packed line)"
```

---

## Phase 2 — pipeline.py 模型 / 抽取 / 去重

### Task 8: Case 模型 + CSV 行转 Case

**Files:**
- Create: `$FEAT/tmp/pipeline.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

在 `test_pipeline.py` 顶部 `rules = _load("rules")` 之后追加 `pipeline = _load("pipeline")`，然后追加：

```python
pipeline = _load("pipeline")


class TestRowToCase(unittest.TestCase):
    def test_basic_row(self):
        row = {
            "用例标题": "数据质量 质量报告 验证「质量报告」查询功能正常",
            "相关需求": "元数据、数据质量支持doris3.x(#9346)",
            "前置条件": "无",
            "步骤": '1. 进入概览\n2. 点击"<"',
            "预期": "1. 成功\n2. 向前翻页",
            "优先级": "P1",
            "所属模块": "数据质量/质量报告",
        }
        c = pipeline.row_to_case(row, version="v6.4.3")
        self.assertEqual(c.version, "v6.4.3")
        self.assertEqual(c.requirement_id, "9346")
        self.assertEqual(c.requirement_name, "元数据、数据质量支持doris3.x")
        self.assertEqual(c.priority, "P1")
        # 标题去前缀 + 改名
        self.assertEqual(c.title, "验证「数据质量报告」查询功能正常")
        # 步骤改名 + 配对正确
        self.assertEqual(c.steps[0].step, "进入总览")
        self.assertEqual(c.steps[1].step, '点击"<"')
        self.assertEqual(c.steps[1].expected, "向前翻页")

    def test_priority_default_p2(self):
        row = {"用例标题": "x", "相关需求": "需求(#1)", "前置条件": "",
               "步骤": "1. a", "预期": "1. b", "优先级": "", "所属模块": ""}
        self.assertEqual(pipeline.row_to_case(row, "v1").priority, "P2")
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestRowToCase -v`
Expected: FAIL（`ModuleNotFoundError`/`AttributeError`）

- [ ] **Step 3: 写最小实现**

创建 `$FEAT/tmp/pipeline.py`：

```python
"""LTQC case pipeline: CSV -> normalized model -> A.md/B.md + xmind."""
from __future__ import annotations

import importlib.util
import re
from dataclasses import dataclass, field
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("rules", _HERE / "rules.py")
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestRowToCase -v`
Expected: PASS（2 tests）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/pipeline.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add Case model and CSV row parsing"
```

---

### Task 9: 目录抽取 + 跨版本去重

**Files:**
- Modify: `$FEAT/tmp/pipeline.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加：

```python
class TestDedup(unittest.TestCase):
    def _case(self, title, steps, version="v1"):
        return pipeline.Case(
            version=version, requirement_id="1", requirement_name="r",
            module="数据质量", submodule="数据质量报告", title=title,
            priority="P1", preconditions="无",
            steps=[pipeline.Step(i + 1, s, "ok") for i, s in enumerate(steps)],
        )

    def test_dedup_keeps_richest(self):
        a = self._case("验证查询", ["进入"], version="v6.4.3")
        b = self._case("验证查询", ["进入", "更多步骤"], version="v6.4.9")
        out = pipeline.dedup([a, b])
        self.assertEqual(len(out), 1)
        self.assertEqual(len(out[0].steps), 2)

    def test_distinct_kept(self):
        a = self._case("验证查询", ["进入"])
        b = self._case("验证下载", ["进入"])
        self.assertEqual(len(pipeline.dedup([a, b])), 2)
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestDedup -v`
Expected: FAIL（`AttributeError: ... 'dedup'`）

- [ ] **Step 3: 写最小实现**

在 `pipeline.py` 追加：

```python
import csv as _csv

CSV_GLOB = "v*.csv"


def _content_len(c: Case) -> int:
    return len(c.preconditions) + sum(len(s.step) + len(s.expected) for s in c.steps)


def dedup(cases: list[Case]) -> list[Case]:
    """Drop cross-version duplicates by (normalized title, step fingerprint),
    keeping the richest variant. Cases with differing steps are kept."""
    best: dict[tuple[str, str], Case] = {}
    order: list[tuple[str, str]] = []
    for c in cases:
        fp_steps = "|".join(rules.normalize_title(s.step) for s in c.steps)
        key = (rules.normalize_title(c.title), fp_steps)
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
```

注：`extract_dir` 的版本号推导仅用于兜底；权威版本归属在 Task 11 由 `selection` 指定，无需依赖文件名推导精度。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestDedup -v`
Expected: PASS（2 tests）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/pipeline.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add csv dir extraction and cross-version dedup"
```

---

## Phase 3 — 渲染 md / xmind

### Task 10: 渲染单条用例 md 块

**Files:**
- Modify: `$FEAT/tmp/pipeline.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加：

```python
class TestRenderCase(unittest.TestCase):
    def test_render_block(self):
        c = pipeline.Case(
            version="v1", requirement_id="1", requirement_name="r",
            module="数据质量", submodule="数据质量报告",
            title="验证查询功能正常", priority="P1", preconditions="无",
            steps=[pipeline.Step(1, "进入页面", "进入成功"),
                   pipeline.Step(2, ' 点击"<" ', "向前翻页")],
        )
        md = pipeline.render_case_md(c)
        self.assertIn("##### 【P1】验证查询功能正常", md)
        self.assertIn("> 前置条件", md)
        self.assertIn("> 用例步骤", md)
        self.assertIn("| 编号 | 步骤 | 预期 |", md)
        self.assertIn('| 2 | 点击"<" | 向前翻页 |', md)
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestRenderCase -v`
Expected: FAIL（`AttributeError: ... 'render_case_md'`）

- [ ] **Step 3: 写最小实现**

在 `pipeline.py` 追加：

```python
def render_case_md(c: Case) -> str:
    lines = [f"##### 【{c.priority}】{c.title}", "", "> 前置条件", "", "```"]
    lines.append((c.preconditions or "无").strip() or "无")
    lines += ["```", "", "> 用例步骤", "", "| 编号 | 步骤 | 预期 |", "| --- | --- | --- |"]
    for s in c.steps:
        lines.append(
            f"| {s.idx} | {rules.cell_to_md(s.step.strip())} | {rules.cell_to_md(s.expected.strip())} |"
        )
    return "\n".join(lines)
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestRenderCase -v`
Expected: PASS（1 test）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/pipeline.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add single-case md rendering"
```

---

### Task 11: 渲染 B.md（版本→需求→用例）

**Files:**
- Modify: `$FEAT/tmp/pipeline.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加：

```python
class TestRenderB(unittest.TestCase):
    def test_grouping_and_no_id(self):
        cases = [
            pipeline.Case("v6.4.3", "9346", "支持doris3.x", "数据质量", "报告",
                          "验证A", "P1", "无", [pipeline.Step(1, "a", "b")]),
            pipeline.Case("v6.4.3", "9346", "支持doris3.x", "数据质量", "报告",
                          "验证B", "P2", "无", [pipeline.Step(1, "a", "b")]),
            pipeline.Case("v6.4.4", "9341", "报告管理", "数据质量", "报告",
                          "验证C", "P1", "无", [pipeline.Step(1, "a", "b")]),
        ]
        md = pipeline.render_b_md(cases, suite_name="岚图已上线需求主流程用例")
        self.assertIn("case_count: 3", md)
        self.assertIn("## v6.4.3", md)
        self.assertIn("### 支持doris3.x", md)        # 无 (#9346)
        self.assertNotIn("(#9346)", md)
        self.assertIn("## v6.4.4", md)
        self.assertLess(md.index("## v6.4.3"), md.index("## v6.4.4"))
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestRenderB -v`
Expected: FAIL（`AttributeError: ... 'render_b_md'`）

- [ ] **Step 3: 写最小实现**

在 `pipeline.py` 追加：

```python
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestRenderB -v`
Expected: PASS（1 test）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/pipeline.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add B.md rendering (version/requirement/case, no #id)"
```

---

### Task 12: 渲染 A.md（模块→子模块→用例）+ 合并保留的 6 模块

**Files:**
- Modify: `$FEAT/tmp/pipeline.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加：

```python
class TestRenderA(unittest.TestCase):
    def test_dq_module_with_submodules(self):
        cases = [
            pipeline.Case("v1", "1", "r", "数据质量", "规则任务管理",
                          "验证任务创建", "P1", "无", [pipeline.Step(1, "a", "b")]),
            pipeline.Case("v1", "1", "r", "数据质量", "规则集管理",
                          "验证规则集", "P1", "无", [pipeline.Step(1, "a", "b")]),
        ]
        kept = "## 资产盘点\n\n##### 【P3】验证旧用例\n\n> 前置条件\n\n```\n无\n```\n"
        md = pipeline.render_a_md(cases, kept_modules_md=[kept])
        self.assertIn("## 资产盘点", md)          # 保留模块原样并入
        self.assertIn("## 数据质量", md)
        self.assertIn("### 规则任务管理", md)
        self.assertIn("### 规则集管理", md)
        self.assertIn("##### 【P1】验证任务创建", md)
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestRenderA -v`
Expected: FAIL（`AttributeError: ... 'render_a_md'`）

- [ ] **Step 3: 写最小实现**

在 `pipeline.py` 追加：

```python
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
```

注：`kept_modules_md` 由 CLI（Task 15）从现有 `岚图主流程用例整理.md` 切出「除数据质量外的 6 个 `## 模块` 段」（并先经 Task 13 的格式归一）。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestRenderA -v`
Expected: PASS（1 test）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/pipeline.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add A.md rendering with DQ submodules and kept modules"
```

---

### Task 13: 现有模块格式归一（解析回模型再渲染）

**Files:**
- Modify: `$FEAT/tmp/pipeline.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加：

```python
class TestParseExistingMd(unittest.TestCase):
    def test_parse_module_cases(self):
        md = (
            "## 元数据\n\n"
            "##### 【P2】验证 X\n\n> 前置条件\n\n```\n无\n```\n\n"
            "> 用例步骤\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n"
            "| 1 | 进入概览 | 成功 |\n"
        )
        mod_name, cases = pipeline.parse_existing_module(md)
        self.assertEqual(mod_name, "元数据")
        self.assertEqual(len(cases), 1)
        self.assertEqual(cases[0].priority, "P2")
        # 归一时也应用菜单改名
        self.assertEqual(cases[0].steps[0].step, "进入总览")
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestParseExistingMd -v`
Expected: FAIL（`AttributeError: ... 'parse_existing_module'`）

- [ ] **Step 3: 写最小实现**

在 `pipeline.py` 追加：

```python
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestParseExistingMd -v`
Expected: PASS（1 test）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/pipeline.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ parse existing A modules back into model for normalization"
```

---

### Task 14: XMind 生成（content.json + zip，正确 marker）

**Files:**
- Modify: `$FEAT/tmp/pipeline.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加：

```python
import json
import zipfile


class TestXmind(unittest.TestCase):
    def test_marker_map(self):
        self.assertEqual(pipeline.MARKER_MAP["P0"], "priority-1")
        self.assertEqual(pipeline.MARKER_MAP["P1"], "priority-2")
        self.assertEqual(pipeline.MARKER_MAP["P2"], "priority-3")
        self.assertEqual(pipeline.MARKER_MAP["P3"], "priority-4")

    def test_case_node_structure(self):
        c = pipeline.Case("v1", "1", "r", "数据质量", "报告", "验证X", "P1",
                          "无", [pipeline.Step(1, "进入", "成功")])
        node = pipeline.case_to_node(c)
        self.assertEqual(node["title"], "验证X")
        self.assertEqual(node["markers"], [{"markerId": "priority-2"}])
        step = node["children"]["attached"][0]
        self.assertEqual(step["title"], "进入")
        self.assertEqual(step["children"]["attached"][0]["title"], "成功")

    def test_write_and_reopen(self):
        out = THIS / "_xmind_test.xmind"
        try:
            pipeline.write_xmind(out, root_title="T",
                                 l1_nodes=[{"id": "x", "title": "L1"}])
            with zipfile.ZipFile(out) as z:
                names = set(z.namelist())
                self.assertIn("content.json", names)
                self.assertIn("metadata.json", names)
                self.assertIn("manifest.json", names)
                content = json.loads(z.read("content.json"))
                self.assertEqual(content[0]["rootTopic"]["title"], "T")
        finally:
            out.unlink(missing_ok=True)
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestXmind -v`
Expected: FAIL（`AttributeError`）

- [ ] **Step 3: 写最小实现**

在 `pipeline.py` 追加：

```python
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestXmind -v`
Expected: PASS（3 tests）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/pipeline.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add xmind generation with correct priority markers"
```

---

### Task 15: 组装 xmind 树（A 模块/子模块、B 版本/需求）

**Files:**
- Modify: `$FEAT/tmp/pipeline.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加：

```python
class TestXmindTree(unittest.TestCase):
    def test_b_tree_version_requirement(self):
        cases = [pipeline.Case("v6.4.3", "1", "需求甲", "数据质量", "报告",
                               "验证X", "P1", "无", [pipeline.Step(1, "a", "b")])]
        nodes = pipeline.build_b_l1_nodes(cases)
        self.assertEqual(nodes[0]["title"], "v6.4.3")
        req = nodes[0]["children"]["attached"][0]
        self.assertEqual(req["title"], "需求甲")           # 无 #id
        self.assertEqual(req["children"]["attached"][0]["title"], "验证X")

    def test_a_tree_module_submodule(self):
        cases = [pipeline.Case("v1", "1", "r", "数据质量", "规则任务管理",
                               "验证Y", "P1", "无", [pipeline.Step(1, "a", "b")])]
        node = pipeline.build_a_dq_node(cases)
        self.assertEqual(node["title"], "数据质量")
        sub = node["children"]["attached"][0]
        self.assertEqual(sub["title"], "规则任务管理")
        self.assertEqual(sub["children"]["attached"][0]["title"], "验证Y")
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestXmindTree -v`
Expected: FAIL（`AttributeError`）

- [ ] **Step 3: 写最小实现**

在 `pipeline.py` 追加：

```python
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestXmindTree -v`
Expected: PASS（2 tests）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/pipeline.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add xmind tree builders for A and B"
```

---

## Phase 4 — selection、CLI、校验、收尾

### Task 16: selection 加载 + 应用

**Files:**
- Modify: `$FEAT/tmp/pipeline.py`
- Create: `$FEAT/tmp/selection/b-select.yaml`（占位，Task 18 填实）
- Create: `$FEAT/tmp/selection/a-dq-pick.yaml`（占位，Task 18 填实）
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加：

```python
class TestSelection(unittest.TestCase):
    def test_select_by_title(self):
        cases = [
            pipeline.Case("v1", "1", "需求甲", "数据质量", "报告", "验证X", "P1", "无", []),
            pipeline.Case("v1", "1", "需求甲", "数据质量", "报告", "验证Y", "P1", "无", []),
        ]
        sel = {"需求甲": ["验证X"]}
        out = pipeline.apply_selection(cases, sel)
        self.assertEqual([c.title for c in out], ["验证X"])

    def test_select_all_marker(self):
        cases = [pipeline.Case("v1", "1", "需求甲", "数据质量", "报告", "验证X", "P1", "无", [])]
        out = pipeline.apply_selection(cases, {"需求甲": "*"})
        self.assertEqual(len(out), 1)
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestSelection -v`
Expected: FAIL（`AttributeError`）

- [ ] **Step 3: 写最小实现**

在 `pipeline.py` 追加：

```python
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
```

并创建占位文件 `$FEAT/tmp/selection/b-select.yaml` 与 `$FEAT/tmp/selection/a-dq-pick.yaml`，各写入：

```yaml
# requirement_name: "*"   或   requirement_name: [case title, ...]
# 由 Task 18 填实
{}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestSelection -v`
Expected: PASS（2 tests）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/pipeline.py $FEAT/tmp/test_pipeline.py $FEAT/tmp/selection/
git commit -m "feat: ✨ add selection loading and application"
```

---

### Task 17: validate.py 校验器

**Files:**
- Create: `$FEAT/tmp/validate.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加：

```python
validate = _load("validate")


class TestValidate(unittest.TestCase):
    def test_case_count_mismatch(self):
        md = '---\ncase_count: 2\n---\n\n## M\n\n##### 【P1】a\n'
        issues = validate.check_case_count(md)
        self.assertTrue(any("case count" in i for i in issues))

    def test_placeholder_and_old_menu(self):
        md = "## M\n\n##### 【P1】TODO 待补充\n步骤进入任务实例查询\n"
        issues = validate.check_placeholders(md) + validate.check_old_menu(md)
        self.assertTrue(any("placeholder" in i for i in issues))
        self.assertTrue(any("任务实例查询" in i for i in issues))

    def test_clean_doc_passes(self):
        md = '---\ncase_count: 1\n---\n\n## M\n\n##### 【P1】验证 X\n'
        self.assertEqual(validate.check_case_count(md), [])
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestValidate -v`
Expected: FAIL（`ModuleNotFoundError`）

- [ ] **Step 3: 写最小实现**

创建 `$FEAT/tmp/validate.py`：

```python
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
        if node.get("markers"):  # case node carries a priority marker
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestValidate -v`
Expected: PASS（3 tests）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/validate.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add archive validator (count, placeholder, menu, md/xmind parity)"
```

---

### Task 18: CLI 端到端编排

**Files:**
- Modify: `$FEAT/tmp/pipeline.py`
- Test: `$FEAT/tmp/test_pipeline.py`

- [ ] **Step 1: 写失败测试**

追加（用临时 CSV 跑通 extract→render→xmind）：

```python
class TestCliEndToEnd(unittest.TestCase):
    def test_build_b_from_csv(self):
        import csv as csvmod
        tmpdir = THIS / "_csv_test"
        tmpdir.mkdir(exist_ok=True)
        csv_path = tmpdir / "v643.csv"
        with csv_path.open("w", newline="", encoding="utf-8") as f:
            w = csvmod.writer(f)
            w.writerow(["用例标题", "相关需求", "前置条件", "步骤", "预期",
                        "优先级", "所属模块"])
            w.writerow(["验证查询", "支持doris3.x(#9346)", "无",
                        '1. 进入\n2. 点击"<"', "1. 成功\n2. 向前翻页",
                        "P1", "数据质量/报告"])
        try:
            cases = pipeline.dedup(pipeline.extract_dir(tmpdir))
            md = pipeline.render_b_md(cases, "测试集")
            self.assertIn("### 支持doris3.x", md)
            self.assertIn('| 2 | 点击"<" | 向前翻页 |', md)
            xpath = tmpdir / "out.xmind"
            pipeline.write_xmind(xpath, "测试集", pipeline.build_b_l1_nodes(cases))
            self.assertTrue(xpath.exists())
        finally:
            import shutil
            shutil.rmtree(tmpdir)
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline.TestCliEndToEnd -v`
Expected: FAIL（若前序函数齐全则可能直接通过；若 `main` 缺失，后续 Step 3 仍需补 CLI）。先确认本测试通过抽取/渲染链路。

- [ ] **Step 3: 写最小实现（CLI 入口）**

在 `pipeline.py` 末尾追加：

```python
def _split_modules(md_body: str) -> "OrderedDict[str, str]":
    """Split an A.md body into {module_name: block} by top-level `## `."""
    blocks: "OrderedDict[str, str]" = OrderedDict()
    cur_name: str | None = None
    cur: list[str] = []
    for line in md_body.split("\n"):
        if line.startswith("## ") and not line.startswith("### "):
            if cur_name is not None:
                blocks[cur_name] = "\n".join(cur)
            cur_name, cur = line[3:].strip(), [line]
        elif cur_name is not None:
            cur.append(line)
    if cur_name is not None:
        blocks[cur_name] = "\n".join(cur)
    return blocks


def build_all(feat: Path) -> dict:
    csv_dir = feat / "assets-csv"
    all_cases = dedup(extract_dir(csv_dir))

    # B: 全量数据质量需求集，按 selection 过滤（默认全收）
    b_sel = load_yaml(feat / "tmp" / "selection" / "b-select.yaml")
    b_cases = apply_selection(all_cases, b_sel) if b_sel else all_cases
    b_md = render_b_md(b_cases, "岚图已上线需求主流程用例")
    (feat / "岚图已上线需求主流程用例.md").write_text(b_md, encoding="utf-8")
    write_xmind(feat / "岚图已上线需求主流程用例.xmind",
                "岚图已上线需求主流程用例", build_b_l1_nodes(b_cases))

    # A: 保留 6 模块（格式归一）+ 数据质量主流程子集
    existing = (feat / "岚图主流程用例整理.md").read_text(encoding="utf-8")
    body = existing.split("\n---\n", 1)[-1]
    kept_md: list[str] = []
    a_l1_nodes: list[dict] = []
    for name, block in _split_modules(body).items():
        if name == "数据质量":
            continue
        mod_name, cases = parse_existing_module(block)
        kept_md.append("\n".join(
            [f"## {mod_name}", ""] + sum(([render_case_md(c), ""] for c in cases), [])
        ).rstrip() + "\n")
        a_l1_nodes.append(build_a_module_node(mod_name, cases))

    a_pick = load_yaml(feat / "tmp" / "selection" / "a-dq-pick.yaml")
    dq_cases = apply_selection(all_cases, a_pick) if a_pick else []
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
```

- [ ] **Step 4: 跑测试确认通过 + 全量回归**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline -v`
Expected: PASS（全部 test classes）

- [ ] **Step 5: 提交**

```bash
git add $FEAT/tmp/pipeline.py $FEAT/tmp/test_pipeline.py
git commit -m "feat: ✨ add end-to-end CLI orchestration (build A/B md+xmind)"
```

---

### Task 19: 填实 selection、跑全量、人工批量复查、修语义类缺陷

**Files:**
- Modify: `$FEAT/tmp/selection/b-select.yaml`、`$FEAT/tmp/selection/a-dq-pick.yaml`
- Modify（生成物）：四个交付文件

- [ ] **Step 1: 生成需求与用例清单辅助挑选**

Run:
```bash
cd $FEAT/tmp && python3 -c "
import importlib.util, pathlib
p=pathlib.Path('pipeline.py'); s=importlib.util.spec_from_file_location('p',p)
m=importlib.util.module_from_spec(s); s.loader.exec_module(m)
import collections
cases=m.dedup(m.extract_dir(pathlib.Path('..')/'assets-csv'))
by=collections.OrderedDict()
for c in cases: by.setdefault(c.requirement_name, []).append(c)
for r,items in by.items():
    print(f'== {r} ({len(items)}) ==')
    for c in items[:50]: print('  -', c.priority, c.title)
" > _req_index.txt
wc -l _req_index.txt`
```
Expected: 生成 `_req_index.txt`，列出全部需求与各自用例标题供挑选。

- [ ] **Step 2: 填实 selection（B 全收 / A 主流程子集）**

- `b-select.yaml`：覆盖 B 文档应含的全部 49 个需求；每个需求值用 `"*"`（全收）或显式标题列表（剔除明显冗余/非岚图项）。
- `a-dq-pick.yaml`：覆盖全部 49 需求的主流程子集（每需求取代表性 P0/P1；规则任务管理/规则集管理/数据质量报告多取），目标约 150–300 条。挑选依据 `_req_index.txt`。

（本步无独立测试；正确性由 Step 3 的全量校验 + Step 4 人工复查保证。）

- [ ] **Step 3: 跑全量管道 + 自动校验**

Run:
```bash
cd $FEAT/tmp && python3 pipeline.py && python3 validate.py
```
Expected: 管道打印 `{'b_cases': N, 'a_dq_cases': M}`（M 在 150–300）；`validate.py` 打印 `issues=0`（若非 0，按报告逐项修，常见为残留旧菜单/占位/计数）。

- [ ] **Step 4: 人工批量复查（语义类缺陷）**

逐子模块通读重建后的 A/B（重点：规则任务管理、数据质量报告、校验结果查询），对照 `assets-csv` 修正脚本扫不出的语义错误。已知必查项：
- #3「报告状态筛选」预期方向：确认为「生成成功 → 生成失败」语义正确。
- #1 翻页用例：确认 6/7/8 步为「点击"<"→向前翻页 / 点击">"→向后翻页 / 切换每页展示数量→每页展示记录数为切换后的数量」。
- #2 导入标准文件类型：确认首步预期已补「操作成功」。
- #4 动态分区：确认标题与正文同时保留 sparkThrift 与 hive 两个数据源。
- 抽查规则任务管理类用例是否已被前置规则升级为「导入规则包」四步流程。

发现语义错误时，优先在 CSV 层无法修正的（如禅道原文即错）直接改生成后的 md，并在 `tmp/_review-notes.md` 记录；可被规则覆盖的，回到 `rules.py` 加规则并补测试，重跑管道。

- [ ] **Step 5: XMind 可读性抽查 + 提交交付物**

Run（抽查 xmind 无 `<br>` 残留、无三项挤行）:
```bash
cd $FEAT/tmp && python3 -c "
import importlib.util, pathlib
p=pathlib.Path('pipeline.py'); s=importlib.util.spec_from_file_location('p',p)
m=importlib.util.module_from_spec(s); s.loader.exec_module(m)
import zipfile,json
for f in ['岚图主流程用例整理.xmind','岚图已上线需求主流程用例.xmind']:
    raw=zipfile.ZipFile(pathlib.Path('..')/f).read('content.json').decode()
    print(f, 'has <br>:', '<br>' in raw)
"
```
Expected: 两文件均 `has <br>: False`。

提交：
```bash
git add $FEAT/岚图主流程用例整理.md $FEAT/岚图主流程用例整理.xmind \
        $FEAT/岚图已上线需求主流程用例.md $FEAT/岚图已上线需求主流程用例.xmind \
        $FEAT/tmp/selection/
git commit -m "chore: 🔧 rebuild lt-dq case archives (A/B md+xmind) from csv"
```

---

### Task 20: 清理 tmp 旧脚本与中间产物

**Files:**
- Delete: 见 File Structure「删除」清单
- Modify: `$FEAT/manifest.json`（更新 case_drafting 状态）

- [ ] **Step 1: 删除可重生的旧中间产物与散脚本**

Run:
```bash
cd $FEAT/tmp && git rm -f all-p1.md 一级用例候选.md 一级用例候选-语义精选.md \
  岚图已上线需求一级用例.json fill-mainflow.py fill-mainflow-v2.py \
  filter-candidates.py merge.py normalize-final-xmind.py normalize-format.py \
  normalize-online-xmind.py render-final.py validate-staging.py \
  test_merge.py test_normalize_final_xmind.py test_normalize_format.py \
  test_validate_staging.py include-paths.txt mainflow-buckets.md 2>/dev/null; \
  rm -f _req_index.txt; ls
```
Expected: 仅剩 `pipeline.py rules.py validate.py test_pipeline.py selection/ menu-rename-map.md ruleset-prerequisite.md style-guide.md _review-notes.md`（参考文档保留）。

- [ ] **Step 2: 跑保留测试确认未受影响**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline -v`
Expected: PASS（全部）

- [ ] **Step 3: 更新 manifest.json**

把 `$FEAT/manifest.json` 的 `case_drafting.status` 保持 `completed`，并将 `files`/`xmind` 注释为重建后的两份产物（如已正确则无需改）；确认 `automation.status` 不变。

- [ ] **Step 4: 提交清理**

```bash
git add -A $FEAT/tmp/ $FEAT/manifest.json
git commit -m "chore: 🔧 consolidate lt-dq pipeline, drop scattered tmp scripts"
```

- [ ] **Step 5: 最终验证**

Run: `cd $FEAT/tmp && python3 -m unittest test_pipeline -v && python3 validate.py`
Expected: 测试全 PASS；`issues=0`。

---

## Self-Review

**Spec coverage：**
- §4 抽取/按序号配对 → Task 1、8、9 ✅
- §4 去重/改名/前缀 → Task 3、6、9 ✅；需求名去 #id → Task 6、11 ✅
- §5 格式规范 → Task 10、13（解析回模型重渲染统一格式）✅
- §6 四类 bug 统一修复 → #1 Task 1；#2 Task 4；#3 Task 19 人工复查；#4 Task 6（去 id 不误删数据源）+ Task 7 扫描 ✅
- §6 扫描器 → Task 7、17 ✅
- §7 规则任务管理前置 → Task 5 ✅
- §8 A 数据质量挑选 + 层级 → Task 12、15、16、19 ✅
- §9 XMind marker/可读性 → Task 14、15、19 ✅
- §10 校验/人工复查/测试 → Task 17、19、贯穿全程 ✅
- §11 目录与清理 → Task 20 ✅

**Placeholder 扫描：** 各步均含实际代码/命令；Task 16 的 yaml 占位为「待 Task 18/19 填实」的显式后续，非计划缺口。

**类型一致性：** `Step(idx,step,expected)`、`Case(version,requirement_id,requirement_name,module,submodule,title,priority,preconditions,steps)` 全程一致；`pair_steps` 返回 `(idx,step,expected)` 元组，`row_to_case` 转 `Step`；`MARKER_MAP`、菜单改名表、`apply_selection` 签名跨任务一致。

**已知开放点：** Task 19 Step 2 的 selection 填实与 Step 4 人工复查为人工判断密集步骤，工作量大，按子模块分批；语义类缺陷（#3）依赖人工对照 CSV。
