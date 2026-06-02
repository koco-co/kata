---
name: using-kata-codex
description: Load at the start of any kata session running under Codex. The kata skills under .agents/skills/ are symlinks to .claude/skills/ and keep Claude Code tool names in their bodies; this skill maps those tool names to Codex equivalents and applies the kata routing table so inputs reach the right skill.
---

# Using kata skills under Codex

kata 的 8 个业务 skill（case-draft、case-edit、case-hotfix、defect-analyze、infra-diagnose、knowledge-curate、playwright-automation、workspace-manage）位于 `.agents/skills/<name>`，是指向 `.claude/skills/<name>` 的**整目录 symlink**。它们与 Claude Code 共用同一份正文，正文里写的是 Claude Code 的工具名。在 Codex 里使用时，按下面两条规则消化差异即可——无需修改任何 skill 文件。

## 1. 工具名翻译

skill 正文出现 Claude Code 工具名时，换成你的 Codex 等价工具。完整对照见 [`references/codex-tools.md`](references/codex-tools.md)，要点：

- `Task`（派子代理）/ 并行多个 `Task` → `spawn_agent`（需在 `~/.codex/config.toml` 开 `[features] multi_agent = true`）；取结果 `wait_agent`，释放槽位 `close_agent`。
- `TodoWrite` → `update_plan`。
- `AskUserQuestion` → Codex 无结构化提问工具，直接在对话里向用户提问，并明确给出候选项。
- `Read` / `Write` / `Edit` → 原生文件工具；`Bash` → 原生 shell；`Skill` → 原生加载，直接照做。

## 2. frontmatter 兼容

各 skill 的 SKILL.md frontmatter 含 Claude Code 专属字段（`argument-hint`、`model`、`effort`、`allowed-tools`）。Codex 只读 `name` + `description` 做发现，其余未知字段忽略即可；`allowed-tools` 不作为硬性工具限制，按任务实际需要使用工具。

## 3. 路由表

仅凭单条输入即可静默分发到对应 skill（与 `.claude/CLAUDE.md` 路由规则一致）：

| 输入 | 走 skill |
| --- | --- |
| Lanhu/Axure URL（lanhuapp.com，含 axure/产品设计） | `case-draft` |
| ZenTao bug URL / bug-view-NNN / bug ID | `case-hotfix`（未修复或缺修复范围时由它生成待办，不回退 `defect-analyze`） |
| 需求功能**目录**路径/目录名（`features/【v...】`，无文件扩展名） | `playwright-automation` |
| 用例产物**文件**（`.xmind`/`.csv`/`archive.md`），或编辑/同步/标准化已有用例 | `case-edit` |
| 异常堆栈/控制台报错/HTTP 失败、合并冲突文本、diff/分支对 | `defect-analyze` |
| 数据源/数据库/服务器连通性报错（如 JDBC No route to host） | `infra-diagnose` |
| 记录/查询/维护业务知识、规则、术语，或问「XX 是什么」 | `knowledge-curate` |
| kata 能力/功能菜单/命令帮助，或创建/初始化/自检/收尾/修复工作区 | `workspace-manage` |

匹配优先级：精确格式/URL/路径匹配 > 意图关键词匹配 > 通用请求。description 里的「改走/不在此」声明优先于触发关键词。无 skill 匹配的请求自行处理，不强套路由。
