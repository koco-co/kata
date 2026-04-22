# 岚图测试用例整理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从 ltqc 历史 CSV 抽取岚图已上线需求一级用例（MD + XMind），补齐主流程 xmind 9 个空叶子节点，并修复 `kata history-convert` 的合并输出问题以加上路径白名单过滤。

**Architecture:** 4 个 phase 顺序执行：(0) 改造 katacli → (1) 出候选表格、阻塞等待用户拍板 → (2) 渲染 Task 1 产物 → (3) 主流程补强。Phase 0 用 TDD（bun:test）。Phase 1-3 主要是数据加工脚本 + 文件生成。

**Tech Stack:** TypeScript / bun / kata CLI（`engine/`）、Markdown、XMind 文件（zip+JSON），Python 用于数据筛选辅助。

**关联文档：**
- 设计稿：`docs/superpowers/specs/2026-05-18-lt-cases-design.md`
- MD 风格 spec：`docs/superpowers/specs/2026-05-18-ltqc-md-case-style-design.md`

---

## Phase 0: 修 katacli — 加 `--include-paths` 与基线核查

### Task 0.1: 跑基线合并转换，识别现有「小问题」

**Files:**
- 仅读取 / 验证：`engine/src/history-convert.ts`、`workspace/dataAssets/_shared/archive/history/ltqc/*.csv`
- 产物（临时）：`/tmp/lt-baseline.md`

- [ ] **Step 1: 构建 kata CLI**

Run: `cd engine && bun install && bun run build`
Expected: 退出码 0，`engine/bin/kata` 可执行

- [ ] **Step 2: 跑基线合并转换（不带白名单）**

Run:
```bash
engine/bin/kata history-convert \
  --path workspace/dataAssets/_shared/archive/history/ltqc \
  --project dataAssets \
  --output /tmp/lt-baseline.md \
  --group-by-version \
  --level 2 \
  --title '岚图已上线需求一级用例'
```
Expected: 退出码 0，`/tmp/lt-baseline.md` 生成

- [ ] **Step 3: 核查 MD 结构**

Run:
```bash
grep -nE '^# |^## |^### |^##### ' /tmp/lt-baseline.md | head -60
```
Expected: 应该出现
- 一个 `# 岚图已上线需求一级用例` 顶级
- `## v6.4.3` … `## v6.4.10` 二级
- `### {需求名}` 三级
- `##### 【Px】用例标题` 五级

记录下：
- 是否出现 `## v` 段重复或缺失
- `###` 三级标题是否带 `#9xxx` 后缀（与设计稿一致）
- `#####` 五级是否带 `【P1】` 前缀
- 是否有非岚图相关需求（多模态/军工/苏银凯基/gate）混进来

把发现的问题清单贴到 PR/commit message 备查。

- [ ] **Step 4: Commit 工作树已有改动**

Run:
```bash
git add engine/src/history-convert.ts engine/src/xmind-gen.ts engine/tests/history-convert.test.ts engine/tests/xmind/gen.test.ts
git status
```
Expected: 待提交 4 个文件

Run:
```bash
git commit -m "fix(history-convert): clean CRLF, render '无' preconditions, allow paren-number in steps"
```
Expected: 新 commit 创建

---

### Task 0.2: 加 `--include-paths <file>` 白名单参数（TDD）

**Files:**
- Modify: `engine/src/history-convert.ts:1462`（runConvert 选项），`engine/src/history-convert.ts:1665`（CLI option 注册）
- Test: `engine/tests/history-convert.test.ts:227`（在 `--module filter` 块附近加新 describe）
- Test fixture: `engine/tests/fixtures/include-paths.txt`（新建）

- [ ] **Step 1: 写失败测试**

新建 `engine/tests/fixtures/include-paths.txt`：
```
/版本迭代测试用例/v6.4.3/规则校验详细结果表(#9334)
```

