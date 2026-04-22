# 岚图主流程用例可读性 / 数据质量刷新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `workspace/dataAssets/features/2099-01-lt-dq-smoke/` 下 4 个交付物（2 md + 2 xmind）按风格指南机械格式化 + 16 个 subagent fanout 编辑改写 + B 数据质量重桶进 A + 测试环境核对 v6.4.3–v6.4.6 数据质量改动 + xmind 重生成。

**Architecture:** 6-phase 流水线，每个 phase 单独 commit 回滚点。确定性步骤用 `tmp/*.py` 脚本（TDD）；编辑性步骤 fanout 16 个 subagent 写到 `tmp/staging/`，再用 merge 脚本拼回主文件；最后 xmind 重生成。

**Tech Stack:** Python 3.11+（pytest）、bun（kata CLI）、zipfile/json（xmind 后处理）、Claude Code Agent tool（subagent fanout）。

**Spec:** `docs/superpowers/specs/2026-05-18-lt-cases-polish-design.md`

**Repo paths used throughout this plan**（全部相对 repo root `/Users/poco/Projects/kata/`）：
- `workspace/dataAssets/features/2099-01-lt-dq-smoke/` → 简称 `FEATURE`
- `FEATURE/岚图主流程用例整理.md` → A.md（159 用例）
- `FEATURE/岚图已上线需求主流程用例.md` → B.md（192 用例）
- `FEATURE/岚图主流程用例整理.xmind` → A.xmind
- `FEATURE/岚图已上线需求主流程用例.xmind` → B.xmind
- `FEATURE/tmp/` → 临时脚本和 staging 输出

---

## File Structure

### 新建文件

| 路径 | 责任 |
|---|---|
| `FEATURE/tmp/style-guide.md` | 风格指南，subagent 强制对照 |
| `FEATURE/tmp/menu-rename-map.md` | v6.4.8 #10221 菜单映射表 |
| `FEATURE/tmp/ruleset-prerequisite.md` | v6.4.8 #10193 规则集前置流程改写指令 |
| `FEATURE/tmp/normalize-format.py` | Phase 1 机械格式化（idempotent） |
| `FEATURE/tmp/test_normalize_format.py` | normalize-format 单测 |
| `FEATURE/tmp/merge.py` | staging → A.md / B.md 拼接 |
| `FEATURE/tmp/test_merge.py` | merge.py 单测 |
| `FEATURE/tmp/fill-mainflow-v2.py` | Phase 4 B 数据质量重桶进 A |
| `FEATURE/tmp/normalize-final-xmind.py` | xmind 节点 `<br>` 换行 + 根节点 flatten |
| `FEATURE/tmp/validate-staging.py` | 校验 staging 文件不变量（用例数 / 占位符） |
| `FEATURE/tmp/staging/*.md` | 16 个 subagent 输出（不进 git） |
| `FEATURE/tmp/staging/*.report.md` | 16 份改动报告（不进 git） |
| `FEATURE/tmp/edit-report.md` | 汇总报告（不进 git） |
| `FEATURE/tmp/probe-report.md` | Phase 5 测试环境核对结果（不进 git） |

### 修改文件

| 路径 | 修改内容 |
|---|---|
| `FEATURE/岚图主流程用例整理.md` | 全文重写（10 模块编辑 + 数据质量重桶） |
| `FEATURE/岚图已上线需求主流程用例.md` | 全文重写（6 版本编辑） |
| `FEATURE/岚图主流程用例整理.xmind` | 重生成 |
| `FEATURE/岚图已上线需求主流程用例.xmind` | 重生成 |
| `FEATURE/manifest.json` | 更新 `case_count` / `xmind_path` / `updated_at` |

---

## Task 1: Phase 0 — 写三份指南文件

**Files:**
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/style-guide.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/menu-rename-map.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/ruleset-prerequisite.md`

- [ ] **Step 1: 写 `tmp/style-guide.md`**

完整内容：

````markdown
# LTQC 用例编辑风格指南

所有编辑 subagent 必读。不符合本指南的输出会被驳回。

## 1. 用例骨架

层级保持现状（B 用 `## v6.4.X / ### 需求 / ##### 【Px】用例`；A 用 `## 模块 / ### 子模块 / #### 叶子 / ##### 【Px】用例`），仅锁住单用例内部模板：

```
##### 【P1】用例标题

> 前置条件

​```
说明文字...
SQL 语句 (DDL/DML)...
账号角色: 管理员
依赖资源: 已存在数据源 doris_test_ds
​```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | … | … |
```

## 2. 前置条件

**单个 ``` 块（无语言标签）**，SQL、账号、依赖、配置全塞同一个块。

必含项（不适用就写"无"）：
- 测试账号 / 角色（管理员 / 普通用户 / 自定义角色名）
- 数据资源：数据源（含类型、连接别名）/ 数据库 / 数据表 — DDL/DML 必须给全
- 上游依赖：具名规则集 / 规则任务 / 实例
- 系统配置：菜单权限 / 全局水印 / 调度参数等开关

示例：

```
说明: 验证 Doris 3.x 字段值校验占比规则
数据源: doris_test_ds (Doris 3.x)
数据库: dq_test
表 DDL/DML:
CREATE TABLE IF NOT EXISTS dq_test.tableA (
  id BIGINT NOT NULL COMMENT '学生 ID',
  course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
  score DECIMAL(4,1) COMMENT '成绩',
  exam_date DATE NOT NULL COMMENT '考试日期'
) ENGINE=OLAP DUPLICATE KEY(id, exam_date)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES ("replication_num"="1");

INSERT INTO dq_test.tableA VALUES
  (1, '数学', 85.5, '2024-03-15'),
  (2, '英语', 92.0, '2024-03-15');

账号: 管理员
依赖: 已在【数据源管理】配置 doris_test_ds, 连接正常
```

## 3. 步骤列

- 一行 = 一个原子动作（可独立断言后再下一步）。
- **菜单路径统一**：`【数据资产】→【数据质量】→【规则集管理】`（中文方括号 + 全角箭头 →）。
- **控件类型 + 文本**：`点击【新建规则集】按钮` / `在"规则集描述"输入框输入 "${desc}"`。
- 占位符约定：`${tableName}` / `${user}` 等花括号变量。

## 4. 预期列

- **每个观察项一行**，多项用 `<br>1) … <br>2) … <br>3) …`，**禁止**把 `1)2)3)` 挤一格。
- 文案断言放双引号：`提示信息显示"任务已提交执行"`。
- UI 元素列举用列表式：`<br>· "表名"列<br>· "所属数据源"列…`。

## 5. BEFORE / AFTER

**BEFORE**:
```
| 3 | 基础信息UICHECK | 支持配置选择数据表、规则包:1) 选择数据表: 选择数据源(必填)、选择数据库(必填)、选择数据表(必填)、规则集描述2) 规则包: 支持对规则包名称进行增删改, 必填3) 按钮: 取消/下一步 |
```

**AFTER**:
```
| 3 | 检查【新建规则集 ❯ 基础信息】页面 UI 元素 | 页面包含两个区块：<br>1) "选择数据表"：数据源（必填）/ 数据库（必填）/ 数据表（必填）/ 规则集描述（选填）<br>2) "规则包"：规则包名称列表，支持增删改重命名，名称必填<br>3) 页面底部按钮：【取消】、【下一步】 |
```

## 6. 不变量（subagent 输出必须满足）

- 用例标题（`##### 【Px】XXX`）保持 1:1，不能删/合并/拆分用例
- 用例数与原段一致
- `##### ` 之外的 `## / ### / #### ` 层级不动
- 表格列必须保持 `| 编号 | 步骤 | 预期 |` 三列
- 不引入 "TODO / 待补充 / 待确认 / FIXME" 类占位
````

