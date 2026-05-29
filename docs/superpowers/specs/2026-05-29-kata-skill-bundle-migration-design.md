# kata Skill-Bundle 迁移 · Design Spec（engine 取消 / 一切下沉 skill）

| 项 | 内容 |
|---|---|
| 起草日期 | 2026-05-29 |
| 作者 | koco + Claude（brainstorming） |
| 状态 | Design 待用户复核 → 转 `superpowers:writing-plans` |
| 关系 | 在 `2026-05-29-kata-skill-router-simplify-design.md`（保留 engine 版）基础上**更进一步**：取消整个 engine/，所有可执行代码与测试下沉到 skill 或共享层；前一版「engine 原样保留」决定被本版取代 |
| 范围 | Claude Code runtime（`.claude/`）；全部 8 个 skill 批量迁移；engine/ 最终整体删除 |
| `.agents/` | 保持 Phase-2 占位（仅确认 `.agents/README.md` 仍准确）；本次迁移保持共享 md/代码 symlink-able，Codex 侧适配后续立项 |

## 1 Executive Summary

把 kata 从「engine 单体 + 薄 skill 入口」彻底翻转为 **skill-centric self-contained bundle** 架构：

- **engine/ 取消**。所有可执行代码搬到两处：跨 skill 共享 → `.claude/scripts/_shared/`；单 skill 专属 → `.claude/skills/<name>/scripts/`（含专属 lib 与 tests）。
- **编排 prompt 驱动**。每个 skill 的工作流编排写在 `phases/§N-<step>.md`（orchestrator 读）；多 subagent 协同的 worker/reviewer 提示词写在 `prompts/agent-<step>.md`（subagent 读）。彻底去掉 `contracts/workflows/*.yaml` 契约层。
- **contracts/ 整目录删除**。schemas 迁入共享层，跨 skill 提示词迁入 `.claude/prompt/_shared/`，workflow/blackboard/manifest 直接删。
- **共享代码集中、单一来源**。`_shared` 一处底盘，多 runtime 用 symlink 引用，避免重复与漂移。

每个 skill = 一个自包含目录：删掉目录即干净卸载该能力。这是 Anthropic skill-creator / superpowers / Microsoft skills 共同收敛的 self-contained skill bundle 形态。

## 2 设计原则（SKILL + Router 最佳实践）

| # | 原则 | 在 kata 的落点 |
|---|---|---|
| 1 | Self-contained skill bundle | 一 skill 一目录，自带 `SKILL.md` + `phases/` + `prompts/` + `scripts/` + `tests/` + `references/` + `rules/` + `fewshots/` + `templates/` |
| 2 | Progressive disclosure | `SKILL.md` 薄（≤100 行，路由入口+索引+硬规则）；phases/prompts/references 命中才加载 |
| 3 | Prompt 驱动编排，脚本做脏活 | LLM 读 phases 自然语言步骤推进；确定性工作交给 `scripts/`，被 phase 内联 `kata <cmd>` 调用 |
| 4 | Router 纯 prompt 零运行时 | `SKILL.md` frontmatter（`description`/`when_to_use`）+ CLAUDE.md 命令索引触发；无运行时调度器 |
| 5 | 共享单一来源 | 共享代码 → `scripts/_shared/`；共享提示词 → `prompt/_shared/`；多 runtime symlink 引用 |

核心信条不变：**LLM 驱动脚本，脚本不驱动 LLM**。脚本永远是被宿主模型 shell 调用的叶子进程。

## 3 目标顶层布局

