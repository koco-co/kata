# Skill 运行目录拆分第四阶段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在完成 Phase 3A 审查的全部修复后，按 spec §12.4 推进 `.ai/**` 停用（Phase 4a）与物理删除（Phase 4b），把仍有价值的 schema 与 rules 迁出 `.ai/core/**`，并废止 `kata ai-core` projection 链路。

**Architecture:** Phase 4a 是迁移与停用阶段，把 `.ai/core/schemas`、`.ai/core/rules`、`.ai/core/plugins`、`.ai/core/contracts` 中仍被引用的内容搬到 `docs/skills/contracts/**` 或 `engine/src/skills/schemas/**`，给 `kata ai-core` CLI 加 deprecation 警告并停用 projection render/check/lock；Phase 4b 至少间隔一个 PR 周期后再物理删除 `.ai/**` 与对应 engine/test 代码。两个子阶段之间通过本计划的 Phase 4a Task 9（PR 周期标记）显式分隔。

**Tech Stack:** Bun >= 1.3、TypeScript、commander CLI、biome、git、`engine/tests/cli-runner.ts`、`bun engine/bin/kata ai-core` 现有代码。

---

## Phase 3A 审查修复基线

本节记录 2026-05-28 审查后已经并入本分支的修复基线。Phase 4 开始前必须保持这些检查为绿色，不再把下列事项作为 Phase 4 待办重复处理。

- `runtime-sync` 已校验 `SKILL.md` frontmatter `description` 必填，避免 Codex/Claude skill 缺少稳定触发描述。
- `runtime-sync` 已读取并校验 `docs/skills/contracts/runtime-sync-exceptions.yaml`，无效例外会使 `bun run check:skills` 失败。
- `BLOCKED_REASON_PATTERNS` 保留 `/\bbehaviou?r/i`，并扩展 `delivery`、`交付`、`产物`、`验证`、`语义` 等禁止豁免关键词。
- `workflow-schema` 已要求每个 workflow step 显式声明 `blackboard_inputs`、`blackboard_outputs`、`references`、`failure_modes`、`human_gates`、`verification`。
- `workflow-check` 已按 YAML 顺序校验 review 文档 step 列表，并校验 failure modes / human gates 在 review 文档中出现。
- `case-draft.yaml` 已为 13 个 step 补齐具体 `references` 和验证项，和 SKILL.md 的按需加载协议保持可追溯。
- `AGENTS.md` / `CLAUDE.md` 已通过 `docs/skills/contracts/project-workflow-rules.md` 恢复 Git、测试、命名、QA 产物和工作区边界规则的按需加载入口。

仍不在 Phase 4 范围内：

- 不实现 `BLACKBOARD_SLOT_MISSING` 运行时拦截；blackboard 第一版仍是文档化状态模型。
- 不处理 Phase 2B（Claude 原生 frontmatter 字段补齐 / Codex `agents/openai.yaml`）。
- 不处理 Phase 3B（其他 skill 的 workflow YAML 抽取）。

---

## Phase 4 范围说明

本计划覆盖 spec §12.4 与 §12.5 描述的两个子阶段：

- **Phase 4a**：把仍有价值的内容从 `.ai/core/**` 迁出；停用 `kata ai-core` projection 链路；标记 `.ai/**` 为"已废弃"。`.ai/**` 仍保留在工作树（只读）。
- **Phase 4b**：至少间隔一个 PR 周期后，物理删除 `.ai/**` 与所有 projection 相关 engine 代码、测试、CI 步骤。

Phase 3A 审查待修复项已作为前置基线修复，本计划从 Phase 4a 停用 `.ai/**` 开始。Phase 5 回归保留为单独的实施计划。

**不在本计划范围**：