- [ ] **Step 2: 写 `tmp/menu-rename-map.md`**

完整内容：

````markdown
# 菜单名映射（v6.4.8 #10221）

适用对象：仅 v6.4.3–v6.4.6 数据质量用例的 subagent。

凡步骤 / 预期 / 前置条件中出现下表"旧名"的，按"新名"全部替换。

| 旧名 | 新名 |
|---|---|
| 概览 | 总览 |
| 规则任务配置 | 规则任务管理 |
| 任务实例查询 | 校验结果查询 |
| 质量报告 | 数据质量报告 |

注意：
- 替换是 token 级，不要替换包含旧名的更长串（例如"质量报告管理" 是一个具体页面名，不要错改成"数据质量报告管理"，要看上下文）
- 新增菜单"规则集管理"原本没有旧名映射，subagent 不需要主动注入；只在 ruleset-prerequisite.md 规则触发时引用
````

- [ ] **Step 3: 写 `tmp/ruleset-prerequisite.md`**

完整内容：

````markdown
# 规则集前置流程改写（v6.4.8 #10193）

适用对象：仅 v6.4.3–v6.4.6 数据质量用例的 subagent。

## 触发条件

凡用例**步骤里**出现以下行为，且**没有**"导入规则包"环节的：
- "新建监控规则"
- "创建规则任务"
- "配置监控规则"（不在规则集上下文中）

→ 必须做下述两件事。

## 改写动作 1：前置条件追加

在原前置条件 ``` 块末尾追加：

```
规则集前置（v6.4.8 #10193 强依赖）：
已在【数据资产】→【数据质量】→【规则集管理】创建规则集 ${rs_name}（数据表 ${tableName}），
规则集下含规则包 ${pkg_name}，包内已配置若干校验规则（具体规则按本用例步骤要校验的类型）。
```

`${rs_name}` 与 `${pkg_name}` 由 subagent 按用例语义自取（如 rs_doris_exam / pkg_completeness）。

## 改写动作 2：步骤升级

原 "进入【数据质量】→【规则任务管理】→ 新建监控规则 → 配置监控对象 → 配置监控规则 → 调度属性 → 保存" 这种合并描述，
拆成三步显式：

```
| N   | 进入【数据资产】→【数据质量】→【规则任务管理】页面，点击【新建监控规则】 | 进入【新建监控规则 ❯ Step 1 基础信息】页面 |
| N+1 | Step 1 基础信息：规则名称 = ${rule_name}、数据源 = ${ds}、数据库 = ${db}、数据表 = ${tableName}，点击【下一步】 | 进入【Step 2 监控规则】页面 |
| N+2 | Step 2 监控规则：点击【导入规则包】按钮，在弹窗中选择规则包 ${pkg_name}，点击【确定】，点击【下一步】 | <br>1) 规则包内规则全部引入<br>2) 进入【Step 3 调度属性】页面 |
| N+3 | Step 3 调度属性：保持默认或按用例需要调整，点击【保存】 | 任务保存成功，回到规则任务管理列表 |
```

后续步骤（运行任务 / 查实例 / 看报告等）保持原意，只是菜单名按 menu-rename-map 替换。

## 例外

如果原用例本身就是测试规则集功能（如 "验证规则集详情数据正确"），步骤不需要改写，保持原样并按菜单映射调整即可。
````

- [ ] **Step 4: 提交**

```bash
cd /Users/poco/Projects/kata
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/style-guide.md
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/menu-rename-map.md
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/ruleset-prerequisite.md
git commit -m "docs: add ltqc cases style guide and rewrite directives"
```

- [ ] **Step 5: Checkpoint 0**

输出："Checkpoint 0 完成：style-guide / menu-rename-map / ruleset-prerequisite 三份已写入并 commit。"
等待用户确认后再进入 Phase 1。

---

## Task 2: Phase 1 — normalize-format.py（TDD）

**Files:**
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/normalize-format.py`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/test_normalize_format.py`
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md`
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md`

- [ ] **Step 1: 写失败测试 `tmp/test_normalize_format.py`**

```python
"""Tests for tmp/normalize-format.py."""
from __future__ import annotations

import importlib.util
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("nf", THIS_DIR / "normalize-format.py")
nf = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(nf)


def test_inline_numbered_list_in_cell():
    cell = "支持配置:1) A 必填2) B 可选3) 按钮: 取消/下一步"
    expected = "支持配置:<br>1) A 必填<br>2) B 可选<br>3) 按钮: 取消/下一步"
    assert nf.normalize_cell(cell) == expected


def test_inline_numbered_list_with_chinese_paren():
    cell = "返回值:1) success2) fail"
    expected = "返回值:<br>1) success<br>2) fail"
    assert nf.normalize_cell(cell) == expected


def test_preserves_existing_br():
    cell = "已经分行:<br>1) A<br>2) B"
    assert nf.normalize_cell(cell) == cell


def test_literal_newline_to_br():
    cell = "line1\nline2\nline3"
    expected = "line1<br>line2<br>line3"
    assert nf.normalize_cell(cell) == expected


def test_crlf_to_br():
    cell = "line1\r\nline2"
    expected = "line1<br>line2"
    assert nf.normalize_cell(cell) == expected


def test_does_not_split_inside_word():
    # "Step1" should not become "Step<br>1)" (the trailing ) is missing)
    cell = "Step1 something"
    assert nf.normalize_cell(cell) == "Step1 something"


def test_idempotent_on_normalized_cell():
    cell = "A<br>1) X<br>2) Y"
    assert nf.normalize_cell(nf.normalize_cell(cell)) == cell


def test_sql_fence_stripped_in_precondition(tmp_path):
    src = tmp_path / "x.md"
    src.write_text(
        "##### 【P1】案例\n"
        "\n"
        "> 前置条件\n"
        "\n"
        "```sql\n"
        "SELECT 1;\n"
        "```\n"
        "\n"
        "> 用例步骤\n",
        encoding="utf-8",
    )
    nf.normalize_file(src)
    out = src.read_text(encoding="utf-8")
    assert "```sql" not in out
    assert "```\nSELECT 1;\n```" in out


def test_bullet_precondition_wrapped(tmp_path):
    src = tmp_path / "x.md"
    src.write_text(
        "##### 【P1】案例\n"
        "\n"
        "> 前置条件\n"
        "\n"
        "- 已登录系统\n"
        "- 已配置数据源\n"
        "\n"
        "> 用例步骤\n",
        encoding="utf-8",
    )
    nf.normalize_file(src)
    out = src.read_text(encoding="utf-8")
    assert "- 已登录系统" not in out
    assert "```\n已登录系统\n已配置数据源\n```" in out


def test_full_width_space_normalized(tmp_path):
    src = tmp_path / "x.md"
    src.write_text("hello　world\n", encoding="utf-8")
    nf.normalize_file(src)
    assert src.read_text(encoding="utf-8") == "hello world\n"


def test_idempotent_on_file(tmp_path):
    src = tmp_path / "x.md"
    src.write_text(
        "| a | b:1)x 2)y | c |\n"
        "| --- | --- | --- |\n"
        "| 1 | step | exp |\n",
        encoding="utf-8",
    )
    nf.normalize_file(src)
    first = src.read_text(encoding="utf-8")
    nf.normalize_file(src)
    second = src.read_text(encoding="utf-8")
    assert first == second