```
.claude/
├── scripts/                              # 全部可执行代码新家（替代 engine/）
│   ├── _shared/                          # 跨 skill 共享代码底盘
│   │   ├── lib/                          #   source-ref·paths·env·progress·rules·schema·frontmatter·md-table·logger·types…
│   │   ├── schemas/                      #   FeatureManifest·SourceSnapshot·CoverageMatrix…（接收 contracts/schemas）
│   │   ├── plugin-runtime/               #   plugin-runner.ts + sandbox（插件执行运行时）
│   │   ├── cli/                          #   kata 命令注册中心 + 共享命令（features-*·paths-audit·skill-audit·results-*·env·handoff-render…）
│   │   └── bin/kata                      #   单一 CLI 入口（替代 engine/bin/kata）
│   └── lint/                             # 仓库级卫生守卫（check-debug-files / -runtime-artifacts / -stale-paths）
│
├── prompt/
│   └── _shared/                          # 共享提示词 md：case-qa.md + output-artifacts.md（各 skill symlink 引用）
│
├── plugins/                              # lanhu / notify / zentao 插件定义
│
├── skills/                               # 恰 8 个 skill 目录
│   ├── case-draft/                       # 自包含 bundle（试点 1）
│   │   ├── SKILL.md                      #   路由入口（≤100 行）
│   │   ├── phases/§N-<step>.md           #   工作流编排步骤（orchestrator 读，按需加载）
│   │   ├── prompts/agent-<step-name>.md  #   subagent 提示词（worker / spec-review / quality-review…）
│   │   ├── rules/  references/  fewshots/  templates/
│   │   ├── scripts/                      #   专属脚本 + 专属 lib（case-draft·archive-gen·xmind-gen·prd-frontmatter…）
│   │   └── tests/                        #   专属测试（自 engine/tests 迁入）
│   ├── playwright-automation/            # 自包含 bundle（试点 2，多 subagent 工作流）
│   │   └── …（scripts/ 含 allure-stats·agent-runner·run-tests-notify 等 playwright 专属代码）
│   ├── case-edit/  case-hotfix/  infra-diagnose/  knowledge-curate/  workspace-manage/
│   └── defect-analyze/                   # 合并 bug-file + conflict-analyze + diff-scan
│
└── rules/                                # 项目级 runtime 规则（保留）
```

**四层归属一句话**：可执行代码→`scripts/`｜共享提示词→`prompt/_shared/`｜插件定义→`plugins/`｜单 skill 自包含→`skills/<name>/`（编排在 `phases/`、subagent 提示词在 `prompts/agent-<step>.md`）。

**三个 `_shared` 划分**（互不混淆）：
- `.claude/scripts/_shared/` = 共享**代码**（lib/schemas/cli/plugin-runtime + `kata` 入口）
- `.claude/prompt/_shared/` = 共享**提示词**（case-qa.md / output-artifacts.md 等纯 md）
- 单 skill 专属一律落 `.claude/skills/<name>/` 内对应子目录

## 4 `kata` CLI 入口模型

engine 取消后命令分两处：共享命令在 `scripts/_shared/cli/`，skill 专属命令在 `skills/<name>/scripts/`。

| 模型 | 做法 | 取舍 |
|---|---|---|
| **① 单 dispatcher = 组合根（选定）** | `scripts/_shared/bin/kata` 静态注册：共享命令 + 各 skill 导出的 `scripts/cli.ts`。新增 skill = registry 加一行 import | 保留现有 `kata <noun> <verb>` UX（prompt 里 `kata features resolve` 不改）；命令代码仍在各 skill 内；底盘→skill 的 import 是组合根模式，可接受 |
| ② 直调 + kata 仅共享 | skill 专属 `bun .claude/skills/<name>/scripts/x.ts` 直调；`kata` 只管共享 | skill 完全解耦，但破坏 `kata case-draft …` UX，prompt/CLAUDE.md 命令示例大改 |
| ③ glob 自动发现 | dispatcher 启动扫描 `skills/*/scripts/cli.ts` 动态注册 | UX+解耦兼得，但加运行时 glob+动态 import，违背克制原则 |

**选定 ①**：单一 `kata` dispatcher 作组合根，一个显式 registry 文件列出共享命令 + 各 skill 命令模块。保 UX、保 skill 内聚、无 glob 魔法。skill 专属脚本仍可被 `bun .claude/skills/<name>/scripts/<x>.ts` 直调（phases 可二选一）。

