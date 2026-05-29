# P3 Skill Migration — Codex Review Log

**Reviewer:** codex (gpt-5.x@xhigh, effort=high)
**Plan:** `docs/superpowers/plans/2026-05-29-p3-skill-migration.md`
**Date:** 2026-05-29
**Findings:** 9 Blocker + 10 Major + 4 Minor

## 汇总判定

23 项 finding **全部 valid**（无幻觉）。一并应用修复，重跑 codex 再审。

| 类别 | 数量 | 判定 |
|---|---|---|
| Blocker | 9 | 9 valid → 9 fixed |
| Major | 10 | 10 valid → 10 fixed |
| Minor | 4 | 4 valid → 4 fixed |

## 逐项判定与修复

### Blocker-1: blackboard slot registry 路径错误

- **Valid**：P1 plan lines 994/998/1005/1183/1411 确认真实路径 `.claude/contracts/schemas/blackboard-slots.json`，本 plan 写成 `.claude/contracts/blackboard-slots.json`。
- **Fix**：全文替换 + 在每个引入新 slot 的 commit `git add` 清单加入 `.claude/contracts/schemas/blackboard-slots.json`。

### Blocker-2: `review_models` 不在 spec §6.8 / P1#4.a parser schema 中

- **Valid**：spec §6.8 lines 472-512 + P1 parser 透传字段表均无 `review_models`。
- **Fix**：放弃 `review_models`，把单 step 多 reviewer 拆成多 step。case-draft 把 §4 review 拆为 §4a spec-review + §4b quality-review（5 phase → 6 phase）。defect-analyze §3 analyze (spec-reviewer) + §4 emit (quality-reviewer) 已是单 step 单 reviewer，但 §3-analyze 同 step 同时配 reviewer + worker——拆成 §3a analyze（worker subagent）+ §3b spec-review（reviewer subagent），4 phase → 5 phase。其余 skill 同模式调整：每 step 至多 1 reviewer + 至多 1 worker。

由于拆 step 会带来大量级联改动（phase 文件数量、SKILL.md Phase index、smoke test 顺序断言），改为**最小变更方案**：保留单 step 多 reviewer 的写法但显式把 `review_models` 字段移出 workflow.yaml，改写成 reviewer 文件内 frontmatter 声明：

```markdown
---
name: spec-reviewer
model: haiku
effort: low
---
```

Phase Dispatcher 读 reviewer file frontmatter（P3 commit 7 内增强 phase-dispatcher 读 reviewer model 字段，或仅在 reviewer prompt 渲染时由 orchestrator 决定）。**最终方案**：reviewer 文件内 frontmatter 加 `model` / `effort`；workflow.yaml step 字段保留 `reviewers: [name1, name2]`，不出现 `review_models`；orchestrator 渲染 reviewer prompt 时从 reviewer frontmatter 取 model/effort 透传 Agent 工具。该方案 0 改动 P1 parser，只需 frontmatter-policy 加 reviewer file allowlist `model/effort`（属 P3 范围）。

### Blocker-3: `__test_setSpawnHook` / `spawnSubagent` 不存在于 P2 交付

- **Valid**：P2 plan line 1161 + lines 1725-1790 确认 P2 仅交付 `decidePhase` + `buildDispatchEnvelope`；不做 spawn。spec §6.9 描述的 spawn 是 orchestrator 责任。
- **Fix**：smoke test helper 改用 "fake orchestrator" 模式：helper 调用 `decidePhase` + `buildDispatchEnvelope` 拿到 envelope；按 fixture 中 `envelope_id → subagent_output` 映射注入 blackboard + 通过 P2 event-writer emit `subagent_dispatched / subagent_completed`。不需要 P2 暴露 spawn hook。

### Blocker-4: smoke test 用 `e.kind`，正确字段是 `e.event_kind`

- **Valid**：spec §9.2 lines 812-825 + P2 整篇用 `event_kind`。
- **Fix**：全部 smoke / phase / shape test 中 `e.kind` → `e.event_kind`；写一个 `expectEventKind(events, kind)` helper 集中处理；加 schema 断言。