在 `engine/tests/history-convert.test.ts` 末尾新增 describe 块：
```typescript
describe("history-convert --include-paths whitelist", () => {
  it("only converts rows whose 所属模块 matches a whitelisted path", () => {
    const whitelistFile = join(import.meta.dirname, "fixtures/include-paths.txt");
    const outFile = join(TMP_DIR, "filtered.md");
    const result = run([
      "--path", FIXTURE_CSV,
      "--project", TEST_PROJECT,
      "--output", outFile,
      "--group-by-version",
      "--include-paths", whitelistFile,
    ]);
    expect(result.code).toBe(0);
    const content = readFileSync(outFile, "utf8");
    // Only the whitelisted requirement section should appear
    expect(content).toContain("### 规则校验详细结果表");
    expect(content).not.toContain("### 质量报告管理");
  });
});
```

注意：`FIXTURE_CSV` 需要含 v6.4.3 的多个需求路径。若现有 fixture 不够，先扩充 `engine/tests/fixtures/sample-history.csv`（详见 Step 1.5）。

- [ ] **Step 1.5: 检查 fixture 是否覆盖多需求**

Run:
```bash
python3 -c "
import csv
with open('engine/tests/fixtures/sample-history.csv') as f:
    reader = csv.reader(f)
    next(reader)
    paths = set()
    for row in reader:
        if len(row) > 2:
            paths.add(row[2].strip())
    for p in sorted(paths):
        print(p)
"
```
Expected: 至少 2 个不同的 `/版本迭代测试用例/v6.x.x/...` 路径

如果不足，在 `engine/tests/fixtures/sample-history.csv` 末尾追加 2-3 行属于不同模块路径（如 `/版本迭代测试用例/v6.4.3/质量报告管理(#9341)`）的行；保持 CSV header 一致。

- [ ] **Step 2: 跑测试验证失败**

Run: `cd engine && bun test tests/history-convert.test.ts -t "include-paths"`
Expected: FAIL，错误类似 `unknown option '--include-paths'`

- [ ] **Step 3: 注册 CLI 参数**

在 `engine/src/history-convert.ts` CLI options 数组（约 1665 行）追加：
```typescript
{ flag: "--include-paths <file>", description: "Path to a file containing line-separated 所属模块 paths to include; mutually exclusive with --filter" },
```

在 `runConvert` 参数接口（约 1447 行）追加：
```typescript
includePaths?: string;
```

- [ ] **Step 4: 实现白名单过滤逻辑**

在 `runConvert` 内，紧跟 `contentFilter` 处理之后（约 1517 行）插入：
```typescript
const includePathsFile = opts.includePaths;
if (includePathsFile) {
  if (contentFilter) {
    process.stderr.write("Error: --include-paths and --filter are mutually exclusive\n");
    process.exit(1);
  }
  const whitelist = new Set(
    readFileSync(validateFilePath(includePathsFile, [repoRoot()]), "utf8")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
  allRows = allRows.filter((r) => whitelist.has(r.module.trim()));
}
```

同时确保 `readFileSync` 和 `validateFilePath` 已 import（顶部）。

- [ ] **Step 5: 跑测试验证通过**

Run: `cd engine && bun test tests/history-convert.test.ts -t "include-paths"`
Expected: PASS

- [ ] **Step 6: 跑整个 history-convert 测试套件**

Run: `cd engine && bun test tests/history-convert.test.ts`
Expected: 全部 PASS（未引入回归）

- [ ] **Step 7: Commit**

```bash
git add engine/src/history-convert.ts engine/tests/history-convert.test.ts engine/tests/fixtures/include-paths.txt engine/tests/fixtures/sample-history.csv
git commit -m "feat(history-convert): add --include-paths whitelist filter"
```

---

### Task 0.3: 修复 Task 0.1 中发现的结构问题

> **条件执行**：仅当 Task 0.1 发现具体问题时执行此 Task。若 Task 0.1 输出已符合设计稿，跳过此 Task。

**Files:**
- Modify: `engine/src/history-convert.ts`（具体位置由问题决定）
- Test: `engine/tests/history-convert.test.ts`

- [ ] **Step 1: 列出每个问题对应一个失败测试**