## 5 phases vs prompts：两类载体语义

| 文件 | 谁读 | 内容 | 命名 |
|---|---|---|---|
| `phases/§N-<step>.md` | **orchestrator**（skill 主 agent） | Goal / Inputs / Steps（内联 `kata <cmd>` 或「派发 subagent」）/ Outputs / Hard rules / Failure modes | `§N-<step>.md` 有序；无序流程用 `<topic>.md` |
| `prompts/agent-<step-name>.md` | **subagent**（被派发的 worker/reviewer） | 输入字段白名单、写入范围、status envelope、证据分层、BlockedEnvelope | `agent-<step-name>.md` |

**协同关系**：phase 的 Steps 写「在此步派发 subagent，加载 `prompts/agent-<step>.md`」；orchestrator 负责 TodoWrite 编排 + 二阶段 review（spec-review→quality-review），subagent 负责干活回传 envelope。多 subagent 协同的工作流（playwright-automation）= phases 串编排 + 每步对应一个或多个 agent-prompt。

phase 文件模板：

```markdown
# §N <Phase Name>
## Goal — 本 phase 要达到的状态
## Inputs — 读取的产物 / 上一步输出
## Steps — 1. 动作 + 调用的 `kata <cmd>` / 派发的 prompts/agent-<step>.md + 验证
## Outputs — 写入的产物（必填 / 可选）
## Hard rules — 可校验项
## Failure modes & recovery — <failure>:<recovery / 阻塞模板>
```

## 6 SKILL.md 角色变化（去 workflow.yaml）

- 现状：SKILL.md「路由摘要」指向 `contracts/workflows/<skill>.yaml` 作唯一规范源 → contracts 删除后**改指 `phases/` 索引表**。
- SKILL.md 保持薄（≤100 行）：路由摘要 + 触发/不触发 + Phase 索引表（含「触发的脚本」列）+ 按需加载协议表（指向 phases / prompts / rules / references / fewshots）+ 硬规则。
- 「按需加载协议」表的 `references/*-prompt.md` 行改指 `prompts/agent-*.md`。

**当前→新载体映射（代表性，逐文件精确映射留 plan）**：
- case-draft：`references/worker-prompt.md`→`prompts/agent-case-draft.md`；`spec-reviewer-prompt.md`→`prompts/agent-spec-review.md`；`quality-reviewer-prompt.md`→`prompts/agent-quality-review.md`；`rules/naming-convention.md` 留 `rules/`；`references/fewshots/*`→`fewshots/`
- playwright-automation：`references/{case-normalize,env-preflight,ui-plan,ui-probe,plan-reconcile,playwright-generate,self-run,run-triage,repair-loop,quality-gate,handoff}.md` → 11 个 `phases/§N-*.md`；`references/{worker,spec-reviewer,quality-reviewer}-prompt.md`+`execution-protocol.md`→`prompts/agent-*.md`；`cli-essentials.md` 等纯参考留 `references/`

## 7 contracts/ 拆解（整目录删除）

| contracts 内容 | 去向 |
|---|---|
| `contracts/schemas/*`（FeatureManifest/SourceSnapshot/CoverageMatrix/CaseCorrections/PlaywrightAutomationHandoff…） | `.claude/scripts/_shared/schemas/` |
| `contracts/output-artifacts.md` | `.claude/prompt/_shared/`（case-draft + case-edit + case-qa.md 共用，已确认） |
| `contracts/workflows/*.yaml`（8 份） | **删除**（编排迁入各 skill `phases/`） |
| `contracts/blackboard/*`、`contracts/schemas/blackboard-*.json` | **删除**（无 blackboard 状态机；产物文件即状态） |
| `contracts/skill-manifest.yaml` | **删除**（消费者随 MCP/workflow 删除而消失，详见 §8 build/lint） |

## 8 构建 / 测试 / 薄 lint

### 8.1 构建配置（tsconfig / package.json）

