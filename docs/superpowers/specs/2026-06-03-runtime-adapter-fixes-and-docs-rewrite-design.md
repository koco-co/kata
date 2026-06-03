# 多 runtime 适配修正 + 文档去花里胡哨重写 — 设计

- 日期：2026-06-03
- 状态：设计已批准，待转 implementation plan
- 触发：用户要求（1）核实 codex / reasonix / hermes 三套 skill 适配是否真适配到各 runtime 官方体系、symlink 是否官方支持；（2）更新已陈旧的文档（README\*.md 等旧产物结构）。

## 1. 背景与触发

kata 的 8 个业务 skill 单一存放于 `.claude/skills/<name>`，并通过三套适配目录暴露给其它 agent runtime：

- `.agents/`（OpenAI Codex）+ `.codex-plugin/plugin.json`
- `.reasonix/`（自称 DeepSeek Agent）+ `.reasonix-plugin/plugin.json`
- `.hermes/`（自称 Hermes Agent），无 plugin manifest

codex 适配是 `2026-06-02` 的正式 `feat` 提交，附依据文档 `docs/skills/2026-06-02-codex-native-skill-adaptation.md`。reasonix / hermes 适配是 `2026-06-03` 被一笔 `chore: save pre-worktree local changes` 顺手扫入，**无依据文档、未进 CI/audit**，结构是把 codex 那套换名复制。

用户怀疑后两者是「凭推断发明格式」（与既有经验记忆一致）。本设计先用对抗性 web 调研核实，再据实修正。

## 2. 调研结论（一手来源）

对抗性验证（research → 反向 refute）结论：**三个 runtime 全部真实存在且有官方 skill 体系**，但 kata 各适配的正确程度不同。

| Runtime | 真实性 | symlink 发现 | plugin manifest | 工具映射 | 判定 |
| --- | --- | --- | --- | --- | --- |
| **Codex** | ✅ OpenAI 官方 | ✅ 官方明确「follows the symlink target」 | ✅ `.codex-plugin/plugin.json` 是真官方格式，kata 字段吻合 | ✅ `spawn_agent`/`wait_agent`/`update_plan` 全对 | 正确，仅 1 处陈旧 |
| **Reasonix** | ✅ `esengine/DeepSeek-Reasonix`，DeepSeek 官方文档收录的社区集成 | ✅ `internal/skill/skill.go` 实证支持，ConventionDirs 含 `.reasonix`/`.agents`/`.claude` | ❌ reasonix 无 JSON manifest（plugins 是 `reasonix.toml` 的 `[[plugins]]` MCP server）；kata 的 `.reasonix-plugin/plugin.json` 是从 codex/claude 换名复制 | ❌ 映射全错：reasonix **原生支持 subagent**（`runAs: subagent`）+ 内置 `todo_write` + `ask`，kata 却写「不支持子代理、降级顺序、无 TodoWrite」 | 保留适配，修正 2 处捏造 |
| **Hermes** | ✅ `NousResearch/hermes-agent`，官方文档站 | ❌ **symlink 目录被发现机制漏掉**（官方 OPEN bug #8293 + #4759；Python rglob 不跟随目录 symlink） | ✅ kata 正确地未建 manifest（Hermes 本就没有） | ✅ 8 个工具名逐字命中官方 `tools-reference` | symlink 机制在 Hermes 上不工作，改用 external_dirs |

关键来源：

- Codex：`developers.openai.com/codex/skills`（symlink 官方支持）、`/codex/plugins/build`（plugin.json 真格式）、`/codex/config-reference`（`[features].multi_agent` 现「stable; on by default」）。
- Reasonix：仓库 `internal/skill/skill.go`、`internal/tool/builtin/todo.go`、`docs/SPEC.md §3.3`、`api-docs.deepseek.com` agent integrations。
- Hermes：官方 `website/docs/reference/tools-reference.md`（8 工具）、`website/docs/user-guide/features/skills.md`（`~/.hermes/skills/` + `config.yaml` `skills.external_dirs`）、open issue #8293 / #4759。

并行核实出的「文档花里胡哨」事实：README 宣称的 **skill graph / workflow 子系统 / blackboard / runtime `contracts/**`** 在真实代码里**零实现**（grep 全空，`.claude/contracts/` 不存在）；`check:skills` 实查的是 `skill sync + detach + structure`，而非 README 写的 route/graph/workflow 契约。

## 3. 目标 / 非目标

**目标**