为每个 Task 0.1 发现的问题写一个 `it(...)` 测试（断言期望输出格式），先确认 FAIL

- [ ] **Step 2: 修源码使测试通过**

针对性修 `csvRowsToArchives` / `runConvert` 的对应分支

- [ ] **Step 3: 全套件回归**

Run: `cd engine && bun test tests/history-convert.test.ts`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git commit -am "fix(history-convert): <具体问题描述>"
```

---

## Phase 1: 出候选表格

### Task 1.1: 生成 43 路径白名单文件

**Files:**
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/include-paths.txt`

- [ ] **Step 1: 写入白名单**

把设计稿附录 A 的 43 行模块路径写入 `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/include-paths.txt`，每行一个路径，不要前后空格。

- [ ] **Step 2: 计数验证**

Run: `wc -l workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/include-paths.txt`
Expected: `43 ...`

---

### Task 1.2: 跑 katacli 生成中间态合并 MD

**Files:**
- Produce: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/all-p1.md`

- [ ] **Step 1: 执行合并转换**

Run:
```bash
engine/bin/kata history-convert \
  --path workspace/dataAssets/_shared/archive/history/ltqc \
  --project dataAssets \
  --output workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/all-p1.md \
  --group-by-version \
  --level 2 \
  --include-paths workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/include-paths.txt \
  --title '岚图已上线需求一级用例（P1 全量候选）'
```
Expected: 退出码 0

- [ ] **Step 2: 结构核查**

Run:
```bash
grep -cE '^## v6\.' workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/all-p1.md
grep -cE '^### ' workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/all-p1.md
grep -cE '^##### ' workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/all-p1.md
```
Expected:
- `## v` 段约 6 个（v6.4.3、v6.4.4、v6.4.5、v6.4.6、v6.4.8、v6.4.10）
- `###` 三级标题约 43 个
- `#####` 五级约 270 个（P1 总数）

如严重偏离，回到 Task 0.1 / Task 0.3 排查。

---

### Task 1.3: 应用启发式筛选输出候选表格

**Files:**
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/filter-candidates.py`（一次性脚本）
- Produce: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/一级用例候选.md`

- [ ] **Step 1: 写筛选脚本**

新建 `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/filter-candidates.py`：

