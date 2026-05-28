# 用例级节点格式 SSOT 与 fewshot 落地 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `tmp/lt-dq-main-flow-sample.{md,xmind}` 沉淀的用例规范固化为 `case-draft/references/output-standard.md` 的 SSOT 章节，瘦身 case-qa / archive-xmind-sync / 双 skill.yaml hard_rules 的重复条款，并在双 skill 注入 md+xmind fewshot。

**Architecture:** 单一权威源（SSOT） + 反向引用。SSOT 落 `output-standard.md`，其他四个文件保留收发性条款 + 指针。fewshot 以精简 md + ASCII 树状 xmind 描述放在 `case-draft/references/fewshots/`，双 skill 共享挂载。

**Tech Stack:** Bun ≥ 1.3、kata projection render/lock、bun test、Biome、YAML、Markdown。

**Spec:** `docs/superpowers/specs/2026-05-26-case-level-format-ssot-design.md`

**取材源（只读）：** `workspace/dataAssets/features/2099-01-lt-dq-main-flow/tmp/lt-dq-main-flow-sample.{md,xmind}`

---

## 文件结构

新增（2）：

- `.ai/core/skills/case-draft/references/fewshots/case-format-sample.md` — 精简 md 用例样例（保留 1 条 P0 完整用例，作为格式参照）
- `.ai/core/skills/case-draft/references/fewshots/case-format-sample.xmind.md` — XMind 映射示意（ASCII 树状 + priority marker / notes / 真实换行标注）

改写（5）：

- `.ai/core/skills/case-draft/references/output-standard.md` — SSOT 扩写「用例级节点格式（Case-Level Normative）」
- `.ai/core/rules/case-qa.md` — 瘦身 + 反向引用 SSOT
- `.ai/core/skills/case-edit/references/archive-xmind-sync.md` — 瘦身 + 反向引用 SSOT
- `.ai/core/skills/case-draft/skill.yaml` — hard_rules 收敛 + few_shots 追加 2 条
- `.ai/core/skills/case-edit/skill.yaml` — hard_rules 收敛（含 codex_override 镜像） + 新建 few_shots 块

测试基线同步（1）：

- `engine/tests/ai-core/case-draft-hardrules-regression.test.ts` — 更新 COUNT + SHA256 基线

执行顺序：先 SSOT（Task 1）→ 反向引用瘦身（Task 2-3）→ skill.yaml 收敛 + few_shots（Task 4-5）→ fewshot 文件（Task 6-7）→ 基线同步（Task 8）→ projection render + lock + test 验收（Task 9）。每个 Task 独立产出可单测，单 commit。

---

## Worktree 准备

按仓库约束「Worktree 优先」，所有改动走 `.worktrees/<slug>`。

- [ ] **Step 0.1: 创建 worktree**

Run:
```bash
cd /Users/poco/Projects/kata
git worktree add .worktrees/case-level-format-ssot -b feat/case-level-format-ssot main
cd .worktrees/case-level-format-ssot
```

Expected: 新分支 `feat/case-level-format-ssot` 与 worktree 目录创建成功；后续所有 Task 在该目录下执行。

- [ ] **Step 0.2: 确认 worktree 干净且基于最新 main**

Run:
```bash
git status
git log -1 --oneline
```

Expected: working tree clean；HEAD 为 main 最新 commit（应包含 `9a1dae202 docs: 📐 fix hard_rules count and budget statement ...`）。

---

## Task 1: 在 output-standard.md 写入 SSOT 章节

**Files:**
- Modify: `.ai/core/skills/case-draft/references/output-standard.md`（在文件末尾新增章节）

- [ ] **Step 1.1: 读取当前文件确认基线**

Run:
```bash
wc -l .ai/core/skills/case-draft/references/output-standard.md
```

Expected: 36 行（当前内容到「证据底线」结束）。

- [ ] **Step 1.2: 在文件末尾 append SSOT 章节 + 顶部加 SSOT 声明**

完整新增内容（在文件末尾追加）：

````markdown

## 用例级节点格式（Case-Level Normative）

本节是用例级（H5 用例标题及其所有子节点）格式的唯一权威源（SSOT）。
- `.ai/core/rules/case-qa.md`、`case-edit/references/archive-xmind-sync.md`、case-draft skill.yaml、case-edit skill.yaml 中如出现条款冲突，以本节为准。
- 标 `(硬)` 的条款均视为 hard_rule，违反必须阻塞产出。

### 通用 — Markdown 用例节点

