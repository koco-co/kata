# 提示词清通化重构 · 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 kata 约 50 个中文提示词文件从「翻译腔/黑话」改写成「清通平实」的中文，行为零丢失。

**Architecture:** 试点先行 + 分批。先把风格指南落盘为常驻参考，再用「抽契约清单 → 改写 → 核对契约 → lint/测试」的统一流程逐 skill 推进。先做 2 个代表 skill 试点、用户复核锁风格，再按低风险→高风险分批改其余文件。全程在单个 detached worktree 内，按任务分批 commit，验证通过后合并回 main。

**Tech Stack:** Markdown 提示词；Bun 测试（`bun test`）；Biome lint（`bun run check`）；skill 契约校验（`bun run check:skills`）。

**Spec:** `docs/superpowers/specs/2026-06-02-prompt-style-refactor-design.md`（病症清单、保真红线、风险登记的唯一来源；本计划多处回指其章节号）。

---

## 前置：Worktree 设置（执行开始时做一次）

项目规则要求所有改动走 detached worktree，且 worktree 必须 symlink `.kata` 才能读到源码证据与 session。注意主仓库已有 `.worktrees/defect-html`（另一条工作线），本计划用独立 slug。

- [ ] **S0.1：提交主工作树现有改动（若有）**

```bash
cd /Users/poco/Projects/kata
git status --short                 # 预期：仅 docs/audit/ 未跟踪（并发会话产物，不要 add）
# 若有本任务无关的 tracked 改动，先快照：git add -A && git commit -m "chore: 🧹 save pre-worktree local changes"
```

- [ ] **S0.2：创建 worktree 并 symlink .kata**

```bash
ROOT=/Users/poco/Projects/kata
W="$ROOT/.worktrees/prompt-clarity"
git worktree add --detach "$W" main
ln -s "$ROOT/workspace" "$W/workspace" 2>/dev/null || true   # 如需读 .kata 证据；本任务多为只读文档，可选
cd "$W"
```

Expected：`Preparing worktree (detached HEAD ...)`；`git -C "$W" status` 干净。

- [ ] **S0.3：基线验证（记录改写前的绿/红基线）**

```bash
cd "$W"
bun test 2>&1 | tail -5            # 记录 pass/fail/skip 基线
bun run check:skills 2>&1 | tail -5
bun run type-check 2>&1 | tail -3  # 基线约 202 预存错误，非绿闸门；后续只比对「无新增」
```

Expected：记录三条基线数字。后续每个任务的验收是「相对基线无新增失败」，不是「全 PASS」。

---

## 标准改写流程（每个文件都按此走，后续任务只列差异）

这是本计划的「测试优先」内核：**契约清单就是不变量，先立后验**。Spec §5 的八步，落成可执行动作：

1. **抽契约清单**：通读原文件，把所有「改写后必须一字不变」的原子约束抄进一个临时清单 `.notes/<file>.contract.md`（worktree 内，不提交）。至少覆盖：
   - 阈值数字（如 `≤3 次`、`15 项`、`keywords 6 段`）
   - 标识符：字段名 / 文件名 / `§phase` 名 / 工具名 / CLI（`kata *`）/ 产物名 / schema 名 / 状态值 / 枚举值
   - 触发条件、路由/改走目标、顺序依赖
   - 被测关键字（见 spec R6）、反例字符串（spec R5）
2. **标可改区**（mixed / structured 文件）：逐段标注「可改散文区」vs「不可改契约区」（代码块、表格、schema、映射、枚举）。
3. **改写**：套用风格指南（spec §3.1–3.3）。`prose` 文件可重组章节；`mixed` 只改散文区；`structured` 只碰散文导语。
4. **核对契约**：拿步骤 1 的清单逐条回查新文，每条都在、含义不变、标识符一字不差。
5. **对抗校验**：派一个 fresh subagent，只给它「原文契约清单 + 改写后文件」，让它找「清单里有但新文件缺失/被改」的项。有缺失就回到步骤 3。
6. **lint + 测试闸门**（见下方「验证闸门」）。
7. **触发回归**：确认 `description` 未改；若正文改了同时是 `description` 触发词的词，确认与 `description` 保持同词（spec R8）。
8. **同源同步**（涉及 spec R10 的文件）：所有副本同步改写、术语对齐。