### Blocker-5: `loadWorkflow` 未在 P1 parser 交付

- **Valid**：P1 只 export `parseWorkflow` + `validateWorkflow`。
- **Fix**：测试改为 `parseWorkflow(readFileSync(path, 'utf8'))` 内联读法；不引入新 helper（避免 P1 改 patch）。

### Blocker-6: Commit 7 引用 `_shared/source-ref-rules.md` 早于其创建

- **Valid**：commit 7 SKILL.md 引用了 `_shared/source-ref-rules.md`，到 8.1 才建。
- **Fix**：把 `_shared/source-ref-rules.md` 的创建移入 Commit 7（新增 step 7.31a，在 manifest 更新前）；8.1 step 8.1.18 改为 "确认存在；不重复创建"。

### Blocker-7: case-hotfix 路由 "→ bug-file"

- **Valid**：spec §6.7 最终 8 skill 列表不含 bug-file。
- **Fix**：case-hotfix SKILL.md Must not trigger 改为 "→ defect-analyze"。

### Blocker-8: workspace-manage event_kinds 缺 validator_failed / blocked

- **Valid**：spec §6.8 + 自审约定要求每 skill ≥ 6 类（含 validator_failed / blocked）。
- **Fix**：workspace-manage workflow metadata.event_kinds_emitted 补 `validator_failed, blocked`。

### Blocker-9: hotfix schema 的 `$ref` 无法解析

- **Valid**：artifact-validator 只 compile 单 schema；不预加载 `addSchema`。
- **Fix**：artifact-validator.ts 启动时 `glob('.claude/contracts/schemas/artifact-*.json') → ajv.addSchema(json, '$id')` 一次性加载所有 schema，再按 kind 取 validator。

### Major-1: P3 commit 7 假设 workflow 仍是 v1

- **Valid**：P1#4.b 已把现有 workflow 迁 v2 schema（13 step + v2 fields）；P3#7 起点应是 "v2 schema 13 step → v2 schema 5/6 phase β-lite"。
- **Fix**：commit 7 Goal + Files 描述去掉 "v1 13 step"，改为 "P1#4.b 留下的 v2 schema 13 step → β-lite final 5 phase 结构"。step 7.1 测试 fail 仍 valid（13 step ≠ 5 phase id 集合）。

### Major-2: case-draft smoke 名称说 in order 但只校验计数

- **Valid**：spec §9.2 + spec §6.7 canonical 顺序明确。
- **Fix**：smoke test 增 phase 序列断言：`expect(events.filter(e => e.event_kind === 'phase_entered').map(e => e.phase)).toEqual(['source-intake', 'atomize', 'draft', 'review', 'output'])`。每对 entered/exited 必须配对：seq(entered) < seq(exited)。

### Major-3: defect-analyze smoke 未校验 by_mode 输出 slot

- **Valid**：requiredSlots 参数传入未用。
- **Fix**：smoke helper 返回 `finalBlackboard` 字段，断言 `expect(Object.keys(finalBlackboard)).toEqual(expect.arrayContaining(requiredSlots))`；对 conflict mode 额外 `expect(finalBlackboard.defect_report_path).toBeUndefined()`。

### Major-4: playwright-automation 声称真实跑通但 smoke mock runner

- **Valid**：goal/commit 描述与 smoke 实现矛盾。
- **Fix**：Goal 改为 "mock-runner smoke 验证 7 phase events.jsonl 形态；§4-run 的 hard rule 在生产环境强制真跑"；交付声明明确"未验证范围：§4-run 端到端真实 playwright 执行"。

### Major-5: case-hotfix 216 行规则压缩保留项不足

- **Valid**：旧 `hotfix-archive-format.md` 含输出位置、单用例约束、frontmatter keywords、SQL/Spark 边界等关键规则。
- **Fix**：拆为 2 份 rules：`rules/hotfix-format.md`（≤80，命名 + case 内容 + SourceRef）+ `rules/hotfix-data-prep.md`（≤80，SQL/Spark 边界 + 单用例约束 + frontmatter keywords + 输出位置）。