```python
#!/usr/bin/env python3
"""
从 all-p1.md 抽取每个需求下 1-3 条主流程候选用例，输出候选表格 MD。

启发式：
  1. 主功能动词：新建/创建/配置/展示/列表/校验/启动/调度/导入/导出/生成/发布
  2. 步骤数 ≥ 3（步骤表行数）
  3. 标题不含：异常/边界/非法/重复/校验失败/缺省
  4. 多条满足时按步骤数降序，取前 3
"""
import re
import sys
from pathlib import Path

SRC = Path(__file__).parent / "all-p1.md"
OUT = Path(__file__).parent / "一级用例候选.md"

MAIN_VERBS = ["新建", "创建", "配置", "展示", "列表", "校验", "启动", "调度", "导入", "导出", "生成", "发布"]
EXCLUDE_KW = ["异常", "边界", "非法", "重复", "校验失败", "缺省"]

def parse(md_text):
    lines = md_text.split("\n")
    version = None
    requirement = None
    cases = []  # (version, requirement, title, step_count)
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("## v"):
            version = line[3:].strip()
        elif line.startswith("### "):
            requirement = line[4:].strip()
        elif line.startswith("##### "):
            title = line[6:].strip()
            # Skip subsequent lines until next ##### or ### or ##
            step_count = 0
            j = i + 1
            in_table = False
            while j < len(lines):
                ln = lines[j]
                if ln.startswith("##### ") or ln.startswith("### ") or ln.startswith("## "):
                    break
                if re.match(r"^\| \d+ \|", ln):
                    step_count += 1
                j += 1
            cases.append((version, requirement, title, step_count))
            i = j
            continue
        i += 1
    return cases

def has_main_verb(title):
    return any(v in title for v in MAIN_VERBS)

def has_exclude_kw(title):
    return any(k in title for k in EXCLUDE_KW)

def pick(cases_by_req):
    """从同一需求的 P1 候选中取 1-3 条。"""
    primary = [c for c in cases_by_req if has_main_verb(c[2]) and not has_exclude_kw(c[2]) and c[3] >= 3]
    primary.sort(key=lambda c: -c[3])
    if primary:
        return primary[:3]
    # fallback: 取步骤数最多的 1 条
    fallback = sorted(cases_by_req, key=lambda c: -c[3])
    return fallback[:1] if fallback else []

def main():
    md_text = SRC.read_text()
    cases = parse(md_text)
    by_req = {}
    for c in cases:
        by_req.setdefault((c[0], c[1]), []).append(c)

    rows = []
    idx = 1
    for (ver, req), case_list in by_req.items():
        picks = pick(case_list)
        for c in picks:
            reason = []
            if has_main_verb(c[2]):
                reason.append("含主功能动词")
            if c[3] >= 3:
                reason.append(f"{c[3]} 步")
            reason_str = "+".join(reason) if reason else "fallback"
            rows.append((idx, ver, req, c[2], c[3], reason_str))
            idx += 1

    out_lines = [
        "# 岚图已上线需求一级用例候选表格",
        "",
        f"> 来源：`tmp/all-p1.md`（{len(cases)} 个 P1 用例）",
        f"> 候选共 {len(rows)} 条；请逐行在「决策」列填 `yes` / `no` / `换为：用例标题` / `新鲜度风险`",
        "",
        "| # | 版本 | 需求 | 候选用例标题 | 步骤数 | 推荐理由 | 新鲜度风险 | 你的决策 |",
        "|---|---|---|---|---:|---|---|---|",
    ]
    # 新鲜度风险 - 简单标注：标题含「质量任务管理」即 stale flag
    STALE_TERMS = ["质量任务管理"]
    for idx, ver, req, title, step_cnt, reason in rows:
        stale = "是（旧菜单名）" if any(t in title for t in STALE_TERMS) else ""
        out_lines.append(f"| {idx} | {ver} | {req} | {title} | {step_cnt} | {reason} | {stale} | |")

    OUT.write_text("\n".join(out_lines) + "\n")
    print(f"Wrote {OUT} with {len(rows)} candidates from {len(by_req)} requirements")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 执行脚本**

Run: `python3 workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/filter-candidates.py`
Expected: 输出 `Wrote .../一级用例候选.md with N candidates from 43 requirements`，N 在 50-150 之间

- [ ] **Step 3: 人工抽查候选**

Run:
```bash
head -30 workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/一级用例候选.md
```
Expected: 表头 + 前 20 行候选；版本/需求/标题字段都非空

- [ ] **Step 4: 提交候选表格供用户拍板**

向用户输出消息：
> 候选表格已生成：[一级用例候选.md](workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/一级用例候选.md)
> 共 {N} 条候选，覆盖 43 个需求。请逐行在「你的决策」列填 yes/no/换为/新鲜度风险，回填后我进 Phase 2。

**停下来等用户回复**。本 phase 不 commit。

---

## Phase 2: 渲染 Task 1 产物

> 前置条件：用户已在 `一级用例候选.md` 的「你的决策」列填写完毕

### Task 2.1: 解析用户拍板结果，生成最终一级用例 MD

**Files:**
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/render-final.py`
- Read: `tmp/一级用例候选.md`（已含用户决策）、`tmp/all-p1.md`（步骤数据来源）
- Produce: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求一级用例.md`

- [ ] **Step 1: 写渲染脚本**

新建 `tmp/render-final.py`：

```python
#!/usr/bin/env python3
"""
读取用户已拍板的候选表格，从 all-p1.md 抽出对应用例的完整内容（前置条件 + 步骤表），
生成最终一级用例 MD。
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
CAND = ROOT / "一级用例候选.md"
SRC = ROOT / "all-p1.md"
OUT = ROOT.parent / "岚图已上线需求一级用例.md"

# Parse candidate table
locked = []  # (version, requirement, title)
with CAND.open() as f:
    for line in f:
        if not line.startswith("| "):
            continue
        cells = [c.strip() for c in line.strip().split("|")[1:-1]]
        if len(cells) < 8 or cells[0] in ("#", "---"):
            continue
        decision = cells[7].lower()
        if decision in ("yes", "y", "ok"):
            locked.append((cells[1], cells[2], cells[3]))
        elif decision.startswith("换为：") or decision.startswith("换为"):
            new_title = decision.split("：", 1)[-1].strip() if "：" in decision else decision[2:].strip()
            locked.append((cells[1], cells[2], new_title))
        # other (no / blank / stale 标记) → skip

print(f"Locked {len(locked)} cases")

# Parse all-p1.md into blocks {(version, req, title): block_lines}
blocks = {}
with SRC.open() as f:
    lines = f.readlines()

version = None
req = None
i = 0
while i < len(lines):
    line = lines[i].rstrip("\n")
    if line.startswith("## v"):
        version = line[3:].strip()
        i += 1
        continue
    if line.startswith("### "):
        req = line[4:].strip()
        i += 1
        continue
    if line.startswith("##### "):
        title = line[6:].strip()
        j = i + 1
        while j < len(lines):
            ln = lines[j].rstrip("\n")
            if ln.startswith("##### ") or ln.startswith("### ") or ln.startswith("## "):
                break
            j += 1
        block = lines[i:j]
        blocks[(version, req, title)] = block
        i = j
        continue
    i += 1

# Render final MD grouped by version → requirement → cases
from collections import OrderedDict
grouped = OrderedDict()
for ver, req, title in locked:
    grouped.setdefault(ver, OrderedDict()).setdefault(req, []).append(title)

out = ["# 岚图已上线需求一级用例", "",
       f"> 范围：v6.4.3 ~ v6.4.10，共 43 个需求", ""]
for ver, reqs in grouped.items():
    out.append(f"## v{ver}" if not ver.startswith("v") else f"## {ver}")
    out.append("")
    for req, titles in reqs.items():
        out.append(f"### {req}")
        out.append("")
        for t in titles:
            block = blocks.get((ver, req, t))
            if not block:
                # 标题被改过，宽松匹配：在同 req 内查找包含或类似标题
                for (bver, breq, btitle), bblock in blocks.items():
                    if bver == ver and breq == req and t in btitle:
                        block = bblock
                        break
            if not block:
                print(f"WARN: not found {ver} | {req} | {t}")
                continue
            out.extend([ln.rstrip("\n") for ln in block])
        out.append("")

OUT.write_text("\n".join(out) + "\n")
print(f"Wrote {OUT}")
```

- [ ] **Step 2: 执行渲染**

Run: `python3 workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/render-final.py`
Expected: 输出 `Wrote .../岚图已上线需求一级用例.md`，无 WARN（若有 WARN 需人工修候选表格）

- [ ] **Step 3: 抽查产物**

Run:
```bash
grep -cE '^## v|^### |^##### ' workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求一级用例.md
head -50 workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求一级用例.md
```
Expected: 头部 frontmatter? 否（本脚本不加 frontmatter）；版本/需求/用例层级正确

- [ ] **Step 4: Commit**

```bash
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求一级用例.md \
        workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/render-final.py \
        workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/filter-candidates.py \
        workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/include-paths.txt
git commit -m "docs(lt-dq-smoke): add 岚图已上线需求一级用例.md from locked candidates"
```

---

### Task 2.2: 生成 .xmind

**Files:**
- Read: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求一级用例.md`
- Produce: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求一级用例.xmind`

- [ ] **Step 1: 调用 xmind-gen**

Run:
```bash
engine/bin/kata xmind-gen \
  --input workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求一级用例.md \
  --output workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求一级用例.xmind \
  --project dataAssets \
  --steps-as-notes
```
Expected: 退出码 0，xmind 文件生成

> 备注：`archiveToJson` 需要 frontmatter（meta.project_name / meta.requirement_name）。若失败，需先给 MD 加 frontmatter。

- [ ] **Step 2: 验证 xmind 内容**

Run:
```bash
cd /tmp && rm -rf lt-xmind-verify && mkdir lt-xmind-verify && cd lt-xmind-verify \
  && unzip -q /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求一级用例.xmind \
  && python3 -c "
import json
with open('content.json') as f: data = json.load(f)
for sheet in data:
    root = sheet.get('rootTopic', {})
    print('Root:', root.get('title'))
    for c in root.get('children',{}).get('attached',[])[:5]:
        print(' L1:', c.get('title'), '(',len(c.get('children',{}).get('attached',[])),'kids)')
"
```
Expected: root 标题正确，下面有 6 个版本节点 (v6.4.3 等)，每个版本下有需求节点

- [ ] **Step 3: 更新 manifest.json**

修改 `workspace/dataAssets/features/2099-01-lt-dq-smoke/manifest.json`：
- `case_drafting.archive_path` 仍为 `archive.md`（主流程）
- 新增 `case_drafting.extra_files` 字段记录一级用例产物（如果 schema 允许）；否则放在 `files.xmind` 的备注中

实际改动：
```json
"files": {
  "archive": "archive.md",
  "xmind": "岚图主流程用例整理.xmind",
  ...
}
```
并新增（如果 schema 允许）：
```json
"extras": {
  "online_l1_md": "岚图已上线需求一级用例.md",
  "online_l1_xmind": "岚图已上线需求一级用例.xmind"
}
```

> 先 `engine/bin/kata cases-validate workspace/dataAssets/features/2099-01-lt-dq-smoke/manifest.json` 看 schema 是否接受 `extras` 字段；不接受则跳过此 Step。

- [ ] **Step 4: Commit**

```bash
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求一级用例.xmind \
        workspace/dataAssets/features/2099-01-lt-dq-smoke/manifest.json
git commit -m "docs(lt-dq-smoke): generate 岚图已上线需求一级用例.xmind"
```

---

## Phase 3: Task 2 主流程补强

### Task 3.1: 提取主流程子集 + 按 9 节点分桶

**Files:**
- Create: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/bucket-mainflow.py`
- Read: `岚图已上线需求一级用例.md`、设计稿「节点 → 需求映射建议」
- Produce: `workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/mainflow-buckets.md`（含 9 个节点的用例分桶建议）

- [ ] **Step 1: 写分桶脚本**

新建 `tmp/bucket-mainflow.py`：把锁定的一级用例按需求 ID 映射到 9 个节点。映射规则按设计稿「节点 → 候选需求来源」表：

```python
#!/usr/bin/env python3
"""按需求 ID 把一级用例分到 9 个主流程节点下。"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT.parent / "岚图已上线需求一级用例.md"
OUT = ROOT / "mainflow-buckets.md"

