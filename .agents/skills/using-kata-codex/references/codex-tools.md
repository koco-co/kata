# Codex Tool Mapping

kata 的 skill 正文使用 Claude Code 工具名（这些 skill 在 `.claude/skills/` 与 `.agents/skills/` 之间共用同一份文件）。在 Codex 里遇到这些工具名时，换成你的平台等价工具。本表与官方 superpowers `codex-tools.md` 对齐。

| skill 正文写的 | Codex 等价 |
| --- | --- |
| `Task`（派子代理） | `spawn_agent`（见下「子代理需要 multi-agent 支持」） |
| 并行多个 `Task` | 多个 `spawn_agent` |
| Task 返回结果 | `wait_agent` |
| Task 自动完成 | `close_agent` 释放槽位 |
| `TodoWrite`（任务跟踪） | `update_plan` |
| `AskUserQuestion`（结构化提问） | Codex 无此工具；直接在对话里向用户提问，并明确列出候选项与推荐项 |
| `Skill`（调用 skill） | skill 原生加载，直接照其指令执行 |
| `Read` / `Write` / `Edit`（文件） | 原生文件工具 |
| `Bash`（执行命令） | 原生 shell 工具 |
| `kata <command>`（CLI） | 原样在 shell 里执行；`.agents/scripts/kata` 是指向 `.claude/scripts/_shared/bin/kata` 的 symlink |

## 子代理需要 multi-agent 支持

在 `~/.codex/config.toml` 加：

```toml
[features]
multi_agent = true
```

> 注：在当前 stable Codex 上，`multi_agent` 已是「stable; on by default」（见官方 config-reference），`spawn_agent`/`wait_agent`/`close_agent` 默认可用，此 flag 非强制；旧版仍需显式开启，故保留上面的配置说明。

启用后才有 `spawn_agent`、`wait_agent`、`close_agent`，供 `playwright-automation`、`case-draft` 等用到「派 worker / spec review / quality review」的 skill 使用。kata 的子代理工作流（subagent-driven-development）在 Codex 下保持结构不变，只是把 `Task` 映射为 `spawn_agent`——不要降级成「全部在主会话顺序执行」。

旧版 Codex（`rust-v0.115.0` 之前）把等待生成的子代理写作 `wait`；当前 Codex 用 `wait_agent`，`wait` 已改指 code-mode 的 `exec/wait`。

## frontmatter 字段

各 skill SKILL.md 的 `argument-hint`、`model`、`effort`、`allowed-tools` 是 Claude Code 专属字段。Codex 只用 `name` + `description` 做发现，未知字段忽略；`user-invocable` 生效（控制是否允许隐式触发）。