- **依赖迁移**：`engine/package.json` deps（ajv·commander·gray-matter·handlebars·pinyin-pro·yaml）并入根 `package.json`；engine 删除时移除 workspace 成员。
- **路径别名**：skill `scripts/` import 共享层用 tsconfig `paths` 别名 `@shared/* → .claude/scripts/_shared/*`，避免 `../../../` 噪音。
- **CLI 入口**：根 `package.json` `bin`/scripts 指向 `.claude/scripts/_shared/bin/kata`。
- **biome lint surface**：`lint` script 从 `engine/src engine/tests` 改为 `.claude/scripts .claude/skills`。
- **type-check**：根 `tsconfig` include 增加 `.claude/scripts/** .claude/skills/**/scripts/** .claude/skills/**/tests/**`；engine 删除前两套并存。

### 8.2 测试迁移

- skill 专属测试 → `skills/<name>/tests/`；共享模块测试 → `scripts/_shared/lib/__tests__/`（或 `scripts/_shared/tests/`）。
- `test` script 从 `bun test --cwd engine` 改为覆盖 `.claude/scripts` + `.claude/skills/**/tests`；渐进期两处都跑。
- 改后即测铁律不变：每步迁移后跑受影响测试，merge 前 `bun test` 全绿。
- case-draft `hard_rules` 若改动，同步更新 hardrules-regression 基线（COUNT + SHA）。

### 8.3 薄 lint（重写 `check:skills`）

contracts 删除后 `kata skills sync-check` 重写为**文件级结构校验**：
1. 命名一致：skill 目录名 == `SKILL.md` frontmatter `name` == CLAUDE.md 命令索引（三处对齐）
2. Phase 完整：`SKILL.md` Phase 索引列的每个 `phases/§N-*.md` 真实存在
3. prompts 命名：`prompts/` 下文件符合 `agent-<step>.md` 格式
4. frontmatter 白名单字段（name/description/when_to_use/user-invocable/model/effort/context/agent/paths/argument-hint/allowed-tools/disable-model-invocation）
5. 长度上限：SKILL.md≤100 / phase≤150 / reference≤200 / rule≤80 / fewshot≤100 / prompt≤200

删 manifest check / manifest↔workflow consistency / workflow check；保留 runtime sync（`.claude` ↔ `.agents`）与 runtime detach 检查。

## 9 迁移序列（全 8 skill，最终删 engine）

case-draft 与 playwright-automation 先行作试点，验证 bundle 模式与多 subagent 工作流模式后，再批量迁其余 skill。

| # | Commit | 内容 |
|---|---|---|
| 1 | `refactor: ✨ stand up _shared chassis` | 建 `scripts/_shared/{lib,schemas,cli,plugin-runtime,bin}`，迁共享代码，切 `kata` 入口；engine 与 _shared 并存过渡 |
| 2 | `refactor: ✨ dissolve contracts` | schemas→`_shared/schemas`，`contracts/output-artifacts.md` 与现有 `skills/_shared/case-qa.md`→`prompt/_shared/`（各 skill 改 symlink 引用），删 workflow/blackboard/manifest |
| 3 | `refactor: ✨ relocate plugins + repo lint` | `plugins/`→`.claude/plugins`，`scripts/lint/`→`.claude/scripts/lint`，更新 `package.json` 引用 |
| 4 | `feat: 🧩 rewrite thin skill lint + build config` | 薄 lint（§8.3）+ tsconfig alias + biome/test surface + 相关测试 |
| 5 | `refactor: ✨ migrate case-draft into bundle` | scripts+tests+templates+phases+prompts 进 skill；SKILL.md 改 Phase 索引；实跑验证产物等价（archive/xmind/metadata/manifest） |
| 6 | `refactor: ✨ migrate playwright-automation into bundle` | references→11 个 phases 拆分 + prompts；专属 lib（allure-stats/agent-runner/run-tests-notify…）进 skill；实跑验证 full.spec 通过 |
| 7 | `refactor: ✨ migrate remaining skills into bundles` | case-edit / case-hotfix / infra-diagnose / knowledge-curate / workspace-manage 逐个迁移（每 skill 一 sub-commit） |
| 8 | `refactor: ✨ merge defect-analyze` | 合并 bug-file + conflict-analyze + diff-scan：4 phases（intake/classify/analyze/emit）+ mode 分支（bug/diff→defect-report.md；conflict→conflict-resolution-plan.md 含 side_a/side_b） |
| 9 | `refactor: ✨ delete engine and finalize chassis` | 确认 engine/ 已无 skill 依赖后整体删除；移除根 `package.json` workspaces 的 engine 成员；依赖收尾 |
| 10 | `docs: 📝 sync entry docs` | CLAUDE.md / AGENTS.md / routing-guard 命令索引 = 8 skill + 新路径示例 |

