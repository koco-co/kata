# Reasonix (DeepSeek Agent) Tool Mapping

kata 的 skill 正文使用 Claude Code 工具名（这些 skill 在 `.claude/skills/` 与 `.reasonix/skills/` 之间共用同一份文件）。在 reasonix 里遇到这些工具名时，换成你的平台等价工具。

| skill 正文写的 | reasonix 等价 |
| --- | --- |
| `Task`（派子代理） | 不支持；在主会话内顺序执行，见下方「子代理降级策略」 |
| 并行多个 `Task` | 不支持；顺序执行，将前一步输出作为后一步输入 |
| Task 返回结果 | N/A（顺序执行，直接获得结果） |
| Task 自动完成 | N/A |
| `TodoWrite`（任务跟踪） | 无等价工具；在对话中维护 markdown checklist |
| `AskUserQuestion`（结构化提问） | reasonix 无此工具；直接在对话里向用户提问，并明确列出候选项与推荐项 |
| `Skill`（调用 skill） | skill 原生加载，直接照其指令执行 |
| `Read` / `Write` / `Edit`（文件） | 原生文件工具 |
| `Bash`（执行命令） | 原生 shell 工具 |
| `Grep` / `Glob`（搜索） | 原生搜索工具 |
| `kata <command>`（CLI） | 原样在 shell 里执行；`.reasonix/scripts/kata`（如有）或直接调用 `npx kata` / `bunx kata` |

## 子代理降级策略

DeepSeek Agent 当前不支持原生多代理（multi-agent）工作流。当 skill 正文要求派 `Task`（如 `case-draft` 的 worker/spec-reviewer/quality-reviewer 三阶段、`playwright-automation` 的多阶段 worker）时：

1. 在主会话内按顺序执行每个角色的指令。
2. 将上一角色的输出作为下一角色的上下文输入。
3. 在对话中标注当前角色切换（如 `--- [spec-reviewer] ---`）。
4. 用 markdown checklist 替代 `TodoWrite` 追踪各阶段进度。

这种降级不影响最终产物质量，但会失去并行加速。未来若 DeepSeek Agent 支持 multi-agent，可升级为原生子代理模式。

## frontmatter 字段

各 skill SKILL.md 的 `argument-hint`、`model`、`effort`、`allowed-tools` 是 Claude Code 专属字段。reasonix 只用 `name` + `description` 做发现，未知字段忽略；`user-invocable` 如被识别则生效（控制是否允许隐式触发）。
