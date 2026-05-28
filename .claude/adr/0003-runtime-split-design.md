# ADR-0003: Runtime Split 架构

**状态**: 已采纳  
**日期**: 2026-05-28  
**关联**: `.claude/architecture/kata-project-architecture.md`

## 背景

Kata 同时支持 Claude Code 和 kata Codex 两个 runtime。两个 runtime 的加载机制、入口文件和平台配置不同，但用户可见语义、交付产物清单、验证口径和证据底线必须一致。

旧的单一生成源已经删除。当前架构不再通过中间目录生成 runtime 文件，也不保留旧命令作为兼容层。

## 决策

采用 `SKILL + Router + Graph + Workflow + Blackboard` 的 runtime 编排模式：

- **SKILL**：`.claude/skills/**` 与 `.agents/skills/**` 分别维护 Claude Code 与 Codex 的 skill 入口。
- **Router**：`.claude/contracts/routes/*.yaml` 记录每个 skill 的触发与排除条件。
- **Graph**：`.claude/contracts/skill-graph.yaml` 记录 skill 的用户入口、输入、输出和关联关系。
- **Workflow**：`.claude/contracts/workflows/*.yaml` 记录可执行步骤，`docs/skills/workflows/*.md` 提供审阅视图。
- **Blackboard**：`docs/skills/contracts/blackboard.schema.yaml` 定义跨步骤共享状态槽位。

## 流程

```
维护 .claude/** 与 .agents/**
       │
       ├── 同步维护 .claude/contracts/routes/*.yaml
       ├── 同步维护 .claude/contracts/skill-graph.yaml
       ├── 同步维护 .claude/contracts/workflows/*.yaml
       └── 同步维护 docs/skills/contracts/blackboard.schema.yaml
       │
       ▼
bun run check:skills
```

## 理由

1. **Runtime 原生**：Claude Code 与 Codex 各自维护自己的提示词和平台配置，不再依赖历史生成层。
2. **可测试**：Router、Graph、Workflow 和 Blackboard 都有独立契约检查。
3. **可审查**：runtime 文件直接出现在 diff 中，审查者无需先推断生成逻辑。
4. **低漂移**：`bun run check:skills` 统一验证 runtime 配对、入口脱钩、路由、图和 workflow。

## 后果

- 修改 `.claude/**` 或 `.agents/**` 时，需要按 `AGENTS.md` 与 `CLAUDE.md` 的入口规则同步评估另一套 runtime。
- 新增 skill 需要同时补 runtime skill、route contract、graph entry，并按需补 workflow。
- 旧命令和旧目录不作为兼容接口保留。

## 关联

- `AGENTS.md` / `CLAUDE.md` — 公开 coding-agent 入口
- `.claude/contracts/runtime-skill-sync.md` — runtime 配对契约
- `.claude/contracts/routes/*.yaml` — Router 契约
- `.claude/contracts/skill-graph.yaml` — Graph 契约
- `.claude/contracts/workflows/*.yaml` — Workflow 契约
- `docs/skills/contracts/blackboard.schema.yaml` — Blackboard 契约