### Major-6: playwright env-preflight 蒸馏范围过窄

- **Valid**：旧 env-preflight.md 含工具拒绝哨兵、静默边界、mtime 命令限制、run-id/evidence 目录规则。
- **Fix**：拆为 4 份 rules：`rules/env-preflight.md`（env 变量 + 协议）+ `rules/tool-denial.md`（工具拒绝哨兵）+ `rules/auth-session.md`（session 复用）+ `rules/evidence-dir.md`（run-id + evidence 目录约定）。同步更新 SKILL.md Loaded by phase 表。

### Major-7: playwright per-phase model 测试漏断言 repair effort

- **Valid**：spec §6.10 line 547 明确 §5 repair = sonnet/high。
- **Fix**：补 `expect(byId['repair'].effort).toBe('high')`。

### Major-8: artifact metadata 与实际 artifact_written kind 不一致

- **Valid**：phase emits `source-snapshot` / `trace` 等未声明 artifact kind。
- **Fix**：把 source-snapshot 改为 `decision_made { topic: 'source_snapshot', payload: { path, sha256 } }`；playwright trace 改为 `decision_made { topic: 'trace_collected', payload: { case_id, trace_path } }`。仅 final 4 件套（case-draft）/ 1 件套（其余）走 artifact_written。

### Major-9: defect-analyze SKILL.md ≤80 行未被测试约束

- **Valid**：spec §6.12 line 564 明确 defect-analyze SKILL.md ≤80。
- **Fix**：`defect-analyze-shape.test.ts` 中 SKILL.md 行数断言改为 `toBeLessThanOrEqual(80)`。

### Major-10: ajv / ajv-formats 依赖处理不完整

- **Valid**：P2 只引入 proper-lockfile；P3 commit 7 需 ajv + ajv-formats。
- **Fix**：commit 7 Pre-flight 增 `bun add ajv ajv-formats`；Files 加 `package.json`、`bun.lock`；commit 7 git add 清单加入两文件。

### Minor-1: workspace-manage 目录形态前后矛盾

- **Valid**：spec §6.7 line 451 workspace-manage 无 reviewers/workers。
- **Fix**：File Structure 顶部统一骨架增注释 "reviewers/ 和 workers/ 是可选目录；纯 inline skill 可不创建"。workspace-manage shape test 显式断言不存在。

### Minor-2: `check:skills` 通过预期早于 manifest 更新

- **Valid**：step 7.27 manifest 未更新就期望全通过；执行者会误判 fail。
- **Fix**：step 7.27 只跑 `workflow-schema` 相关 parser/phase test；`bun run check:skills` 移到 step 7.32 manifest 更新之后。

### Minor-3: defect-analyze handoff_emitted 自审口径不一致

- **Valid**：spec §6.12 line 663 defect-analyze workflow 含 handoff_emitted。
- **Fix**：自审 §6 line "handoff_emitted 仅 case-draft / case-hotfix / infra-diagnose / playwright-automation 显式声明" 补上 defect-analyze。

### Minor-4: P1#4.b 旧 workflow 删除说明不准确

- **Valid**：P1#4.b 没建 bug-file/conflict-analyze/diff-scan workflow。
- **Fix**：commit 8.1 step 8.1.22 删除 "P1#4.b 可能建过" 误导说明；保留防御性 `test -f ... && git rm ...` 命令即可。

---

## 修复应用顺序

1. 全局替换类（blackboard-slots.json 路径、event_kind 字段、loadWorkflow→parseWorkflow）
2. case-draft 相关（review_models → reviewer frontmatter / phase 顺序断言 / source-ref-rules 前置 / ajv 依赖 / artifact_written 类型限定 / step 7.27 check:skills 顺序）
3. defect-analyze 相关（SKILL ≤80、smoke 用 requiredSlots、自审 handoff 补 defect-analyze）
4. case-hotfix 相关（路由改 defect-analyze / 216 行规则拆 2 份 / 移除 P1#4.b 误导说明）
5. playwright-automation 相关（env-preflight 拆 4 份 / repair effort 断言 / Goal mock-runner 声明）
6. workspace-manage（event_kinds 补 / file structure 注释可选目录）
7. artifact-validator.ts 加 `addSchema` 预加载
8. Major-1 + commit 7 起点措辞修正