- 不处理 Phase 3B（其他 9 个 skill 的 workflow yaml 抽取），属于独立计划。
- 不处理 Phase 2B（Claude 原生 frontmatter 字段补齐 / Codex `agents/openai.yaml`），属于独立计划。
- 不实现 spec §8 第三层 route-check prompt 样例测试。
- 不实现 `BLACKBOARD_SLOT_MISSING` 运行时拦截（P5）。

---

## 与前置阶段的关系

- Phase 1 + 2A + 3A 全部检查必须保持绿色：`bun test engine/tests/skills/ engine/tests/cli/skills-sync-check.test.ts` 与 `bun run check:skills` 在 Task 4 Pre-flight 中再次校验。
- Phase 2B（runtime native config）可与 Phase 4 并行；若 Phase 2B 在执行中扩展了 SKILL.md frontmatter 字段，Phase 4a Task 4 pre-flight 会发现白名单偏移，停下 Phase 4 先同步白名单。
- Phase 4a Task 9（PR 周期标记）与 Phase 4b Task 11（物理删除）之间必须有至少一个 PR 周期，且 4a 落地后保持 `.ai/**` 只读。

---

## 文件结构（Phase 4 总览）

**Modify（Phase 3A 修复基线，已完成，不在 Phase 4 重复执行）：**

- `engine/src/skills/runtime-sync.ts`：`description` 必填、runtime-sync exceptions 接入、`behaviou?r` 与中文 reason guard。
- `engine/src/skills/workflow-schema.ts` / `workflow-check.ts`：step metadata、review 顺序、failure modes / human gates 检查。
- `docs/skills/contracts/workflows/case-draft.yaml` 与 `docs/skills/workflows/case-draft.md`：case-draft workflow references 下沉和 review 细节补齐。
- `AGENTS.md` / `CLAUDE.md`：恢复 `docs/skills/contracts/project-workflow-rules.md` 规则入口。

**Create（Phase 4a 主体）：**

- `docs/skills/migrations/ai-core-inventory.md`：`.ai/core/**` 清点与迁移状态。
- `docs/skills/contracts/schemas/*.json` / `source-ref-registry.yaml`：从 `.ai/core/schemas/**` 迁入 runtime-used schemas。
- `docs/skills/contracts/rules/*.md`：从 `.ai/core/rules/**` 迁入项目规则。
- `docs/skills/contracts/plugins/**`：从 `.ai/core/plugins/**` 迁入仍被 runtime 使用的插件 metadata。

**Modify（Phase 4a 主体）：**

- `engine/src/cli/ai-core.ts`（或等价入口）：增加 deprecation 警告 + 默认 no-op；保留 `--allow-deprecated` 逃生口直到 4b。
- `README.md` / `README-EN.md`：标记 `.ai/core` 为"已废弃，保留待删除"。
- `scripts/run-ai-core-lint.ts`：不再调 projection render/check/lock，改跑 `skills sync-check --exit-code`。
- `.github/workflows/*.yml` 与 `docs/ci-cd.md`：schema 触发路径切到 `docs/skills/contracts/schemas/**`。

**Delete（Phase 4b 主体）：**

- `.ai/**`：物理删除。
- `engine/src/ai-core/**`：删除 projection render/check/lock 实现。
- `engine/tests/ai-core/**`：删除对应测试。
- CI yaml 中 `kata ai-core projection` 相关步骤：删除。

---

## Task 1: 已完成基线 — Phase 3A 文档自检

> 历史记录：中文标点、Phase 3A 文档自检和 case-draft runtime 文档同步问题已在 Phase 3A 审查修复基线中处理。Phase 4 不再重复执行这些修复，只在 Task 4 Pre-flight 重新验证。

- [x] Phase 3A 新增文档已完成标点和 workflow 自检。
- [x] `.agents/skills/case-draft/SKILL.md` 与 `.claude/skills/case-draft/SKILL.md` 不再含 generated marker 或 active `.ai/core` 引用。
- [x] `bun run check:skills` 覆盖 runtime detach 和 workflow check。