# 节点 → 需求路径关键词
BUCKETS = {
    "数据质量 → 规则库配置": ["质量内置规则库", "自定义sql模版", "内置规则增加规则项"],
    "数据质量 → 规则集管理": ["规则集管理"],
    "数据质量 → 规则任务管理": ["一个数据表支持创建多个质量规则任务", "编辑分区信息", "spark任务调参", "任务时长限制"],
    "数据质量 → 校验结果查询": ["规则校验详细结果表", "多表唯一性"],
    "数据质量 → 数据质量报告": ["质量报告管理", "质检式质量报告", "100W条数据", "报告支持持续生成", "报告搜索优化"],
    "数据质量 → 通用配置 → 报告关联维表设置": ["报告关联维表"],
    "数据质量 → 通用配置 → json格式校验管理": ["json格式配置"],
    "数据质量 → 项目管理 → 项目信息": [],  # 暂无明确需求源，标 TODO
    "数据标准 → 落标检查": ["dbc标准落标", "落标检查任务"],
}

# Parse final MD by requirement
md = SRC.read_text().split("\n")
sections = {}  # req -> list of (title, block)
cur_req = None
cur_case_title = None
cur_case_lines = []
for line in md:
    if line.startswith("### "):
        cur_req = line[4:].strip()
        sections.setdefault(cur_req, [])
    elif line.startswith("##### "):
        if cur_case_title:
            sections[cur_req].append((cur_case_title, cur_case_lines))
        cur_case_title = line[6:].strip()
        cur_case_lines = [line]
    elif cur_case_title:
        cur_case_lines.append(line)