## 验证闸门（每个任务结束前必跑，全部相对基线无新增失败）

```bash
cd "$W"
bun run check:skills                                   # skill 契约：frontmatter 白名单 / 行数上限 / 装饰标记 / sync
bun test .claude/scripts/_shared/tests/lint            # skill-frontmatter/shape/structure 等
bun test .claude/scripts/_shared/tests/references      # strategy-templates
bun test .claude/scripts/_shared/tests/cli             # skills-audit / skills-sync-check
bun run check                                          # Biome lint（每任务必跑，避免格式违规攒到最后）
```

- 改到 `prompt/_shared/case-qa.md` 时，额外跑断言其存在性的测试：`bun test .claude/scripts/_shared/tests` 中命中 `shared-case-qa` 的用例。
- 行数贴顶文件（`cli-essentials.md` 251/260、`hotfix-archive-format.md` 227/260、`§6` 208/260）改写后必跑 `wc -l <file>` 确认未超上限。
- 文档改动不触 `type-check`；仅在最终闸门跑一次 `bun run type-check` 做「无新增」兜底。

## 保真红线速查

完整 11 条见 spec §3.4。最容易踩的五条：**R3** description 触发词一字不动 · **R4** 格式契约表/枚举/SQL/schema 样例不散文化 · **R5** 反例字符串零改写 · **R6** 被测关键字不动 · **R9** 不破行数上限。

---

## Task 0：落盘风格指南 `docs/prompt-style-guide.md`

把 spec §3 固化成常驻参考文档，作为所有改写任务的依据。

**Files:**
- Create: `docs/prompt-style-guide.md`

- [ ] **Step 1：转写 spec §3 为风格指南正文**

把 spec 的 §3.1（语言 L1–L9）、§3.2（结构 S1–S7）、§3.3（排版 P1–P5）、§3.4（保真红线 R1–R11）原样组织进 `docs/prompt-style-guide.md`，每条保留真实语料实例。

- [ ] **Step 2：补「术语对照表」一节**

新增 `## 术语对照表` 章节，列出全仓统一的词对（来自 L1/L2/L3 与 spec S7），至少含：

| 黑话/英文 | 统一中文 |
| --- | --- |
| 分诊 | 按类型分流 |
| 对账 | 核对 |
| 门禁 | 检查项 |
| 管线 | 流程 |
| 不变量 | 铁律 |
| 回指 | 指回 |
| 归因 | 判断原因 |
| 可见编排 | 公开进度 |
| Worker | 执行子代理 |
| review | 评审 |
| silent-mode | 静默模式 |
| 去重 / 归一 / 回写 | 去掉重复 / 统一成 / 写回 |

> 注：术语对照表在试点（Task 1–2）后会被用户复核校准，此处先立骨架。

- [ ] **Step 3：补「三类文件处理策略」一节**

把 spec §4 的 prose / mixed / structured 三类处理策略写入 `## 文件分类与处理策略`。

- [ ] **Step 4：提交**

```bash
cd "$W"
git add docs/prompt-style-guide.md
git commit -m "docs: 📝 新增 kata 中文提示词风格指南"
```

Expected：1 file changed。无需跑测试闸门（纯新增 docs，不影响 skill 契约）。

---

## Task 1：试点 A — defect-analyze（小而典型）

**Files:**
- Modify: `.claude/skills/defect-analyze/SKILL.md`（39 行，prose，余量充足）
- 不动 `templates/`（`.hbs` + `GUIDE.md`，out-of-scope）