## Task 2: 已完成基线 — runtime-sync exceptions 与 behaviour 拦截

> 历史记录：`behaviou?r` 拦截、中文 reason guard、`description` 必填和 `runtime-sync-exceptions.yaml` 接入已在前置修复中完成。Phase 4 只保留回归验证。

- [x] `engine/src/skills/runtime-sync.ts` 校验 `description` 必填。
- [x] `docs/skills/contracts/runtime-sync-exceptions.yaml` 被 `checkRuntimeSkillSync` 读取并校验。
- [x] exception reason 不允许豁免用户语义、输出产物、验证范围或交付语义。
- [x] `engine/tests/skills/sync-check.test.ts` 覆盖 English `behaviour` reason 拒绝。

## Task 3: 已完成基线 — case-draft workflow references 下沉

> 历史记录：当前选择已固定为将具体 references 下沉到 `case-draft.yaml`，并由 workflow schema/check 校验 step metadata 和 review 细节。

- [x] `docs/skills/contracts/workflows/case-draft.yaml` 的 13 个 step 均声明 `blackboard_inputs`、`blackboard_outputs`、`references`、`failure_modes`、`human_gates`、`verification`。
- [x] `engine/src/skills/workflow-schema.ts` 要求 step metadata 字段存在且为 array。
- [x] `engine/src/skills/workflow-check.ts` 按 YAML 顺序校验 review step 列表，并校验 failure modes / human gates 在 review 文档中出现。
- [x] `.agents/skills/case-draft/SKILL.md` 与 `.claude/skills/case-draft/SKILL.md` 只引用 workflow YAML，不再内嵌 13 步长流程。

## Task 4: Phase 4a Pre-flight — 检查 Phase 1–3 全部修复落地

本任务**不修改任何文件**，仅校验 Phase 4a 入场条件。

- [x] **Step 1: 确认 worktree、分支、merge-base**

Run:

```bash
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git merge-base main HEAD
git status --short
```

Verified 2026-05-28:

- toplevel: `/Users/poco/Projects/kata/.worktrees/skill-runtime-split-design`。
- branch: `codex/skill-runtime-split-design`。
- merge-base: `40889a74bda5b33ff8b0fd054b98d177704b66f4`。
- implementation 后 working tree 包含本 Phase 4a diff；未把 `.ai/**` 纳入 diff。

- [x] **Step 2: 跑 Phase 1+2+3 全部测试**

Run:

```bash
bun test engine/tests/skills/ engine/tests/cli/skills-sync-check.test.ts
```

Verified 2026-05-28: `45 pass / 0 fail`。

- [x] **Step 3: 跑 check:skills**

Run:

```bash
bun run check:skills
```

Verified 2026-05-28: exit code `0`，输出顺序为 `runtime skill sync passed` → `runtime detach passed` → `workflow check passed`。

- [x] **Step 4: 自动断言 Phase 3A 文档全角标点齐全**

Run:

```bash
for f in docs/skills/blackboard/state-model.md docs/skills/workflows/case-draft.md; do
  rg -n '[，；：（）]' "$f" >/dev/null || { echo "FAIL: $f missing full-width punctuation"; exit 1; }
done
```

Verified 2026-05-28: 命中中文全角标点，无 FAIL 输出。

- [x] **Step 5: 自动断言 `.ai/**` 仍存在且未被本分支动过**

Run:

```bash
test -d .ai
BASE=$(git merge-base main HEAD)
git diff --name-only "$BASE"..HEAD | rg '^\.ai/' && exit 1 || true
```

Verified 2026-05-28: `.ai/**` 存在，`git diff --name-only main...HEAD -- .ai` 无输出。

- [x] **Step 6: 跑 biome baseline**

Run:

```bash
bun run check 2>&1 | tee /tmp/phase4-preflight-biome.log | tail -20
```

Verified 2026-05-28: `bun run check` exit code `0`，baseline 保持 `173 warnings / 6 infos`。