if cur_case_title and cur_req:
    sections[cur_req].append((cur_case_title, cur_case_lines))

out = ["# 主流程补强分桶建议", "",
       "> 每个节点下列出建议合入的用例。Phase 3.2 / 3.3 据此覆写 archive.md + xmind。", ""]
for bucket, keywords in BUCKETS.items():
    out.append(f"## {bucket}")
    out.append("")
    if not keywords:
        out.append("> TODO: 未在 44 需求中找到直接对应的需求，需用户补充来源")
        out.append("")
        continue
    for req, cases in sections.items():
        if any(k in req for k in keywords):
            for title, _ in cases:
                out.append(f"- 来自 `{req}`：{title}")
    out.append("")

OUT.write_text("\n".join(out) + "\n")
print(f"Wrote {OUT}")
```

- [ ] **Step 2: 执行脚本**

Run: `python3 workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/bucket-mainflow.py`
Expected: 输出 9 个节点 + 对应用例清单

- [ ] **Step 3: 用户确认分桶**

向用户输出 `tmp/mainflow-buckets.md`，请用户确认每个节点下的用例选择是否合理（尤其是「项目管理 → 项目信息」TODO 那个）。**等用户回复**。

---

### Task 3.2: 覆写 archive.md 的数据质量 + 落标检查段

**Files:**
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-smoke/archive.md`（仅修改 数据质量 段 + 数据标准 → 落标检查 段）