1. (硬) 层级：`## 一级模块` → `### 二级模块` → `#### 子分组(可选)` → `##### 【Pn】用例标题`。用例 = H5。
2. (硬) 标题结构：`【Pn】+ 验证动词 + 验证对象 + 验证场景/结果`。验证对象内可嵌套业务括号 `【...】`（如规则名、字段类型）。
3. (硬) 标题禁机器标识：TC-ID、SR-、RA- 等一律不进标题。
4. (硬) 括号语义：`【】` 专用于 `【Pn】` 与业务子括号；`「」` 专用于 UI/菜单/按钮/字段/选项名。
5. (硬) 用例正文按顺序包含两个 blockquote 段落，且只能出现一次：
   - `> 前置条件` → 紧跟一个 ` ```sql ` 代码块。
   - `> 用例步骤` → 紧跟一个三列表格 `| 编号 | 步骤 | 预期 |`。
6. (硬) 前置条件代码块内部结构：
   - 顶部 `/* ... */` 多行 SQL 注释，逐条编号描述「依赖的环境/数据源/通用配置/SQL 准备目的」。
   - 紧随可执行 SQL（USE / DROP / CREATE / INSERT / SELECT）；每条验证用 SELECT 末尾用 `-- 预期结果：N` 行内注释标注期望返回。
   - 环境差异项（数据库/Schema/表/库）一律用 `${SchemaA}` 等占位符；不得硬编码租户库名。
   - 非 SQL 的说明文字必须写在 `/* ... */` 注释块内，不得与可执行 SQL 混排。
7. (硬) 步骤表格规则：
   - 「步骤」单元格写「动作 + 冒号 + 配置项列表」，配置项以 `<br>- ` 拆行。进入路径用 `进入【模块 → 页面】`，按钮/字段用 `「」`。
   - 「预期」单元格用 `1)` `2)` … 编号断言，多条预期用 `<br>` 拆行。禁用「页面正常打开」之类空泛断言作为唯一预期。
   - 一行表格 = 一个交互页面/阶段的操作；不同页面（如「监控规则」与「调度属性」）必须拆成不同行。
   - 编号必须与操作发生顺序一致。
   - 表单中如有「规则描述」「备注」等描述类字段，必须填写有业务含义的内容，不得留空；预期需验证「保存 + 详情回显」。

### 通用 — XMind 用例节点（镜像 Markdown）

8. (硬) 用例 topic title = Markdown H5 标题原文（含 `【Pn】` 前缀，含业务括号）。
9. (硬) 用例 topic 必须挂 priority marker，对照表：

   | Markdown 标题前缀 | XMind markerId |
   | --- | --- |
   | `【P0】` | `priority-1` |
   | `【P1】` | `priority-2` |
   | `【P2】` | `priority-3` |
   | `【P3】` | `priority-4` |

10. (硬) 用例 topic 的 `notes.plain.content` = Markdown 前置条件代码块**裸内容**（含 `/* */` 注释 + SQL，不带 ```sql 围栏）。
11. (硬) 用例 topic 的 attached children = 步骤列表；每个步骤是一个 child topic，title = markdown 表「步骤」单元格的**真实换行**版本（把 `<br>` 还原为 `\n`，把 `<br>- ` 还原为 `\n- `）。
12. (硬) 每个步骤 topic 下挂**一个**预期 grandchild topic，title = markdown 表「预期」单元格的真实换行版本。
13. (硬) XMind 节点 title 与 notes 内一律禁出现 `<br>`。超长 SQL/前置/步骤/预期需要拆成 children 或 notes，不得堆进单 title。
14. (硬) 单个步骤 topic title 不得包含 3 个及以上 `「...」` 引号项；超过须再拆 child 或换行。

### 数据质量子集 — DQ 规则任务管理类用例

15. (硬) 标题对象部分用三段式 `【校验类型-生效范围-统计函数】`（如 `【完整性校验-字段级-空值数】`），保留业务括号。
16. (硬) 前置条件 SQL 必须包含：`USE ${SchemaA}` → DROP/CREATE 分区表（带 `PARTITIONED BY`、`STORED AS ORC`）→ 多分区 INSERT 制造正/异常数据 → SELECT 校验空值数/期望值。
17. (硬) 步骤必须按业务前置链顺序：
    1. 「规则集管理」新建规则集 + 规则包；
    2. 在规则包中新增校验规则（含「规则描述」必填业务句）；
    3. 「规则任务管理」新建监控规则；
    4. 引用规则包；
    5. 配置「调度属性」并执行；
    6. 进入「校验结果查询」查询实例详情。
18. (硬) 正/异常对照不得通过改规则集期望值制造失败。保持规则集 + 规则包内容不变，只在「规则任务管理」编辑任务分区后再执行。
19. (硬) 「规则描述」字段必填业务含义句；预期必须验证「保存成功 + 规则集详情回显规则描述」。
````

同时在文件开头插入 SSOT 声明 — 用 Edit 把原文「# case-draft 输出产物标准（normative）」下一行（第 2 行）替换为：

```markdown
# case-draft 输出产物标准（normative）

> 本文件中带 `(硬)` 的条款均为 hard_rules。文末「## 用例级节点格式（Case-Level Normative）」节是用例级格式 SSOT：case-qa.md、archive-xmind-sync.md、case-draft skill.yaml、case-edit skill.yaml 在用例级条款上一律反向引用本节，发生冲突以本节为准。

```

- [ ] **Step 1.3: 验证修改**

Run:
```bash
wc -l .ai/core/skills/case-draft/references/output-standard.md
head -5 .ai/core/skills/case-draft/references/output-standard.md
grep -c "^### " .ai/core/skills/case-draft/references/output-standard.md
grep -c "(硬)" .ai/core/skills/case-draft/references/output-standard.md
```

Expected: 行数大幅增加（≈120 行）；首段含 SSOT 声明 blockquote；至少 3 个 `### ` 子标题（通用 md / 通用 xmind / DQ 子集）；至少 19 处 `(硬)` 标注。

- [ ] **Step 1.4: Commit**

```bash
git add .ai/core/skills/case-draft/references/output-standard.md
git commit -m "docs: 📐 add case-level format SSOT section in output-standard.md"
```

---

## Task 2: 瘦身 case-qa.md，反向引用 SSOT

**Files:**
- Modify: `.ai/core/rules/case-qa.md`

- [ ] **Step 2.1: 整段替换**

把现文件整体替换为以下内容（保留首段「自检要求」、文末「产物变更后检查」，合并并指针化中间三节）：

```markdown
# QA 产物质量检查

## 自检要求

创建或编辑 Archive Markdown、XMind、CSV 衍生用例或标准化 QA 产物后，交付前必须自检，不得依赖用户发现格式或业务规则缺陷。

## 一致性自检维度

Archive Markdown 与 XMind 必须从同一用例模型生成/更新，逐字段比对以下六维必须一致：

- 版本/模块
- 需求
- 标题
- 优先级/marker
- 前置条件
- 步骤
- 预期结果

用户明确指定用例标题或历史标题包含业务括号（如「验证【规则名】...」）时，必须原样保留业务括号内容，不得按通用标题规则移除。

用例级节点的所有格式细节（标题三段式、前置条件 SQL 注释块、`${SchemaA}` 占位符、步骤=单页面、预期编号写法、XMind topic 镜像与 priority marker 对照、数据质量「规则集 → 规则任务」前置链、分区切换正负样本约束等）一律以 `.ai/core/skills/case-draft/references/output-standard.md#用例级节点格式（Case-Level Normative）` 为准。

## 产物变更后检查

QA 产物编辑后执行以下专项检查：
- 用例数量和优先级分布
- Markdown/XMind 一致性
- XMind 标记分布
- 过期术语/菜单名称残留
- 涉及模块相关的领域规则扫描
```

- [ ] **Step 2.2: 验证**

Run:
```bash
wc -l .ai/core/rules/case-qa.md
grep -c "^## " .ai/core/rules/case-qa.md
grep -c "Case-Level Normative" .ai/core/rules/case-qa.md
```

Expected: 行数 ≤25；三个 `## ` 节；含 1 处反向引用。

