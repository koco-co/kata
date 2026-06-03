---
name: using-kata-hermes
description: Load at the start of any kata session running under Hermes Agent (NousResearch/hermes-agent). kata business skills live in .claude/skills/ and are discovered by Hermes via external_dirs (NOT symlinks — symlinked skill dirs are omitted from Hermes discovery, upstream #8293). This skill maps Claude Code tool names to Hermes equivalents and applies the kata routing table so inputs reach the right skill.
---

# Using kata skills under Hermes Agent

kata 的 8 个业务 skill（case-draft、case-edit、case-hotfix、defect-analyze、infra-diagnose、knowledge-curate、playwright-automation、workspace-manage）单一存放于 `.claude/skills/<name>`。它们与 Claude Code 共用同一份正文，正文里写的是 Claude Code 的工具名。在 Hermes Agent 里使用时，按下面规则消化差异即可——无需修改任何 skill 文件。

## 1. 发现机制（external_dirs，不用 symlink）

Hermes 的官方 skill 源是 `~/.hermes/skills/`，并可在 `~/.hermes/config.yaml` 的 `skills.external_dirs` 增加额外目录。**不要**用 symlink 把业务 skill 挂进 `.hermes/skills/`：Hermes 当前会把 skills 目录下的整目录 symlink 从 `skills_list`/`skill_view` 漏掉（上游 open bug NousResearch/hermes-agent#8293）。

正确做法是让 Hermes 直接扫真实目录。在 `~/.hermes/config.yaml`：

```yaml
skills:
  external_dirs:
    - ${KATA_REPO}/.claude/skills   # 8 个业务 skill（_shared 因下划线前缀被自动忽略）
    - ${KATA_REPO}/.hermes/skills   # 取本 bootstrap（using-kata-hermes）
```

把 `${KATA_REPO}` 换成 kata 仓库绝对路径（也可写死；`external_dirs` 支持 `~` 与 `${VAR}`）。`.hermes/skills/` 下只保留本 bootstrap 真实目录，无业务 skill symlink。

## 2. 工具名翻译

skill 正文出现 Claude Code 工具名时，换成你的 Hermes 等价工具。完整对照见 [`references/hermes-tools.md`](references/hermes-tools.md)，要点：

- `Task`（派子代理）/ 并行多个 `Task` → `delegate_task`（原生子代理，不降级）。
- `TodoWrite` → `todo`。
- `AskUserQuestion` → 无结构化提问工具；直接在对话里提问并列候选项 + 推荐项。
- `Read` → `read_file`；`Write` → `write_file`；`Edit` → `patch`。
- `Bash` → `terminal`；`Grep` / `Glob` → `search_files`；`Skill` → `skill_view`。

## 3. frontmatter 兼容

各 skill 的 SKILL.md frontmatter 含 Claude Code 专属字段（`argument-hint`、`model`、`effort`、`allowed-tools`）。Hermes Agent 只读 `name` + `description` 做发现，其余未知字段忽略即可；`allowed-tools` 不作为硬性工具限制，按任务实际需要使用工具。

## 4. 路由表

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

匹配优先级：精确格式/URL/路径匹配 > 意图关键词匹配 > 通用请求。description 里的路由声明优先于触发关键词。无 skill 匹配的请求自行处理，不强套路由。