- [ ] **Step 1: 定位 archive.md 待修改段**

Run:
```bash
grep -n "^## 数据质量\|^## 数据标准\|^### 落标检查\|^### 标准映射" workspace/dataAssets/features/2099-01-lt-dq-smoke/archive.md
```
Expected: 数据质量段起止行、落标检查段位置

- [ ] **Step 2: 备份原文件**

Run: `cp workspace/dataAssets/features/2099-01-lt-dq-smoke/archive.md /tmp/archive.md.bak`

- [ ] **Step 3: 重写数据质量段**

按 Task 3.1 的分桶结果，重写 `## 数据质量` 至下一个 `## ` 之前的内容。结构：
```md
## 数据质量

### 总览
（保留原有 2 个用例）

### 规则库配置
##### 【P1】... （来自分桶建议）
...

### 规则集管理
...

### 规则任务管理
...

### 校验结果查询
...

### 数据质量报告
...

### 通用配置
#### 报告关联维表设置
...
#### json格式校验管理
...

### 项目管理
#### 项目信息
（TODO 或保留空）
#### 脏数据管理
（保留原有 2 个用例）
```

> 用 Edit 工具按段替换；不要一次性覆写整个文件以保留其他段。

- [ ] **Step 4: 在 数据标准 段加 落标检查 子节**

定位 `### 标准落标` 或 `## 数据标准` 末尾，新增 `### 落标检查` 子节并填入 Task 3.1 分桶建议的用例。

- [ ] **Step 5: 验证产物**

Run:
```bash
diff /tmp/archive.md.bak workspace/dataAssets/features/2099-01-lt-dq-smoke/archive.md | head -60
grep -nE "^### |^##### " workspace/dataAssets/features/2099-01-lt-dq-smoke/archive.md | grep -A1 -B1 -E "数据质量|落标"
```
Expected: diff 仅覆盖 数据质量 段 + 落标检查 子节；其他模块（资产盘点/元数据/数据安全/平台管理）行号未变化

- [ ] **Step 6: Commit**

```bash
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/archive.md
git commit -m "docs(lt-dq-smoke): fill 数据质量 + 落标检查 mainflow sections"
```