```

- [ ] **Step 2: 跑测试，验证 fail**

```bash
cd /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp
python -m pytest test_normalize_format.py -v
```

预期：`ModuleNotFoundError` 或 `FileNotFoundError`，因为 `normalize-format.py` 还没写。

- [ ] **Step 3: 写实现 `tmp/normalize-format.py`**

```python
#!/usr/bin/env python3
"""Mechanical format normalization for LTQC main-flow md files.

Idempotent: running twice produces the same result as running once.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# Repo root resolves relative to this script (tmp/normalize-format.py).
FEATURE_DIR = Path(__file__).resolve().parent.parent

DEFAULT_TARGETS = [
    FEATURE_DIR / "岚图主流程用例整理.md",
    FEATURE_DIR / "岚图已上线需求主流程用例.md",
]


def normalize_cell(text: str) -> str:
    """Normalize a single markdown table cell.

    Rules:
    - Convert "<digit>)" inline patterns (when preceded by non-whitespace
      and not already preceded by <br>) to "<br><digit>)".
    - Convert CRLF / LF / CR to <br>.
    - Idempotent: if cell already contains <br>, only do the newline pass.
    """
    # Always normalize newlines first (idempotent)
    text = text.replace("\r\n", "<br>").replace("\n", "<br>").replace("\r", "<br>")

    def _split(s: str) -> str:
        out: list[str] = []
        i = 0
        while i < len(s):
            ch = s[i]
            if ch.isdigit() and i + 1 < len(s) and s[i + 1] == ")":
                if i > 0:
                    prev = s[i - 1]
                    # Prev must be non-space and not already a <br>'s ">"
                    if prev != " " and prev != "\t" and prev != ">":
                        # Skip insertion if already preceded by <br>
                        if not s[:i].endswith("<br>"):
                            out.append("<br>")
                out.append(ch)
                out.append(")")
                i += 2
            else:
                out.append(ch)
                i += 1
        return "".join(out)

    return _split(text)


def _normalize_table_row(line: str) -> str:
    if not line.startswith("|"):
        return line
    parts = line.split("|")
    # parts looks like ['', cell1, cell2, ..., '']
    new = []
    for p in parts:
        stripped = p.strip()
        if stripped == "" or set(stripped) <= set("-: "):
            new.append(p)
        else:
            new.append(normalize_cell(p))
    return "|".join(new)


SQL_FENCE_RE = re.compile(
    r"(> 前置条件\s*\n\s*\n)```\w+\n",
    re.MULTILINE,
)

BULLET_PRECOND_RE = re.compile(
    r"(> 前置条件\n)\n((?:- [^\n]*\n)+)\n",
    re.MULTILINE,
)


def _wrap_bullets(match: re.Match[str]) -> str:
    bullets = match.group(2).strip("\n")
    lines: list[str] = []
    for raw in bullets.split("\n"):
        raw = raw.rstrip()
        if raw.startswith("- "):
            lines.append(raw[2:])
        elif raw:
            lines.append(raw)
    body = "\n".join(lines)
    return f"{match.group(1)}\n```\n{body}\n```\n\n"


def normalize_file(path: Path) -> None:
    content = path.read_text(encoding="utf-8")

    # Full-width space → ASCII space
    content = content.replace("　", " ")

    # Per-line normalization for table rows
    out_lines: list[str] = []
    for line in content.split("\n"):
        out_lines.append(_normalize_table_row(line))
    content = "\n".join(out_lines)

    # ```sql / ```python / ```yaml etc. → ``` (only inside 前置条件)
    content = SQL_FENCE_RE.sub(lambda m: m.group(1) + "```\n", content)

    # bullet-style 前置条件 → fenced block (only when there is no existing fence)
    content = BULLET_PRECOND_RE.sub(_wrap_bullets, content)

    path.write_text(content, encoding="utf-8")


def main(argv: list[str]) -> int:
    targets: list[Path] = [Path(a) for a in argv[1:]] or DEFAULT_TARGETS
    for t in targets:
        if not t.exists():
            print(f"skip (missing): {t}", file=sys.stderr)
            continue
        normalize_file(t)
        print(f"normalized: {t}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
```

- [ ] **Step 4: 跑测试，验证 pass**

```bash
cd /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp
python -m pytest test_normalize_format.py -v
```

预期：全部 11 个测试通过。

- [ ] **Step 5: 在真实文件上跑一遍**

```bash
cd /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke
python tmp/normalize-format.py
```

预期输出：
```
normalized: .../岚图主流程用例整理.md
normalized: .../岚图已上线需求主流程用例.md
```

- [ ] **Step 6: 幂等性验证**

再跑一次，记录 git diff：

```bash
git add -N workspace/dataAssets/features/2099-01-lt-dq-smoke/
git diff --stat workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md \
                workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md
python workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/normalize-format.py
git diff --stat workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md \
                workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md
```

预期：两次 diff stat 完全一致（第二次跑不会引入新变更）。

- [ ] **Step 7: 验证用例数没掉**

```bash
grep -c "^##### 【P" workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md
grep -c "^##### 【P" workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md
```

预期：分别 `192` 和 `159`。如果不是，stop，调查 `normalize-format.py` 是否动了标题行。

- [ ] **Step 8: Commit**

```bash
cd /Users/poco/Projects/kata
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/normalize-format.py
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/test_normalize_format.py
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md
git commit -m "chore: normalize ltqc md formatting"
```

- [ ] **Step 9: Checkpoint 1**

报告："Checkpoint 1 完成：机械格式化跑完，A/B 用例数保持 159/192。git diff 摘要：[N 行变更]"。
等用户确认后再进入 Phase 2。

---

## Task 3: Phase 2 — fanout 6 个 subagent 改写 B（按版本）

**Files:**
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/B_v6.4.3.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/B_v6.4.4.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/B_v6.4.5.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/B_v6.4.6.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/B_v6.4.8.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/B_v6.4.10.md`
- Create: corresponding `*.report.md` for each

- [ ] **Step 1: 建 staging 目录**

```bash
mkdir -p /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging
```

- [ ] **Step 2: 计算每个版本块的行号范围**

```bash
cd /Users/poco/Projects/kata
grep -n "^## v6\." workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md
```

记录每个 `## v6.4.X` 的起始行号；该版本块到下一个 `## v6.4.X-1` 之间的行就是它的范围（最后一段到文件末尾）。

- [ ] **Step 3: 派发 6 个 subagent（并行，一条消息中 6 个 Agent 调用）**

每个 subagent 用通用 prompt 模板，替换 `{VERSION}` / `{INCLUDE_REWRITE_DIRECTIVES}` 两个变量：

```
你是 LTQC 测试用例编辑 subagent。

任务：把以下文件中 `## {VERSION}` 整段（含 ### 需求子节、所有 ##### 用例）按风格指南改写。

输入文件（只读）:
- /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md

必读参考:
- /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/style-guide.md
{INCLUDE_REWRITE_DIRECTIVES}

输出（必写）:
- /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/B_{VERSION}.md
  内容：改写后的完整 `## {VERSION}` 整段（包括 ## 标题本身、所有 ### 和 ##### 子节）。不要带 YAML 前言、不要带其它版本。
- /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/B_{VERSION}.report.md
  内容：表格 | 用例 | 改动类型 | 改动摘要 | 不确定项 |，每条用例一行。

不变量（违反任何一条就停下重试）:
- 用例标题（##### 【Px】XXX）保持 1:1，不能删/合并/拆分用例
- 该版本块的用例数与原文一致
- ## 和 ### 层级保持不动
- 表格列保持 | 编号 | 步骤 | 预期 | 三列
- 不引入 "TODO / 待补充 / 待确认 / FIXME" 类占位

工作流:
1. Read 输入文件，定位 `## {VERSION}` 整段
2. Read 参考文件
3. 逐用例改写
4. Write staging.md 与 staging.report.md
5. 自检：grep ##### staging.md 验证用例数
```

参数表：

| Subagent | {VERSION} | {INCLUDE_REWRITE_DIRECTIVES} 内容 |
|---|---|---|
| B1 | v6.4.3 | `- /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/menu-rename-map.md (必须套用)`<br>`- /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/ruleset-prerequisite.md (必须套用)` |
| B2 | v6.4.4 | 同 B1 |
| B3 | v6.4.5 | 同 B1 |
| B4 | v6.4.6 | 同 B1 |
| B5 | v6.4.8 | （空字符串，无额外指令） |
| B6 | v6.4.10 | （空字符串，无额外指令） |

执行：一条消息里发 6 个 `Agent` tool call，并行。

- [ ] **Step 4: 等所有 6 个 subagent 返回**

- [ ] **Step 5: 验证 staging 输出**

```bash
cd /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke
for v in v6.4.3 v6.4.4 v6.4.5 v6.4.6 v6.4.8 v6.4.10; do
  echo "=== $v ==="
  ls -la tmp/staging/B_$v.md tmp/staging/B_$v.report.md
  echo "用例数 staging: $(grep -c '^##### 【P' tmp/staging/B_$v.md)"
  # 原文用例数
  orig=$(awk "/^## $v(\$| )/,/^## v6/" 岚图已上线需求主流程用例.md | grep -c "^##### 【P")
  echo "用例数 原文:   $orig"
  # 占位检查
  if grep -E "TODO|待补充|待确认|FIXME" tmp/staging/B_$v.md > /dev/null; then
    echo "WARN: 发现占位符"
    grep -nE "TODO|待补充|待确认|FIXME" tmp/staging/B_$v.md
  fi
done
```

若任一版本用例数不一致或发现占位符：重派该 subagent。

- [ ] **Step 6: Checkpoint 2**

报告："Checkpoint 2 完成：B 6 个版本 staging 全部出齐。用例数核对：v6.4.3 [N], v6.4.4 [N], v6.4.5 [N], v6.4.6 [N], v6.4.8 [N], v6.4.10 [N]，全部与原文一致。报告路径：tmp/staging/B_*.report.md"

等用户确认后再进 Phase 3。

---

## Task 4: Phase 3 — fanout 10 个 subagent 改写 A 非数据质量

**Files:**
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/A_元数据.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/A_数据标准.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/A_数据模型.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/A_数据治理.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/A_数据安全.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/A_数据源管理.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/A_用户角色管理.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/A_通知中心.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/A_资产盘点.md`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/A_岚图定制模块.md`
- Create: corresponding `*.report.md` for each

注意：**A 的 `## 数据质量` 模块不分配 subagent**，由 Phase 4 的 fill-mainflow-v2.py 处理。

- [ ] **Step 1: 计算 A 各模块的行号范围**

```bash
cd /Users/poco/Projects/kata
grep -n "^## " workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md
```

确认顺序与下表一致。

- [ ] **Step 2: 派发 10 个 subagent（并行）**

通用 prompt 模板（替换 `{MODULE}`）：

```
你是 LTQC 测试用例编辑 subagent。

任务：把以下文件中 `## {MODULE}` 整段（含 ### 子模块、#### 叶子分类、所有 ##### 用例）按风格指南改写。

输入文件（只读）:
- /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md

必读参考:
- /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/style-guide.md

输出（必写）:
- /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/A_{MODULE}.md
  内容：改写后的完整 `## {MODULE}` 整段。不要带 YAML 前言、不要带通用前置条件、不要带其它模块。
- /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/A_{MODULE}.report.md
  内容：表格 | 用例 | 改动类型 | 改动摘要 | 不确定项 |

不变量（违反任何一条就停下重试）:
- 用例标题（##### 【Px】XXX）保持 1:1，不能删/合并/拆分用例
- 该模块块的用例数与原文一致
- ## 和 ### 和 #### 层级保持不动
- 表格列保持 | 编号 | 步骤 | 预期 | 三列
- 不引入 "TODO / 待补充 / 待确认 / FIXME" 类占位

工作流:
1. Read 输入文件，定位 `## {MODULE}` 整段
2. Read 参考文件
3. 逐用例改写
4. Write staging.md 与 staging.report.md
5. 自检：grep ##### staging.md 验证用例数
```

参数表：

| Subagent | {MODULE} |
|---|---|
| A1 | 元数据 |
| A2 | 数据标准 |
| A3 | 数据模型 |
| A4 | 数据治理 |
| A5 | 数据安全 |
| A6 | 数据源管理 |
| A7 | 用户角色管理 |
| A8 | 通知中心 |
| A9 | 资产盘点 |
| A10 | 岚图定制模块 |

执行：一条消息里 10 个 `Agent` tool call，并行。

- [ ] **Step 3: 等所有 10 个 subagent 返回**

- [ ] **Step 4: 验证 staging 输出**

```bash
cd /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke
for m in 元数据 数据标准 数据模型 数据治理 数据安全 数据源管理 用户角色管理 通知中心 资产盘点 岚图定制模块; do
  echo "=== $m ==="
  ls -la "tmp/staging/A_$m.md" "tmp/staging/A_$m.report.md"
  echo "用例数 staging: $(grep -c '^##### 【P' tmp/staging/A_$m.md)"
  if grep -E "TODO|待补充|待确认|FIXME" "tmp/staging/A_$m.md" > /dev/null; then
    echo "WARN: 发现占位符"
    grep -nE "TODO|待补充|待确认|FIXME" "tmp/staging/A_$m.md"
  fi
done
```

- [ ] **Step 5: Checkpoint 3**

报告："Checkpoint 3 完成：A 10 个模块 staging 全部出齐。用例数核对：[逐模块列出]"。
等用户确认后再进 Phase 4。

---

## Task 5: Phase 4a — merge.py（TDD）

**Files:**
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/merge.py`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/test_merge.py`

- [ ] **Step 1: 写失败测试**

```python
"""Tests for tmp/merge.py."""
from __future__ import annotations

import importlib.util
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("mg", THIS_DIR / "merge.py")
mg = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mg)


def _write(path: Path, body: str) -> Path:
    path.write_text(body, encoding="utf-8")
    return path


def test_extract_yaml_frontmatter():
    src = """---
