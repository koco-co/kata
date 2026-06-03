# Reasonix (DeepSeek Agent) Tool Mapping

kata 的 skill 正文使用 Claude Code 工具名（这些 skill 在 `.claude/skills/` 与 `.reasonix/skills/` 之间共用同一份文件）。在 reasonix 里遇到这些工具名时，换成你的平台等价工具。reasonix（`esengine/DeepSeek-Reasonix`）原生支持子代理与任务跟踪，无需降级。

| skill 正文写的 | reasonix 等价 |
| --- | --- |
| `Task`（派子代理） | `task` 内置工具派子代理；或把子任务做成 `runAs: subagent` 的 skill（可配 `subagent_model`） |
| 并行多个 `Task` | 多个 `task`，原生并行，不降级 |
| Task 返回结果 | `task` 自动返回 |
| `TodoWrite`（任务跟踪） | `todo_write` 内置工具 |
| `AskUserQuestion`（结构化提问） | `ask` 内置工具（提问并明确列出候选项与推荐项） |
| `Skill`（调用 skill） | skill 原生加载，直接照其指令执行 |
| `Read` / `Write` / `Edit`（文件） | 原生文件工具 |
| `Bash`（执行命令） | 原生 shell 工具 |
| `Grep` / `Glob`（搜索） | 原生搜索工具 |
| `kata <command>`（CLI） | 原样在 shell 里执行（`npx kata` / `bunx kata`） |

## 子代理（原生支持，不降级）

reasonix 原生支持子代理：内置 `task` 工具可派子代理，skill 也可声明 `runAs: subagent`（子代理 skill 默认继承执行器模型，可用 `subagent_model` 覆盖）。因此 skill 正文里的多代理工作流（如 `case-draft` 的 worker/spec-reviewer/quality-reviewer 三阶段、`playwright-automation` 的多阶段 worker）直接映射为 `task`/`runAs: subagent`，**保持结构与并行能力，不降级为主会话顺序执行**。任务跟踪用内置 `todo_write`。

## 技能发现

reasonix 按目录扫描发现 skill：扫描各根目录与 home 下的 convention dirs（`.reasonix` / `.agents` / `.agent` / `.claude`）的 `skills/` 子目录，每个 skill 是含 `SKILL.md` 的目录（或扁平 `<name>.md`）。仅 `name` + `description`（frontmatter）进入索引；正文按需加载。**支持整目录 symlink**（`.reasonix/skills/<name>` 指向 `.claude/skills/<name>` 即被正常发现）。

## frontmatter 字段

各 skill SKILL.md 的 `argument-hint`、`model`、`effort`、`allowed-tools` 是 Claude Code 专属字段。reasonix 只用 `name` + `description` 做发现，未知字段忽略。
