# .claude 提示词去黑话 + 官方 Skill 规范对齐重写 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `.claude` 全树提示词去黑话、平实化重写并对齐 Anthropic 官方 Skill authoring best practices，语义不变。

**Architecture:** 这是一份 **process-gated 重写计划**，映射 spec 五阶段（Phase 0 准则 → 1 基线 → 2 审计闸门 → 3 逐技能落地 → 4 验证合并）。A 类黑话（可 grep）已逐处定位、可在 task 内直接 1:1 替换；B 类黑话、description 改动、冗余规则删除依赖 **Phase 2 审计清单 + 用户审查闸门**——这些 task 锁定「改哪个文件:行、依据审计哪条、用什么命令验收」，逐字新文本在审计阶段定稿（这是 spec 的审查闸门，不是 placeholder）。逐技能一 commit，改一个跑一个测试。验证**不依赖 codex**（codex 全量迁移与触发链调试是本任务之后的独立阶段）。

**Tech Stack:** Bun test、Biome（`bun run check`）、`kata skills sync-check`（`bun run check:skills`）、git detached worktree、`grep`。

**Spec:** `docs/superpowers/specs/2026-06-01-claude-prompt-dejargon-rewrite-design.md`（唯一标尺，已二次修订对齐现状）。

---

## 关键事实（写计划时已核实，执行时无需重查）

- **8 个技能**（非 9）：`case-draft` `case-edit` `case-hotfix` `defect-analyze` `infra-diagnose` `knowledge-curate` `playwright-automation` `workspace-manage`。`_shared` 不是技能。
- **行数上限实际 300**（`skill-shape.ts:16` `SKILL_MD_LINE_LIMIT`），本任务上调到 500；当前 8 个 SKILL.md 最长 74 行，远低于阈值。
- **hard_rule 无 SHA/COUNT 基线测试**：是 `case-draft/SKILL.md:42-54`、`playwright-automation/SKILL.md` 正文的「## 硬规则」章节。验收靠人工逐条对照 + `check:skills` + case-draft e2e fixture replay。
- **frontmatter 白名单 11 字段**（`frontmatter-policy.ts`）：name / description / allowed-tools / when_to_use / user-invocable / disable-model-invocation / argument-hint / model / effort / context / agent。
- **顶层子目录白名单 7 个**（`skill-shape.ts:7-15`）：phases / prompts / references / fewshots / rules / scripts / templates。
- **黑话命中 18 文件**，其中 **2 个是第三方 `plugins/lanhu`（Out，不动）**，16 个在 In 范围（命中明细见 Task 4 审计清单）。
- **SKILL.md 手写**，无 projection / lock-render；直接改 `.claude/skills/*/SKILL.md`。
- **codex 不在本次范围**：不跑 codex-companion 触发链 harness。

---

## File Structure

**新建（计划产物，写入 `docs/superpowers/`）：**

- `docs/superpowers/references/dejargon-rewrite-guide.md` — Phase 0 改写准则文档（唯一术语标尺）
- `docs/superpowers/specs/2026-06-01-claude-prompt-dejargon-baseline.md` — Phase 1 现状基线快照（GREEN 记录 + 8 SKILL.md description/硬规则原文）
- `docs/superpowers/specs/2026-06-01-claude-prompt-dejargon-audit.md` — Phase 2 审计清单（审查闸门）
- `docs/superpowers/specs/2026-06-01-claude-prompt-dejargon-verify-report.md` — Phase 4 验证报告

**改代码（唯一允许的 scripts 改动）：**

- `.claude/scripts/_shared/lint/skill-shape.ts:16` — `SKILL_MD_LINE_LIMIT` 300 → 500
- `.claude/scripts/_shared/tests/lint/fixtures/skill-bad/skill-oversized-skill-md/SKILL.md` — 310 行扩到 ≥501 行（保持 S4 仍触发）

**改提示词（In，Phase 3 逐技能）：**