每步遵循项目 worktree-first 流程，改后即测，merge 前 `bun test` 最终确认。`.agents/` 本次保持 Phase-2 占位（仅确认 README 仍准确），迁移保持共享 md/代码 symlink-able。

## 10 验收标准

| 标准 | 测量 |
|---|---|
| engine 删净 | `test ! -d engine`；根 `package.json` workspaces 不含 engine |
| contracts 删净 | `.claude/contracts/` 不存在；`grep -r workflow.yaml .claude` 空 |
| chassis 就位 | `.claude/scripts/_shared/{lib,schemas,cli,bin}` 存在；`kata features resolve` 可用 |
| skill 数 = 8 | `ls .claude/skills/` 恰 8 目录（无 _shared 残留，已移至 prompt/） |
| skill 自包含 | 各 skill `scripts/tests/phases/prompts` 齐全；试点二 skill 实跑产物与迁移前等价 |
| defect-analyze | bug/diff 产 `defect-report.md`；conflict 产 `conflict-resolution-plan.md` 且含 side_a/side_b；原三 skill 目录消失 |
| 共享提示词 | `case-qa.md`+`output-artifacts.md` 在 `prompt/_shared/`，各 skill symlink 引用 |
| 测试/lint | `bun test` 全绿；`bun run check:skills` exit 0；故意命名漂移/缺 phase → 报错 |
| 入口文档 | CLAUDE.md / AGENTS.md / routing-guard 命令索引/路径 = 8 skill + 新结构 |

## 11 风险

1. **import 路径大面积改动**：engine→`_shared` 迁移触及全部 import → 用 codemod 批量改 + tsconfig `@shared/*` alias 收敛；分 commit 小步迁，每步 type-check。
2. **共享 vs skill-专属 lib 误判**：先跑真实 import 依赖图分类，再决定每个 lib 模块去 `_shared` 还是某 skill；误判会造成跨 skill import 耦合。
3. **行为等价性**：phase 迁移可能漏 workflow.yaml 的 failure_modes / 人工确认节点 → 逐 step 对照，试点二 skill 实跑核对产物（archive/xmind/handoff/report）。
4. **defect-analyze 合并**：三 skill 原硬规则（尤其 conflict 的 dual-intent）必须 1:1 保留再调 phase。
5. **CLI 组合根耦合**：dispatcher import 各 skill 命令模块 → skill 删除时需同步删 registry 行（薄 lint 第 1 项可扩展校验）。
6. **engine 删除时机**：必须确认全部 8 skill 迁完且 `bun test` 全绿后才执行 commit 9，避免删早导致引用悬空。

## 12 Out of Scope

- `.agents/` Codex runtime 实际适配（保持 Phase-2 占位；本次仅保持 symlink-able）。
- event journal / 审计可回放、blackboard 状态机、per-phase model enforcement（明确不做）。
- engine 命令的功能性重构 / 重命名（本次只搬不改逻辑，保行为等价）。
- lt-dq 岚图整改等其它独立 initiative。
- plugin SDK v2 / capability 强制（保持现状）。