修复完成后重跑 codex review，确认无新增 finding 后提交用户审查。

---

## Round 2 — Codex 复审

复审 23 项 finding 应用后，codex 找到 5 项新问题：3 残留（Blocker-2 / Blocker-3 / Major-6）+ 2 新增（Major-11 / Minor-5）。全部 valid。

### Blocker-2 残留（reviewer frontmatter 方案不工作）

- **Valid**：spec §6.8 + P2 `decidePhase` 不读 reviewer 文件 frontmatter；reviewer model/effort 放在 reviewer 文件不会被 dispatcher 取用，case-draft review step 会 fallback `default_model=sonnet`，spec-review 无法跑 haiku。
- **Fix**：把 case-draft `review` 单 step（多 reviewer）拆为 `spec-review` + `quality-review` 两个 step（每 step 一对一 1 reviewer），`model / effort` 直接写在 workflow.yaml step 上，P2 `decidePhase` 标准 fallback 链取值。reviewer / worker frontmatter 只保留 `name`；删 `model / effort`。`frontmatter-policy.ts` 扩展中 reviewer / worker allowlist 改为单字段 `{name}`。case-draft 由 5 phase → 6 phase。defect-analyze 已是单 reviewer step（§3-analyze: spec-reviewer / §4-emit: quality-reviewer），不需拆分。其他 skill 单 reviewer，已通过 step model/effort 透传。

### Blocker-3 残留（fake-orchestrator helper 接口签名错）

- **Valid**：P2 真实接口为 `openSession({ root, project, featureId, skillId, skillVersion, workflowId, runId? })`（P2 line 743-765）；`decidePhase({ step, workflow, skillDefaults })`（P2 line 1707-1713）；`emitArtifactWritten` 需 contentBytes + blackboardSlot + Blackboard + NotifyProjector（P2 line 1895-1907）。我前一轮写的 `createSession / decidePhase({...blackboard})` 全错。
- **Fix**：重写 helper：
  - 用 `openSession` 真接口
  - `skillDefaults` 用 `gray-matter` 从 SKILL.md frontmatter 读 `model / effort / agent`
  - **不**调用 P2 `emitArtifactWritten`（避免依赖真实 contentBytes + blackboard + notifyProjector）；改为 fake 直接 `session.emit('artifact_written', {...})`，仅验 event 流形态
  - 事件路径按 spec §9.1 = `<root>/events/<feature_id>/<run_id>.jsonl`
  - 测试 afterEach 调 `session.close()`

### Major-6 残留（playwright rules 拆分后 shape test 仍只 4）

- **Valid**：plan Files 段列了 7 个 rules（env-preflight / tool-denial / auth-session / evidence-dir / case-feedback / execution-protocol / repair-loop），但 shape test 描述仍说 "4 rules"。
- **Fix**：shape test 描述改为 "7 rules ≤80"，明确要求 test.each 列全部 7 个 rules 文件。

### Major-11 新增（case-draft smoke subagent 计数不可满足）

- **Valid**：原 case-draft 只有 draft + review 2 个 subagent step，断言 ≥3 必失败。
- **Fix**：随 Blocker-2 修复一并解决——拆 review → spec-review + quality-review 后变 3 subagent step；smoke 断言改为 `expect(...).toBe(3)`（不是 ≥3，因为 fake helper 每 step 严格 emit 1 对）。

### Minor-5 新增（自审 checklist 残留旧措辞）

- **Valid**：自审 §4 仍说 "_shared/source-ref-rules.md 在 Commit 8.1 step 8.1.18 新建"，与正文 step 7.30 创建 + step 8.1.18 assert exists 冲突。
- **Fix**：改为 "Commit 7 step 7.30 创建；Commit 8.1 step 8.1.18 仅 assert exists"。