- 8 个技能的 `SKILL.md` + `rules/` `references/` `fewshots/` `prompts/` `phases/` `templates/` 下的 `.md`
- `.claude/rules/**`、`.claude/prompt/_shared/{case-qa,output-artifacts}.md`
- 根 `CLAUDE.md`、`.claude/rules/project-workflow-rules.md`、`INSTALL.md`（若含提示词文案）

**不动（Out）：** `.claude/scripts/**`（除上面两文件）、`.claude/hooks`、`.claude/plugins/**`、测试业务断言、templates 骨架/字段、subagent 调用契约。

---

## Task 0: 创建隔离 worktree

**Files:** 无（git 操作）

- [ ] **Step 1: 确认主工作树干净**

Run: `git -C /Users/poco/Projects/kata status --short`
Expected: 空输出（前两次 spec 提交已落盘）。若有改动，先 `git add -A && git commit -m "chore: 🧹 save pre-worktree local changes"`。

- [ ] **Step 2: 建 detached worktree**

```bash
cd /Users/poco/Projects/kata
git worktree add --detach .worktrees/dejargon main
```
Expected: `Preparing worktree (detached HEAD ...)`。

- [ ] **Step 3: 按需 symlink .kata（仅当 e2e fixture replay 需要本地证据时）**

```bash
ROOT=/Users/poco/Projects/kata
# 本任务 e2e 用仓库内置 fixture，通常无需 .kata；若 test:e2e:fixture 报缺 .kata，再执行：
# ln -s "$ROOT/workspace" "$ROOT/.worktrees/dejargon/workspace"
```
说明：后续所有实现、lint、测试、分批 commit 都在 `.worktrees/dejargon` 内完成。

---

## Task 1: Phase 0 — 改写准则文档

**Files:**
- Create: `docs/superpowers/references/dejargon-rewrite-guide.md`

- [ ] **Step 1: 写准则文档**

把 spec §4（官方原则 + 自由度分级落地约定）与 §5（5.1 A/B 黑话表 + 保留白名单 + 中英夹杂定义、5.2 冗余判定、5.3 正向准则、5.4 底线）整理为独立文档，作为 8 个技能统一术语来源。必须包含这些 H2 小节标题（验收会 grep）：

```markdown
# .claude 提示词改写准则

## 校准基准（官方原则）
## 自由度分级落地约定
## A 类黑话：可 1:1 机械替换
## B 类黑话：需逐处人工判断
## 保留术语白名单
## "中英夹杂"定义
## 冗余 / 未验证规则判定
## 正向准则
## 底线（语义不变 / 信是红线 / 行数）
```
内容逐条搬 spec §4§5 原文（spec 已是定稿标尺，不再改写措辞），A/B 表格与白名单原样复制。

- [ ] **Step 2: 验收小节齐全**

Run: `grep -c '^## ' docs/superpowers/references/dejargon-rewrite-guide.md`
Expected: ≥ 9。
Run: `grep -E 'A 类黑话|B 类黑话|中英夹杂|保留术语白名单' docs/superpowers/references/dejargon-rewrite-guide.md`
Expected: 四个标题都命中。

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/references/dejargon-rewrite-guide.md
git commit -m "docs: 📝 新增提示词去黑话改写准则文档"
```

---

## Task 2: Phase 1 — 现状基线固化

**Files:**
- Create: `docs/superpowers/specs/2026-06-01-claude-prompt-dejargon-baseline.md`

- [ ] **Step 1: 跑全量测试与契约检查存 GREEN 记录**

```bash
cd /Users/poco/Projects/kata/.worktrees/dejargon
bun test 2>&1 | tail -5
bun run check:skills 2>&1 | tail -5
```
Expected: `bun test` 全 pass（0 fail）；`check:skills` exit 0。把两段尾部输出粘进 baseline 文档「## GREEN 基线」节。若有 pre-existing fail，先停下排查根因（testing.md 规则），不得带病往下。

- [ ] **Step 2: 快照 8 个 SKILL.md 的 description 与硬规则原文**

```bash
cd /Users/poco/Projects/kata/.worktrees/dejargon
for s in case-draft case-edit case-hotfix defect-analyze infra-diagnose knowledge-curate playwright-automation workspace-manage; do
  echo "### $s"
  grep -n '^description:' .claude/skills/$s/SKILL.md