**本文件契约要点**（抽清单时至少覆盖这些）：三模式 `bug`/`conflict`/`diff` 名与各自产物名（`defect-report.md`、`conflict-resolution-plan.md`）；字段 `evidence_refs`、`side_a`/`side_b`、`resolution_plan`、`impacted_areas`；改走目标 case-hotfix / case-draft；只读 `workspace/{project}/.kata/repos/**` 规则；`description`/frontmatter 不动。

**本文件主要病症**（对照风格指南）：L1「分诊」「不变量」「回指」、L4 破折号因果（「——合并会让修复方分不清…」）、L5「凡无证据者一律不入文」、P5「## 硬规则（不变量）」标题。

- [ ] **Step 1：抽契约清单** → 按标准流程 1 写 `.notes/defect-analyze-SKILL.contract.md`。
- [ ] **Step 2：改写** `SKILL.md` 正文（保留 frontmatter 原样），套用风格指南。示例方向：
  - `按输入类型分诊到三种模式，凡无证据者一律不入文。` → `按输入类型分流到三种模式；没有证据的内容，一律不写进报告。`
  - `## 硬规则（不变量）` → `## 必须遵守的规则`
  - `事实性结论回指 evidence_refs` → `凡是结论，都要能指回 evidence_refs`
- [ ] **Step 3：核对契约**（标准流程 4）+ **对抗校验**（标准流程 5，派 fresh subagent）。
- [ ] **Step 4：跑验证闸门**

```bash
cd "$W"
bun run check:skills && bun test .claude/scripts/_shared/tests/lint && bun run check
grep -c "evidence_refs\|side_a\|side_b\|conflict-resolution-plan\|defect-report" .claude/skills/defect-analyze/SKILL.md
```

Expected：闸门相对基线无新增失败；grep 确认关键标识符仍在。

- [ ] **Step 5：提交**

```bash
git add .claude/skills/defect-analyze/SKILL.md
git commit -m "refactor: ✨ defect-analyze SKILL 清通化改写"
```

---

## Task 2：试点 B — playwright-automation（大型多文件，含全部高风险点）

整个 skill 17 个文件一并改写，覆盖各类病症与最高风险文件（`cli-essentials` 贴顶、`§10` 结构化、`§1/§6` 含路由样例/代码块），作为试点充分暴露问题。

**Files（17）:**
- `SKILL.md`（74，prose）
- `references/cli-essentials.md`（251/260，**贴顶，只能等行/减行**）、`references/execution-protocol.md`（91，mixed，含英文标题）
- `phases/§1`(165)、`§2`(165)、`§3`(51)、`§4`(123)、`§5`(75)、`§6`(208)、`§7`(86)、`§8`(84)、`§9`(116)、`§10`(21,结构化)、`§11`(35)、`§12`(151)
- `prompts/agent-worker.md`(66)、`agent-spec-reviewer.md`(55)、`agent-quality-reviewer.md`(67)（含英文标题、被测枚举/字段）

**关键契约/红线**（抽清单覆盖）：12 个 `§phase` 名与顺序、`§10` 的 15 项 check 名（lint 标识符）、状态值（`aligned`/`plan_adjusted`/`needs_user_decision`/`blocked`/`source_backed_bootstrap`/`repair_exhausted` 等）、schema 名（`PlanReconciliation@1`/`UiRunTriage@1`/`PlaywrightAutomationHandoff@2`/`CaseCorrections@1`）、所有 bash/ts 代码块整块保真、`§1` 第 50/52 行路由判定连续短语样例、`prompts/agent-*` 的 category/severity 枚举与 JSON 字段（被契约测试依赖）、文件名 `§<数字>-<kebab>.md` 不改、所有 `description` 不动。

**主要病症**：P4 英文标题层（`Self-run command template`、`Spec Reviewer Prompt`、`Hard-Rule Priority` 等）→ 中文；S1 §5 第 33 行巨型禁令句拆分；S2 长枚举禁令；P5「## 硬规则（不变量）」统一标题；L1/L2 黑话；中英空格 P2。