- [x] **Step 7: 汇报 pre-flight 通过**

写下：

```text
Phase 4a pre-flight 通过：Phase 1+2A+3A 全测试 PASS；check:skills 三段 passed；Phase 3A 文档全角标点齐全；.ai/** 未被本分支动过；biome warning baseline = <数字>。
```

Verified 2026-05-28: Phase 4a pre-flight 通过；Phase 1+2A+3A 测试 PASS；check:skills 三段 passed；Phase 3A 文档全角标点齐全；`.ai/**` 未被本分支动过；biome warning baseline = 173。

如果任一断言失败：明确写"pre-flight 失败：<具体项>"，**停下** Phase 4 后续 Task 直到修复。

---

## Task 5: Phase 4a — 清点 `.ai/core/**` 现役引用源

**Files:**

- Create: `docs/skills/migrations/ai-core-inventory.md`

- [x] **Step 1: 记录 `.ai/core/**` 文件数量与目录分布**

Run:

```bash
find .ai/core -type f | wc -l
for d in agents commands contracts docs evals exceptions external-skills guards imports plugins prompts references rules runners runtimes schemas skills source-refs workflows; do
  if [ -d ".ai/core/$d" ]; then printf '%s ' "$d"; find ".ai/core/$d" -type f | wc -l | tr -d ' '; fi
done
```

Expected: inventory 文档记录 `.ai/core/**` 当前 288 个文件和各目录数量。

- [x] **Step 2: 输出迁移清单**

`docs/skills/migrations/ai-core-inventory.md` 必须说明：

- Phase 4a 只读保留 `.ai/core/**`。
- runtime-used schemas 迁入 `docs/skills/contracts/schemas/**`。
- rules 迁入 `docs/skills/contracts/rules/**`。
- plugin runtime metadata 迁入 `docs/skills/contracts/plugins/**`。
- `kata ai-core` 默认 no-op，旧命令仅通过 `--allow-deprecated` 暂时可用。
- Phase 4b 删除 `.ai/**`、`engine/src/ai-core/**`、`engine/tests/ai-core/**` 必须等下一 PR 周期。

## Task 6: Phase 4a — 迁移 runtime-used schemas

**Files:**

- Create: `docs/skills/contracts/schemas/CaseCorrections.v1.schema.json`
- Create: `docs/skills/contracts/schemas/CoverageMatrix.v1.schema.json`
- Create: `docs/skills/contracts/schemas/FeatureManifest.v2.schema.json`
- Create: `docs/skills/contracts/schemas/FeatureMetadata.v1.schema.json`
- Create: `docs/skills/contracts/schemas/FeatureSourceSnapshot.v1.schema.json`
- Create: `docs/skills/contracts/schemas/PlaywrightAutomationHandoff.v2.schema.json`
- Create: `docs/skills/contracts/schemas/SourceRefRegistry.v1.schema.json`
- Create: `docs/skills/contracts/schemas/SourceSnapshot.v1.schema.json`
- Create: `docs/skills/contracts/schemas/source-ref-registry.yaml`
- Modify: `engine/src/schemas/loaders.ts`
- Modify: `engine/src/lint/source-ref-registry.ts`
- Modify: `engine/src/cli/handoff-render.ts`
- Modify: `engine/tests/schemas/*.test.ts`

- [x] **Step 1: 复制仍被 non-ai-core runtime 使用的 schema**

Runtime-used schema 文件从 `.ai/core/schemas/**` 复制到 `docs/skills/contracts/schemas/**`。不复制仅被废弃 AI Core compat 使用的 schema。

- [x] **Step 2: 切换 non-ai-core loader 路径**

`engine/src/schemas/loaders.ts`、`engine/src/lint/source-ref-registry.ts`、`engine/src/cli/handoff-render.ts` 读取 `docs/skills/contracts/schemas/**`。