done
```
把每个技能的 `description:` 整行 + `## 硬规则` 章节原文（case-draft、playwright-automation 有）抄进 baseline 文档「## description 基线」「## 硬规则基线」节，作为 Phase 4 人工逐条对照的对照物。

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-06-01-claude-prompt-dejargon-baseline.md
git commit -m "docs: 📝 固化去黑话重写现状基线快照"
```

---

## Task 3: Phase 1.5 — SKILL.md 行数上限 300 → 500

**Files:**
- Modify: `.claude/scripts/_shared/lint/skill-shape.ts:16`
- Modify: `.claude/scripts/_shared/tests/lint/fixtures/skill-bad/skill-oversized-skill-md/SKILL.md`（当前 310 行）

- [ ] **Step 1: 改常量 300 → 500**

`.claude/scripts/_shared/lint/skill-shape.ts:16`：

```ts
const SKILL_MD_LINE_LIMIT = 500;
```

- [ ] **Step 2: 跑 S4 测试，确认它现在变红（RED）**

Run: `cd /Users/poco/Projects/kata/.worktrees/dejargon && bun test .claude/scripts/_shared/tests/lint/skill-shape.test.ts`
Expected: FAIL — `S4: SKILL.md > line limit flagged` 不再通过，因为 oversized fixture 只有 310 行，已不超过新上限 500。这证明 fixture 需要扩。

- [ ] **Step 3: 把 oversized fixture 扩到 ≥501 行**

在 `.claude/scripts/_shared/tests/lint/fixtures/skill-bad/skill-oversized-skill-md/SKILL.md` 末尾追加足够的填充行，使总行数 ≥ 501。命令式做法：

```bash
cd /Users/poco/Projects/kata/.worktrees/dejargon
F=.claude/scripts/_shared/tests/lint/fixtures/skill-bad/skill-oversized-skill-md/SKILL.md
need=$(( 501 - $(wc -l < "$F") ))
for i in $(seq 1 "$need"); do echo "- 填充行用于触发 S4 行数上限（限 500）。"; done >> "$F"
wc -l < "$F"   # 期望 ≥ 501
```

- [ ] **Step 4: 跑测试，确认全绿（GREEN）**

Run: `bun test .claude/scripts/_shared/tests/lint/skill-shape.test.ts`
Expected: PASS（4 tests）。
Run: `bun run check:skills`
Expected: exit 0（8 个真实 SKILL.md 都远低于 500，无 S4）。

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/_shared/lint/skill-shape.ts .claude/scripts/_shared/tests/lint/fixtures/skill-bad/skill-oversized-skill-md/SKILL.md
git commit -m "refactor: ✨ SKILL.md 行数上限 300 提到 500 对齐官方"
```

---

## Task 4: Phase 2 — 全量审计清单（⛔ 审查闸门）

**Files:**
- Create: `docs/superpowers/specs/2026-06-01-claude-prompt-dejargon-audit.md`

本 task 产出审计清单后 **必须停下交用户审**，用户点头才进 Task 5+。下表是写计划时 grep 出的 In 范围命中明细（已排除第三方 `plugins/lanhu`），直接作为审计清单初稿；执行时再补「冗余规则」栏与用户决策。

- [ ] **Step 1: 复核命中未漂移**

Run:
```bash
cd /Users/poco/Projects/kata/.worktrees/dejargon
grep -rnE '沉淀|锚点|心智|抓手|赋能|颗粒度|对齐|收敛|漂移|surface|忠实度|闭环' .claude/skills .claude/rules .claude/prompt --include='*.md' --include='*.yaml' | sort
```
Expected: 与下表一致（计划基线 16 文件）。若有出入以实跑为准并更新清单。

