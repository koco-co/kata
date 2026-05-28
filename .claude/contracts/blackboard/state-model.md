# Blackboard 状态模型（v2）

Blackboard 是 skill workflow 跨 phase 共享的状态容器。**v2 起 engine 强制校验每个 phase 只能写自己在 workflow.yaml `blackboard_outputs` 字段中声明的 slot，越界 emit `validator_failed`**。

Slot 声明集中在 `.claude/contracts/schemas/blackboard-slots.json`；新增 slot 必须同时改 registry、对应 workflow.yaml，并通过 `bun run check:skills`。

## 槽位写入规则

- 任意 phase 可读全部 slot，但只能写入自己在 `blackboard_outputs` 中显式声明的 slot。
- 写入语义按 slot 类型：数组类追加；对象类全量覆盖。
- 任一被下游 `blackboard_inputs` 引用的 slot 为空 → 下游 phase 必须 emit `validator_failed`，不可静默继续。
- mode-specific 写入用 `blackboard_outputs_by_mode`（spec §6.12）；engine 按当前 blackboard 中的 `mode` slot 值选择分支。
- mode-specific 校验用 `validators_by_mode`：每个 mode 列出该分支专属的 validator id（spec §6.12）。

## 跨 runtime 一致性

- Claude / Codex runtime 共享 `.claude/contracts/schemas/blackboard-slots.json` 与 `.claude/contracts/workflows/<skill>.yaml`。
- Phase 2 Codex runtime 通过 symlink 复用同一份 slot registry，不允许在 codex side 静默扩展 slot。

## 关联文档

- Slot registry：`.claude/contracts/schemas/blackboard-slots.json`
- v2 envelope schema：`.claude/contracts/schemas/blackboard.json`（P2 落地）
- workflow schema：`engine/src/skills/workflow-schema.ts`（v2 parser）

## v1 legacy 槽位（兼容期保留）

历史 v1 workflow 使用以下 8 个槽位（registry 中 `v1_legacy` 字段）；P3 完成 v2 迁移后会从 registry 移除。

- `sources`、`source_refs`、`decisions`、`open_questions`、`artifacts`、`coverage`、`verification`、`handoff`