- [x] **Step 3: 更新 schema tests**

`engine/tests/schemas/**` 直接读取 `docs/skills/contracts/schemas/**`。

## Task 6.5: Phase 4a — 迁移插件 runtime metadata

**Files:**

- Create: `docs/skills/contracts/plugins/**`
- Modify: `engine/lib/paths.ts`
- Modify: `engine/src/config.ts`
- Modify: `engine/src/plugin-loader.ts`
- Modify: `engine/src/case-draft.ts`
- Modify: `engine/lib/plugin-utils.ts`
- Modify: `engine/tests/plugins/plugin-utils.test.ts`
- Modify: `engine/tests/security-command-hardening.test.ts`

- [x] **Step 1: 复制仍被 non-ai-core runtime 使用的插件 metadata**

`.ai/core/plugins/**` 复制到 `docs/skills/contracts/plugins/**`，保留 `runtime.json`、`plugin.json`、`plugin.yaml` 和 fixture。

- [x] **Step 2: 切换 non-ai-core 插件 loader 路径**

`config`、`plugin-loader`、`case-draft` 改读 `docs/skills/contracts/plugins/**`；`.ai/core/plugins/**` 仅由废弃 AI Core 兼容代码继续使用。

- [x] **Step 3: 更新插件相关测试**

安全硬化测试和 plugin-utils 测试不再把 `.ai/core/plugins/**` 当作当前 metadata 来源。

## Task 7: Phase 4a — 迁移项目规则

**Files:**