- [ ] **Step 2.3: Commit**

```bash
git add .ai/core/rules/case-qa.md
git commit -m "docs: 📐 slim case-qa rules and point to SSOT"
```

---

## Task 3: 瘦身 archive-xmind-sync.md，反向引用 SSOT

**Files:**
- Modify: `.ai/core/skills/case-edit/references/archive-xmind-sync.md`

- [ ] **Step 3.1: 整段替换**

完整新内容：

```markdown
# Archive XMind 同步

跨 Archive Markdown、XMind、CSV 或标准化归档格式维护既有 QA 用例产物时，参照本文。

用例意图须在格式间保持稳定——层级、标题、前置条件、步骤、预期结果、标签、优先级与标识符（若存在），一律保留。目标格式无法直接承载某字段时，将信息落到最近的显式备注或元数据字段，不得静默丢弃。

交付前必须主动自审，不得把格式、同步或业务规则缺陷留给用户人工发现。至少校验：Archive frontmatter `case_count` 与实际用例数一致；Archive 与 XMind 的版本/模块、需求、标题、优先级/marker、前置条件、步骤、预期逐条一致；XMind priority marker 分布符合预期；旧术语、旧菜单名或用户指定替换项无残留。

用例级节点的所有格式细节（标题与括号语义、前置条件 SQL 注释块、`${SchemaA}` 占位符、步骤表格写法、XMind topic 镜像/priority marker/notes 约束、数据质量「规则集 → 规则任务」前置链、分区切换正负样本规则、规则描述必填等）一律以 `.ai/core/skills/case-draft/references/output-standard.md#用例级节点格式（Case-Level Normative）` 为准；DQ 规则任务管理类用例额外遵循该节「数据质量子集」段。

编辑诉求模糊时，须先以一个澄清问题确认意图，之后再触碰用例语义。源产物冲突时，以用户指定的来源为权威；未解决的分歧记入 pending items。

本 skill 不得依据 PRD 生成新的需求覆盖——新的 PRD 到用例生成，须路由至 case-draft product skill。

## corrections 触发的同步

当 `/case-edit apply-corrections` 在落地阶段调用本同步契约时，xmind 节点定位以 `case-corrections.md` 中每条 correction 的 `case_ref` 字段为权威：`case_ref` 形如 `archive.md#L120 / cases.xmind 节点 数据质量 > 概览 > P0-1`，本同步过程必须按"cases.xmind 节点"分号后给出的节点路径直接定位 xmind topic，再把已修改的 archive 文本同步到该 topic 的 title/notes，不得重新解析 archive 全文反推映射。

同步前先快照 archive.md（可用 `git stash` 或临时副本）；若同步后 archive↔xmind 自检（数量、优先级、标题、前置条件、步骤、预期 6 项一致）失败，必须回滚 archive 改动到快照点，并在 apply-log 中标记 `failed_xmind_sync`，对应 correction status 不得置 applied。
```

- [ ] **Step 3.2: 验证**

Run:
```bash
wc -l .ai/core/skills/case-edit/references/archive-xmind-sync.md
grep -c "Case-Level Normative" .ai/core/skills/case-edit/references/archive-xmind-sync.md
grep -c "corrections 触发的同步" .ai/core/skills/case-edit/references/archive-xmind-sync.md
```

Expected: 行数 ≤25；1 处反向引用；corrections 节保留。

- [ ] **Step 3.3: Commit**

```bash
git add .ai/core/skills/case-edit/references/archive-xmind-sync.md
git commit -m "docs: 📐 slim archive-xmind-sync and point to SSOT"
```

---

## Task 4: case-draft skill.yaml hard_rules 收敛 + few_shots 追加

**Files:**
- Modify: `.ai/core/skills/case-draft/skill.yaml`

- [ ] **Step 4.1: 替换 hard_rules 末尾四条为单条指针**

当前 hard_rules 共 20 条。用 Edit 删除以下四条（第 83-86 行的语义对应条款），并替换为单条指针：

删除四条：
- 「archive.md/cases.xmind 用例标题禁止任何机器标识（TC-ID、SR-、RA-）；标题仅 `【Pn】` 前缀 + 自然中文动宾句。」
- 「括号语义：`【】` 专用于 `【Pn】` 优先级前缀，`「」` 用于所有 UI/菜单/选项/字段名。」
- 「每条用例每步预期必须具体可验，禁止「页面正常打开」之类空泛断言作为唯一预期。」
- 「证据底线：Lanhu 设计内容或相关源码读取失败时，用 ask_user 一次性批量索要缺口，不得凭历史/推断产出最终 archive.md/cases.xmind。」

新增一条指针（放在被删四条原位置，紧跟「交付层仅 archive.md/cases.xmind/metadata.yaml/manifest.json 四件...」之后）：

```yaml
      - 用例级节点格式与内容质量条款以 references/output-standard.md#用例级节点格式（Case-Level Normative） 为准；该文件标 (硬) 的条款均视为 hard_rule。证据底线：Lanhu 设计内容或相关源码读取失败时，用 ask_user 一次性批量索要缺口，不得凭历史/推断产出最终 archive.md/cases.xmind。
```

注：证据底线保留在指针条款里（因为它不是格式条款，而是行为底线）。

- [ ] **Step 4.2: 追加 few_shots 两条**

当前 `few_shots:` 块只挂一条 `references/confirmation-package-template.md`。Edit 把整个 few_shots 块替换为：

```yaml
few_shots:
  - path: references/confirmation-package-template.md
    load_phases:
      - confirmation-package
    purpose: 仅供确认包问题组织格式参考，不作需求事实来源。
    load_when: step.id == confirmation-package
    max_tokens: 1200
  - path: references/fewshots/case-format-sample.md
    load_phases:
      - case-draft
      - output
    purpose: 用例级节点格式参照（含 DQ 子集），仅用于格式参考，不作需求事实来源。
    load_when: step.id in [case-draft, output]
    max_tokens: 3000
  - path: references/fewshots/case-format-sample.xmind.md
    load_phases:
      - case-draft
      - output
    purpose: XMind 用例 topic 与 md 用例的映射对照（ASCII 树状示意，非真 .xmind）。
    load_when: step.id in [case-draft, output]
    max_tokens: 1500