- [ ] **Step 2: 写审计清单（A 类 — 可 1:1 替换）**

| 文件:行 | 词 | 拟改 |
|---|---|---|
| case-draft/fewshots/case-format-sample.md:6 | 对齐 | 「即可掌握所有要点」 |
| case-edit/references/fewshots/case-format-sample.md:6 | 对齐 | 同上（与 case-draft 副本一致） |
| infra-diagnose/SKILL.md:12 | 沉淀回知识库 | 写回知识库 |
| infra-diagnose/SKILL.md:33 | 收尾沉淀时 | 收尾记录时 |
| infra-diagnose/references/knowledge-format.md:1 | 收尾沉淀（标题） | 收尾记录 |
| infra-diagnose/references/knowledge-format.md:3 | 知识沉淀在本地 | 知识记录在本地 |
| infra-diagnose/references/knowledge-format.md:15 | ## 排查后：沉淀 | ## 排查后：记录 |
| infra-diagnose/references/ssh-protocol.md:7 | 已沉淀的 | 已记录的 |
| knowledge-curate/SKILL.md:12 | 沉淀到 | 记录到 |
| knowledge-curate/SKILL.md:30 | 与沉淀流程 | 与记录流程 |
| knowledge-curate/references/knowledge-rules.md:5 | 沉淀为业务知识 | 记录为业务知识 |
| playwright-automation/SKILL.md:73 | surface 契约测试 | 只测页面表层不测业务结果 |
| playwright-automation/phases/§1-case-normalize.md:104,106 | surface 契约测试 / surface 断言假通过 | 只测页面表层… / 表面通过 |
| playwright-automation/phases/§3-ui-plan.md:20 | 收敛为 / surface runner / surface 断言 | 缩小为 / 表层 runner / 弱断言 |
| playwright-automation/phases/§3-ui-plan.md:29,31,44 | UI 知识沉淀 / 沉淀入 / 沉淀为 | …记录 / 记录入 / 记录为 |
| playwright-automation/phases/§4-ui-probe.md:77 | 沉淀知识 | 记录知识 |
| playwright-automation/phases/§6-playwright-generate.md:11,66,68,186,188 | UI 知识沉淀 / surface×2 / 沉淀×2 | 记录 / 表层 / 表面通过 / 记录 |
| playwright-automation/phases/§9-repair-loop.md:77 | 业务规则漂移 / 产品漂移 | 业务规则变了 / 产品行为变了 |
| playwright-automation/phases/§12-case-feedback.md:33 | 文案漂移 | 文案变了（字段 id `ui_text_drift` 保留） |
| playwright-automation/prompts/agent-quality-reviewer.md:32,34 | surface 契约测试 / surface 断言假通过 | 只测页面表层… / 表面通过 |
| playwright-automation/references/cli-essentials.md:55,79 | locator 锚点 / 锚点优先级 | locator 首选 / 定位点优先级（locator 保留） |
| playwright-automation/references/cli-essentials.md:110 | surface 假通过 | 表面通过 |

- [ ] **Step 3: 写审计清单（B 类 — 需判断，逐处理由）**

| 文件:行 | 词 | 处理 |
|---|---|---|
| playwright SKILL.md:13、prompts/agent-quality-reviewer.md:36 | 闭环（修复闭环） | 凑词，删：「运行归因与修复」「### 修复」 |
| playwright SKILL.md:71,72、§6:9,60、prompts/...:26、references/cli-essentials.md:181、§1:104、§3:20、§6:34 | **忠实度 / 覆盖忠实度** | ⚠ **高频核心术语，跨 9 处必须统一定调**——按 spec §5.3 示例改为「步骤与断言的真实性」式说法，给全局唯一替换词，交用户审定后全树一致替换 |

- [ ] **Step 4: 写审计清单（description 改动 — 单列单审）**