- [ ] **Step 1：抽契约清单**（17 个文件各一份，写入 `.notes/`）。`cli-essentials.md` 额外记录当前行数 251。
- [ ] **Step 2：逐文件标可改区**（全部 mixed/structured，代码块与表格占比高，务必先标注）。
- [ ] **Step 3：改写**。顺序建议：先 prose 的 `SKILL.md`，再 phases，再 prompts，最后 `cli-essentials.md`（贴顶，最谨慎）。统一 P5 标题替换词，全 skill 一致。
- [ ] **Step 4：核对契约 + 对抗校验**（17 文件逐一）。
- [ ] **Step 5：行数 + 闸门验证**

```bash
cd "$W"
for f in .claude/skills/playwright-automation/references/cli-essentials.md .claude/skills/playwright-automation/phases/§6-playwright-generate.md; do echo "$(wc -l < "$f") $f"; done
# 预期：cli-essentials ≤ 251（不增），§6 ≤ 260
bun run check:skills && bun test .claude/scripts/_shared/tests/lint && bun test .claude/scripts/_shared/tests/references && bun run check
```

Expected：行数未超；闸门无新增失败。

- [ ] **Step 6：分文件提交**（按 phases / prompts / references 分几个 commit，便于回看）

```bash
git add .claude/skills/playwright-automation/
git commit -m "refactor: ✨ playwright-automation 提示词清通化改写"
```

---

## 检查点 1：用户复核试点（锁风格 + 术语对照表）

- [ ] 把 Task 1–2 改写后的 diff 交给用户 review。
- [ ] 用户确认文风、术语对照表、排版尺度。
- [ ] 据反馈回填 `docs/prompt-style-guide.md` 的术语对照表与任何法则微调，提交一次 `docs: 📝 据试点校准风格指南`。
- [ ] **未获确认不进入 Task 3**（spec §7 阶段 1 门）。

---

## 批 A：纯散文 / 小型 skill（低风险，先做）

> 以下每个任务都走「标准改写流程」八步 + 「验证闸门」。任务块只列文件、契约/红线、主要病症、任务特有验证与提交命令。

### Task 3：case-edit

**Files:** `SKILL.md`(41,prose) · `references/apply-corrections.md`(144,mixed) · `references/archive-xmind-sync.md`(19,prose)
（**不含** `references/fewshots/*` → Task 8 统一处理）

**契约/红线：** `apply-corrections` 子命令流程 `加载 corrections → dry-run → 回写 → 同步` 各环节名；schema/字段名；改走目标 case-draft / playwright-automation；`description` 不动。`apply-corrections.md` 含 JSON/markdown 模板样例（mixed，只改散文区）。`archive-xmind-sync.md` 第 17 行英文直引号 → 全角，括号内 8 项清单外提为 bullet（S3）。

**主要病症：** L2 黑话动词（回写/归一/去重）、S3 括号塞清单、P3 引号混用、P5 标题。

- [ ] Step 1–5：标准流程八步（抽清单含两个 references 的样例区标注）。
- [ ] 验证：`bun run check:skills && bun test .claude/scripts/_shared/tests && bun run check`
- [ ] 提交：`git commit -m "refactor: ✨ case-edit 提示词清通化改写"`

### Task 4：infra-diagnose

**Files:** `SKILL.md`(42,prose) · `references/diagnostic-playbook.md`(47,mixed) · `references/knowledge-format.md`(47,structured) · `references/ssh-protocol.md`(50,mixed)

**契约/红线：** **R10 同源同步** —— 凭据/破坏性操作门控规则在 `SKILL.md` 与 `ssh-protocol.md` 各写一遍，改写须两处语义与关键术语对齐。`knowledge-format.md` 是结构化格式样例，只碰散文导语；其中 `检索（lookup）`/`记录（record）` 是 **L8 冗余双语注脚**（英文非标识符，整体删括号）。诊断命令、错误签名（如 `No route to host`）原样。改走目标 defect-analyze / knowledge-curate。