```

- [ ] **Step 4.3: 验证**

Run:
```bash
grep -c "^      - " .ai/core/skills/case-draft/skill.yaml | head -1
python3 -c "import yaml; d=yaml.safe_load(open('.ai/core/skills/case-draft/skill.yaml')); print('hard_rules:', len(d['body']['always_load']['hard_rules'])); print('few_shots:', len(d['few_shots']))"
```

Expected: `hard_rules: 17`（20 - 4 + 1）；`few_shots: 3`。

- [ ] **Step 4.4: Commit**

```bash
git add .ai/core/skills/case-draft/skill.yaml
git commit -m "feat: 📐 collapse case-draft hard_rules into SSOT pointer and add format fewshots"
```

---

## Task 5: case-edit skill.yaml hard_rules 收敛 + 新建 few_shots

**Files:**
- Modify: `.ai/core/skills/case-edit/skill.yaml`

- [ ] **Step 5.1: 替换 always_load.hard_rules 后 9 条为单条指针**

case-edit `body.always_load.hard_rules` 当前共 13 条（第 51-63 行）。保留前 4 条 + 第 5 条（业务括号保留）共 5 条；删除第 6-13 条（XMind 可读性、`<br>` 转真实换行、动作冒号写法、规则描述必填、拆步骤、XMind 打开性能、规则任务管理前置链、分区切换正负样本、占位符 SQL 注释块）。

被删的 8 条之后追加 1 条指针：

```yaml
      - 用例级节点格式与可读性以 .ai/core/skills/case-draft/references/output-standard.md#用例级节点格式（Case-Level Normative） 为准；DQ 规则任务管理类用例额外遵循该节「数据质量子集」段。
```

最终 `always_load.hard_rules` 锁定为 5 条：
1. 编辑或同步用例时，原有语义须完整保留。
2. 缺失的前置条件、步骤或预期结果，不得凭空补造。
3. 交付前必须自审 Archive Markdown 与 XMind 的数量、优先级、标题、前置条件、步骤和预期一致性，不得依赖用户人工发现格式或业务规则问题。
4. 用户明确指定用例标题或历史标题包含业务括号（如「验证【规则名】...」）时，必须原样保留业务括号内容，不得按通用标题规则移除。
5. 用例级节点格式与可读性以 .ai/core/skills/case-draft/references/output-standard.md#用例级节点格式（Case-Level Normative） 为准；DQ 规则任务管理类用例额外遵循该节「数据质量子集」段。

「同步自检」语义已被第 3 条覆盖，无需再补一条。

- [ ] **Step 5.2: 镜像替换 codex_override.hard_rules**

case-edit 在 `body.codex_override.hard_rules`（第 67-80 行）有完全相同的 13 条 mirror。按 Step 5.1 同样规则替换，确保两套 hard_rules 文本完全一致。

- [ ] **Step 5.3: 在 references 块之前插入 few_shots 块**

case-edit 当前没有 `few_shots:` 块。在 `references:`（第 81 行）之前插入：

```yaml
few_shots:
  - path: ../case-draft/references/fewshots/case-format-sample.md
    load_phases:
      - plan_edit
      - output
    purpose: 用例级节点格式参照（含 DQ 子集），仅用于格式参考，不作需求事实来源。
    load_when: step.id in [plan_edit, output]
    max_tokens: 3000
  - path: ../case-draft/references/fewshots/case-format-sample.xmind.md
    load_phases:
      - plan_edit
      - output
    purpose: XMind 用例 topic 与 md 用例的映射对照（ASCII 树状示意，非真 .xmind）。
    load_when: step.id in [plan_edit, output]
    max_tokens: 1500
```

注：路径用 `../case-draft/references/fewshots/...` 跨 skill 引用同一份样例文件，避免重复维护。如果 product-skill-contract 测试不接受跨 skill 相对路径，回退方案：把两份 fewshot 在 case-edit/references/fewshots/ 下做 symlink（Step 7 兜底）。

- [ ] **Step 5.4: 验证**

Run:
```bash
python3 -c "
import yaml
d = yaml.safe_load(open('.ai/core/skills/case-edit/skill.yaml'))
print('always_load.hard_rules:', len(d['body']['always_load']['hard_rules']))
print('codex_override.hard_rules:', len(d['body']['codex_override']['hard_rules']))
print('few_shots:', len(d.get('few_shots', [])))
assert d['body']['always_load']['hard_rules'] == d['body']['codex_override']['hard_rules'], 'mirror mismatch'
print('mirror ok')
"
```

Expected: `always_load.hard_rules: 5`；`codex_override.hard_rules: 5`；`few_shots: 2`；`mirror ok`。

- [ ] **Step 5.5: Commit**

```bash
git add .ai/core/skills/case-edit/skill.yaml
git commit -m "feat: 📐 collapse case-edit hard_rules into SSOT pointer and add format fewshots"
```

---

## Task 6: 新建 case-format-sample.md fewshot

**Files:**
- Create: `.ai/core/skills/case-draft/references/fewshots/case-format-sample.md`
- Read source: `workspace/dataAssets/features/2099-01-lt-dq-main-flow/tmp/lt-dq-main-flow-sample.md`

- [ ] **Step 6.1: 准备目录**

Run:
```bash
mkdir -p .ai/core/skills/case-draft/references/fewshots
```

- [ ] **Step 6.2: 写入 fewshot md（基于 tmp 样例精简）**

完整文件内容：

````markdown
<!--
用例级节点格式 fewshot — 仅供 case-draft / case-edit 在 case-draft / output / plan_edit 阶段参考格式
取材：workspace/dataAssets/features/2099-01-lt-dq-main-flow/tmp/lt-dq-main-flow-sample.md
SSOT：.ai/core/skills/case-draft/references/output-standard.md#用例级节点格式（Case-Level Normative）

格式速查（看完此条 P0 用例即可对齐所有要点）：
- 标题：【Pn】+ 验证动词 + 验证对象【业务括号】+ 验证场景
- 前置条件：> 前置条件 + ```sql 块（顶部 /* ... */ 多行注释说明环境与目的；可执行 SQL；SELECT 末尾 -- 预期结果：N）
- 步骤表格：| 编号 | 步骤 | 预期 |，步骤=「动作 + 冒号 + <br>- 配置列表」，预期=「1) 2) 编号断言」
- 占位符：数据库/Schema 用 ${SchemaA} 等；不得硬编码租户库名
- 业务括号：UI/字段用「」；优先级与业务对象用【】
- 步骤=单页面：监控规则 / 调度属性等不同页面动作必须拆成不同行
- 规则描述等描述字段必填，预期需验证保存+回显
-->