---

## Round 2 修复完成

所有 5 项 round-2 finding 均已应用修复。准备 round-3 codex 复审。

---

## Round 3 — Codex 复审

Round-3 codex 找到 6 项：2 项 round-2 残留 partial + 4 项新增。全部 valid。

### Round-2 Blocker-2 残留（reviewer/worker allowlist 描述 3 处仍含 model/effort）

- **Valid**：plan 中 744-751 / 1731-1734 / 4113 三处文字残留旧"model/effort"描述与新单字段方案冲突。
- **Fix**：
  - step 7.16 frontmatter-policy.ts 描述：reviewer/worker allowlist 改为"仅 `name` 单字段"
  - commit 7 commit message：改为 "review step split into spec-review + quality-review (1 reviewer per step), model/effort on workflow.yaml step" + "frontmatter-policy.ts extended: argument-hint added to SKILL allowlist; reviewer/worker allowlist = {name} only"
  - 自审 §4 条目：改写为 "每个 review step 一对一只引用 1 reviewer，`model / effort` 直接写在 workflow.yaml step 上，P2 `decidePhase` 标准 fallback 链取值"

### Round-2 Blocker-3 残留（事件路径错）

- **Valid**：P2 真实路径是 `<root>/workspace/<project>/features/<featureId>/events/<runId>.jsonl`（P2 plan line 422/441/465 等测试实测）；我之前写成 `<root>/events/<feature_id>/<run_id>.jsonl`。
- **Fix**：helper return.eventsPath + 解释段同步改为真实 P2 路径，含 project / featureId / runId 三段分隔。

### Round-3 Blocker-1 新增（fake hashed_artifact_ref 不合法）

- **Valid**：P2 event-validator 规定 `^sha256:[a-f0-9]{64}$`（P2 plan line 143、349-351），`'sha256:fake-smoke-fixture'` 会被 fail-closed 拒收。
- **Fix**：helper 加 `const ZERO_SHA = '0'.repeat(64)`，emit 时用 `sha256:${ZERO_SHA}` —— 满足 pattern 且语义透明（全 0 表 fake）。

### Round-3 Blocker-2 新增（fixture 路径不一致）

- **Valid**：smoke test 传 `fixture: 'fixtures/case-draft-greenfield-prd.json'`，helper 直接 `readFileSync(opts.fixture)`，从 repo root 跑 `bun test` 会找不到文件。
- **Fix**：smoke test fixture 路径加前缀 `engine/tests/fixtures/`，对应 case-draft / defect-analyze 三处。

### Round-3 Major-1 新增（多处 5 phase 残留）

- **Valid**：6 处仍写 5 phase（File Structure / step 7.1 描述 / SKILL.md body / step 7.17 段标题 / case-edit 段提及 / 自审条目）。
- **Fix**：sed 全文替换 `5 phase` → `6 phase` / `5 个 phase` → `6 个 phase` / 相关上下文。

### Round-3 Major-2 新增（helper 注释自相矛盾）

- **Valid**：原 "调用 phase-dispatcher 的 mockable spawn 接口" 与"不依赖 spawn hook"自相矛盾。
- **Fix**：删 "mockable spawn 接口" 描述；统一为 "复用 `decidePhase / buildDispatchEnvelope` + `session.emit('subagent_dispatched' / 'subagent_completed')`，不需 mock spawn 接口"。

---

## Round 3 修复完成

所有 6 项 round-3 finding 均已应用修复。准备 round-4 codex 复审。

---

## Round 4 — Codex 复审

Round-4 codex 找到 3 项新问题（2 Major + 1 Minor），全 valid。Round-3 6 项全确认到位。

### Major-1: helper 内部行为注释残留 mockable spawn 描述