suite_name: "x"
---

## Section
body
"""
    fm, rest = mg.split_frontmatter(src)
    assert fm == '---\nsuite_name: "x"\n---\n'
    assert rest.startswith("\n## Section\n")


def test_extract_section_block():
    src = """## A
A body
## B
B body
## C
C body
"""
    block = mg.extract_section(src, "## A")
    assert block.rstrip() == "## A\nA body"
    block = mg.extract_section(src, "## B")
    assert block.rstrip() == "## B\nB body"
    block = mg.extract_section(src, "## C")
    assert block.rstrip() == "## C\nC body"


def test_merge_B_with_staging(tmp_path):
    src = tmp_path / "B.md"
    _write(src, """---
suite_name: "B"
---

## v6.4.3
old v6.4.3
## v6.4.4
old v6.4.4
## v6.4.10
old v6.4.10
""")
    staging_dir = tmp_path / "staging"
    staging_dir.mkdir()
    _write(staging_dir / "B_v6.4.3.md", "## v6.4.3\nNEW v6.4.3 content\n")
    _write(staging_dir / "B_v6.4.4.md", "## v6.4.4\nNEW v6.4.4 content\n")
    _write(staging_dir / "B_v6.4.10.md", "## v6.4.10\nNEW v6.4.10 content\n")

    mg.merge_b(src, staging_dir, versions=["v6.4.3", "v6.4.4", "v6.4.10"])
    out = src.read_text(encoding="utf-8")
    assert "old v6.4.3" not in out
    assert "NEW v6.4.3 content" in out
    assert "NEW v6.4.4 content" in out
    assert "NEW v6.4.10 content" in out
    assert out.startswith("---\nsuite_name: \"B\"\n---\n")


def test_merge_A_with_staging_and_empty_dq(tmp_path):
    src = tmp_path / "A.md"
    _write(src, """---