**主要病症：** L8 双语注脚、L1 黑话、S6 同文件内红线重复、P2 中英空格。

- [ ] Step 1–8：标准流程（步骤 8 同源同步 SKILL ↔ ssh-protocol）。
- [ ] 验证：`bun run check:skills && bun test .claude/scripts/_shared/tests/lint && bun run check`
- [ ] 提交：`git commit -m "refactor: ✨ infra-diagnose 提示词清通化改写"`

### Task 5：knowledge-curate + workspace-manage

**Files:** `knowledge-curate/SKILL.md`(36) · `knowledge-curate/references/knowledge-rules.md`(9) · `workspace-manage/SKILL.md`(36) · `workspace-manage/references/project-layout.md`(3)

**契约/红线：** **R10** —— knowledge 的分仓/指回规则在 `SKILL.md` 与 `knowledge-rules.md` 各一遍、repos 只读在 `workspace SKILL.md` 与 `project-layout.md` 各一遍，同步改。知识库路径（`_shared/knowledge/`、`sites/{domain}/`）、`kata` 子命令名原样。改走目标互链。

**主要病症：** L1 黑话、L5 文白、P5 标题。两个文件极短，改写空间大但行为少。

- [ ] Step 1–8：标准流程（同源同步两处）。
- [ ] 验证：`bun run check:skills && bun test .claude/scripts/_shared/tests/lint && bun run check`
- [ ] 提交：`git commit -m "refactor: ✨ knowledge-curate 与 workspace-manage 提示词清通化改写"`

### Task 6：case-hotfix（含贴顶结构化 references）

**Files:** `SKILL.md`(41,prose) · `references/hotfix-archive-format.md`(227/260,**结构化贴顶**)

**契约/红线（重）：** `hotfix-archive-format.md` 是格式契约重灾——`keywords` **6 段**规则与各段定义、frontmatter 字段、SourceRefs JSON 样例、前置条件 SQL 写法、`CREATE TABLE`/`INSERT`/Spark 全分区 DDL 与错误串 `ALL_PARTITION_COLUMNS_NOT_ALLOWED`、目录命名 `hotfix_{...}-{short-title}`、`{YYYYMM}`/`{{...}}` 占位 —— **全部 R4 整块保真**，只能改散文说明与禁止清单的措辞。**R9** 行数 227/260 仅余 33 行，改写**不得净增行**。`SKILL.md` 含 L4 破折号因果（「——hotfix 要的是窄而准…」）。

**主要病症：** L4 破折号、L1 黑话、S2 长枚举禁令；但严格限制在散文区。

- [ ] Step 1：抽清单时把所有样例块边界与 `keywords` 6 段逐条记下。
- [ ] Step 2：逐段标可改区，SQL/JSON/frontmatter/DDL 全部标「不可改」。
- [ ] Step 3：只改散文说明；改写后 `wc -l .claude/skills/case-hotfix/references/hotfix-archive-format.md` 必须 ≤ 227。
- [ ] Step 4–5：核对契约（重点 6 段 keywords 与 SQL 样例）+ 对抗校验。
- [ ] 验证：`bun run check:skills && bun test .claude/scripts/_shared/tests && bun run check`
- [ ] 提交：`git commit -m "refactor: ✨ case-hotfix 提示词清通化改写"`

---

## 批 B：mixed 的 prompts（中风险）

### Task 7：case-draft

**Files:** `SKILL.md`(57,prose) · `prompts/agent-worker.md`(126) · `prompts/agent-spec-reviewer.md`(110) · `prompts/agent-quality-reviewer.md`(87) · `rules/naming-convention.md`(30)
（**不含** `fewshots/*` → Task 8）