- 让 reasonix / hermes 适配与各自 runtime 的**官方真实机制**一致（删捏造、修映射、换发现机制）。
- 三个 runtime 适配都纳入 `kata skills audit` + CI 守护，与 codex 对齐。
- README\*.md 改为如实描述 kata 的真实架构，删除虚构子系统叙事；修正陈旧路径与目录。
- 给 reasonix / hermes 各补一份对齐 codex 的依据文档；codex 文档补 multi_agent 注记。
- 旁支文档（CONTRIBUTING.md、3 个 plugin README）对齐真实结构。

**非目标**

- 不改 8 个业务 skill 的正文（跨 runtime 共用，靠映射翻译）。
- 不清理审计报告里其它无关死代码（A/B/C/D 类）——本次只做与「多 runtime + 文档」直接相关项。
- 不真去 reasonix / hermes 运行时端到端跑通（无本地环境）；正确性以官方源码/文档/issue 为据，并在交付说明里写清未实跑范围。

## 4. 工作流 A — Reasonix 修正

**A1 删捏造的 plugin manifest**

- 删除整个 `.reasonix-plugin/` 目录（`.reasonix-plugin/plugin.json`）。reasonix 不读 JSON manifest；其 plugin 是 `reasonix.toml` 的 `[[plugins]]` MCP server 声明，skill 纯靠目录扫描发现。

**A2 重写工具映射 `references/reasonix-tools.md`**

当前表全错。改为（依 reasonix 内置工具）：

| skill 正文 | reasonix 等价 |
| --- | --- |
| `Task`（派子代理） | `task` 内置工具 / 子代理 skill（`runAs: subagent`，可配 `subagent_model`） |
| 并行多个 `Task` | 多个 `task`，原生支持，不降级 |
| `TodoWrite` | `todo_write` 内置工具 |
| `AskUserQuestion` | `ask` 内置工具（结构化提问，列候选项 + 推荐项） |
| `Read`/`Write`/`Edit` | 原生文件工具 |
| `Bash` | 原生 shell |
| `Grep`/`Glob` | 原生搜索 |
| `Skill` | 原生加载 |

删除「子代理降级策略」整节，替换为「reasonix 原生支持子代理（`runAs: subagent`）与 `todo_write`，子代理工作流保持结构不降级」。

**A3 重写 `using-kata-reasonix/SKILL.md`**

- 删去「## 4. 子代理降级策略」节及 description / 正文里的「不支持子代理」「顺序执行」「markdown checklist 替代 TodoWrite」措辞。
- 工具要点段改为 A2 的真实映射。
- 路由表保留不变。

**A4 重写 lint `reasonix-skill-shape.ts` + 测试**

- 删除 `checkPluginManifest` 及规则 `REASONIX_PLUGIN_MANIFEST_MISSING` / `REASONIX_PLUGIN_MANIFEST_INVALID`，并从 JSDoc 去掉「plugin manifest is valid」。
- **保留** symlink 树校验（reasonix `skill.go` 官方支持 symlink，ConventionDirs 含 `.reasonix`，故 `.reasonix/skills/<name>` symlink 是正确形态）。
- 同步更新 `tests/lint/reasonix-skill-shape.test.ts`：删 plugin-manifest 相关用例，确保「无 `.reasonix-plugin/` 也通过」。

## 5. 工作流 B — Hermes 修正（symlink → external_dirs）

Hermes 的 symlink 目录会被官方 bug #8293 从 `skills_list` / `skill_view` 漏掉，故弃用 symlink，改用官方 `external_dirs` 直接扫真实目录。

**B1 移除业务 skill symlink**

- 删除 `.hermes/skills/` 下 8 个业务 skill symlink（case-draft、case-edit、case-hotfix、defect-analyze、infra-diagnose、knowledge-curate、playwright-automation、workspace-manage）与 `_shared` symlink。
- **保留** `.hermes/skills/using-kata-hermes/`（真实目录，含 SKILL.md + references）。

**B2 发现机制改为 external_dirs**

- Hermes 用户在 `~/.hermes/config.yaml` 的 `skills.external_dirs` 增加两条真实目录：
  - `<repo>/.claude/skills`（8 个业务 skill 真实目录，`_shared` 因 `_` 前缀被 Hermes 自动忽略）
  - `<repo>/.hermes/skills`（取 `using-kata-hermes` bootstrap）
- 配置写法支持 `~` 与 `${VAR}`。

**B3 重写 `using-kata-hermes/SKILL.md`**

- description / 正文删「整目录 symlink」叙事，改为「业务 skill 真实存放于 `.claude/skills/`，由 Hermes `external_dirs` 直接发现；symlink 因官方 #8293 不可用」。
- 新增「## 发现机制（external_dirs）」节，给出 `config.yaml` 配置样例。
- 工具映射要点 + 路由表保留（工具映射已全对）。

