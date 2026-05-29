# P2 Plan Codex Review — 2026-05-29

## Plan reviewed
`docs/superpowers/plans/2026-05-29-p2-event-journal-core.md`（2 commits）

## Reviewer
Codex（gpt-5.x@xhigh，effort=high），通过 codex-companion runtime。

## Codex 报 5 blocker + 8 major + 1 minor；逐条核对结果

### Blocker B1 — "staged transaction 在 spec 6.a 但 plan 全放 6.b"
**判定: valid。**
Spec §11 表 6.a 字面列 "staged transaction + 单调 seq + atomic append"。Plan 原版把 staged tx 全放 6.b 不合 spec 字面交付边界。
**已修复**：把 stage + commit 两段（artifact 写 → atomic-rename → emit `artifact_written`）前移到 6.a，新增 step 6.a.22-6.a.26 + `engine/src/runtime/staged-transaction.ts` + 4 case `engine/tests/runtime/staged-stage-commit.test.ts`；6.b 只接 project 第三阶段（applyDelta + notify + `projection_failed` 补偿事件）通过 `emitArtifactWritten` 包装。

### Blocker B2 — "staged tx 缺 commit 失败 (rename 失败 / event append 失败) 测试与 recovery"
**判定: valid。**
**已修复**：step 6.a.22 新增的 4 个 case 覆盖：(1) happy path + (2) stage 失败 + (3) commit rename 失败（chmod 500 让 rename 报错，验证 tmp 被清理、无 event append）+ (4) commit event-append 失败（chmod 500 events dir，验证 artifact 在 target 但 event 缺失，文档明示 recovery 责任在调用方）。

### Blocker B3 — "Phase Dispatcher 降级'只做 decision 不 spawn'与 spec §6.9 冲突"
**判定: partially valid（措辞不清）。**
Spec §6.9 要求 engine 显式 spawn，但 engine TS 层在 Claude Code harness 下无 Agent 工具，物理上无法 spawn。真正能做的是「engine 输出决策 + skill prompt 机械地调 Agent 工具传 model 参数」。原 plan 这点说得太松。
**已修复**：6.b "Why" 段重写明确 engine→orchestrator dispatch envelope 契约；`buildDispatchEnvelope` 函数显式输出 `{ kind, model, effort, subagent_type, expected_events, prompt_hint }`，orchestrator 按 envelope 字段直接传 Agent tool；F3 实测验证延后到 P3#7（spec §13 F3 风险段本就说"P2#6.b 实施时验证"，表述对齐）。

### Blocker B4 — "Goal 句过头：'case-draft 跑一次能看到完整 phase 序列' vs 收尾 P2 不接 case-draft"
**判定: valid。**
**已修复**：Goal 段重写为「P2 收尾时 backbone 所有单元测试 PASS；真实 skill 接入与 end-to-end phase 序列由 P3#7 case-draft 迁移落地」。

### Blocker B5 — "event-writer.append 单调 seq 破坏：index 失败时 seq 不前进但 jsonl 已写"
**判定: valid。**
**已修复**：step 6.a.8 实现改为「jsonl atomic append 成功后立即 `seq += 1`」，index 失败用 try/catch 让上层补偿事件处理；加注释明确 "jsonl 是 seq 的 source of truth"。

### Major M1 — "atomic append 改 tmp+rename"
**判定: codex 字面读 spec 表格，但 spec 表格"tmp+fsync+rename"对应 blackboard.json / notify markdown 全量替换语义，append 语义下 tmp+rename 不可行（要全文重写）。**
**已澄清**：step 6.a.8 注释加段说明 spec §9.4 表的 "tmp+rename" 适用于全量替换；对 streaming append 用 POSIX 标准 `O_APPEND + fsync`，如 spec 未来字面化要求 tmp+rename，本 step 同步重写。

### Major M2 — "blackboard 未声明 slot 应 emit `validator_failed` 而非裸 throw"
**判定: valid。** Spec §9.5 + §15 明文。
**已修复**：`BlackboardOptions` 加可选 `session` 字段；`applyDelta` 检测 undeclared slot 时先 `session.emit("validator_failed", { payload: { undeclared_slots, attempted_delta } })` 再 throw。step 6.b.1 测试更新为含 session 注入 + 断言 jsonl 包含 `validator_failed` 事件。

### Major M3 — "CLI 用 `--file` 偏离 spec §9.7 `<run_id>` 位置参 + `--feature/--run-id/--kind/--since/--by`"
**判定: valid。**
**已修复**：step 6.b.17 测试全部重写为 spec §9.7 命令面；step 6.b.19 实现段重写说明 + 加 `project <run_id>` 独立 case；CLI 新增 `--workspace-root/--project/--feature/--run-id/--kind/--since/--by` 选项。

### Major M4 — "`program.addCommand` vs 现仓 commander 入口对象名"
**判定: minor 措辞问题。**
**已修复**：step 6.b.20 改为先跑 `grep` 看现仓 commander 入口对象名再 mimic 注册，不硬编码 `program`。

### Major M5 — "`readResumeSeq` + run_id→writer 单例语义未说"
**判定: valid。**
**已修复**：step 6.a.12 `session.ts` 实现段加 `Map<run_id, Session>` 单例 + `SessionOptions.runId?` 可选；step 6.a.10 测试加两 case："openSession with same runId returns same instance" + "lastSeq advances on each emit"。

### Major M6 — "proper-lockfile 在 Bun 1.3+ 下未验证"
**判定: valid。**
**已修复**：P0 新增 step P0.5 跑 lockfile smoke test；fallback 到 `O_EXLOCK` POSIX flag，并要求改用时同步更新 step 6.a.8 + 顶端 Tech Stack 段。

### Major M7 — "decidePhase inline phase 也走 step → workflow → skill fallback 链，违反 spec §6.9 inline 只用 SKILL 默认"
**判定: valid。**
**已修复**：`decidePhase` 实现按 `kind` 分支：inline 时强制用 `skillDefaults.model/effort`，遇到 step.model 或 step.effort 时通过 `warn` 回调记录而不应用；step 6.b.9 测试加 inline 分支断言（step 上 model=haiku 但实际用 SKILL 的 sonnet + warn 触发）。

### Major M8 — "telemetry adapter 迁移路径过窄，只提 6 kind 断言"
**判定: valid。**
**已修复**：step 6.a.21 改为完整迁移矩阵：列出旧 6 字段假设 → 新 envelope 替换表（event_kind / status / issue codes / hash / fixture 必填字段 / ID prefix / semver 等 9 类），逐项给替换说明 + 不适用 case 删除策略。

### Minor minor-1 — "debounce projector 测试只看最终内容，不证 debounce"
**判定: valid。**
**已修复**：`NotifyProjectorOptions` 加 `onFlush?` 测试钩子；`createNotifyProjector` 在 `flushSync` 末尾调用；step 6.b.5 测试加两 case 用 `writeCounts.length` 断言"5 rapid updates → 1 flush"和"debounce 超时后自然触发 + 重复 flush 不写"。

## 结论

5 blocker 全部修复；8 major 7 个修复 1 个澄清（M1）；1 minor 修复。

**P2 plan 视为通过审查。**
