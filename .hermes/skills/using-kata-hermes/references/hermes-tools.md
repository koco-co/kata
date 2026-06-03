# Hermes Agent Tool Mapping

kata 的 skill 正文使用 Claude Code 工具名（这些 skill 在 `.claude/skills/` 与 `.hermes/skills/` 之间共用同一份文件）。在 Hermes Agent 里遇到这些工具名时，换成你的平台等价工具。

| skill 正文写的 | Hermes 等价 |
| --- | --- |
| `Task`（派子代理） | `delegate_task`（派子代理执行，返回结果） |
| 并行多个 `Task` | 多个 `delegate_task` 调用 |
| Task 返回结果 | `delegate_task` 自动返回 |
| Task 自动完成 | `delegate_task` 自动管理生命周期 |
| `TodoWrite`（任务跟踪） | `todo`（任务管理） |
| `AskUserQuestion`（结构化提问） | 无结构化提问工具；直接在对话里向用户提问，并明确列出候选项与推荐项 |
| `Skill`（调用 skill） | `skill_view`（查看 skill 定义）；加载后按其指令执行 |
| `Read`（读文件） | `read_file` |
| `Write`（写文件） | `write_file` |
| `Edit`（编辑文件） | `patch`（find-and-replace 编辑） |
| `Bash`（执行命令） | `terminal`（执行 shell 命令） |
| `Grep` / `Glob`（搜索） | `search_files`（ripgrep-backed 搜索） |
| `kata <command>`（CLI） | `terminal(command="kata ...")`（原样执行） |

## 子代理支持

Hermes Agent 原生支持 `delegate_task`，功能等同 Claude Code 的 `Task`。skill 正文中的子代理工作流（如 `case-draft` 的 worker/spec-reviewer/quality-reviewer 三阶段、`playwright-automation` 的多阶段 worker）可直接映射为 `delegate_task`，保持并行能力不降级。

## frontmatter 字段

各 skill SKILL.md 的 `argument-hint`、`model`、`effort`、`allowed-tools` 是 Claude Code 专属字段。Hermes Agent 只用 `name` + `description` 做发现，未知字段忽略。