---
suite_name: "<replace-when-rendering>"
description: "<replace-when-rendering>"
tags:
  - "<replace-when-rendering>"
create_at: "<replace-when-rendering>"
status: "<replace-when-rendering>"
case_count: 1
---

### 数据质量

#### 规则任务管理

##### 【P0】验证【完整性校验-字段级-空值数】质量规则任务校验正常

> 前置条件

```sql
/*
1. 已引入 SparkThrift2.x 数据源，数据库 ${SchemaA}。
2. 已在【数据质量 → 通用配置 → 报告关联维表设置】中为表 dwd_voyah_dq_vehicle_null_cnt 设置：
-- 车辆数统计字段：vehicle_count
-- 车系关联字段：car_series_code
-- 车型关联字段：car_model_code
-- 动力类型关联字段：power_type
3. 执行以下 SparkThrift2.x 前置 SQL，准备分区表和测试数据。
*/

USE ${SchemaA};

DROP TABLE IF EXISTS dwd_voyah_dq_vehicle_null_cnt;

CREATE TABLE dwd_voyah_dq_vehicle_null_cnt (
  order_id STRING COMMENT '销售订单号',
  vin STRING COMMENT '车辆识别代码',
  vehicle_count BIGINT COMMENT '车辆数统计字段',
  car_series_code STRING COMMENT '车系关联字段',
  car_series_name STRING COMMENT '车系名称',
  car_model_code STRING COMMENT '车型关联字段',
  car_model_name STRING COMMENT '车型名称，用于空值数校验',
  power_type STRING COMMENT '动力类型关联字段',
  final_price DECIMAL(20,2) COMMENT '最终成交价',
  delivery_center STRING COMMENT '交付中心'
)
COMMENT '岚图车辆质量规则字段级空值数测试表'
PARTITIONED BY (stat_date STRING COMMENT '分区字段，格式 yyyyMMdd')
STORED AS ORC;

INSERT INTO TABLE dwd_voyah_dq_vehicle_null_cnt PARTITION (stat_date='20260115')
VALUES
('ORD_NULL_001','LTV_FREE_001',1,'FREE','岚图FREE','FREE_STD','岚图FREE 标准版','REEV',261900.00,'武汉交付中心'),
('ORD_NULL_002','LTV_DREAM_002',1,'DREAM','岚图梦想家','DREAM_LONG','岚图梦想家 长续航版','PHEV',365000.00,'杭州交付中心'),
('ORD_NULL_003','LTV_PASSION_003',1,'PASSION','岚图追光','PASSION_STD',NULL,'EV',252800.00,'深圳交付中心'),
('ORD_NULL_004','LTV_FREE_004',1,'FREE','岚图FREE','FREE_LONG','岚图FREE 长续航版','REEV',260000.00,'成都交付中心');

INSERT INTO TABLE dwd_voyah_dq_vehicle_null_cnt PARTITION (stat_date='20260116')
VALUES
('ORD_NULL_005','LTV_FREE_005',1,'FREE','岚图FREE','FREE_STD','岚图FREE 标准版','REEV',262000.00,'上海交付中心');

SELECT COUNT(1) AS car_model_name_null_cnt
FROM dwd_voyah_dq_vehicle_null_cnt
WHERE stat_date='20260115' AND car_model_name IS NULL;
-- 预期结果：1

SELECT COUNT(1) AS car_model_name_null_cnt
FROM dwd_voyah_dq_vehicle_null_cnt
WHERE stat_date='20260116' AND car_model_name IS NULL;
-- 预期结果：0
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理】, 点击「新建规则集」:<br>- 选择数据源: SparkThrift2.x<br>- 选择数据库: ${SchemaA}<br>- 选择数据表: dwd_voyah_dq_vehicle_null_cnt<br>- 规则集描述: 完整性字段级空值数校验<br>- 新增规则包名称: 字段空值数规则包<br>点击「下一步」 | 1)规则集基础信息保存成功<br>2)规则包创建成功 |
| 2 | 选择规则包(字段空值数规则包), 新增「完整性校验」规则:<br>- 生效范围: 字段级<br>- 字段: car_model_name<br>- 统计函数: 空值数<br>- 过滤条件: 无<br/>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 校验指定分区内车型名称空值数为0<br/>点击「保存」并保存规则集 | 1)规则保存成功<br>2)规则集详情中展示 car_model_name 空值数规则<br>3)期望值为固定值 = 0<br>4)规则描述展示为「校验指定分区内车型名称空值数为0」 |
| 3 | 进入【数据质量 → 规则任务管理】, 点击「新建监控规则」:<br>- 规则名称: SparkThrift2.x+完整性校验+字段级+空值数<br>- 选择数据源: SparkThrift2.x<br/>- 选择数据库: ${SchemaA}<br>- 选择数据表: dwd_voyah_dq_vehicle_null_cnt<br>- 选择已有分区: stat_date='20260116'<br>点击「下一步」 | 1)监控对象配置成功<br>2)进入监控规则页面 |
| 4 | 在「监控规则」中引用质量规则:<br>- 规则包: 字段空值数规则包<br/>- 规则类型: 完整性校验<br/>点击「下一步」 | 1)监控规则配置成功<br/>2)进入调度属性页面 |
| 5 | 在「调度属性」中配置:<br/>1)调度配置:<br/>- 调度周期: 手动触发<br>- 规则拼接包: 1<br/>- 实例生成方式: 立即生成<br>- 超时时间: 不限制<br/>2)告警配置: 无<br/>3)报告配置: 无需生成报告<br/>点击保存, 进入规则任务${SchemaA}.dwd_voyah_dq_vehicle_null_cnt详情页, 点击「立即执行」 | 1)调度属性配置成功<br>2)规则任务保存成功<br>3)进入规则任务${SchemaA}.dwd_voyah_dq_vehicle_null_cnt详情页<br>4)任务提交执行成功 |
| 6 | 进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+完整性校验+字段级+空值数)最新实例详情 | 1)最新实例为「校验通过」<br>2)car_model_name 空值数实际值为 0<br>3)期望值为 0<br>4)明细仅统计 stat_date='20260116' 分区 |
| 7 | 进入【数据质量 → 规则任务管理】, 编辑规则任务(SparkThrift2.x+完整性校验+字段级+空值数), 仅变更选择分区:<br>- 选择已有分区: stat_date='20260116' -> stat_date='20260115'<br>保存后再次点击「立即执行」 | 1)规则集和规则包内容未改动<br>2)任务分区保存成功<br>3)任务提交执行成功 |
| 8 | 进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+完整性校验+字段级+空值数)最新实例详情 | 1)最新实例为「校验不通过」<br>2)car_model_name 空值数实际值为 1<br>3)期望值为 0<br>4)不通过明细包含 order_id=ORD_NULL_003<br>5)明细仅统计 stat_date='20260115' 分区 |
````

注：与原 tmp 样例完全一致，仅 frontmatter 改为占位符；8 步骤全保留以展示「步骤=单页面」「正/异常分区切换」「规则描述必填」等所有特征。

- [ ] **Step 6.3: 验证**

Run:
```bash
wc -l .ai/core/skills/case-draft/references/fewshots/case-format-sample.md
grep -c "^| " .ai/core/skills/case-draft/references/fewshots/case-format-sample.md
grep -c '`\${SchemaA}`' .ai/core/skills/case-draft/references/fewshots/case-format-sample.md
grep -c "格式速查" .ai/core/skills/case-draft/references/fewshots/case-format-sample.md
```

Expected: 行数 ≈90；至少 10 行表格（表头 + 8 步骤 + 分隔）；至少 1 处占位符（SQL 块内）；含「格式速查」HTML 注释。

- [ ] **Step 6.4: Commit**

```bash
git add .ai/core/skills/case-draft/references/fewshots/case-format-sample.md
git commit -m "feat: 📐 add case-format-sample.md fewshot (P0 DQ rule task case)"
```

---

## Task 7: 新建 case-format-sample.xmind.md fewshot（ASCII 树状映射示意）

**Files:**
- Create: `.ai/core/skills/case-draft/references/fewshots/case-format-sample.xmind.md`

- [ ] **Step 7.1: 写入 xmind 映射 fewshot**

完整文件内容：

````markdown
<!--
XMind 用例 topic 与 Markdown 用例的映射示意（ASCII 树状）
SSOT：.ai/core/skills/case-draft/references/output-standard.md#用例级节点格式（Case-Level Normative）
配套 md fewshot：./case-format-sample.md

为什么用 ASCII 树状而非真 .xmind：
- 真 .xmind 是 zip + JSON，模型只能看到压缩后的 JSON 文本，结构反而被掩盖；
- 此处用 ASCII 树状直白展示「md 表格 → xmind topic 父子链」「priority marker」「notes 与裸 SQL」三套映射规则。
-->

## 映射对照表

| Markdown 元素 | XMind topic 对应 |
| --- | --- |
| `##### 【Pn】<标题>` | 用例 topic：title=`【Pn】<标题>` + `markers=[priority-N]` |
| `> 前置条件` 后的 ```sql 块 | 用例 topic 的 `notes.plain.content`，裸内容（不带 ```sql 围栏） |
| 表格的每一行「步骤」单元格 | 用例 topic 下的 step child topic：title=步骤文本（`<br>` 还原为换行） |
| 表格同一行的「预期」单元格 | step child 下的 expected grandchild topic：title=预期文本（`<br>` 还原为换行） |