| 技能 | 行 | 改动 | 触发风险 |
|---|---|---|---|
| infra-diagnose | SKILL.md:3 | 「并沉淀凭据与排查知识」→「并记录凭据与排查知识」 | 「沉淀」非触发词，低风险；核对 description 总长仍 < 1536 字符 |
| knowledge-curate | SKILL.md:3 | 「统一沉淀于 _shared/knowledge/」→「统一记录于 _shared/knowledge/」 | 同上；触发短语「记一下/术语/更新知识」不受影响 |

其余 6 技能 description 不含 A 类黑话；Phase 3 内若发现 B 类或冗余仍按本栏追加，逐条标触发风险与 1536 字符边界。

- [ ] **Step 5: 写审计清单（冗余 / 未验证规则 — 拟删 / 拟合并）**

执行时逐文件审，重点 `case-draft`、`playwright-automation`（Codex `/goal` 自迭代规则重灾区），按 spec §5.2 五条判定（重复 / 空泛防御 / 自指元规则 / 过度细化 / 保留）逐条标「拟删 / 拟合并 + 对应判定 + 理由」。`case-hotfix`、`defect-analyze`、`workspace-manage`（0 黑话）与 `.claude/rules/**`、`.claude/prompt/_shared/*`、根 `CLAUDE.md`、`INSTALL.md` 也在本栏过一遍。判断偏保守：吃不准合并不删除。

- [ ] **Step 6: ⛔ 交用户审，等待 approve**

把清单（尤其 B 类忠实度定调、description 改动、冗余拟删）交用户。用户逐项点头后才进 Task 5。规则删除与 description 改动**未经用户同意不得执行**。

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/specs/2026-06-01-claude-prompt-dejargon-audit.md
git commit -m "docs: 📝 产出去黑话全量审计清单待审"
```

---

## Phase 3 通用约定（Task 5–11 每个技能/分组都照此走）

每个 Phase 3 task 的四步固定：
1. **改写**：按 Task 4 审计清单对应条目改。A 类直接 1:1 替换；B 类「忠实度」用审计定调的统一词；冗余规则按用户 approve 的删/并执行——**未 approve 的规则删除与 description 改动不得做**。语义不变（要求/禁止/触发条件逐条等价）。
2. **跑测试**：`bun run check:skills`（结构/frontmatter/行数/装饰标记），exit 0。
3. **grep 清零**：对该技能目录跑 A 类 grep，命中为 0（B 类按定调词另核）。
4. **Commit**：`refactor: ✨ <技能> 提示词去黑话重写`。

通用 grep 验收命令（`<DIR>` 替换为技能目录）：
```bash
cd /Users/poco/Projects/kata/.worktrees/dejargon
grep -rnE '沉淀|锚点|心智|抓手|赋能|颗粒度|对齐|收敛|漂移|surface' <DIR> --include='*.md' --include='*.yaml'
# Expected: 无输出（A 类清零）。"忠实度/闭环"按审计定调另核。
```

---

## Task 5: case-draft 去黑话

**Files:**
- Modify: `.claude/skills/case-draft/fewshots/case-format-sample.md:6`（「对齐」）
- Audit: `.claude/skills/case-draft/SKILL.md`（硬规则 9 条 + 工作流，按审计冗余栏判定）

- [ ] **Step 1: 改写**
  - `case-format-sample.md:6`：「看完此条 P0 用例即可对齐所有要点」→「…即可掌握所有要点」。
  - SKILL.md：仅执行审计清单 approve 的冗余删/并；硬规则改写须补「为什么」一句理由且语义等价，未 approve 不动。

- [ ] **Step 2: 测试** — `bun run check:skills`（exit 0）+ `bun run test:e2e:fixture`（case-draft e2e fixture replay PASS，证 hard_rule 语义等价）。

- [ ] **Step 3: grep 清零** — `<DIR>` = `.claude/skills/case-draft`，无输出。

- [ ] **Step 4: Commit** — `git commit -m "refactor: ✨ case-draft 提示词去黑话重写"`

---

## Task 6: case-edit 去黑话

**Files:**
- Modify: `.claude/skills/case-edit/references/fewshots/case-format-sample.md:6`（「对齐」）

- [ ] **Step 1: 改写** — 同 Task 5 的 fewshot 改法。⚠ 这是 case-draft fewshot 的副本，两份措辞必须一致（核对 Task 5 已改文案）。审计 approve 的冗余删/并一并做。

- [ ] **Step 2: 测试** — `bun run check:skills`（exit 0）。

- [ ] **Step 3: grep 清零** — `<DIR>` = `.claude/skills/case-edit`，无输出。

- [ ] **Step 4: Commit** — `git commit -m "refactor: ✨ case-edit 提示词去黑话重写"`

---

## Task 7: infra-diagnose 去黑话（含 description）

**Files:**
- Modify: `.claude/skills/infra-diagnose/SKILL.md`（:3 description、:12、:33）
- Modify: `.claude/skills/infra-diagnose/references/knowledge-format.md`（:1、:3、:15）
- Modify: `.claude/skills/infra-diagnose/references/ssh-protocol.md`（:7）

- [ ] **Step 1: 改写** — 全部「沉淀」按审计 A 类表替换为「记录/写回」。`SKILL.md:3` description 改后核对总长仍 < 1536 字符。`references/knowledge-format.md` 的标题（`# ...收尾沉淀`、`## 排查后：沉淀`）一并改。

