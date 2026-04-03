# .ai/core/agents

`*.agent.yaml` 描述每个 skill 的 worker/reviewer 执行 agent，schema 见 `.ai/core/schemas/AgentContract.v1.schema.json`。

## worker-base

以下 7 个 worker agent 共享同一份 boilerplate：

- `bug-file-worker.agent.yaml`
- `case-edit-worker.agent.yaml`
- `case-hotfix-worker.agent.yaml`
- `conflict-analyze-worker.agent.yaml`
- `diff-scan-worker.agent.yaml`
- `knowledge-curate-worker.agent.yaml`
- `workspace-manage-worker.agent.yaml`

新建同类 worker 时按以下模板复制后改 `id` 与差异字段：

```yaml
id: <slug>-worker@1
schema_ref: AgentContract@1
role: worker
runner: worktree_patch
write_capability: patch_only
allowed_tools:
  - read_file
  - write_patch
  - ask_user
read_scope:
  - .ai/core/**
  - workspace/**
write_scope:
  - workspace/**
forbidden_scope:
  - .kata/repos/**
  - .agents/**
  - .claude/**
handoff_schema: HandoffEnvelope@1
review_gates:
  - schema_guard.require_provenance@1
  - write_policy.block_repos_write@1
```

修改公共策略（如 `allowed_tools`、`forbidden_scope`、`review_gates`）时**必须**同步更新本 README 模板与所有 7 个 yaml；漏一处即破例。

后续如需引入 `extends:` 机制将 boilerplate 收敛为字段继承，需同步升级 `AgentContract.v1.schema.json` 与 `engine/src/ai-core/load.ts`。

## 例外

- `case-draft-worker.agent.yaml` — `allowed_tools` 不含 `ask_user`，且 `write_scope` 为 `workspace/*/features/**`；详见 `.ai/core/skills/case-draft/skill.yaml` hard_rules 中 BlockedEnvelope 规则。
- `playwright-automation-worker.agent.yaml` — `runner: local`、`write_capability: staged_artifacts_only`、`handoff_schema: PlaywrightAutomationHandoff@2`；现阶段与 AgentContract@1 schema 枚举不严格兼容，已记为 schema 漂移待后续 audit 处理。
- `case-reviewer.agent.yaml` — `role: reviewer`、`runner: read_only`、`write_capability: none`、不含 `write_scope`。