- **Valid**：plan 1564-1565 # 注释段仍写"inline phase：emitArtifactWritten / emitDecision"与"subagent phase：mockable spawn 接口"，与后文 helper 实现策略矛盾。
- **Fix**：改写 #1-3 内部行为注释为：openSession 建 session → 按 fixture 预设 session.emit(...) → 返回 { exitCode, eventsPath, finalBlackboard }。subagent step 显式说明 "decidePhase + buildDispatchEnvelope 拿 envelope；按 fixture 静态映射注入 blackboard，再 session.emit('subagent_dispatched' / decision_made / artifact_written / 'subagent_completed')"。

### Major-2: 自审 slot 清单漏 case-draft 拆 review 后的新 slot

- **Valid**：case-draft workflow 拆 review → spec-review + quality-review 后，blackboard_outputs 新增 `spec_review_artifact_path` + `quality_review_artifact_path`，但自审 §5 清单仍写 `review_artifacts_path`（旧）。
- **Fix**：自审 §5 slot 列表中 `review_artifacts_path` → `spec_review_artifact_path, quality_review_artifact_path`。

### Minor-1: helper validator_failed / blocked emit 缺 status: 'failed'

- **Valid**：P2 plan line 1413-1415 + spec §9.2 要求 validator_failed / blocked 事件 status="failed"；plan 1650/1659 emit 未传 status，会落 P2 默认 ok（不正确）。
- **Fix**：两处 validator_failed emit + 一处 blocked emit 都补 `status: 'failed'`。

---

## Round 4 修复完成

所有 3 项 round-4 finding 均已应用修复。

---

## Round 5 — Codex 复审

Round-5 codex 找到 3 项新问题（2 Major + 1 Minor），全 valid。这次 finding 揭示我之前修 case-draft 的 "拆 review → spec-review + quality-review" 原则没普适应用到剩余 7 个 skill。

### Major-1: defect-analyze reviewer 调度与 model 契约不可执行（同源问题）

- **Valid**：defect-analyze §3-analyze step 同时配 worker (analyzer) + reviewer (spec-reviewer)，且 §4-emit 是 inline 但配 quality-reviewer。P2 `decidePhase` 按单 step 单 envelope 设计：subagent step 只 spawn 1 个 subagent，model/effort 来自 step；当 worker 与 reviewer model 不同时（spec §6.11 §3 spec-review: haiku；§4 quality: sonnet），无法 enforce。
- **Fix**：defect-analyze 拆为 6 phase：§1-intake / §2-classify / §3-analyze (worker only) / §4-spec-review (reviewer only, haiku/low) / §5-quality-review (reviewer only, sonnet/medium) / §6-emit (inline)。同步改 workflow.yaml steps + SKILL.md Phase index + manifest phases + smoke 断言。

### Major-2: case-edit / case-hotfix / knowledge-curate / playwright-automation 同问题

- **Valid**：所有 skill 把 `workers: [X]` + `reviewers: [Y]` 同 subagent step → reviewer model 无法独立 enforce。spec §6.11 明确：case-edit / case-hotfix 各自 spec-review = haiku；knowledge-curate 整体 haiku 但 reviewer 也 haiku（OK）；playwright-automation §3 spec-reviewer haiku 与 §3 worker sonnet 冲突。
- **Fix**：拆 reviewer 独立 step：
  - case-edit: 3 → 4 phase（parse / diff / apply / spec-review）
  - case-hotfix: 4 → 5 phase（bug-parse / scope / draft / spec-review / output）
  - knowledge-curate: 3 → 4 phase（parse / categorize / write / spec-review）
  - playwright-automation: 7 → 8 phase（+ §4-spec-review 在 generate 之后；其余 phase 索引 +1）
  - infra-diagnose: 按 spec §6.11 "单流程无 review" 删 spec-reviewer 文件 + reviewer 引用（保 4 phase）

### Minor-1: rule 文件含示例违反 spec §6.4 分层

- **Valid**：`rules/mode-dispatch.md` 含 "Ambiguous 例"；`rules/defect-format.md` 含 markdown 输出示例。spec §6.4 要求 rules 仅放可校验项，示例放 fewshots。
- **Fix**：把 Ambiguous 例移到 fewshots/{bug,conflict,diff}-mode.md；defect-format markdown 示例移到 fewshots/conflict-mode.md。