- [ ] **Step 2: 测试** — `bun run check:skills`（exit 0）。

- [ ] **Step 3: grep 清零** — `<DIR>` = `.claude/skills/infra-diagnose`，无输出。

- [ ] **Step 4: 对照基线** — `grep -n '^description:' .claude/skills/infra-diagnose/SKILL.md`，与 Task 2 baseline 比对：除「沉淀→记录」外触发词/路由关键词无丢失。

- [ ] **Step 5: Commit** — `git commit -m "refactor: ✨ infra-diagnose 提示词去黑话重写"`

---

## Task 8: knowledge-curate 去黑话（含 description）

**Files:**
- Modify: `.claude/skills/knowledge-curate/SKILL.md`（:3 description、:12、:30）
- Modify: `.claude/skills/knowledge-curate/references/knowledge-rules.md`（:5）

- [ ] **Step 1: 改写** — 全部「沉淀」→「记录」。`SKILL.md:3` description 改后核对 < 1536 字符且触发短语（「记一下这个规则」「XX 术语什么意思」「更新模块知识」）原样保留。

- [ ] **Step 2: 测试** — `bun run check:skills`（exit 0）。

- [ ] **Step 3: grep 清零** — `<DIR>` = `.claude/skills/knowledge-curate`，无输出。

- [ ] **Step 4: 对照基线** — description 与 Task 2 baseline 比对，触发词无丢失。

- [ ] **Step 5: Commit** — `git commit -m "refactor: ✨ knowledge-curate 提示词去黑话重写"`

---

## Task 9: playwright-automation 去黑话（重灾区，9 文件）

**Files（全部含命中）:**
- `SKILL.md`（:13 闭环、:71/:72 忠实度、:73 surface）
- `phases/§1-case-normalize.md`（:104、:106）
- `phases/§3-ui-plan.md`（:20、:29、:31、:44）
- `phases/§4-ui-probe.md`（:77）
- `phases/§6-playwright-generate.md`（:9、:11、:60、:66、:68、:186、:188）
- `phases/§9-repair-loop.md`（:77）
- `phases/§12-case-feedback.md`（:33）
- `prompts/agent-quality-reviewer.md`（:26、:32、:34、:36）
- `references/cli-essentials.md`（:55、:79、:110、:181）

- [ ] **Step 1: 改写 A 类** — 全树「沉淀→记录」「surface→表面通过/只测页面表层」「收敛→缩小」「漂移→变了」「锚点→定位点（locator 保留）」，逐处按审计 A 类表。`§12:33` 注意 `ui_text_drift` 是字段 id，只改中文「漂移」。