priority marker 对照：

| Markdown 标题前缀 | XMind markerId |
| --- | --- |
| `【P0】` | `priority-1` |
| `【P1】` | `priority-2` |
| `【P2】` | `priority-3` |
| `【P3】` | `priority-4` |

## 完整结构示意（基于同目录 case-format-sample.md）

```
画布 1 (sheet)
└── 岚图主流程用例集合-样例 (rootTopic)
    └── 数据质量                              [一级模块 H3]
        └── 规则任务管理                       [二级模块 H4]
            └── 【P0】验证【完整性校验-字段级-空值数】质量规则任务校验正常
                │   [markers: priority-1]
                │   [notes.plain.content =
                │     /*
                │     1. 已引入 SparkThrift2.x 数据源，数据库 ${SchemaA}。
                │     2. 已在【数据质量 → 通用配置 → 报告关联维表设置】中为表 dwd_voyah_dq_vehicle_null_cnt 设置：
                │     -- 车辆数统计字段：vehicle_count
                │     ...
                │     3. 执行以下 SparkThrift2.x 前置 SQL，准备分区表和测试数据。
                │     */
                │     USE ${SchemaA};
                │     DROP TABLE IF EXISTS dwd_voyah_dq_vehicle_null_cnt;
                │     CREATE TABLE dwd_voyah_dq_vehicle_null_cnt (...)
                │     ...
                │     SELECT COUNT(1) AS car_model_name_null_cnt
                │     FROM dwd_voyah_dq_vehicle_null_cnt
                │     WHERE stat_date='20260115' AND car_model_name IS NULL;
                │     -- 预期结果：1
                │     ...
                │   ]
                │
                ├── 进入【数据质量 → 规则集管理】, 点击「新建规则集」:    [step child topic — title 真实换行]
                │       - 选择数据源: SparkThrift2.x
                │       - 选择数据库: ${SchemaA}
                │       - 选择数据表: dwd_voyah_dq_vehicle_null_cnt
                │       - 规则集描述: 完整性字段级空值数校验
                │       - 新增规则包名称: 字段空值数规则包
                │       点击「下一步」
                │   └── 1)规则集基础信息保存成功               [expected grandchild — 真实换行]
                │       2)规则包创建成功
                │
                ├── 选择规则包(字段空值数规则包), 新增「完整性校验」规则:
                │       - 生效范围: 字段级
                │       - 字段: car_model_name
                │       - 统计函数: 空值数
                │       - 过滤条件: 无
                │       - 校验方法: 固定值
                │       - 期望值: = 0
                │       - 强弱规则: 强规则
                │       - 规则描述: 校验指定分区内车型名称空值数为0
                │       点击「保存」并保存规则集
                │   └── 1)规则保存成功
                │       2)规则集详情中展示 car_model_name 空值数规则
                │       3)期望值为固定值 = 0
                │       4)规则描述展示为「校验指定分区内车型名称空值数为0」
                │
                ├── 进入【数据质量 → 规则任务管理】, 点击「新建监控规则」:
                │       - 规则名称: SparkThrift2.x+完整性校验+字段级+空值数
                │       - 选择数据源: SparkThrift2.x
                │       - 选择数据库: ${SchemaA}
                │       - 选择数据表: dwd_voyah_dq_vehicle_null_cnt
                │       - 选择已有分区: stat_date='20260116'
                │       点击「下一步」
                │   └── 1)监控对象配置成功
                │       2)进入监控规则页面
                │
                ├── 在「监控规则」中引用质量规则:
                │       - 规则包: 字段空值数规则包
                │       - 规则类型: 完整性校验
                │       点击「下一步」
                │   └── 1)监控规则配置成功
                │       2)进入调度属性页面
                │
                ├── 在「调度属性」中配置:
                │       1)调度配置:
                │       - 调度周期: 手动触发
                │       - 规则拼接包: 1
                │       - 实例生成方式: 立即生成
                │       - 超时时间: 不限制
                │       2)告警配置: 无
                │       3)报告配置: 无需生成报告
                │       点击保存, 进入规则任务${SchemaA}.dwd_voyah_dq_vehicle_null_cnt详情页, 点击「立即执行」
                │   └── 1)调度属性配置成功
                │       2)规则任务保存成功
                │       3)进入规则任务${SchemaA}.dwd_voyah_dq_vehicle_null_cnt详情页
                │       4)任务提交执行成功
                │
                ├── 进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+完整性校验+字段级+空值数)最新实例详情
                │   └── 1)最新实例为「校验通过」
                │       2)car_model_name 空值数实际值为 0
                │       3)期望值为 0
                │       4)明细仅统计 stat_date='20260116' 分区
                │
                ├── 进入【数据质量 → 规则任务管理】, 编辑规则任务(SparkThrift2.x+完整性校验+字段级+空值数), 仅变更选择分区:
                │       - 选择已有分区: stat_date='20260116' -> stat_date='20260115'
                │       保存后再次点击「立即执行」
                │   └── 1)规则集和规则包内容未改动
                │       2)任务分区保存成功
                │       3)任务提交执行成功
                │
                └── 进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+完整性校验+字段级+空值数)最新实例详情
                    └── 1)最新实例为「校验不通过」
                        2)car_model_name 空值数实际值为 1
                        3)期望值为 0
                        4)不通过明细包含 order_id=ORD_NULL_003
                        5)明细仅统计 stat_date='20260115' 分区
```

