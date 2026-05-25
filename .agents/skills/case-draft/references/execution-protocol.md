# Execution Protocol — Stage-Internal Task Orchestration (case-draft)

适用范围：source-intake 与 module-identify 完成且不在 Lanhu/Axure error-fallback 路径下。

## 启用前置门禁

Worker 编排必须等到以下引用文件全部存在后才允许启用：`references/worker-prompt.md`、`references/spec-reviewer-prompt.md`、`references/quality-reviewer-prompt.md`。若任一文件缺失，所有阶段继续由主会话执行，且不得派发 Worker 或进入二阶段 Review 替代流程。

## 禁止派 Worker 的场景（hard gate）

- Lanhu/Axure URL only 或抓取失败 → 阻塞草稿路径（25 条硬规则全主会话）
- source-intake 抓取期间 silent-mode
- 任何 BlockedEnvelope 路径

## 阶段调度表

| 阶段 | 调度 |
| --- | --- |
| source-intake | 主会话 |
| module-identify | 主会话 |
| historical-context | Agent |
| requirement-atomize | Agent |
| ambiguity-scan | 主会话 |
| confirmation-package | 主会话 |
| product-feedback-merge | 主会话 |
| coverage-matrix | 主会话 |
| case-draft | Agent |
| case-review | spec-reviewer 替代 |
| output | quality-reviewer 替代 |
| automation-handoff | 主会话 |

## Deterministic path resolution (engine-owned — both runtimes)

After module-identify yields a stable {project, module} and source-confirm pins the source triple, resolve the feature path from the engine — NEVER concatenate it in-prompt:

    kata features resolve --project <project> --module <module> --lanhu-page <pageId> --json

(use `--prd-file <name>` instead of `--lanhu-page` for a PRD source; `--slug <slug>` only when the user gave one explicitly.)

Consume the returned JSON `{ featureId, featureDir, reused }`:
- `featureDir` is the single write root for the 4 delivery artifacts (manifest.json, metadata.yaml, archive.md, cases.xmind). Machine-layer files go under `.process/` (.process/source-snapshot.json, .process/coverage-matrix.json) and never pollute the feature root.
- write `featureId` to `metadata.yaml#id`, and the slug origin to `.process/source-snapshot.json#slug_source` (e.g. `lanhu:<pageId-prefix>`).

Both runtimes MUST run this command and use its stdout — this is what makes the path byte-identical across models.

## 运行时任务可视化工具（Claude Code: TodoWrite；Codex: update_plan） 编排

进入 Worker 编排可用窗口后：
1. 主 Skill 一次性创建 12 项 运行时任务可视化工具（Claude Code: TodoWrite；Codex: update_plan）
2. 每阶段开始时把对应 todo 标 `in_progress`，完成后标 `completed`

## Worker 派发协议

按 `references/worker-prompt.md` 模板构造 prompt。重阶段使用运行时子代理派发（Claude Code: Agent tool subagent_type=general-purpose；Codex: spawn_agent + send_input + wait_agent）。

Worker 必须返回稳定 status envelope；阻塞状态使用 `status=BLOCKED` 且原因写入 `blocked.kind`。

## 二阶段 Review 协议

case-draft 阶段产物落盘后：
1. spec-reviewer（主会话，按 `references/spec-reviewer-prompt.md`）— 核心：MD/JSON SourceRef 分层、MD↔JSON `case_id` 对账、`requirement_atom_ids` 追溯、blocking pending 计数
2. spec 通过 → quality-reviewer（Agent，按 `references/quality-reviewer-prompt.md`）— 内容审查：用例步骤完整、人类可读标题表意清晰

## Review Loop 上限

- spec review ≤ 3 次重试；超限进入 `output` 并报 `failed_quality_gate`
- quality review ≤ 3 次重试；超限同上

## Worker Status 处置

与 playwright-automation 一致；Worker 可返回的 BLOCKED `blocked.kind` 包括：`missing_evidence`、`ambiguous_requirement`、`history_only`。`source_intake_failed` 仅保留为主会话 source-intake/error-fallback 的阻塞原因，不属于 Worker 派发结果，且不得暗示 source-intake 可派 Worker。