- Create: `docs/skills/contracts/rules/*.md`
- Create/Modify: `docs/skills/contracts/project-workflow-rules.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `docs/skills/*.md`

- [x] **Step 1: 复制 `.ai/core/rules/**` 到 docs contracts**

规则文件迁入 `docs/skills/contracts/rules/**`，并清理文件内仍把 `.ai/core/**` 当当前来源的措辞。

- [x] **Step 2: 恢复 runtime 入口的项目规则入口**

`AGENTS.md` / `CLAUDE.md` 保留摘要，并指向 `docs/skills/contracts/project-workflow-rules.md`。

- [x] **Step 3: 替换 skill docs 中的 active `.ai/core/rules/**` 引用**

`docs/skills/*.md` 的参考路径改指 runtime skill 或 `docs/skills/contracts/rules/**`。

## Task 8: Phase 4a — 停用 `kata ai-core` 默认路径

**Files:**

- Modify: `engine/src/cli/ai-core.ts`
- Modify: `engine/src/cli/index.ts`
- Modify: `engine/tests/cli/ai-core-cli.test.ts`
- Modify: `scripts/run-ai-core-lint.ts`

- [x] **Step 1: `kata ai-core` 默认 no-op**

默认执行 `kata ai-core ...` 输出 deprecation warning，exit code `0`，不再运行 projection render/check/lock。

- [x] **Step 2: 保留临时逃生口**

旧命令仅通过 `kata ai-core --allow-deprecated ...` 访问，供 Phase 4b 删除前兼容排查。

- [x] **Step 3: CI/local lint 停止调用 projection**

`scripts/run-ai-core-lint.ts` 不再调用 `ai-core projection`、`docs check`、`gate` 等旧链路，改为运行 `skills sync-check --exit-code`。

## Task 9: Phase 4a — 更新 README、架构文档与 CI 触发路径

**Files:**

- Modify: `README.md`
- Modify: `README-EN.md`
- Modify: `docs/architecture/kata-project-architecture.md`
- Modify: `docs/architecture/ai-core-architecture.md`
- Modify: `docs/ci-cd.md`
- Modify: `.github/workflows/schema-check.yml`
- Modify: `.github/workflows/features-lint.yml`

- [x] **Step 1: README 标记 `.ai/core/**` 已废弃**

README / README-EN 不再把 `.ai/core/**` 描述为当前 source of truth；runtime source 改为 `.agents/**`、`.claude/**` 和 `docs/skills/contracts/**`。

- [x] **Step 2: 架构文档标记 AI Core 为历史兼容层**

架构文档说明 Phase 4a 后 `.ai/core/**` 只读保留，旧 projection 流程仅为历史参考。

- [x] **Step 3: CI schema 路径切到 docs contracts**

`.github/workflows/schema-check.yml` 与 `.github/workflows/features-lint.yml` 监听 `docs/skills/contracts/schemas/**`。

本任务完成后即 Phase 4a 收尾。进入 Phase 4b 前必须至少间隔一个 PR 周期。

## Task 10: Phase 4b — 物理删除 `.ai/**`（下一 PR 周期）

> **Do not execute in Phase 4a.** Phase 4b 需要在 Phase 4a PR 合并并稳定至少一个 PR 周期后执行。

Phase 4b 属于本 Phase 4 计划。若由后续 closeout 计划执行，后续计划必须引用本任务作为源计划，而不是把 `.ai/**` 删除改写成新的阶段范围。

**Files:**

- Delete: `.ai/**`
- Delete: `engine/src/ai-core/**`
- Delete: `engine/tests/ai-core/**`
- Delete: `scripts/run-ai-core-lint.ts`
- Delete: `docs/architecture/ai-core-architecture.md`
- Modify: `package.json`
- Modify: `engine/src/cli/index.ts`
- Modify: `engine/lib/paths.ts`
- Modify: `.github/workflows/*.yml`
- Modify: `README.md`, `README-EN.md`
- Modify: `docs/architecture/kata-project-architecture.md`, `docs/ci-cd.md`
- Modify: non-AI-Core source/test imports still pointing at `engine/src/ai-core/**`

- [ ] **Step 1: 重新确认 Phase 4a 到 Phase 4b 的间隔**

记录 Phase 4a PR/merge commit、当前 Phase 4b branch 或 closeout branch，以及至少一个 PR 周期已经过去的证据。若本仓库策略改为由用户明确授权跳过等待，最终报告必须记录该授权来源和日期。

- [ ] **Step 2: 查找所有旧架构引用**

Run:

```bash
rg -n "from ['\"].*ai-core|engine/src/ai-core|engine/tests/ai-core|kata ai-core|lint:ai-core|test:ai-core|projection render|projection check|projection lock|aiCorePluginsDir|\.ai/core|\.ai/" engine scripts package.json .github README.md README-EN.md AGENTS.md CLAUDE.md docs/architecture docs/ci-cd.md docs/skills
```

Expected: 输出列出所有需要删除或改写的引用；只允许 `docs/skills/migrations/**` 中的历史清单类文本作为迁移记录保留，不能作为当前架构或兼容路径出现。

- [ ] **Step 3: 将非 AI Core 共享类型迁出**

如果非 AI Core 模块只从 `engine/src/ai-core/types.ts` 引入通用结果类型，创建 `engine/src/result-types.ts`：

```typescript
export interface KataIssue {
  code: string;
  message: string;
  path?: string;
  severity?: "info" | "warn" | "fail";
  contractId?: string;
}

export interface KataResult {
  passed: boolean;
  issues: KataIssue[];
}
```

把非 AI Core 模块改为从相对路径引入：

```typescript
import type { KataIssue, KataResult } from "../result-types.ts";
```

- [ ] **Step 4: 删除 CLI、脚本和 package 入口**

修改 `engine/src/cli/index.ts`：

- 删除 `ai-core` command import。
- 删除 `program.addCommand(buildAiCoreCommand())`。

修改 `package.json`：

- 删除 `lint:ai-core`。
- 删除 `test:ai-core`。
- 将 `ci` 中的旧 projection/lint 入口改为当前 `bun run check:skills` 和现有测试入口。

删除 `scripts/run-ai-core-lint.ts`。

- [ ] **Step 5: 删除旧 path helper**

修改 `engine/lib/paths.ts`，删除：

```typescript
export function aiCorePluginsDir(): string {
  return resolve(repoRoot(), ".ai/core/plugins");
}
```

Run:

```bash
rg -n "aiCorePluginsDir|\.ai/core/plugins" engine lib tests
```

Expected: exit code `1`，无输出。

- [ ] **Step 6: 物理删除旧目录**

Run:

```bash
rm -rf .ai engine/src/ai-core engine/tests/ai-core docs/architecture/ai-core-architecture.md
```

Expected: exit code `0`。

- [ ] **Step 7: 验证旧目录不存在**

Run:

```bash
test ! -e .ai
test ! -e engine/src/ai-core
test ! -e engine/tests/ai-core
test ! -e scripts/run-ai-core-lint.ts
test ! -e docs/architecture/ai-core-architecture.md
```

Expected: 全部 exit code `0`。

## Task 11: Phase 4b — 清理旧 projection 兼容代码与总回归（下一 PR 周期）

> **Do not execute in Phase 4a.** 该任务只能在 Task 10 同一个 Phase 4b 分支中执行。

Phase 4b 完成后，当前架构只能是 `SKILL + Router + Graph + Workflow + Blackboard`。不得保留 `kata ai-core`、projection render/check/lock、`.ai/**` 只读兼容或历史 fallback。

- [ ] **Step 1: 改写当前架构文档**

README、README-EN、`docs/architecture/kata-project-architecture.md` 和 `docs/ci-cd.md` 只能描述：

```text
SKILL + Router + Graph + Workflow + Blackboard
.claude/** for Claude Code runtime
.agents/** for Codex runtime
docs/skills/contracts/** for shared orchestration contracts
engine/src/skills/** for validation
```

不要把 AI Core、projection 或 `.ai/**` 保留为兼容、fallback 或当前路径。

- [ ] **Step 2: 确认当前架构引用已清零**

Run:

```bash
rg -n "kata ai-core|lint:ai-core|test:ai-core|projection render|projection check|projection lock|aiCorePluginsDir|engine/src/ai-core|engine/tests/ai-core|\.ai/core|\.ai/" engine scripts package.json .github README.md README-EN.md AGENTS.md CLAUDE.md docs/architecture docs/ci-cd.md docs/skills
```

Expected: exit code `1`，无输出；若 `docs/skills/migrations/**` 保留历史迁移清单，必须在最终报告中单独列为历史记录，不得被 README、入口文档或 runtime SKILL.md 引用。

- [ ] **Step 3: 跑 Phase 4b 总回归**

Run:

```bash
bun run check:skills
bun test --cwd engine
bun run check
git diff --check
```

Expected:

- `check:skills` exit code `0`。
- `bun test --cwd engine` exit code `0`，记录 pass/fail/skipped count。
- `bun run check` exit code `0`；若只剩既有 warning，记录 warning count。
- `git diff --check` exit code `0`。

---

## Self-Review Checklist

- [x] Phase 3A 审查修复基线已落地：description 必填、runtime-sync-exceptions 接入、behaviou?r 保留、workflow step metadata 校验、review 顺序和细节校验、case-draft references 下沉。
- [x] Task 4 pre-flight 含全部 Phase 1+2A+3A 测试与 check:skills 三段 passed 断言。
- [x] Task 5–9（含 Task 6.5 插件 metadata 迁移）已展开为可执行 Step 并完成 Phase 4a；Task 10–11 明确保留到下一 PR 周期的 Phase 4b。
- [x] 计划文档本身不再含未展开任务或历史漂移措辞。
- [x] `.ai/**` 在 Phase 4a 中保持未被改动；只有 Task 10（Phase 4b）允许删除。
- [x] Phase 4a 与 Phase 4b 之间显式留有至少一个 PR 周期间隔（spec §13 风险表 442 行要求）。