**契约/红线：** 三个 `prompts/agent-*` 是子代理模板，**可能被 `strategy-templates.test.ts` 断言存在与字段**——逐字模板块、Status/Envelope 字段、category/severity 枚举、JSON 字段不动（R6）。`naming-convention.md` 的目录命名格式 `【v{version}】…` 模式串保真。`agent-quality-reviewer.md` 开头有 S5 相邻重复（连说两遍「不重复 spec reviewer 的结构检查」）可合并。英文标题层 → 中文（P4）。

**主要病症：** S5 相邻重复、P4 英文标题、L1/L2 黑话、S2 长枚举。

- [ ] Step 1：抽清单覆盖三模板的字段与枚举；标注逐字模板块为不可改。
- [ ] Step 2–5：标准流程。
- [ ] 验证（含 strategy-templates）：`bun run check:skills && bun test .claude/scripts/_shared/tests/references && bun test .claude/scripts/_shared/tests/lint && bun run check`
- [ ] 提交：`git commit -m "refactor: ✨ case-draft 提示词清通化改写"`

---

## 批 C：结构化样例对（同步改）

### Task 8：fewshot 样例（case-format-sample 对）

**Files（4 个路径，2 份唯一内容，须同步）:**
- `case-draft/fewshots/case-format-sample.md` ＝ `case-edit/references/fewshots/case-format-sample.md`（98，逐字相同）
- `case-draft/fewshots/case-format-sample.xmind.md` ＝ `case-edit/references/fewshots/case-format-sample.xmind.md`（154，逐字相同）

**契约/红线：** 这是 QA 用例**格式样例**（structured）——用例标题/步骤/预期/节点结构是格式契约，**样例本体零改**（R4）。只允许改：注释头的电报体（「取材：」「SSOT：」→ 主谓句，路径标识符保留，L9/⑨）。**R10 同步**：两份副本必须做完全相同的改写，改完 `diff` 必须为空。

- [ ] Step 1：抽清单（样例结构、节点层级、DQ 子集内容）。
- [ ] Step 2：仅改注释头散文；样例正文不动。
- [ ] Step 3：把同一改写应用到 case-draft 与 case-edit 两份副本。
- [ ] Step 4：验证副本一致 + 闸门

```bash
cd "$W"
diff .claude/skills/case-draft/fewshots/case-format-sample.md .claude/skills/case-edit/references/fewshots/case-format-sample.md && echo "md 一致"
diff .claude/skills/case-draft/fewshots/case-format-sample.xmind.md .claude/skills/case-edit/references/fewshots/case-format-sample.xmind.md && echo "xmind 一致"
bun run check:skills && bun run check
```

Expected：两个 `diff` 均无输出（一致）。

- [ ] 提交：`git commit -m "refactor: ✨ case 用例格式样例注释头清通化（双副本同步）"`

---

## 批 D：规则 + 入口 + 共享提示（最高契约风险，最后做）

### Task 9：rules/*.md + 入口文档（同源重复簇）

**Files:** `rules/`：`comments.md`(43) `git-workflow.md`(44) `priority.md`(11) `project-workflow-rules.md`(83) `repo-readonly.md`(9) `routing-guard.md`(21) `testing.md`(20) `workspace-boundary.md`(15) · 入口：`CLAUDE.md`(75) `INSTALL.md`(58)

**契约/红线（最重）：**
- **R10 同源重复簇**——必须先把重复块改写一次、再同步到所有副本：
  - 路由规则：`routing-guard.md` ↔ `CLAUDE.md`「路由规则」节
  - Git/代码变动流程：`project-workflow-rules.md`「Git 工作流」↔ `git-workflow.md` ↔ `CLAUDE.md`「代码变动请求标准流程」
- **R4 + R6 机器/契约级**：`project-workflow-rules.md` 的 **type/emoji 映射表**、**KATA 工作通知模板**（字段名可能被契约测试/渲染校验）、`CLAUDE.md` 的**命令索引表**、**环境变量名**（`KATA_ZENTAO_PASSWORD` 等）—— 整块保真。
- `priority.md` 的规则优先级链、`repo-readonly.md` 的只读禁令清单语义不变。