**B4 工具映射 `references/hermes-tools.md`**

- 工具表已全部正确（`delegate_task`/`todo`/`read_file`/`write_file`/`patch`/`terminal`/`search_files`/`skill_view`），**不改表**。
- 仅在文件末尾补一句指引：发现机制见 SKILL.md 的 external_dirs 节。

**B5 重写 lint `hermes-skill-shape.ts` + 测试**

- 反转 symlink 断言：业务 skill **不得**作为 symlink 出现在 `.hermes/skills/`（避免 #8293 陷阱）；规则更名（如 `HERMES_STRAY_SYMLINK`）。
- 保留 bootstrap（`using-kata-hermes/SKILL.md` 含 name+description）+ `hermes-tools.md` 非空校验。
- 新增校验：bootstrap SKILL.md 引用 `external_dirs`（确保发现机制有文档）。
- 同步更新 `tests/lint/hermes-skill-shape.test.ts`：删 symlink-required 用例，加「symlink 存在即违规」「external_dirs 文档缺失即违规」用例。

## 6. 工作流 C — Codex 微调

- `codex-tools.md` 的「子代理需要 multi-agent 支持」节补注：`[features].multi_agent` 现已「stable; on by default」（`developers.openai.com/codex/config-reference`），当前 stable Codex 上该 flag 非强制；为兼容旧版仍保留开启说明。
- `docs/skills/2026-06-02-codex-native-skill-adaptation.md` 补一句 multi_agent 默认开启注记。
- 其余 codex 适配（symlink 树、`.codex-plugin/plugin.json`、`codex-skill-shape.ts`）已验证正确，**不动**。

## 7. 工作流 D — audit + CI 接线

**D1 `skill-audit.ts` 扩 runtime 分支**

- `--runtime` 文案 `claude | codex` → `claude | codex | reasonix | hermes`。
- 新增分支：`opts.runtime === "reasonix"` → `lintReasonixSkillTree` + `formatReasonixSkillReport`；`opts.runtime === "hermes"` → `lintHermesSkillTree` + `formatHermesSkillReport`（与现有 codex 分支同构）。

**D2 `package.json` 脚本 + CI**

- 加 `"lint:skills:reasonix": "kata skills audit --runtime reasonix --exit-code"`。
- 加 `"lint:skills:hermes": "kata skills audit --runtime hermes --exit-code"`。
- `ci` 链在 `lint:skills:codex` 后补 `lint:skills:reasonix` 与 `lint:skills:hermes`。

## 8. 工作流 E — README 大改（去花里胡哨）

对 `README.md` 与 `README-EN.md` 双语同步：

**E1 tagline / 概览**

- 去掉「SKILL + Router + Graph + Workflow + Blackboard 驱动」表述。
- 改为如实描述：基于 Claude Code Skills 的可审计 QA 工作流编排，附 `.claude/scripts/_shared/**` CLI/校验底盘与多 runtime 适配。

**E2 架构段**

- 删除 skill graph / workflow 子系统 / blackboard / runtime `contracts/**` 等虚构子系统。
- 按真实结构重写：8 个 product skill + prompt 级路由表（`CLAUDE.md`）+ `.claude/scripts/_shared/**`（lib / schemas / lint / cli / plugin-runtime）+ `.claude/plugins/`（lanhu / zentao / notify）+ 多 runtime 适配（`.agents` / `.reasonix` / `.hermes`）+ `workspace/{project}/` 产物区。

**E3 目录树修正**

- `plugins/` → `.claude/plugins/`。
- 删除根级 `templates/`（仓库不存在）。
- `.kata/repos` 统一写作 `workspace/{project}/.kata/repos/`（修 README-EN 内部 `.kata/repos/{project}` 不一致）。

**E4 开发与验证段**

- `check:skills` 实查改为 `skill sync + detach + structure`（删 route/graph/workflow 措辞）。

**E5 新增「多 runtime 支持」小节**

- Codex：✅ 官方 skills 体系，`.agents/skills/` symlink + `.codex-plugin/plugin.json`。
- Reasonix：✅ 官方目录扫描，`.reasonix/skills/` symlink（修正后）。
- Hermes：⚠️ 官方 skills 体系，但需用 `external_dirs` 指真实目录（symlink 受阻于上游 #8293）。

## 9. 工作流 F — 依据文档 + 旁支对齐

**F1 依据文档**