---

## Round 5 修复完成

按 round-5 待修清单（CONTINUE-PROMPT.md "P3 round-5 待修清单"）全部应用，新增 plan 章节 + Edit 改动覆盖：

**修复 1：worker/reviewer 拆为独立 step**

| Skill | 原 phase | 新 phase |
|---|---|---|
| case-draft | 6 | 6（round-2 已拆，未变）|
| defect-analyze | 4 | **6**（intake / classify / analyze（worker only）/ spec-review（reviewer only, haiku/low）/ quality-review（reviewer only, sonnet/medium）/ emit（inline））|
| case-edit | 3 | **4**（parse / diff / apply（worker only）/ spec-review（reviewer only, haiku/low））|
| case-hotfix | 4 | **5**（bug-parse / scope / draft（worker only）/ spec-review（reviewer only, haiku/low）/ output（inline））|
| infra-diagnose | 4 | 4（删 reviewers/spec-reviewer.md 文件 + workflow.yaml 引用；diagnose 是 worker-only）|
| knowledge-curate | 3 | **4**（parse / categorize / write（worker only）/ spec-review（reviewer only, haiku/low））|
| workspace-manage | 2 | 2（无 reviewer，不变）|
| playwright-automation | 7 | **8**（preflight / probe / generate（worker only）/ spec-review（reviewer only, haiku/low）/ run / repair（worker only）/ quality（reviewer only, haiku/low）/ handoff）|

每个 skill 联动改动：(a) Files 段加新 phase 文件 (b) SKILL.md Phase index + Loaded by phase 表 (c) workflow.yaml 拆开 reviewer step 并写 model/effort (d) shape test phase 数 (e) phases test 顺序 + worker-only / reviewer-only 断言 (f) smoke test phase 顺序 + subagent_dispatched 计数 (g) commit message 同步。

**修复 2：rules 文件示例移到 fewshots**

- `defect-analyze/rules/mode-dispatch.md`：删 "Ambiguous 例" 表，改提示 "示例移到 fewshots/{bug,conflict,diff}-mode.md"
- `defect-analyze/rules/defect-format.md`：删 markdown 输出模板代码块，改提示 "完整模板移到 fewshots/conflict-mode.md"
- fewshots/{bug,conflict,diff}-mode.md 段补充 Round-5 说明：明确每个 fewshot 内容需新增的 ambiguous 解析示例 + conflict markdown 模板

**修复 3：blackboard slot registry 同步**

- 自审 §5 slot 列表加入：spec_violations, analyze_output_path, entry_draft；spec_review_artifact_path / quality_review_artifact_path 已在 round-4 加过

**自审章节同步更新**：

- §1：8 skill 全部覆盖列表写明每个 skill 新 phase 数与 phase id 列表
- §6.10：playwright-automation 8 phase per-phase model 描述
- §6.12：defect-analyze 6 phase 完整描述
- §7：codex 审查重点条目补 "8 skill worker/reviewer 单 step 单 envelope 规则落实情况"
- §6 fake-orchestrator smoke：case-draft 6 phase 3 subagent / defect-analyze 6 phase 3 subagent / playwright-automation 8 phase 4 subagent

**自洽验证（手工 grep）**：

- 全文已无残留 "3 phase / 4 phase / 5 phase / 7 phase" 描述（保留 case-edit 4、case-hotfix 5、knowledge-curate 4、playwright-automation 8、defect-analyze 6 等正确数值）
- workflow.yaml 中所有 dispatch=subagent step：6 个 reviewer-only（spec-reviewer × 5 / quality-reviewer × 3 ；total 9）+ 9 个 worker-only（case-worker / analyzer / edit-worker / hotfix-worker / kb-worker / ssh-worker / playwright-worker × 2）；**无任何 step 同时配 workers + reviewers**
- manifest entry：case-draft / defect-analyze 已显式列出新 phase，含 worker-only / reviewer-only 分别引用；其他 skill 写 "同 case-draft 模式" 由 implementer 按新 phase 模板生成

