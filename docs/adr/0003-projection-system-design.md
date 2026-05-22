# ADR-0003: Projection 系统设计

**状态**: 已采纳  
**日期**: 2026-04-29 (v3), 2026-05-08 (v4 P0 Kernel)  
**关联**: CHANGELOG 4.0.0-alpha.0, 3.0.0-alpha.1

## 背景

Kata 同时支持 Claude Code 和 kata Codex 两个 runtime。两个 runtime 的 agent/命令/skills 加载机制不同（目录结构、manifest 格式、行为配置），但核心逻辑（skills、workflows、rules、prompts）应该是同一份。如果分别维护两套副本，必然产生 drift。

同时，根目录下的 `AGENTS.md` 是公开 coding-agent 入口文件，`CLAUDE.md` 是其 symlink。这些入口文件也需要与 `.ai/core` 的 command index 保持同步。

## 决策

采用 Source of Truth + Projection 架构：

- **Source of Truth**：`.ai/core/**` 是唯一的 AI runtime 源，包含 skills、commands、workflows、agents、prompts、schemas、guards、evals、runtimes 的全部声明。
- **Runtime Projection**：`.claude/**` 和 `.agents/**` 是从 `.ai/core` 生成（render）的投影目录。
- **Projection Lock**：在 P4 AI Core Hardening 中引入 `projection-lock.json`，记录每个投影文件的 sha256 hash，CI 检查 drift。
- **入口文件**：`AGENTS.md` 是唯一公开入口，`CLAUDE.md` 是其 symlink；command index 通过 `<!-- ai-core:start command-index -->` 标记块由 AI Core docs renderer 生成。

## 流程

```
编辑 .ai/core/** 源契约
       │
       ▼
bun engine/bin/kata ai-core projection render
       │
       ├── 生成 .claude/**  (Claude Code runtime)
       ├── 生成 .agents/**  (kata Codex runtime)
       └── 更新 AGENTS.md command index (如果变更)
       │
       ▼
bun engine/bin/kata ai-core projection check (CI 中验证 drift)
```

## 理由

1. **单一真相源**：skills 的能力定义、规则、prompt 只需在 `.ai/core` 修改一次。所有 product skill 的 hard_rules 都定义在 `skill.yaml` 中，不分散到多个 runtime。
2. **Diff 可审计**：运行 `bun engine/bin/kata ai-core projection render` 后，git diff 可以精确显示哪些投影文件被更新，diff 内容即为两份文件的差异。
3. **Drift 检测**：CI 中的 `kata ai-core projection check` 步骤校验投影文件的 hash 是否匹配源，保证运行时不会加载过期配置。
4. **部署灵活**：新增 runtime 时只需添加新的投影目标，不需要复制或修改核心 skills 代码。

## 后果

- 开发者必须记住：编辑 `.claude/**` 或 `.agents/**` 是无效的——下次 projection render 会覆盖。必须编辑 `.ai/core/**` 下的源文件。
- 新增 skill 或命令时，必须在 `.ai/core/skills/` 和 `.ai/core/commands/` 下声明，然后运行 projection render。
- Projection lock 文件 (`projection-lock.json`) 需要与 `.ai/core` 源契约一起维护。

## 关联

- `.ai/core/runtimes/` — 各 runtime 的 projection manifest
- `engine/src/ai-core/projection/` — projection render 和 check 实现
- `.ai/core/rules/workspace-boundary.md` — 投影系统边界说明
