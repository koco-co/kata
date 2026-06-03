# Codex 原生 skill 适配（canonical）

日期：2026-06-02

## 目标

让 kata 的 8 个业务 skill 在 OpenAI Codex 运行时可被原生发现并正确执行，且与 Claude Code 共用同一份 skill 源——零内容复制、零提示词漂移。

## Codex 真实的 skill 体系（依据）

核对了本机已安装插件中两份一手证据：

- **原生 skill 发现**（superpowers `.codex/INSTALL.md`）：把现有 `skills/` 目录**直接 symlink** 到 `~/.agents/skills/<plugin>` 或项目级 `.agents/skills/`，Codex 即按 `<name>/SKILL.md` 的 agentskills.io frontmatter（`name` + `description`）发现 skill。**零重构，嵌套子目录原样保留。**
- **插件级 manifest**（superpowers `.codex-plugin/plugin.json`）：插件根部**一个** `plugin.json`，含 `"skills": "./skills/"` 指针与**插件级**（每插件一个）的 `interface` 块，键为 **camelCase**，`defaultPrompt` 为**数组**。
- **工具映射**（superpowers `skills/using-superpowers/references/codex-tools.md`）：skill 正文保留 Claude Code 工具名，靠一张映射表让 agent 运行时翻译（`Task → spawn_agent`、`TodoWrite → update_plan` 等）。官方**从不为 Codex fork 正文**。

结论：Codex 适配本质上是「同结构 + 工具名映射」，不是目录重构，也没有 per-skill 元数据文件。

## 本仓库的 canonical 落法

```
.agents/
  skills/
    <skill>            -> ../../.claude/skills/<skill>   # 8 个业务 skill：整目录 symlink
    _shared            -> ../../.claude/skills/_shared
    using-kata-codex/                                    # 唯一真实目录：codex bootstrap
      SKILL.md                                           # 会话起始加载：工具映射 + 路由表
      references/codex-tools.md                          # Claude → Codex 工具对照
  scripts/kata         -> ../../.claude/scripts/_shared/bin/kata
.codex-plugin/
  plugin.json                                            # 插件级 camelCase interface（defaultPrompt 数组）
```

- **业务 skill = symlink**：`.agents/skills/<skill>` 指向 `.claude/skills/<skill>`，两端共用一份文件，改 `.claude` 即同步生效，无复制、无漂移。
- **工具差异走映射，不改正文**：`using-kata-codex` bootstrap + `codex-tools.md` 负责把正文里的 `Task`/`TodoWrite`/`AskUserQuestion`/`Read`/`Bash` 翻译成 Codex 等价工具。Codex 原生支持子代理（`spawn_agent`，需 `~/.codex/config.toml` 开 `[features] multi_agent = true`），所以 `subagent-driven-development` 工作流**保持结构不变**，`Task` 映射为 `spawn_agent`，不降级成主会话顺序执行。
- **frontmatter 兼容**：各 SKILL.md 含 Claude 专属字段（`argument-hint`/`model`/`effort`/`allowed-tools`）。Codex 只读 `name` + `description`，未知字段忽略；`user-invocable` 生效。
- **interface 元数据集中在 plugin.json**：替代被废弃的 per-skill 方案。

## 明确废弃的写法（非 Codex 原生）

早期适配发明过一套谁都不是的混合结构，已废弃，并由 lint 防回归：

| 废弃写法 | 原因 |
| --- | --- |
| per-skill `agents/openai.yaml`（snake_case `display_name`/`short_description`/`default_prompt`） | Codex 无 per-skill interface；interface 是插件级、camelCase、`defaultPrompt` 为数组 |
| `policy.allow_implicit_invocation` | Codex 无此字段；隐式触发由 SKILL.md `user-invocable` 控制 |
| per-skill `agents/source-map.json` | 迁移账本，Codex 生态不存在 |
| 把 `fewshots/`+`prompts/`+`rules/`+`phases/` 拍平进 `references/` | Codex 保留原嵌套子目录，无需拍平 |
| `templates/` → `assets/templates/` | 非 Codex 约定 |
| 复制并改写整棵 skill 树 | canonical 是整树 symlink，复制会导致 `.claude` 与 `.agents` 漂移 |

## 校验

`kata skills audit --runtime codex --exit-code`（脚本 `lint:skills:codex`，已纳入 `ci`）校验：

- 每个业务 skill 在 `.agents/skills/` 有指向 `.claude/skills/<name>` 的 symlink（缺失/非 symlink/目标错误/悬空均报错）；
- 禁止 `agents/openai.yaml`、`agents/source-map.json` 回归；
- bootstrap `using-kata-codex/SKILL.md`（name+description）与 `references/codex-tools.md` 存在且非空；
- `.codex-plugin/plugin.json` 为合法 JSON、有 `skills` 指针与 camelCase `interface`、`defaultPrompt` 为数组，且不含 snake_case 键或 `policy.allow_implicit_invocation`。

实现：`.claude/scripts/_shared/lint/codex-skill-shape.ts`；测试：`.claude/scripts/_shared/tests/lint/codex-skill-shape.test.ts`。

## Codex 侧使用

项目级 `.agents/skills/` 被 Codex 原生发现，无需额外安装。若要全局可用，按 superpowers 约定 symlink 到 `~/.agents/skills/kata`。子代理工作流在当前 stable Codex 默认可用；旧版需在 `~/.codex/config.toml` 开启 `[features] multi_agent = true`。

> 时效注记（2026-06-03 核实）：Codex `[features].multi_agent` 现为「stable; on by default」，当前 stable 版无需显式开启该 flag；保留开启说明以兼容旧版 Codex。