suite_name: "A"
---

## 通用前置条件
preamble
## 元数据
OLD 元数据
## 数据质量
OLD 数据质量
## 数据安全
OLD 数据安全
""")
    staging_dir = tmp_path / "staging"
    staging_dir.mkdir()
    _write(staging_dir / "A_元数据.md", "## 元数据\nNEW 元数据\n")
    _write(staging_dir / "A_数据安全.md", "## 数据安全\nNEW 数据安全\n")

    mg.merge_a(src, staging_dir, modules=["元数据", "数据安全"])
    out = src.read_text(encoding="utf-8")
    assert "OLD 元数据" not in out
    assert "OLD 数据安全" not in out
    assert "NEW 元数据" in out
    assert "NEW 数据安全" in out
    # 数据质量 段保留为占位（## 数据质量 + 空行）
    assert "## 数据质量\n" in out
    assert "OLD 数据质量" not in out
    # 通用前置条件 保留
    assert "## 通用前置条件\npreamble" in out


def test_merge_fails_when_staging_missing(tmp_path):
    src = tmp_path / "B.md"
    _write(src, "---\nfoo: bar\n---\n\n## v6.4.3\nbody\n")
    staging_dir = tmp_path / "staging"
    staging_dir.mkdir()
    import pytest
    with pytest.raises(FileNotFoundError):
        mg.merge_b(src, staging_dir, versions=["v6.4.3"])
```

- [ ] **Step 2: 跑测试，验证 fail**

```bash
cd /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp
python -m pytest test_merge.py -v
```

- [ ] **Step 3: 写实现 `tmp/merge.py`**

```python
#!/usr/bin/env python3
"""Merge staging md files back into A.md / B.md."""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

FEATURE = Path(__file__).resolve().parent.parent
A_MD = FEATURE / "岚图主流程用例整理.md"
B_MD = FEATURE / "岚图已上线需求主流程用例.md"
STAGING = FEATURE / "tmp" / "staging"

B_VERSIONS = ["v6.4.3", "v6.4.4", "v6.4.5", "v6.4.6", "v6.4.8", "v6.4.10"]

A_MODULES_BEFORE_DQ = ["元数据", "数据标准", "数据模型"]
A_MODULE_DQ = "数据质量"
A_MODULES_AFTER_DQ = [
    "数据治理",
    "数据安全",
    "数据源管理",
    "用户角色管理",
    "通知中心",
    "资产盘点",
    "岚图定制模块",
]


def split_frontmatter(text: str) -> tuple[str, str]:
    if not text.startswith("---\n"):
        return "", text
    end = text.find("\n---\n", 4)
    if end == -1:
        return "", text
    fm = text[: end + len("\n---\n")]
    return fm, text[end + len("\n---\n") :]


def extract_section(text: str, heading: str) -> str:
    """Return the block from a `## heading` line up to (but not including) the next `## `."""
    pattern = re.compile(rf"(^{re.escape(heading)}\s*\n)", re.MULTILINE)
    m = pattern.search(text)
    if not m:
        raise ValueError(f"section not found: {heading}")
    start = m.start()
    after = text[m.end() :]
    nxt = re.search(r"^## ", after, re.MULTILINE)
    end = m.end() + nxt.start() if nxt else len(text)
    return text[start:end]


def _replace_section(text: str, heading: str, new_block: str) -> str:
    old = extract_section(text, heading)
    return text.replace(old, new_block, 1)


def _empty_dq_placeholder(heading: str) -> str:
    return f"{heading}\n\n"


def merge_b(target: Path, staging_dir: Path, versions: list[str] | None = None) -> None:
    versions = versions or B_VERSIONS
    text = target.read_text(encoding="utf-8")
    for v in versions:
        staging = staging_dir / f"B_{v}.md"
        if not staging.exists():
            raise FileNotFoundError(f"missing staging: {staging}")
        new_block = staging.read_text(encoding="utf-8")
        if not new_block.endswith("\n"):
            new_block += "\n"
        text = _replace_section(text, f"## {v}", new_block)
    target.write_text(text, encoding="utf-8")


def merge_a(
    target: Path,
    staging_dir: Path,
    modules: list[str] | None = None,
) -> None:
    modules = modules or (A_MODULES_BEFORE_DQ + A_MODULES_AFTER_DQ)
    text = target.read_text(encoding="utf-8")
    for m in modules:
        staging = staging_dir / f"A_{m}.md"
        if not staging.exists():
            raise FileNotFoundError(f"missing staging: {staging}")
        new_block = staging.read_text(encoding="utf-8")
        if not new_block.endswith("\n"):
            new_block += "\n"
        text = _replace_section(text, f"## {m}", new_block)
    # Replace 数据质量 with placeholder
    text = _replace_section(
        text, f"## {A_MODULE_DQ}", _empty_dq_placeholder(f"## {A_MODULE_DQ}")
    )
    target.write_text(text, encoding="utf-8")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("which", choices=["A", "B", "both"])
    args = parser.parse_args(argv[1:])
    if args.which in ("B", "both"):
        merge_b(B_MD, STAGING)
        print(f"merged: {B_MD}")
    if args.which in ("A", "both"):
        merge_a(A_MD, STAGING)
        print(f"merged: {A_MD} (数据质量 段留空占位)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
```

- [ ] **Step 4: 跑测试，验证 pass**

```bash
cd /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp
python -m pytest test_merge.py -v
```

- [ ] **Step 5: Commit**

```bash
cd /Users/poco/Projects/kata
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/merge.py
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/test_merge.py
git commit -m "chore: add ltqc staging merge script"
```

---

## Task 6: Phase 4b — fill-mainflow-v2.py（复用 + 微改）

**Files:**
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/fill-mainflow-v2.py`

- [ ] **Step 1: 写新脚本（基于 fill-mainflow.py 改）**

`fill-mainflow.py` 现有逻辑：从 B.md 抓用例 → 桶进 A.md 的 `## 数据质量` 段 + 改 xmind。新版本只做 md 部分（xmind 由 Phase 6 重生成统一处理）。

```python
#!/usr/bin/env python3
"""Phase 4b: bucket B's 数据质量 cases into A's 数据质量 placeholder.