## 易错点（违例示例 → 正确写法）

1. 把 `<br>` 留在 xmind topic title 里
   - ❌ `选择数据源: SparkThrift2.x<br>- 选择数据库: ${SchemaA}`
   - ✅ topic title 内换行用真实 `\n`，`<br>` 仅在 md 表格单元格内出现。

2. 单 topic title 堆 3+ 个 「...」 引号项
   - ❌ `校验「字段」「统计函数」「过滤条件」`
   - ✅ 拆成多行或拆 child topic。

3. priority marker 漏挂或挂错
   - ❌ 用例 topic 无 markers，靠 title 的 `【P0】` 文本表示优先级
   - ✅ 同时挂 `markers: [{markerId: "priority-1"}]`；marker 与标题前缀对照表必须一致。

4. 前置条件 SQL 塞到 step child 而非 notes
   - ❌ 在用例 topic 下挂一个 "前置 SQL" child topic
   - ✅ 前置条件代码块的**裸内容**写到用例 topic 的 `notes.plain.content`。

5. 步骤跨页面合并
   - ❌ 一个 step child 同时写「在『监控规则』引用规则包」+「在『调度属性』配置调度周期」
   - ✅ 拆成两个 step child，预期编号顺序与发生顺序一致。
````

- [ ] **Step 7.2: 验证**

Run:
```bash
wc -l .ai/core/skills/case-draft/references/fewshots/case-format-sample.xmind.md
grep -c "priority-1" .ai/core/skills/case-draft/references/fewshots/case-format-sample.xmind.md
grep -c "expected grandchild" .ai/core/skills/case-draft/references/fewshots/case-format-sample.xmind.md
```

Expected: 行数 ≈140；至少 2 处 `priority-1`；至少 1 处 `expected grandchild`。

- [ ] **Step 7.3: 兜底 — 若 product-skill-contract 拒绝跨 skill 路径，回退用 symlink**

如果 Task 9 验收时 case-edit 的 `few_shots.path: ../case-draft/...` 被 product-skill-contract.test.ts 报错，执行 fallback：

```bash
mkdir -p .ai/core/skills/case-edit/references/fewshots
ln -sf ../../../case-draft/references/fewshots/case-format-sample.md \
       .ai/core/skills/case-edit/references/fewshots/case-format-sample.md
ln -sf ../../../case-draft/references/fewshots/case-format-sample.xmind.md \
       .ai/core/skills/case-edit/references/fewshots/case-format-sample.xmind.md
```

然后回到 Task 5 改 case-edit skill.yaml 的两条 few_shots path 为 `references/fewshots/case-format-sample.md` 和 `references/fewshots/case-format-sample.xmind.md`，重提 commit。

- [ ] **Step 7.4: Commit**

```bash
git add .ai/core/skills/case-draft/references/fewshots/case-format-sample.xmind.md
git commit -m "feat: 📐 add case-format-sample.xmind.md fewshot (ASCII tree mapping)"
```

---

## Task 8: 更新 hardrules-regression 基线

**Files:**
- Modify: `engine/tests/ai-core/case-draft-hardrules-regression.test.ts`

- [ ] **Step 8.1: 跑测试看到失败**

Run:
```bash
bun test engine/tests/ai-core/case-draft-hardrules-regression.test.ts
```

Expected: FAIL 两条断言 — `hard_rules array length is unchanged`（expect 20, actual 17）和 `hard_rules joined sha256 is unchanged`（哈希不匹配）。

- [ ] **Step 8.2: 算新基线**