- [ ] Step 1：抽清单（重点标出三处重复块的边界 + emoji 表 + 通知模板 + 命令索引 + 环境变量名）。
- [ ] Step 2：**先**改写重复块各一次，分别贴回 routing-guard/CLAUDE.md、git-workflow/project-workflow-rules/CLAUDE.md，确保逐字一致。
- [ ] Step 3：再改各文件非重复的散文部分。
- [ ] Step 4：核对契约 + 对抗校验（重点：重复块三处是否一致、emoji 表/命令索引是否原样）。
- [ ] Step 5：同源一致性 + 闸门

```bash
cd "$W"
# 抽检重复块关键句在各副本一致（按实际改写后的代表句替换 PATTERN）
grep -rn "type: emoji description" .claude/rules/project-workflow-rules.md CLAUDE.md
bun run check:skills && bun test .claude/scripts/_shared/tests && bun run check
```

- [ ] 提交：`git commit -m "refactor: ✨ rules 与入口文档清通化改写（同源块同步）"`

### Task 10：prompt/_shared

**Files:** `.claude/prompt/_shared/case-qa.md`(42,mixed) · `.claude/prompt/_shared/output-artifacts.md`(23,structured)
（注：`skills/_shared/case-qa.md` 是指向前者的 symlink，自动覆盖，**不要单独改**）

**契约/红线（重）：** **R6** —— `case-qa.md` 顶部 HTML 注释被 `shared-case-qa.test.ts` 存在性断言；**R5** —— 文件含大量反例字符串（「不得把 `sql` 归一成 `SQL`」「不得把字段写成字段级」、占位反例「页面已存在数据」「已登录/具备权限」），**零改写**。被 3 个 skill（case-draft/case-edit/case-hotfix）共享。

- [ ] Step 1：抽清单时把被测 HTML 注释串与所有反例字符串逐条标「禁改」。
- [ ] Step 2–3：只改非反例、非被测的散文说明。
- [ ] Step 4：闸门（含 shared-case-qa 断言）

```bash
cd "$W"
bun test .claude/scripts/_shared/tests 2>&1 | grep -i "case-qa\|shared" || true
bun run check:skills && bun run check
```

Expected：`shared-case-qa` 相关断言仍 PASS。

- [ ] 提交：`git commit -m "refactor: ✨ 共享提示 case-qa 与 output-artifacts 清通化改写"`

---

## 检查点 2：最终验证 + 合并回 main

- [ ] **全量闸门**（worktree 内）

```bash
cd "$W"
bun run check:skills
bun test                                   # 相对基线无新增失败
bun run check
bun run type-check 2>&1 | tail -3          # 对比基线（约 202），确认无新增
```

- [ ] **全语料契约总核对**：抽查每个改过文件的 `.notes/*.contract.md`，确认无遗漏；同源重复块（infra、knowledge、rules/entry、fewshots）逐对 `diff`/`grep` 确认一致。
- [ ] **诚实交付声明**：写明已验证范围（闸门命令 + exit code + pass/fail/skip）与未验证范围（如未做的 `GUIDE.md`、未 symlink 去重的 fewshots）。
- [ ] **记录 worktree HEAD SHA 并合并**

```bash
cd "$W"; SHA=$(git rev-parse HEAD)
cd /Users/poco/Projects/kata
git merge --no-ff "$SHA" -m "merge: 🔀 提示词清通化重构合入"
bun test                                   # merge 后再跑一次最终确认
```

- [ ] **推送与清理**

```bash
git push origin main
git worktree remove .worktrees/prompt-clarity
```

Expected：main 上 `bun test` 无新增失败；worktree 清理完成；`docs/audit/` 始终未被本计划触碰。