Reuses the BUCKETS mapping from the previous fill-mainflow.py. This version:
- Only writes to A.md (xmind regeneration is Phase 6).
- Assumes merge.py has already left A's 数据质量 section as an empty placeholder.
- Reads B.md (Phase 2 already merged in).
"""
from __future__ import annotations

import re
import sys
from collections import OrderedDict
from pathlib import Path

FEATURE = Path(__file__).resolve().parent.parent
A_MD = FEATURE / "岚图主流程用例整理.md"
B_MD = FEATURE / "岚图已上线需求主流程用例.md"

# Reuse the BUCKETS dict from the previous fill-mainflow.py
# (copy verbatim from FEATURE/tmp/fill-mainflow.py BUCKETS variable)
BUCKETS: "OrderedDict[str, dict]" = OrderedDict([
    # NOTE: paste the full BUCKETS dictionary here verbatim from
    # FEATURE/tmp/fill-mainflow.py lines 34-202. The mapping covers 9 leaves:
    #   数据质量 → 规则库配置
    #   数据质量 → 规则集管理
    #   数据质量 → 规则任务管理
    #   数据质量 → 校验结果查询
    #   数据质量 → 数据质量报告
    #   数据质量 → 通用配置 → 报告关联维表设置
    #   数据质量 → 通用配置 → json格式校验管理
    #   数据质量 → 项目管理 → 项目信息
    #   数据标准 → 落标检查
    # (the last one is in 数据标准 not 数据质量, but lives in the same fill script.)
])


def _read_case_blocks_from_b(b_text: str) -> dict[tuple[str, str], str]:
    """Index B.md by (need_heading, case_title) → full ##### block."""
    blocks: dict[tuple[str, str], str] = {}
    # Walk B.md and assign each ##### block to the nearest preceding ### heading
    lines = b_text.split("\n")
    current_need: str = ""
    current_case_lines: list[str] = []
    current_case_title: str = ""

    def _flush():
        nonlocal current_case_lines, current_case_title
        if current_case_title and current_need:
            blocks[(current_need, current_case_title)] = "\n".join(current_case_lines).rstrip() + "\n"
        current_case_lines = []
        current_case_title = ""

    for line in lines:
        if line.startswith("### "):
            _flush()
            current_need = line[4:].strip()
        elif line.startswith("##### "):
            _flush()
            current_case_title = line[6:].strip()
            current_case_lines.append(line)
        elif current_case_title:
            # Continue current case unless we hit a new section
            if line.startswith("## ") or line.startswith("### "):
                _flush()
                if line.startswith("### "):
                    current_need = line[4:].strip()
            else:
                current_case_lines.append(line)
    _flush()
    return blocks


def _format_dq_section(blocks_by_leaf: dict[str, list[str]]) -> str:
    """Render A's 数据质量 section from bucketed case blocks."""
    lines: list[str] = ["## 数据质量", ""]
    # Subsection structure expected by A's xmind: 9 leaves under 数据质量
    leaf_order = [
        ("规则库配置", None),
        ("规则集管理", None),
        ("规则任务管理", None),
        ("校验结果查询", None),
        ("数据质量报告", None),
        ("通用配置", ["报告关联维表设置", "json格式校验管理"]),
        ("项目管理", ["项目信息"]),
    ]
    for sub, sub_leaves in leaf_order:
        lines.append(f"### {sub}")
        lines.append("")
        if sub_leaves is None:
            key = f"数据质量 → {sub}"
            for block in blocks_by_leaf.get(key, []):
                lines.append(block)
                lines.append("")
        else:
            for leaf in sub_leaves:
                lines.append(f"#### {leaf}")
                lines.append("")
                key = f"数据质量 → {sub} → {leaf}"
                for block in blocks_by_leaf.get(key, []):
                    lines.append(block)
                    lines.append("")
    return "\n".join(lines).rstrip() + "\n\n"


def _format_落标_section(blocks_by_leaf: dict[str, list[str]]) -> str:
    """A 数据标准 → 落标检查 段补充用例。仅写出 ### 落标检查 内的 ##### 用例块。"""
    key = "数据标准 → 落标检查"
    blocks = blocks_by_leaf.get(key, [])
    return "\n".join(blocks).rstrip() + "\n\n" if blocks else ""


def fill_dq(a_md: Path, b_md: Path) -> None:
    a = a_md.read_text(encoding="utf-8")
    b = b_md.read_text(encoding="utf-8")
    blocks_index = _read_case_blocks_from_b(b)

    blocks_by_leaf: dict[str, list[str]] = {}
    for leaf, cfg in BUCKETS.items():
        out: list[str] = []
        for need, case_title in cfg["cases"]:
            key = None
            # match by need heading suffix (B uses `### 需求名(#id)`)
            for (nh, ct), block in blocks_index.items():
                if (nh == need or nh.endswith(need)) and ct == case_title:
                    key = (nh, ct)
                    out.append(block)
                    break
            if key is None:
                print(f"WARN: not found in B: {need} / {case_title}", file=sys.stderr)
        blocks_by_leaf[leaf] = out

    # Replace empty ## 数据质量 placeholder
    placeholder_re = re.compile(r"^## 数据质量\s*\n\s*\n(?=## )", re.MULTILINE)
    rendered = _format_dq_section(blocks_by_leaf)
    new_a, n = placeholder_re.subn(rendered, a, count=1)
    if n == 0:
        raise RuntimeError("数据质量 placeholder not found in A.md (expected empty section)")

    # Insert 落标检查 cases under existing 数据标准 → 落标检查 heading if any
    luobiao = _format_落标_section(blocks_by_leaf)
    if luobiao:
        new_a = re.sub(
            r"(^### 落标检查\s*\n)(?:\s*\n)?(?=##### |^## |^### )",
            lambda m: m.group(1) + "\n" + luobiao,
            new_a,
            count=1,
            flags=re.MULTILINE,
        )

    a_md.write_text(new_a, encoding="utf-8")
    print(f"filled: {a_md}")


if __name__ == "__main__":
    fill_dq(A_MD, B_MD)
```

**重要**：第 24-32 行的 `BUCKETS` 字典必须从 `tmp/fill-mainflow.py` 第 34-202 行原样复制过来（保留 9 个 entry 的完整结构 `xmind_path` / `archive_heading` / `cases`）。直接 `cat fill-mainflow.py | sed -n '34,202p'` 抽出来粘进新脚本。

- [ ] **Step 2: 复制 BUCKETS**

```bash
cd /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke
sed -n '34,202p' tmp/fill-mainflow.py
```

把输出粘到 `tmp/fill-mainflow-v2.py` 中标记的位置。

- [ ] **Step 3: Commit**

```bash
cd /Users/poco/Projects/kata
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/fill-mainflow-v2.py
git commit -m "chore: add ltqc data-quality bucketing v2 script"
```

---

## Task 7: Phase 4c — 跑 merge + bucket，提交结果

**Files:**
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md`
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md`

- [ ] **Step 1: 跑 merge.py 合并 B**

```bash
cd /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke
python tmp/merge.py B
```

预期输出：`merged: .../岚图已上线需求主流程用例.md`

- [ ] **Step 2: 验证 B 用例数**

```bash
grep -c "^##### 【P" workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md
```

预期：依然 192（如果 staging 完整覆盖了所有用例）。

- [ ] **Step 3: 跑 merge.py 合并 A（数据质量留空）**

```bash
python tmp/merge.py A
```

预期输出：`merged: .../岚图主流程用例整理.md (数据质量 段留空占位)`

- [ ] **Step 4: 验证 A 数据质量 段为空**

```bash
awk '/^## 数据质量/,/^## 数据治理/' workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md | head -10
```

预期：仅看到 `## 数据质量` + 空行 + `## 数据治理`。

