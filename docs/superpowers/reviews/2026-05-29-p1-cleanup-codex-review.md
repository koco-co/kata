# P1 Plan Codex Review — 2026-05-29

## Plan reviewed
`docs/superpowers/plans/2026-05-29-p1-cleanup.md`（2156 行，7 commits）

## Reviewer
Codex（gpt-5.x@xhigh，effort=high），通过 codex-companion runtime。

## Codex 报 5 blocker + 6 major；逐条核对结果

### Blocker B1 — "§6.1 frontmatter allowlist lint 完全缺失"
**判定: false positive（codex 幻觉）。**
真实 spec §6.1 是字段表（"✅ 必填"是行内说明而非 schema 子键）；§10 lint #1 只要求 "frontmatter 字段 ∈ allowlist"。Plan commit 3 step 3.8-3.11 已经覆盖：扩 `CLAUDE_SKILL_FRONTMATTER_FIELD_LIST` 加 `argument-hint`、`CODEX_SKILL_FRONTMATTER_FIELD_LIST` 加 `when_to_use` + `disable-model-invocation`，并更新 `frontmatter-check.test.ts`。现有 `engine/src/skills/runtime-sync.ts` `validateSupportedFrontmatterFields()` 自动 push `UNSUPPORTED_FRONTMATTER` violation，lint 强制机制本就存在。

### Blocker B2 — "4 个新 skill workflow 在 P1 创建但 skill dir 在 P3，catalog check throw"
**判定: false positive。**
现仓 `.claude/skills/` 已有 infra-diagnose / knowledge-curate / workspace-manage 三个目录（用 `ls .claude/skills/` 已确认）；只有 defect-analyze 缺。Plan commit 4.b step 4.b.13 显式说明此点，并在 step 4.b.12 改 `workflow-check.ts` 容许过渡 skill 目录缺失（stderr `[transition]` warn，不 push violation）。Codex 没看到 4.b.12 + 4.b.13 段落。

### Blocker B3 — "`.agents/skills/playwright-cli/` 未同步删除"
**判定: false positive。**
Plan commit 5 step 5.10：`git rm -r .claude/skills/playwright-cli .agents/skills/playwright-cli` 已含双侧删除；step 5.7 的 test 也断言两侧目录都不存在。

### Blocker B4 — "compat-shim 必须在下一 commit 删除（§13 风险 7）"
**判定: false positive（codex 编造 spec 风险）。**
Spec §13 风险 7 是 "migrate case-draft 难度"，与 compat-shim 生命周期无关。Spec §13 风险 4（"`apps/core` 解耦 `.agents` 读取"）只要求 compat-shim 保 `kata_list_skills` 响应字段 schema 不变 —— 这正是 plan commit 1 + commit 3 做的，shim 在 P1 期间稳定存在，P2 才会换。

### Blocker B5 — "commit 2 删 `apps/legacy-*.yaml` 越权 P2"
**判定: false positive（plan 根本没列该文件）。**
Plan commit 2 删除清单：`apps/console/`、`runtime-sync-exceptions.yaml`、`progress.json`、`package.json scripts.console`、`engine/src/skills/runtime-sync.ts` 内部 exceptions 链路。没有 `apps/legacy-*.yaml`。

### Major 1 — "commit 3 无全量 grep skill-graph.yaml"
**判定: 部分有效。**
Plan step 3.21 原文 "搜索 `skill-graph` 字样替换为 `skill-manifest`" 不够具体。**已修复**：step 3.21 改为给出完整 grep 命令 + 替换映射 + 兜底验证。

### Major 2 — "commit 4.c 缺 v1-format 负向 lint 测试"
**判定: false positive。**
Spec §11 P1#4.a 明确说 "保 v1 fallback"，意即 v1 workflow 仍合法。Plan commit 4.b 已将所有现仓 workflow 升 v2；4.c 启 hard lint 对 v2 enum/slot 越界 hard error，对 v1 走 fallback 是 by design。

### Major 3 — "WorkflowStep.inputs 类型错（string[] vs BlackboardSlot[]）"
**判定: false positive（codex 编造字段名）。**
Spec §6.8 实际字段是 `blackboard_inputs`，类型是字符串列表（spec 未约束 strict union）。Plan `blackboard_inputs?: string[]` 与 spec 一致。runtime slot 校验由 `loadBlackboardSlots()` + `validateWorkflowV2()` 两阶段做（step 4.a.4-4.a.5），不需要在 TypeScript 层用 union 类型。

### Major 4 — "validateWorkflow / validateWorkflowV2 命名漂移"
**判定: false positive。**
Plan step 4.a.4 显式说 `validateWorkflow(workflow, root?)` 内部判断 `workflow.version === 2` 后 dispatch 到 `validateWorkflowV1` 或 `validateWorkflowV2`，外部签名稳定。step 4.c.1 测试代码 `validateWorkflow(parseWorkflow(bad))` 正确无歧义。

### Major 5 — "4.b.7 sync-check 命令在当前状态必然失败"
**判定: false positive（codex 引用了错误 step 编号）。**
Plan 实际 step 是 4.b.13，且命令未加 `--exit-code`，`process.exit(1)` 不触发。Plan 4.b.12 已改 workflow-check 把过渡 skill 目录缺失改为 stderr warn 不进 violations，所以 `passed=true`。

### Major 6 — "source-ref-rules.md 空文件兜底缺失"
**判定: 部分有效。**
Plan commit 5 Files 段确实列了 `_shared/source-ref-rules.md` 但 TDD 步骤未创建，与 spec §6.7 case-* skills 无关，是 defect-analyze（P3）依赖。**已修复**：Files 段移除该项并在原位置加 P3 移交说明。

## 结论

5 blocker 全部为 codex 幻觉或误读；6 major 仅 1+1=2 条有效（commit 3 grep 命令具体化 + commit 5 Files 列表删 source-ref-rules.md），均已现场修复。

**P1 plan 视为通过审查。**