Run:
```bash
bun -e "
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
const d = parse(readFileSync('.ai/core/skills/case-draft/skill.yaml', 'utf8'));
const rules = d.body.always_load.hard_rules;
const joined = rules.join('\n');
console.log('COUNT:', rules.length);
console.log('SHA256:', createHash('sha256').update(joined).digest('hex'));
"
```

Expected: 输出新的 COUNT（17 或 Step 4.1 实际落定的数）与 SHA256。

- [ ] **Step 8.3: 更新测试文件基线**

Edit `engine/tests/ai-core/case-draft-hardrules-regression.test.ts`：

把第 26-28 行的注释追加一行：
```typescript
  // Updated 2026-05-26: -3 rules collapsed into SSOT pointer (case-level format moved to output-standard.md#用例级节点格式).
```

把 BASELINE_SHA256 替换为 Step 8.2 输出的新 SHA256。
把 BASELINE_COUNT 从 20 改为 Step 8.2 输出的新 COUNT。

- [ ] **Step 8.4: 验证测试通过**

Run:
```bash
bun test engine/tests/ai-core/case-draft-hardrules-regression.test.ts
```

Expected: 2 tests pass。

- [ ] **Step 8.5: Commit**

```bash
git add engine/tests/ai-core/case-draft-hardrules-regression.test.ts
git commit -m "test: 📐 update case-draft hardrules baseline after SSOT collapse"
```

---

## Task 9: Projection render + lock + 全量测试 + 验收

**Files:** （生成产物）
- `.claude/skills/case-draft/SKILL.md`
- `.claude/skills/case-draft/references/**`
- `.claude/skills/case-edit/SKILL.md`
- `.claude/skills/case-edit/references/**`
- `.agents/skills/case-draft/**`
- `.agents/skills/case-edit/**`
- `.ai/core/projections/**.lock`（lock render 产物）

- [ ] **Step 9.1: projection render**

Run:
```bash
bun engine/bin/kata ai-core projection render
```

Expected: 退出码 0；输出列出 case-draft / case-edit 两个 skill 重新渲染；`.claude/skills/case-draft/SKILL.md` 与 `.agents/skills/case-draft/SKILL.md` 包含新增的 fewshot 引用与瘦身后的 hard_rules。

- [ ] **Step 9.2: projection lock render**

Run:
```bash
bun engine/bin/kata ai-core projection lock render
```

Expected: 退出码 0；lock 文件 hash 更新；不再 mismatch（参见 [[project-projection-lock-render]] 的历史教训）。

- [ ] **Step 9.3: 验证渲染产物语义未掉关键 hard_rule**

Run:
```bash
grep -E "禁止任何机器标识|TC-ID|证据底线|业务括号" .claude/skills/case-draft/SKILL.md | head -10
grep -E "Case-Level Normative|用例级节点格式" .claude/skills/case-draft/SKILL.md | head -5
grep -E "Case-Level Normative|用例级节点格式" .claude/skills/case-edit/SKILL.md | head -5
grep -E "case-format-sample" .claude/skills/case-draft/SKILL.md .claude/skills/case-edit/SKILL.md | head -5
```

Expected:
- 「证据底线」仍出现（保留在指针条款中）。
- 至少各 1 处「用例级节点格式」反向引用出现。
- fewshot 引用出现在两个 SKILL.md。
- 「禁止任何机器标识 / TC-ID」可能只通过反向引用呈现，但 references/output-standard.md 内仍能 grep 到「TC-ID」。

- [ ] **Step 9.4: 跑 ai-core 测试套**

Run:
```bash
bun run test:ai-core
```

Expected: 全绿。重点关注：
- `case-draft-hardrules-regression.test.ts` — Task 8 已对齐。
- `product-skill-contract.test.ts` — fewshot path/load_when 校验通过。
- `lint.test.ts` / `preflight.test.ts` — 渲染产物与源一致。

- [ ] **Step 9.5: 如果 product-skill-contract 拒绝 case-edit 的跨 skill `../` 路径**

按 Task 7 Step 7.3 的兜底方案执行 symlink，并 amend Task 5 的 commit（用 `git commit --amend --no-edit` 仅替换 path 字段）。

- [ ] **Step 9.6: 跑 lint**

Run:
```bash
bun run check
```

Expected: 全绿。

- [ ] **Step 9.7: 把渲染产物纳入 commit**

Run:
```bash
git status -s
git add .claude/skills .agents/skills .ai/core/projections 2>/dev/null || true
git commit -m "chore: 🧱 render projections for case-level format SSOT"
```

Expected: 渲染后的投影文件被 commit；working tree clean。

---

## Task 10: 合并回 main 并清理 worktree

- [ ] **Step 10.1: 切回 main 并合并**

Run:
```bash
cd /Users/poco/Projects/kata
git checkout main
git merge --no-ff feat/case-level-format-ssot -m "merge: 📐 case-level format SSOT and fewshots"
```

Expected: 快进合并或 merge commit；`git log -1` 显示 merge。

- [ ] **Step 10.2: 推送（按需）**

Run（按用户确认后执行；不要默认 push）：
```bash
git push origin main
```

- [ ] **Step 10.3: 清理 worktree**

Run:
```bash
git worktree remove .worktrees/case-level-format-ssot
git branch -d feat/case-level-format-ssot
git worktree list
```

Expected: worktree 目录已删；分支已删；list 中不再出现该 worktree。

---

## Self-review notes

- 取材路径锁定在 spec 顶部已记录，未来样例升级走「先改 tmp 源 → 再同步 fewshot」流程。
- hard_rules 收敛后所有「机器标识 / 括号语义 / 空泛断言 / 证据底线」语义都通过 SSOT + 指针保留，但触发链中只剩一条 prompt 引用 — 这是「单一来源 + 反向引用」模式的预期，靠 references/output-standard.md 在 case-draft / output 阶段被加载来兜底。
- fewshot 取自真实 P0 用例，与 case-draft / case-edit 在 case-draft / output / plan_edit 阶段加载；其 hard_rules 与 SSOT 双重保证不会让模型把 fewshot 当成需求事实（skill.yaml 中已有「few-shot 作为格式参照使用，不包含需求事实或历史事实依据」一条）。
- 验收用 grep 而非新增测试 — 现有 product-skill-contract / hardrules-regression 已覆盖 fewshot 路径合规与 hard_rules 基线。