- [ ] **Step 5: 跑 fill-mainflow-v2.py 填数据质量**

```bash
python tmp/fill-mainflow-v2.py
```

预期输出：`filled: .../岚图主流程用例整理.md`，stderr 无 WARN。如有 WARN，stop 并调试 BUCKETS 是否与新 B 内容能匹配。

- [ ] **Step 6: 再跑一次 normalize-format 保证格式一致**

```bash
python tmp/normalize-format.py
```

- [ ] **Step 7: 全文用例数核对**

```bash
echo "B: $(grep -c '^##### 【P' workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md)"
echo "A: $(grep -c '^##### 【P' workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md)"
```

预期：B = 192；A 应在原 159 ± BUCKETS 调整后的差额（记录数字给 checkpoint）。

- [ ] **Step 8: 占位符扫描**

```bash
grep -nE "TODO|待补充|待确认|FIXME" workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md \
                                       workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md || echo "无占位符 ✓"
```

- [ ] **Step 9: Commit**

```bash
cd /Users/poco/Projects/kata
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md
git commit -m "feat: refresh ltqc cases per style guide"
```

- [ ] **Step 10: Checkpoint 4**

报告："Checkpoint 4 完成：merge + bucket + format 收尾跑完。A 最终 [N] 用例；B 192 用例；无占位符。git show --stat 摘要：[摘要]"

汇总 staging report 到 `tmp/edit-report.md`：

```bash
cat workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging/*.report.md \
  > workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/edit-report.md
```

等用户确认后再进 Phase 5。

---

## Task 8: Phase 5 — 测试环境核对 subagent

**Files:**
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/probe-report.md`
- 可能 Modify: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md`
- 可能 Modify: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md`

- [ ] **Step 1: 确认测试环境登录态可用**

```bash
ls -la /Users/poco/Projects/kata/.auth/ 2>/dev/null | head -10
```

如果有 `.auth/<env>.json` 之类的 storageState 文件，记录路径供 subagent 使用。

- [ ] **Step 2: 派发 1 个 subagent**

```
你是 LTQC 数据质量改写核对 subagent。

任务：从 B (岚图已上线需求主流程用例.md) 的 v6.4.3 / v6.4.4 / v6.4.5 / v6.4.6 数据质量需求段，
取出本次重写过的所有用例，登录测试环境核对 菜单路径 / 按钮文案 / 字段名 / Step 命名 是否一致。
不一致就改 B.md (并同步改 A.md 对应桶里的副本)；查不到就在 probe-report.md 标 [需复核]。

测试环境:
- URL: http://shuzhan63-test-ltqc.k8s.dtstack.cn/dataAssets/#/
- StorageState 文件: 检查 /Users/poco/Projects/kata/.auth/ 下匹配 ltqc / shuzhan63 关键字的 .json
- 用 Playwright MCP 或现有 ui-autotest 工具登录

工作流：
1. Read B.md 的 v6.4.3-v6.4.6 数据质量段，列出本次新启用的菜单/按钮/字段名清单
2. 在测试环境逐项核对（菜单路径走一遍，按钮 click 检查文案）
3. 一致 → 不动
4. 不一致 → 同时改 B.md 和 A.md 的对应副本（A 里通过 grep 用例标题精确定位），并在 probe-report.md 记录
5. 查不到的菜单/按钮 → 不修改用例，在 probe-report.md 把该用例标 [需复核]

输出：
- /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/probe-report.md
  字段：| 用例 | 项目 | 期望（用例里写的） | 实际（测试环境） | 处置（已修正/需复核） |

