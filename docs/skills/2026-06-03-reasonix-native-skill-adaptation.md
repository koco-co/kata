# Reasonix 原生 skill 适配（canonical）

日期：2026-06-03

## 目标

让 kata 的 8 个业务 skill 在 reasonix（`esengine/DeepSeek-Reasonix`）原生可发现并正确执行，且与 Claude Code 共用同一份 skill 源——零内容复制、零提示词漂移。

## Reasonix 真实的 skill 体系（依据）

核对了以下一手来源：

- **skill 发现机制**（`internal/skill/skill.go`、`internal/config/config.go`）：reasonix 按**目录扫描**发现 skill；ConventionDirs = `.reasonix` / `.agents` / `.agent` / `.claude`（扫各项目根目录与 home 下这些目录的 `skills/` 子目录）；每个 skill 是含 `SKILL.md` 的目录（或扁平 `<name>.md`）；仅 `name` + `description`（frontmatter）进入索引，正文按需加载。**支持整目录 symlink**：`.reasonix/skills/<name>` → `.claude/skills/<name>` 即被正常发现，无需特殊配置。
- **子代理**（`docs/SPEC.md §3.3`、`api-docs.deepseek.com` agent integrations）：reasonix 原生支持子代理，工具为 `task` 内置工具或 `runAs: subagent` 配置，可指定 `subagent_model`。
- **无 JSON manifest**：reasonix 的插件声明走 `reasonix.toml` 里的 `[[plugins]]`（MCP server 配置），与 skill 发现机制完全独立；不存在 per-skill 或 per-plugin 的 JSON manifest。

结论：reasonix 适配与 Codex 同路线——整目录 symlink + 工具名映射，无需目录重构，也无 JSON manifest。

## 本仓库的 canonical 落法

```
.reasonix/
  skills/
    <skill>                  -> ../../.claude/skills/<skill>   # 8 个业务 skill：整目录 symlink
    _shared                  -> ../../.claude/skills/_shared
    using-kata-reasonix/                                        # 唯一真实目录：reasonix bootstrap
      SKILL.md                                                  # 会话起始加载：工具映射 + 路由表
      references/reasonix-tools.md                              # Claude → reasonix 工具对照
```

- **业务 skill = symlink**：`.reasonix/skills/<skill>` 指向 `.claude/skills/<skill>`，两端共用一份文件，改 `.claude` 即同步生效，无复制、无漂移。
- **工具差异走映射，不改正文**：`using-kata-reasonix` bootstrap + `reasonix-tools.md` 负责把正文里的 Claude Code 工具名翻译成 reasonix 等价工具。
- **frontmatter 兼容**：各 SKILL.md 含 Claude 专属字段（`argument-hint`/`model`/`effort`/`allowed-tools`）。reasonix 只读 `name` + `description`，未知字段忽略；`user-invocable` 生效。

## 工具映射

reasonix 原生支持子代理，多代理工作流（subagent-driven-development）**保持结构不降级**：

| Claude Code 工具 | reasonix 等价 |
| --- | --- |
| `Task`（派子代理）/ 并行多个 `Task` | `task` 内置工具，或 `runAs: subagent` skill（可配 `subagent_model`） |
| `TodoWrite` | `todo_write` |
| `AskUserQuestion` | `ask`（列候选项 + 推荐项） |
| `Read` / `Write` / `Edit` | 原生文件工具 |
| `Bash` | 原生 shell |
| `Grep` / `Glob` | 原生搜索工具 |
| `Skill` | 原生 skill 加载，直接照做 |

## 明确废弃的写法

`.reasonix-plugin/plugin.json` —— reasonix **无 JSON manifest**；其 plugins 是 `reasonix.toml` 里的 `[[plugins]]`（MCP server 声明），与 skill 发现无关。该捏造文件格式已删除，并由 lint 防回归：

| 废弃写法 | 原因 |
| --- | --- |
| `.reasonix-plugin/plugin.json` | reasonix 无此 manifest 机制；发明来的结构，非原生 |
| per-skill `agents/openai.yaml`（reasonix 侧） | reasonix 无 per-skill metadata 文件 |
| 复制并改写整棵 skill 树 | canonical 是整目录 symlink；复制导致 `.claude` 与 `.reasonix` 漂移 |

## 校验

`kata skills audit --runtime reasonix --exit-code`（脚本 `lint:skills:reasonix`，已纳入 `ci`）校验：

- 每个业务 skill 在 `.reasonix/skills/` 有指向 `.claude/skills/<name>` 的 symlink（缺失/非 symlink/目标错误/悬空均报错）；
- bootstrap `using-kata-reasonix/SKILL.md`（name+description）与 `references/reasonix-tools.md` 存在且非空；
- **不再要求任何 plugin.json**。

实现：`.claude/scripts/_shared/lint/reasonix-skill-shape.ts`；测试：`.claude/scripts/_shared/tests/lint/reasonix-skill-shape.test.ts`。

## Reasonix 侧使用

项目级 `.reasonix/skills/` 被 reasonix ConventionDirs 扫描原生发现，无需额外安装。若要全局可用，symlink 到 `~/.reasonix/skills/kata`（或 `~/.agents/skills/kata`，reasonix 也扫 `.agents`）。子代理工作流开箱即用，无需额外配置项。