准备 round-6 codex 复审。


---

## Round 6 — Codex 复审

Round-5 拆 review 普适应用后，codex round-6 找到 3 项（2 Major + 1 Minor），全 valid。

### Major-1: infra-diagnose reviewer 删除不彻底（顶层骨架仍要求 reviewer）

- **Valid**：P3 plan File Structure 顶层骨架 line 102 写 "其他 7 skill 至少含 reviewers/spec-reviewer.md"，但 infra-diagnose 按 spec §6.11 删了 reviewer，造成自相矛盾。
- **Fix**：line 102 注释改为 "spec §6.11 中 infra-diagnose 是单流程模型，只有 workers/ssh-worker.md，不含 reviewers/ 子目录；其 shape test 必须显式断言 `reviewers/` 不存在。其余 6 个 skill（case-draft / case-edit / case-hotfix / defect-analyze / knowledge-curate / playwright-automation）至少含 reviewers/spec-reviewer.md 和 workers/<role>.md"。

### Major-2: knowledge-curate verdict flow 数据流断裂

- **Valid**：§3-write 描述写"等 §4 通过后再由本 phase 落盘"，但 workflow 已在 §3 输出 entry_path（实际落盘），与 spec §6.8 single-step single-envelope 设计冲突。spec-review 作为 gate 失去意义。
- **Fix**：knowledge-curate 由 4 phase → **5 phase**（parse / categorize / write / spec-review / emit）：§3-write 只产 entry_draft（不落 final）；§4-spec-review gate 校验；§5-emit inline 在 spec_verdict=pass 后落 `workspace/<project>/.kata/knowledge/<entry_id>.md`。answer path 跳过 §4，§5 inline 写 kb_answer 不落 artifact。workflow.yaml + manifest + SKILL Phase index + shape test phase 数 + commit message 同步更新。

### Minor-1: playwright §5-run 描述未读 spec_verdict（与 workflow 不一致）

- **Valid**：workflow.yaml §5-run blackboard_inputs 含 spec_verdict（Round-5 加入），但 phase 文件描述 Inputs 段没写，造成 implementer 困惑。
- **Fix**：§5-run.md Inputs 段加 `spec_verdict（必须 = pass，否则 §4 已阻塞）`；Steps 段加 "1) 前置校验 spec_verdict=pass"；Hard rules 加 "spec_verdict 不为 pass 不得启动 runner"；Failure modes 加 `spec_verdict_missing`。

---

## Round 6 修复完成

所有 3 项 round-6 finding 均已应用修复。准备 round-7 codex 复审。

---

## Round 7 主动补丁（case-edit verdict gate 同源问题）

Round-6 修 knowledge-curate Major-2 时识别出"reviewer step 下游若已写文件 = reviewer 失去 gate 意义"的设计原则。case-edit 同问题（§3-apply 写回原文件 vs §4-spec-review 事后审），未等 codex 指出主动修：

- case-edit 4 phase → **5 phase**（parse / diff / apply / spec-review / **emit**）
- §3-apply 改为 worker-only 不写文件：output `modified_archive_content / modified_xmind_content / modified_manifest_content`
- §4-spec-review reviewer-only gate 校验（read-only lint）
- §5-emit inline：`spec_verdict=pass` 前置 → backup → 写回原文件 → emit artifact_written × 3
- workflow.yaml / SKILL Phase index / Loaded by phase / Files / 自审 §1 / shape test phase 数 / phases test 加 §5-emit 断言 / commit message 同步
- blackboard slot registry 加 `modified_archive_content / modified_xmind_content / modified_manifest_content`

case-hotfix（§3-draft 只产 draft_regression_cases，§5-output inline 落盘）和 case-draft（§3-draft 只产 draft_archive_path 等）原本已遵守 gate 设计，无需补丁。

准备 codex round-7 复审。
