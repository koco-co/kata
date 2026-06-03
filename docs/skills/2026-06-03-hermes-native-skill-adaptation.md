# Hermes 原生 skill 适配（canonical）

日期：2026-06-03

## 目标

让 kata 的 8 个业务 skill 在 Hermes（`NousResearch/hermes-agent`）原生可发现并正确执行，且与 Claude Code 共用同一份 skill 源——零内容复制、零提示词漂移。

## Hermes 真实的 skill 体系（依据）

核对了以下一手来源：

- **skill 发现机制**（`website/docs/reference/tools-reference.md`、`website/docs/user-guide/features/skills.md`）：官方 skill 源是 `~/.hermes/skills/`，可经 `~/.hermes/config.yaml` 的 `skills.external_dirs` 扩展额外目录；skill 是含 `SKILL.md` 的目录，仅 `name` + `description` 进入索引，progressive disclosure（`skills_list` 列出 → `skill_view` 展开正文）。
- **内置工具**（共 8 个）：`delegate_task`、`todo`、`read_file`、`write_file`、`patch`、`terminal`、`search_files`、`skill_view`。
- **无 plugin manifest**：Hermes 分发走 taps / Skills Hub，不产出 per-plugin JSON manifest；skill 目录本身即完整交付单元。

结论：Hermes 适配必须用 `external_dirs` 指向真实目录——**不能用 symlink**（见下方 bug 说明）。

## 本仓库的 canonical 落法（external_dirs）

业务 skill **不 symlink** 进 `.hermes/skills/`；改为在 `~/.hermes/config.yaml` 把 `external_dirs` 指向真实 `.claude/skills`，让 Hermes 直接扫真实目录：

```yaml
skills:
  external_dirs:
    - ${KATA_REPO}/.claude/skills   # 8 个业务 skill（_shared 因下划线前缀被自动忽略）
    - ${KATA_REPO}/.hermes/skills   # 取本 bootstrap（using-kata-hermes）
```

把 `${KATA_REPO}` 换成 kata 仓库绝对路径（`external_dirs` 支持 `~` 与 `${VAR}`）。

```
.hermes/
  skills/
    using-kata-hermes/              # 唯一真实目录：hermes bootstrap
      SKILL.md                      # 发现机制文档 + 工具映射 + 路由表
      references/hermes-tools.md    # Claude → Hermes 工具对照
                                    # 无业务 skill symlink
```

- **业务 skill 走 external_dirs，不走 symlink**：`.hermes/skills/` 下零业务 skill，无论是真实目录还是 symlink。
- **工具差异走映射，不改正文**：`using-kata-hermes` bootstrap + `hermes-tools.md` 负责翻译工具名差异。

## 工具映射

Hermes 原生支持 `delegate_task`（子代理），多代理工作流（subagent-driven-development）**保持结构不降级**：

| Claude Code 工具 | Hermes 等价 |
| --- | --- |
| `Task`（派子代理）/ 并行多个 `Task` | `delegate_task`（原生子代理，不降级） |
| `TodoWrite` | `todo` |
| `AskUserQuestion` | 无结构化提问工具；直接在对话里提问，并列候选项 + 推荐项 |
| `Read` | `read_file` |
| `Write` | `write_file` |
| `Edit` | `patch` |
| `Bash` | `terminal` |
| `Grep` / `Glob` | `search_files` |
| `Skill` | `skill_view` |

## 明确不用 symlink 的原因

上游 open bug **NousResearch/hermes-agent#8293**（关联 #4759）：Hermes 会把 skills 目录下的**整目录 symlink** 从 `skills_list` / `skill_view` 漏掉——symlink 目标存在，但 Hermes 枚举时不跟进。因此 Codex / reasonix 上可行的「整目录 symlink」方案在 Hermes 上会导致业务 skill 静默缺失，必须改用 `external_dirs` 指向真实目录。

该 bug 修复前，本 canonical 落法是明确规避方案，并由 lint 强制保证 `.hermes/skills/` 下无任何 symlink。

## 明确无 plugin manifest

Hermes 没有 per-plugin manifest（分发走 taps / Skills Hub），故本适配**不产出任何 plugin.json**。lint 同步校验此约束，防止错误引入无效文件。

## 校验

`kata skills audit --runtime hermes --exit-code`（脚本 `lint:skills:hermes`，已纳入 `ci`）校验与 codex/reasonix **相反**：

- `.hermes/skills/` 下**禁止任何 symlink**（`HERMES_STRAY_SYMLINK`）；
- bootstrap `using-kata-hermes/SKILL.md` 存在且含 `name` + `description` frontmatter；
- `SKILL.md` 正文**文档化 external_dirs 发现机制**（`HERMES_EXTERNAL_DIRS_UNDOCUMENTED`）；
- `references/hermes-tools.md` 存在且非空（tool mapping 非空）。

实现：`.claude/scripts/_shared/lint/hermes-skill-shape.ts`；测试：`.claude/scripts/_shared/tests/lint/hermes-skill-shape.test.ts`。

## Hermes 侧使用

配置好 `~/.hermes/config.yaml` 的 `external_dirs` 后，Hermes 即可发现 kata 全部 8 个业务 skill 与本 bootstrap，无需 symlink 或额外安装步骤。bug #8293 修复后，可评估是否迁回 symlink 落法（届时须同步更新 lint 逻辑）。