- 新增 `docs/skills/2026-06-03-reasonix-native-skill-adaptation.md`：对齐 codex 那份，写明 reasonix 真实 skill 机制（`skill.go` 目录扫描、ConventionDirs、symlink 支持、`task`/`todo_write`/`ask`、plugins=`reasonix.toml [[plugins]]`），引用一手来源，并记「明确废弃：`.reasonix-plugin/plugin.json`」。
- 新增 `docs/skills/2026-06-03-hermes-native-skill-adaptation.md`：写明 Hermes 真实机制（`~/.hermes/skills/` + `external_dirs`、8 工具、progressive disclosure），并记「symlink 受阻于 #8293，故用 external_dirs」。

**F2 旁支文档**

- `CONTRIBUTING.md`：`bun run --cwd engine type-check` / `bun test --cwd engine` → `bun run type-check` / `bun test`（`engine/` 包已删）；commit 约定补全 type/emoji 映射与「标题行英文」规则，与 `.claude/rules/project-workflow-rules.md` 对齐。
- 3 个 plugin README（`.claude/plugins/{lanhu,notify,zentao}/README.md`）：`plugins/xxx/yyy.ts` → `.claude/plugins/xxx/yyy.ts`（lanhu/zentao 的 `bun run plugins/.../fetch.ts` 用法行等）。

## 10. 受影响文件清单

**删除**

- `.reasonix-plugin/plugin.json`（及空目录 `.reasonix-plugin/`）
- `.hermes/skills/{8 业务 skill + _shared}` symlink

**新增**

- `docs/skills/2026-06-03-reasonix-native-skill-adaptation.md`
- `docs/skills/2026-06-03-hermes-native-skill-adaptation.md`

**修改**

- `.reasonix/skills/using-kata-reasonix/SKILL.md` + `references/reasonix-tools.md`
- `.hermes/skills/using-kata-hermes/SKILL.md`（+ `references/hermes-tools.md` 末尾补一句）
- `.agents/skills/using-kata-codex/references/codex-tools.md` + `docs/skills/2026-06-02-codex-native-skill-adaptation.md`
- `.claude/scripts/_shared/lint/reasonix-skill-shape.ts` + `tests/lint/reasonix-skill-shape.test.ts`
- `.claude/scripts/_shared/lint/hermes-skill-shape.ts` + `tests/lint/hermes-skill-shape.test.ts`
- `.claude/scripts/_shared/cli/skill-audit.ts`
- `package.json`
- `README.md`、`README-EN.md`
- `CONTRIBUTING.md`
- `.claude/plugins/{lanhu,notify,zentao}/README.md`

## 11. 验证门

每个任务改后即测；合并前再跑全量：

```
bun test                                   # 含三个 *-skill-shape 测试，须 0 fail
bun run check                              # biome（与本地基线一致：0 error）
bun run check:skills                       # skill sync + detach + structure
bun run lint:skills:codex                  # 既有
bun run lint:skills:reasonix               # 新增，须 pass
bun run lint:skills:hermes                 # 新增，须 pass
bun run type-check                         # 与 ~202 预存错误基线比对：无新增
```

文档改动（README/CONTRIBUTING/plugin README）属 `*.md`，但其中的命令/路径示例须手工核对真实可达。

## 12. 执行方式

- **Worktree-first**：主树当前 clean → `git worktree add --detach .worktrees/<新 slug> main`（**新 slug**；绝不复用 `.worktrees/zentao-fetch-enrich`，该 worktree 有并行会话在改）→ symlink `.kata` 子路径（只读证据）→ 分批 commit → 记 HEAD SHA → 回主树 `git merge --no-ff <sha>` → 重验 → `git push origin main` → `git worktree remove`。
- **多任务**：走 `superpowers:subagent-driven-development`，每任务 implementer → spec review → quality review；按工作流 A–F 切任务，每任务跑相关测试 + `bun run check`。
- Commit 遵循 `type: emoji description`（英文标题行）；多 runtime 文件改动用 `fix`/`refactor`/`docs` 对应 emoji。

## 13. 风险与注意

- **未实跑风险**：reasonix / hermes 无本地运行环境，正确性以官方源码/文档/issue 为据。external_dirs 与工具映射的端到端验证留作未验证范围，交付说明须写清。
- **#8293 时效**：Hermes external_dirs 方案规避的是当前 open bug；若上游修复 symlink，可回到 symlink，但 external_dirs 始终有效，无需回退。
- **codex multi_agent 漂移**：仅文档注记，不改 flag 行为；保留旧版兼容说明，避免误导仍在旧版 Codex 的用户。
- **lint 反转的回归面**：hermes lint 从「要求 symlink」反转为「禁止 symlink」，须确认仓库内确无残留 symlink 触发新规则误报（B1 删除后核验）。

