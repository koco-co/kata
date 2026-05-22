# ADR-0001: 为什么有 7 个相同结构的 Agent

**状态**: 已采纳  
**日期**: 2026-04-29  
**关联**: v3 Architecture Redesign (CHANGELOG 3.0.0-alpha.1)

## 背景

Kata v3 中定义了 7 个 product skills，每个 skill 遵循一个 4 文件合约结构：`SKILL/workflow/rules/references`。在 runtime 层面，每个 skill 对应一个独立 agent（如 `case-draft-agent`、`case-edit-agent`、`case-hotfix-agent` 等）。这些 agent 的目录结构高度相似，都包含 `agent.yaml`、`workflow.yaml`、`rules/` 和 `references/`。

## 决策

采用统一的 4 文件合约模板，每个 product skill 独立生成完整的 agent 目录，而非使用动态加载或单 agent 多路由模式。

## 理由

1. **可审计性**：每个 agent 是一个独立的加载单元。CI lint 可以直接对每个 agent 做完整性检查，无需理解动态分发逻辑。
2. **隔离性**：每个 agent 的 context budget、workflow、rules 互不影响。一个 agent 的 prompt 溢出或规则变更不会影响其他 agent。
3. **投影确定性**：`.ai/core` 到 `.claude/` / `.agents/` 的投影是 1:1 映射。多 agent 多文件可以逐文件校验 hash，单文件聚合会影响 diff 粒度。
4. **测试简化**：skill 的回归测试（如 `case-draft-hardrules-regression.test.ts`）可以直接 pin 单个 agent 的 baseline，无需 mock 路由层。
5. **Codex 兼容**：kata Codex runtime 的 agent 加载机制与 Claude Code 不同，独立 agent 目录更容易适配两者的投影格式。

## 后果

- 正面：新增 skill 时 template 化成本低，复制 + 修改关键字段即可。
- 正面：每个 agent 的 context budget 可独立调优。
- 负面：目录文件数增加，但通过 projection 系统自动生成缓解。
- 负面：跨 agent 的公共规则需要通过 `.ai/core/rules/` 共享，不能在每个 agent 内重复定义。

## 关联

- `.ai/core/skills/` 下的每个 product skill 目录是独立单元。
- `.ai/core/rules/` 下的公共规则被多个 agent 引用。
- 投影系统确保 `.claude/agents/` 的内容由 `.ai/core` 生成而非手工维护。