不变量：
- 仅改 v6.4.3-v6.4.6 数据质量段
- 不改用例数，不删用例
```

- [ ] **Step 3: 等 subagent 返回**

- [ ] **Step 4: 核查 probe-report.md**

```bash
ls -la workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/probe-report.md
cat workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/probe-report.md | head -50
```

- [ ] **Step 5: 如果 subagent 改过文件，commit**

```bash
cd /Users/poco/Projects/kata
git status workspace/dataAssets/features/2099-01-lt-dq-smoke/*.md
git diff --stat workspace/dataAssets/features/2099-01-lt-dq-smoke/*.md
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md
git commit -m "fix: align ltqc dq cases with test env truth"
```

如果没有改动，跳过 commit。

- [ ] **Step 6: Checkpoint 5**

报告："Checkpoint 5 完成：测试环境核对 [N] 项，已修正 [M] 项，需复核 [K] 项（见 tmp/probe-report.md）。"

等用户确认后再进 Phase 6。

---

## Task 9: Phase 6a — normalize-final-xmind.py（TDD）

**Files:**
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/normalize-final-xmind.py`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/test_normalize_final_xmind.py`

- [ ] **Step 1: 写失败测试**

```python
"""Tests for tmp/normalize-final-xmind.py."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

THIS_DIR = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("nx", THIS_DIR / "normalize-final-xmind.py")
nx = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(nx)


def test_replace_br_in_title():
    topic = {"title": "step1<br>step2<br>step3", "children": {"attached": []}}
    nx.transform_topic(topic)
    assert topic["title"] == "step1\nstep2\nstep3"


def test_replace_br_recursive():
    topic = {
        "title": "root<br>x",
        "children": {
            "attached": [
                {"title": "leaf<br>y", "children": {"attached": []}},
            ]
        },
    }
    nx.transform_topic(topic)
    assert topic["title"] == "root\nx"
    assert topic["children"]["attached"][0]["title"] == "leaf\ny"


def test_flatten_root_project_to_suite():
    sheet = {
        "title": "project",
        "rootTopic": {
            "title": "project",
            "children": {
                "attached": [
                    {
                        "title": "suite",
                        "children": {"attached": [{"title": "v6.4.3"}]},
                    }
                ]
            },
        },
    }
    nx.flatten_root(sheet)
    assert sheet["rootTopic"]["title"] == "suite"
    assert sheet["title"] == "suite"
    assert sheet["rootTopic"]["children"]["attached"][0]["title"] == "v6.4.3"


def test_full_pass_on_xmind(tmp_path):
    p = tmp_path / "x.xmind"
    content = [{
        "title": "project",
        "rootTopic": {
            "title": "project",
            "children": {
                "attached": [
                    {
                        "title": "suite",
                        "children": {
                            "attached": [
                                {"title": "leaf<br>line2", "children": {"attached": []}}
                            ]
                        },
                    }
                ]
            },
        },
    }]
    with ZipFile(p, "w", ZIP_DEFLATED) as z:
        z.writestr("content.json", json.dumps(content, ensure_ascii=False))
    nx.normalize_xmind(p)
    with ZipFile(p, "r") as z:
        out = json.loads(z.read("content.json").decode("utf-8"))
    assert out[0]["title"] == "suite"
    assert out[0]["rootTopic"]["title"] == "suite"
    leaf = out[0]["rootTopic"]["children"]["attached"][0]
    assert leaf["title"] == "leaf\nline2"
```

- [ ] **Step 2: 跑测试，验证 fail**

```bash
cd /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp
python -m pytest test_normalize_final_xmind.py -v
```

- [ ] **Step 3: 写实现 `tmp/normalize-final-xmind.py`**

```python
#!/usr/bin/env python3
"""Phase 6 xmind post-processor.

1. Replace <br> with \n in every topic title (recursive).
2. Flatten root: if project → suite → versions, lift suite to root.
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZIP_DEFLATED, ZipFile

FEATURE = Path(__file__).resolve().parent.parent
A_XMIND = FEATURE / "岚图主流程用例整理.xmind"
B_XMIND = FEATURE / "岚图已上线需求主流程用例.xmind"


def transform_topic(topic: dict) -> None:
    if "title" in topic and isinstance(topic["title"], str):
        topic["title"] = topic["title"].replace("<br>", "\n")
    children = topic.get("children", {})
    for kind in ("attached", "detached", "summary"):
        for child in children.get(kind, []):
            transform_topic(child)


def flatten_root(sheet: dict) -> None:
    root = sheet.get("rootTopic", {})
    children = root.get("children", {}).get("attached", [])
    if len(children) != 1:
        return  # nothing to flatten
    suite = children[0]
    suite_children = suite.get("children", {}).get("attached", [])
    if not suite_children:
        return
    root["title"] = suite.get("title", root.get("title", ""))
    root["children"] = {"attached": suite_children}
    sheet["title"] = root["title"]


def normalize_xmind(path: Path) -> None:
    with ZipFile(path, "r") as zin:
        content = json.loads(zin.read("content.json").decode("utf-8"))
        for sheet in content:
            flatten_root(sheet)
            root = sheet.get("rootTopic")
            if root:
                transform_topic(root)

        with NamedTemporaryFile(delete=False) as tmp:
            tmp_path = Path(tmp.name)

        with ZipFile(tmp_path, "w", ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == "content.json":
                    zout.writestr(
                        item,
                        json.dumps(content, ensure_ascii=False, separators=(",", ":")),
                    )
                else:
                    zout.writestr(item, zin.read(item.filename))

    shutil.move(tmp_path, path)
    print(f"normalized: {path}")


def main(argv: list[str]) -> int:
    targets = [Path(a) for a in argv[1:]] or [A_XMIND, B_XMIND]
    for t in targets:
        if not t.exists():
            print(f"skip (missing): {t}", file=sys.stderr)
            continue
        normalize_xmind(t)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
```

- [ ] **Step 4: 跑测试，验证 pass**

```bash
cd /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp
python -m pytest test_normalize_final_xmind.py -v
```

- [ ] **Step 5: Commit**

```bash
cd /Users/poco/Projects/kata
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/normalize-final-xmind.py
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/test_normalize_final_xmind.py
git commit -m "chore: add ltqc xmind normalization script"
```

---

## Task 10: Phase 6b — 重生成 xmind + 更新 manifest

**Files:**
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.xmind`
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.xmind`
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-smoke/manifest.json`

- [ ] **Step 1: 确认 kata CLI 可用**

```bash
cd /Users/poco/Projects/kata/engine
bun run build 2>&1 | tail -5
ls -la bin/kata
```

- [ ] **Step 2: 重生成 A.xmind**

```bash
cd /Users/poco/Projects/kata
engine/bin/kata xmind-gen \
  --input workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md \
  --output workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.xmind \
  --mode replace
```

- [ ] **Step 3: 重生成 B.xmind**

```bash
engine/bin/kata xmind-gen \
  --input workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md \
  --output workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.xmind \
  --mode replace
```

- [ ] **Step 4: 跑 normalize-final-xmind.py**

```bash
python workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/normalize-final-xmind.py
```

预期输出：两条 `normalized: ...`。

- [ ] **Step 5: 手动校验 xmind**

```bash
cd /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke
python3 -c "
import json, zipfile
for fn in ['岚图主流程用例整理.xmind', '岚图已上线需求主流程用例.xmind']:
    with zipfile.ZipFile(fn) as z:
        c = json.loads(z.read('content.json'))
        root = c[0]['rootTopic']
        print(f'{fn}: root={root[\"title\"]!r}, children={len(root.get(\"children\", {}).get(\"attached\", []))}')
        # Check: no '<br>' literal in any title
        def walk(t):
            yield t.get('title', '')
            for k in ('attached','detached','summary'):
                for ch in t.get('children',{}).get(k,[]):
                    yield from walk(ch)
        br = [x for x in walk(root) if '<br>' in x]
        if br:
            print(f'  WARN: {len(br)} titles still contain <br>')
        else:
            print('  ✓ no <br> literals')
"
```

预期：两文件均显示 `✓ no <br> literals`，根节点为 suite 标题（不是 project）。

- [ ] **Step 6: 更新 manifest.json**

```bash
A_COUNT=$(grep -c '^##### 【P' workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md)
B_COUNT=$(grep -c '^##### 【P' workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md)
TODAY=$(date +%F)
echo "A=$A_COUNT B=$B_COUNT date=$TODAY"
```

记下三个值，按如下结构改 `manifest.json`：

```json
{
  "schema": "FeatureManifest@2",
  "feature_id": "2099-01-lt-dq-smoke",
  "case_drafting": {
    "status": "completed",
    "archive_path": "岚图主流程用例整理.md",
    "xmind_path": "岚图主流程用例整理.xmind",
    "requirement_atoms": [],
    "coverage_matrix_path": null,
    "case_count": <A_COUNT>,
    "updated_at": "<TODAY>"
  },
  "automation": {
    "status": "not-started",
    "intents": [],
    "last_handoff_path": null,
    "last_run_status": "not-run"
  },
  "files": {
    "archive": "岚图主流程用例整理.md",
    "xmind": "岚图主流程用例整理.xmind",
    "tests_root": null,
    "latest_results": null
  }
}
```

注意：`case_count` 用 A.md 的数量（因为 archive_path 指向 A.md）。B.md 的数量记录在 commit message 里即可。

- [ ] **Step 7: 最终 commit**

```bash
cd /Users/poco/Projects/kata
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.xmind
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.xmind
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/manifest.json
git commit -m "feat: regenerate ltqc xmind + bump manifest"
```

- [ ] **Step 8: 最终交付报告**

输出最终交付清单：
- A.md / A.xmind: [N] 用例
- B.md / B.xmind: 192 用例
- manifest.json: case_count=[N], xmind_path=岚图主流程用例整理.xmind, updated_at=YYYY-MM-DD
- 改动报告: tmp/edit-report.md（16 个 subagent 改动摘要）
- 测试环境核对: tmp/probe-report.md
- Commits: Phase 0/1/2-3/4/5/6 共 5-7 个 commit（依实际情况）

---

## Risk & Recovery

**回滚到任一 checkpoint**：每个 Phase 一个 commit，`git reset --hard <commit>` 即可回退。

**Subagent 重派**：如果某个 staging 文件不达标（用例数错 / 占位符 / 格式偏），单独重派该 subagent，覆盖 staging 文件，重跑 Phase 4。

**Merge 冲突**：merge.py 设计为完全覆盖式（按 `## Section` 行整段替换），不会出现 git merge 冲突。如果 `extract_section` 抛错，看是不是 section 名拼错或被改过。

**Fill 找不到 case**：fill-mainflow-v2.py 输出 WARN 但不中止，缺失的桶项保持空。检查 BUCKETS 字典里的 `(need, case_title)` 二元组是否与 B 里的实际标题一致（B 改写后标题不能变，但子代理可能违反此不变量，回到 Phase 2 重派）。

**Xmind 错位**：xmind-gen 生成失败，检查 md 是否有不规则标题层级（`#`/`##`/`###` 混用）。