- [ ] **Step 2: 改写 B 类「忠实度」** — 用审计 Step 3 用户定调的统一词，替换全部 9 处「覆盖忠实度 / 忠实自动化 / 忠实覆盖 / 忠实实现」，跨文件用词一致。关键禁令（如「禁止把业务流程简化为只测页面表层」）补「为什么」一句（surface 测试证明不了业务结果正确）。「修复闭环」删为「修复」。

- [ ] **Step 3: 冗余规则** — 按审计 approve 项删/并 Codex 自迭代冗余条款；未 approve 不动；语义不变。

- [ ] **Step 4: 测试** — `bun run check:skills`（exit 0；注意 phases 子目录合法）。

- [ ] **Step 5: grep 清零** — `<DIR>` = `.claude/skills/playwright-automation`，A 类无输出；`grep -rn '忠实度\|闭环' .claude/skills/playwright-automation` 仅剩定调后认可的用法（或 0）。

- [ ] **Step 6: Commit** — `git commit -m "refactor: ✨ playwright-automation 提示词去黑话重写"`

---

## Task 10: 零黑话技能冗余审计落地（case-hotfix / defect-analyze / workspace-manage）

**Files:**
- `.claude/skills/case-hotfix/**`、`.claude/skills/defect-analyze/**`、`.claude/skills/workspace-manage/**`（无 A/B 黑话命中）

- [ ] **Step 1: 改写** — 这三个技能无黑话替换，仅执行审计清单 approve 的冗余删/并（按 spec §5.2）。无 approve 项则本 task 仅确认无需改动并跳过 commit。

- [ ] **Step 2: 测试** — `bun run check:skills`（exit 0）。

- [ ] **Step 3: grep 复核** — 三技能目录 A 类 grep 仍为 0。

- [ ] **Step 4: Commit（仅当有改动）** — `git commit -m "refactor: ✨ 精简 hotfix/defect/workspace 冗余规则"`

---

## Task 11: 非技能文档去黑话（rules / prompt / 入口文档）

**Files:**
- `.claude/rules/**`（8 个 .md）
- `.claude/prompt/_shared/case-qa.md`、`output-artifacts.md`
- 根 `CLAUDE.md`、`.claude/rules/project-workflow-rules.md`、`INSTALL.md`

- [ ] **Step 1: 复核命中** — `grep -rnE '沉淀|锚点|心智|抓手|赋能|颗粒度|对齐|收敛|漂移|surface|忠实度|闭环' .claude/rules .claude/prompt CLAUDE.md INSTALL.md`。grep 基线显示这批 0 黑话命中；若实跑有命中按审计表改。

- [ ] **Step 2: 改写** — 按命中（若有）+ 审计 approve 的冗余。入口文档（CLAUDE.md/INSTALL.md）改路径/命令示例时手工验证可执行（testing.md 规则）。

- [ ] **Step 3: 测试** — `bun run check:skills` + `bun run lint:paths`（改了路径引用时，exit 0）。

- [ ] **Step 4: Commit（仅当有改动）** — `git commit -m "refactor: ✨ rules/prompt/入口文档去黑话"`

---

## Task 12: Phase 4 — 验证 + 合并回 main

**Files:**
- Create: `docs/superpowers/specs/2026-06-01-claude-prompt-dejargon-verify-report.md`

- [ ] **Step 1: A 类黑话全树清零（排除第三方 plugins）**

```bash
cd /Users/poco/Projects/kata/.worktrees/dejargon
grep -rnE '沉淀|锚点|心智|抓手|赋能|颗粒度|对齐|收敛|漂移|surface' .claude/skills .claude/rules .claude/prompt CLAUDE.md INSTALL.md --include='*.md' --include='*.yaml'
```
Expected: 无输出。`.claude/plugins/**`（lanhu 第三方）不在范围、不算违规。

- [ ] **Step 2: B 类按定调核** — `grep -rn '忠实度\|闭环' .claude/skills .claude/rules` 仅剩审计定调认可的用法（理想为 0）。