---

### Task 3.3: 重生成主流程 xmind

**Files:**
- Read: 更新后的 `archive.md`
- Produce: 覆写 `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.xmind`

- [ ] **Step 1: 备份原 xmind**

Run: `cp workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.xmind /tmp/lt-mainflow.xmind.bak`

- [ ] **Step 2: 调用 xmind-gen（replace 模式）**

Run:
```bash
engine/bin/kata xmind-gen \
  --input workspace/dataAssets/features/2099-01-lt-dq-smoke/archive.md \
  --output workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.xmind \
  --mode replace \
  --project dataAssets \
  --steps-as-notes
```
Expected: 退出码 0

- [ ] **Step 3: 抽查 xmind 节点**

Run:
```bash
cd /tmp && rm -rf lt-mainflow-verify && mkdir lt-mainflow-verify && cd lt-mainflow-verify \
  && unzip -q /Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.xmind \
  && python3 -c "
import json
with open('content.json') as f: data = json.load(f)
def walk(n, d=0, mx=3):
    if d > mx: return
    t = n.get('title','?')[:40]
    kids = n.get('children',{}).get('attached',[])
    print('  '*d + f'- {t} ({len(kids)} kids)')
    for c in kids:
        walk(c, d+1, mx)
for s in data:
    walk(s.get('rootTopic',{}))
"
```
Expected:
- 数据质量 下 8 个子节点都不再是 0 kids（除 项目信息 视情况）
- 数据标准 下出现 落标检查 子节点且非 0 kids
- 其他模块（资产盘点 / 元数据 / 数据安全 / 平台管理）保持原结构

- [ ] **Step 4: 对比 diff**

如果你想保险，再用 Python 对比两份 content.json，确认非数据质量/非落标检查节点未变。

- [ ] **Step 5: Commit**

```bash
git add workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.xmind
git commit -m "docs(lt-dq-smoke): regenerate main-flow xmind with 数据质量 + 落标检查"
```

---

## 完成验收

- [ ] **Step 1: 通跑 engine 测试**

Run: `cd engine && bun test`
Expected: 全 PASS

- [ ] **Step 2: 验证产物清单**

Run:
```bash
ls -la workspace/dataAssets/features/2099-01-lt-dq-smoke/
```
Expected:
- `archive.md`（已更新，行数变化）
- `岚图已上线需求一级用例.md`（新增）
- `岚图已上线需求一级用例.xmind`（新增）
- `岚图主流程用例整理.xmind`（已覆写）
- `manifest.json`（已更新）
- `tmp/`（包含中间产物：白名单、候选表、脚本）

- [ ] **Step 3: 总结输出**

向用户报告：
- Phase 0：katacli 改造 commit `<hash>`
- Phase 1：候选 N 条，锁定 M 条
- Phase 2：一级用例 M 条 → MD + XMind
- Phase 3：9 个空叶子已补 K 个，剩余 (9-K) 个原因
- 总 commit 数 `git log main..HEAD --oneline | wc -l`

---

## 自查清单（写完计划后我自己过一遍）

- [x] 每个 task 文件路径明确
- [x] TDD 步骤完整：write test → run fail → implement → run pass → commit
- [x] 没有 TBD / TODO 字眼留在步骤里（Task 3.1 中的 TODO 是分桶建议，不是 plan 的 placeholder）
- [x] 类型/方法签名一致：`--include-paths`、`includePaths` 选项贯穿 0.2 全程
- [x] 阻塞点明确标注：Phase 1 末尾、Phase 3.1 末尾需用户介入
- [x] 与 spec 对应：
  - spec「katacli 改造」→ Phase 0
  - spec「候选表格 1-3 条 P1 主流程」→ Phase 1 Task 1.3
  - spec「新鲜度风险列」→ Task 1.3 脚本中的 STALE_TERMS
  - spec「9 个空叶子节点」→ Phase 3 Task 3.1 BUCKETS
  - spec「保留非空模块」→ Phase 3 Task 3.2 Step 3 强调"按段替换"