- [ ] **Step 3: 全量测试 + 契约 + e2e**

```bash
bun run check:skills          # exit 0
bun test 2>&1 | tail -5       # 全 pass，0 fail
bun run test:e2e:fixture      # case-draft e2e fixture replay PASS
bun run check 2>&1 | tail -5  # biome 无新增问题
```
Expected: 全绿。任何 fail 先在 worktree 内修到根因（testing.md），不得带病合并。

- [ ] **Step 4: description 人工对照** — infra-diagnose、knowledge-curate 的 `description:` 与 Task 2 baseline 逐字比对：仅「沉淀→记录」一处差异，触发词/路由关键词/<1536 字符均未破。其余 6 技能 description 未改则与 baseline 全等。

- [ ] **Step 5: 写验证报告** — 记录每条命令的 exact 输出（exit code、pass/fail/skip 数）、A 类清零结论、B 类定调结论、description 对照结论、行数上限 300→500 说明、本次未做项（codex 触发链迁移）。

- [ ] **Step 6: Commit 报告**

```bash
git add docs/superpowers/specs/2026-06-01-claude-prompt-dejargon-verify-report.md
git commit -m "docs: 📝 去黑话重写验证报告"
```

- [ ] **Step 7: 合并回 main + push + 清理**

```bash
cd /Users/poco/Projects/kata/.worktrees/dejargon
SHA=$(git rev-parse HEAD)
cd /Users/poco/Projects/kata
git merge --no-ff "$SHA" -m "merge: 🔀 .claude 提示词去黑话与官方规范对齐重写"
bun run check:skills && bun test 2>&1 | tail -5   # 合并后复验全绿
git push origin main
git worktree remove .worktrees/dejargon
```
Expected: 合并无冲突、复验全绿、push 成功、worktree 清理。远端不可用时记录阻塞，不静默跳过。

---

## Self-Review（写计划后自检，已执行）

**1. Spec 覆盖：**
- §3 范围（In/Out、8 技能、phases/、300→500 例外）→ File Structure + Task 3 + Task 5–11 ✓
- §4 官方原则 + 自由度分级 → Task 1 准则文档 ✓
- §5.1 A/B 黑话 + 白名单 + 中英夹杂 → Task 4 审计 A/B 栏 + Task 5–11 grep 清零 ✓
- §5.2 冗余判定 → Task 4 Step 5 + 各技能冗余 step ✓
- §5.3/§5.4 正向准则/底线（hard_rule 人工对照 + e2e）→ Task 1 + Task 5 Step 2 ✓
- §6 五阶段 → Task 0–12 一一映射（Phase 0=T1, 1=T2, 1.5=T3, 2=T4, 3=T5–11, 4=T12）✓
- §7 四产物（准则/基线/审计/验证报告）→ T1/T2/T4/T12 ✓
- §8 风险（触发链漂移/hard_rule/lint/语义/纯禁令/误删/术语）→ 审查闸门 T4 + grep 验收 + 人工对照覆盖 ✓
- §9 成功标准 → Task 12 Step 1–5 逐条对应 ✓

**2. Placeholder 扫描：** 唯一带代码的 Task 3 给了 complete code（常量值 + fixture 扩行命令 + RED/GREEN 期望）。文本改写 task 的「逐字新文本」刻意延后到 Task 4 审计闸门定稿——这是 spec 的审查闸门设计，每个 task 已钉死 exact 文件:行 + 改写依据 + grep/test 验收门，非 placeholder。

**3. 一致性：** worktree 路径全程 `.worktrees/dejargon`；行数阈值全程 500；技能数全程 8；commit type 遵守映射（docs 📝 / refactor ✨ / merge 🔀）；grep 词表 A 类全程一致。

---

## 执行入口

逐技能独立、改一个测一个，适合 subagent-per-task。Task 4 是硬闸门（产审计清单→停→交用户审），Task 5+ 必须在 approve 后启动。
