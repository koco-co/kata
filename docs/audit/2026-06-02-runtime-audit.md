# kata 运行时存在价值审计（2026-06-02）

> 逐文件/目录/脚本拷问七问：① 真有用吗 ② 该优化吗 ③ 该合并吗 ④ 目录有用吗 ⑤ 有无更好处理方式 ⑥ 每个脚本有用吗 ⑦ 是否融入 SKILL 触发的工作流。

## 方法与范围

- **范围**：`.claude/` 运行时（622 个跟踪文件）+ 根级配置/文档/`lib/`。**不含** `workspace/`（935 个生成的 QA 产物 + 只读源仓库证据，按项目规则属产物/证据，不审存在价值）。
- **方法**：11 个审计区并行逐文件 grep 核验 → 对每条「删除/合并」结论派对抗性 skeptic 尝试反驳 → 部分 skeptic 输出失败的，由主审计手动 `git grep` 补核。
- **「融入 SKILL 工作流」判定**：脚本是否被某 SKILL.md/references/rules 直接路径引用、或经 `kata <子命令>` 调用、或被 `package.json` 的 ci/check/lint、或被 `.claude/hooks` 触发。`kata` CLI 是脚本与 SKILL 的唯一集成接口。

## 一句话结论

整体运行时**健康**：核心库（约 18 个 lib 模块）、CLI 产物链、测试（1346 pass/1 skip/0 fail）、Codex symlink 适配层都真实在用。问题**高度集中**在三类历史遗留：**(1) engine→\_shared 迁移后从未重新接线的孤儿 CLI 命令与 lib 模块**；**(2) 整个上游 `lanhu-mcp` 仓库被 vendored 进来的 ~20 个打包噪声文件**；**(3) 设计了但从未接线的子系统（plugin sandbox、agent runtime/policy 契约层、orchestrator 残骸）**。清理这三类可移除约 60+ 文件/4500+ 行死代码，且风险低。

## 数字总览

| 区 | 结论数 | KEEP | OPTIMIZE | MERGE | DELETE | RESTRUCTURE |
|---|---|---|---|---|---|---|
| root-config | 17 | 15 | 1 | 0 | 1 | 0 |
| cli-subcommands | 25 | 10 | 5 | 0 | 10 | 0 |
| lib-modules | 20 | 7 | 5 | 0 | 7 | 1 |
| tests | 9 | 7 | 0 | 1 | 0 | 1 |
| lint-schemas-runtime | 14 | 4 | 3 | 0 | 6 | 1 |
| skills | 19 | 11 | 6 | 1 | 1 | 0 |
| plugins | 27 | 10 | 9 | 0 | 7 | 1 |
| packages-dtstack | 12 | 6 | 3 | 0 | 3 | 0 |
| rules-hooks-prompt | 16 | 11 | 1 | 1 | 3 | 0 |
| codex-agents | 7 | 7 | 0 | 0 | 0 | 0 |
| docs-assets-lib | 13 | 9 | 2 | 0 | 1 | 1 |
| **合计** | **179** | **97** | **35** | **4** | **39** | **5** |

> 42 条「删除/合并」中，**3 条经核验为误报（务必保留）**，其余按置信度与所需配套改动分级见下。

---

## ⚠️ 误报纠正：以下结论错误，务必保留

对抗复核 + 手动核验推翻了 3 条删除结论。这正是「审计有真实误报率、删除前必须独立核验」的证据：

| 目标 | 审计原结论 | 实际 | 证据 |
|---|---|---|---|
| `packages/dtstack/src/core/platform/script.ts` | DELETE | **活代码，删会断编译** | `batch.ts:2` import `BatchScriptRunner`；`executeDDL` 内部把 INSERT/DROP 委派给 `scriptRunner.executeSync`；链路达 `exec-sql`/`precond-setup`/CLI。审计 grep 错了符号名（找 `ScriptApi`，实际是 `BatchScriptRunner`），且只看 `executeDDL` 调用点没读方法体。 |
| `cli/safety-audit-command.ts` | DELETE | **有 CI 测试，删会让 CI 红** | `tests/cli/safety-audit-command.test.ts`（10 用例）spawn 真实 `kata safety audit-command` 端到端跑，经 `bun test`（在 ci 链）执行。功能上确与 `pre-bash-guard.ts` 重复，但属「需带测试一起处理」的重构，非快删。 |
| `cli/cases-e2e.ts` | DELETE | **接入活跃命令树，边界情形** | 经 `cases-lint.ts:4` 静态 import + `:181` `registerCasesE2e(cases)` 注册成 `kata cases e2e`，与 `cases compare/verify` 平级。虽无外部调用方（e2e 测试直接 import 绕过 CLI），但删它要改 live 命令树。**倾向保留**，除非做一轮刻意的 CLI 表面收敛。 |

---

## A 类 · 高置信「真死代码」可删（零外部引用，风险低）

以下均经 skeptic 高置信确认或本人 `git grep` 补核——全仓零生产引用、零外部调用、零 SKILL/CI/hook 触及。删除时需同步删除「随附测试」（否则测试找不到模块会红）。

### A1 · plugin sandbox 子系统（整座未接线孤岛，约 666 行）
真实插件加载入口 `cli/plugin-loader.ts` 走 `loadAllPlugins`，**完全绕过 sandbox**。整链零生产消费：
- `plugin-runtime/plugin-runner.ts`（零引用）
- `plugin-runtime/sandbox/entry-template.ts`（零引用）
- `plugin-runtime/sandbox/runner.ts`（仅自身测试）
- `plugin-runtime/sandbox/secret-injector.ts`（仅被 runner.ts，runner 本身死）
- `plugin-runtime/sandbox/capability-spec.ts`（仅被 runner.ts + `lib/policy/plugin-sandbox-policy.ts`，后者亦零消费）
- `lib/policy/plugin-sandbox-policy.ts`（**跨区同死链**，零引用、连测试都没有）
- 随附：`tests/plugins/sandbox-runner.test.ts`
- **决策项**：A=直接整组删；B=若 sandbox 是冻结路线图，加 `README` 标注「未接线/roadmap」并建任务把 `runInSandbox` 接进 plugin-loader。证据强烈倾向 A。

### A2 · agent runtime / policy 契约层（仅单元测试 import，无任何生产/CLI/skill 入口）
- `lib/runners/agent-runner.ts`（+ test）
- `lib/policy/schema-guard.ts`（仅被 agent-runner〔死〕+ test）
- `lib/policy/content-lint.ts`（仅 test；还导出 3 个零引用别名）
- `lib/policy/write-policy.ts`（仅 test；实际拦截逻辑在 `hooks/pre-edit-guard.ts` 自带，不 import 它）
- `lib/config/runtime-config.ts`（仅 test）
- `lib/telemetry/runtime-telemetry.ts`（仅 test）
- 删除时同步删对应 `tests/{runners,policy,config,telemetry}/*.test.ts`

### A3 · 退役 orchestrator 设计残骸（零引用）
- `lib/orchestrator-types.ts`、`lib/model-tiers.ts`、`lib/quality-layers.ts`、`lib/hooks.ts`、`lib/state.ts`
- `lib/dispatch-guide.md`、`lib/gate-guide.md`（lib 目录里放 .md 本身反常；描述的 subagent 派发/gate 架构从未落地，全仓零引用）
- ⚠️ **核验补充**：`lib/types.ts:49` 自带**独立**的 `export interface WorkflowState`（不 import state.ts），删 state.ts 安全；但需同步更新 `tests/dead-code-cleanup.test.ts` 中针对 `lib/state` 的断言。

### A4 · 被替代/孤儿 lib 模块
- `lib/env-schema.ts`（仅 test；已被 `cli/env-check.ts` 读 yaml schema 取代）+ 其 test
- `lib/test-case.ts`（`countCasesInModules` 已被 `cli/archive-gen.ts` 内联同名函数取代，lib 版零引用、无 test）

### A5 · 孤儿 schema 与 loader
- `schemas/SourceSnapshot.v1.schema.json` + `loaders.ts:26` 的 `loadSourceSnapshotValidator`（`$id` `SourceSnapshot@1` 零 `$ref`；真实快照校验全走 `FeatureSourceSnapshot@1`）
- 顺带：`loaders.ts:25` `loadSourceRefRegistryValidator` 导出仅 test 引用，生产无消费（schema 文件本身保留，仅删冗余导出）

### A6 · notify 孤儿 hook
- `plugins/notify/detect-events.ts`（自述「Stop hook」但 `settings.json` 无 Stop 接线，仅自身测试引用）+ `__tests__/detect-events.test.ts`

### A7 · packages/dtstack 调试遗留 fixture（实测删后仍 70 pass）
- `packages/dtstack/test-precond.yaml`、`__tests__/precond-tables-creates-only.yaml`、`__tests__/precond-tables-demo.yaml`（三个 yaml 无人加载，测试自建临时 fixture）

### A8 · 孤儿配置/图
- `playwright.selftest.config.ts`（根级；全仓无 `--config` 指向它，自首提交无维护，testMatch 路径已与主 config 漂移）
- `assets/diagrams/kata-runtime-flow.svg`（472KB drawio 导出，被更新更小的 `kata-project-overview.svg` 取代，双 README 均不引用）

---

## B 类 · 孤儿 CLI 命令（已注册但无任何 SKILL/CI/外部调用 → Q7 未融入工作流）

这些命令在 `cli/index.ts` 被 import + `addCommand` 注册，是「可加载的命令面」，但**没有任何 skill/CI/hook/外部脚本调用**——全是 engine→\_shared 迁移遗留。删除需同步移除 `index.ts` 的 import 与注册行。已核验 `tests/test-case-flow/cli.test.ts` **不**断言这些命令名，删除不破坏测试。

| 命令文件 | 体积 | 现状 | 删除注意 |
|---|---|---|---|
| `cli/plan.ts` | 16KB | 与 `superpowers:subagent-driven-development`+TodoWrite 实际编排重复 | 改 index.ts:23/70 |
| `cli/progress.ts` | 19KB | 进度实际由 TodoWrite + `manifest.json#status` 承担 | 改 index.ts:25/73 |
| `cli/config.ts` | — | 配置实际由 `.env.local`+`lib/env.ts` 承担 | 改 index.ts:21/61 |
| `cli/repo-profile.ts` | — | repo profile 配置/类型在 lanhu/project-resolver 另有独立实现，与此 CLI 无关 | 改 index.ts:26 |
| `cli/test-bucket-audit.ts` | — | 不在 ci、无 skill、无 test | 改 index.ts:135 |
| `cli/codemod-apply.ts` | — | 一次性迁移工具，迁移已完成；`lib/codemod/*` 纯函数仍有 test 可保留 | 改 index.ts 三处注册 |
| `cli/image-compress.ts` | — | 截图处理走 lanhu fetch 直读图，不经此命令 | 改 index.ts:22；⚠️**保留 `sharp` 依赖**（`lanhu/fetch.ts` 仍用）+ 删自身 test |

### B-簇 · sqlite 子系统（闭合死岛，无测试，入口仅未被调用的 `kata db`）
`cli/db.ts`（懒加载）→ `lib/client.ts` → `lib/init.ts`/`lib/estimator.ts`/`lib/sync.ts`，五文件互相 import 形成闭环，**唯一入口 `kata db` 无任何调用方，整簇无测试**。可整簇删除并撤销 `better-sqlite3` + `@types/better-sqlite3` 依赖（已核验 sqlite 仅此簇用）。
- **决策项**：A=整簇下线（含撤依赖）；B=若计划做「用例/知识落库索引」则接进某 skill 工作流坐实。证据倾向 A，但属 medium 风险（撤依赖面较大），建议单独成批。

---

## C 类 · 合并去重（MERGE）

| 目标 | 说明 | 合并方向 |
|---|---|---|
| `skills/case-draft/fewshots/case-format-sample.md`(+`.xmind.md`) ↔ `skills/case-edit/references/fewshots/`同名 | 两份 .md(98 行)+两份 .xmind.md(154 行)**字节级完全相同**，引用关系已混乱（case-edit 反向引 case-draft 当 SSOT） | 提到 `.claude/prompt/_shared/`（落 `skills/_shared/` 会触发 skill-shape lint），两 skill 改引同一份；.md 与 .xmind.md 因相对链接须同目录共存 |
| `rules/routing-guard.md` ↔ `CLAUDE.md` 的「## 路由规则」段 | 21 行**逐字重复**且已开始漂移（引号 `"XX"` vs `「XX」`），无任何 checker 引用，两份都自动进模型上下文＝同规则出现两遍 | 删 `routing-guard.md`，路由唯一权威留 `CLAUDE.md`；或反之 CLAUDE.md 仅留一行指针。二选一不可并存 |
| `tests/audits-paths.test.ts` ↔ `tests/paths.test.ts` | 两者测同一源模块 `lib/paths.ts`，仅按导出函数人为拆成两文件 | 把 `audits-paths.test.ts` 两用例并入 `paths.test.ts` 的 `describe("audit paths")` 块 |
| `rules/workspace-boundary.md` 的「只读证据」条 ↔ `repo-readonly.md` + `CLAUDE.md` | 三处重复表述 | `workspace-boundary.md` 该条精简为「源仓库只读约束见 repo-readonly.md」，去重非删除 |

---

## D 类 · 最大单项收益：lanhu-mcp vendored 噪声瘦身

`.claude/plugins/lanhu/mcp-bridge/lanhu-mcp/` 把整个上游 `dsphper/lanhu-mcp` 开源仓库塞了进来。kata 运行时**只需** `lanhu_mcp_server.py` + 精简 `pyproject.toml` + `LICENSE`（+ `.gitignore` 防 `.venv` 入库）；安装走同级 `../setup.sh`(uv sync)，运行走 `fetch.ts→bridge.py→lanhu_mcp_server.py`。以下 ~20 个文件/4500+ 行经逐文件高置信核验为上游打包/分发/社区/CI/测试噪声，kata 既不 docker 部署也不发布该 PyPI 包，全可删：

- **容器/分发文档**：`Dockerfile` `.dockerignore` `docker-compose.yml` `CHANGELOG.md` `DEMO.md` `DEPLOY.md` `SECURITY.md` `RELEASE_NOTES_v1.0.0.md` `CODE_OF_CONDUCT.md` `CONTRIBUTING.md` `ai-install-guide.md` `GET-COOKIE-TUTORIAL.md` `README_EN.md` `config.example.env` `.env.example`
- **安装脚本噪声**：`easy-install.{bat,sh}` `quickstart.{bat,sh}` `setup-env.{bat,sh}`（.bat 是 Windows 专用，与 kata darwin/bun 无关）
- **上游打包元件**：`requirements.txt`（与 pyproject 重复且版本漂移 fastmcp>=2.0.0 vs >=0.2.0）
- **上游 CI/社区**：`.github/`（FUNDING/ISSUE_TEMPLATE/PR_TEMPLATE/workflows）——GitHub Actions 只跑仓库根 `.github/workflows/`，永不触发此子目录
- **上游单测**：`tests/`（pytest，`bun test` 永不收集 .py；lanhu 回归由 `__tests__/fetch.test.ts` 覆盖）
- **演示资源**：`images/wechat.jpg`（198KB 微信群二维码，仅上游 README 引用）
- 瘦身后建议加一行 `VENDOR.md` 记录上游 commit/版本以便升级溯源。

---

## E 类 · 优化与重组（保留功能，提升一致性/收敛）

### E1 · 文档/路径修正（低风险，应顺手做）
- `CONTRIBUTING.md`：`bun run --cwd engine type-check`/`bun test --cwd engine` 引用**已删除的 engine/ 包**，命令会直接报错 → 改为 `bun run type-check`/`bun test`；补齐 commit emoji 映射。
- 三个 plugin `README.md`（lanhu/notify/zentao）：`plugins/xxx/yyy.ts` 路径 → `.claude/plugins/xxx/yyy.ts`（共 ~8 处过时路径）。
- `cli/README.md`：更新为当前 noun-verb 实态，删过时「Bundle-2/3 迁移」措辞。
- `lib/playwright/index.ts:9` `@example` 注释里不存在的 `@pw/index` → `@shared/test-setup`。
- `skills/case-edit/SKILL.md`：把未提交的 `\_shared` 转义改动还原为 `_shared`（当前工作树这处改动制造了不一致，应撤销）。
- `defect-analyze/templates/GUIDE.md`：引用了已不存在的旧 skill 名（test-case-gen/static-scan/hotfix-case-gen/bug-report）→ 重写或删除。

### E2 · 死配置字段
- 三个 `plugin.json`（lanhu/notify/zentao）的 `hooks` 字段（`case-draft:init`/`case-hotfix:init`/`*:output`）**无任何代码读取**，是死配置 → 删字段，或补 plugin-loader 真正按 hooks 派发的实现。

### E3 · 目录重组（与已有 `lib/source-ref/`、`lib/cases/` 子目录风格对齐，可选）
- `lib/scan-report-*.ts`（5 个）→ `lib/scan-report/{types,store,render,diff,validate}.ts`（去冗余前缀）
- `lib/enhanced-doc-*.ts`（3 个）→ `lib/enhanced-doc/`
- `lib/progress-*.ts`（2 个）→ `lib/progress/`；`lib/client/init/schema.ts` → `lib/db/`
- `tests/` 根级散落的 ~20 个 CLI/lib 测试 → 镜像进 `tests/cli/`、`tests/lib/`
- `docs/skills/` 单文件目录 → 并入 `docs/superpowers/specs/`，消除 docs 碎片

### E4 · 未接线但有测试的「旁路能力」（需定位决策，非急删）
- `skills/case-draft/scripts/` 下 9 个脚本（source-analyze/search-filter/case-signal-analyzer/case-strategy-resolver/writer-context-builder/prd-frontmatter/format-check-script/format-report-locator/auto-fixer）：注册为 kata 命令 + 有单测，但既不被 worker prompt 也不被编排调用 → 确认是否仍属现行管线，是则在 SKILL 工作流写明何时调用，否则标 deprecated/迁出。
- `defect-analyze/templates/*.html.hbs`（4 个）：HTML 三模式产物计划中但 SKILL.md 与 loader 均未接 → 随实现 PR 接线，或加 WIP 标注。
- `cli/xmind-patch.ts`/`cli/source-ref.ts`/`cli/plugin-loader.ts`/`cli/archive-gen.ts`：保留功能，但确认是否应在对应 skill 工作流显式接入，否则属「测试守护的孤立 CLI 表面」。
- `packages/dtstack` 的 `core/direct/`+`sdk/exec-sql`+`sdk/ping-sql`（direct DB 直连模式）：over-vendored，运行时全走平台 HTTP，direct 零真实调用 → 标实验性或裁剪（可去 mysql2/hive-driver 依赖）。
- `scripts/lint/check-stale-paths.ts`：守护的 `docs/refactor/`、`REFACTOR_STATUS.md` 已不存在，是价值衰减的历史守卫 → 精简或下线。

---

## 跨区系统性主题

1. **engine→\_shared 迁移残留**：A3/A4/B 类大量孤儿都源于此次迁移只搬代码、没重新接线或没删旧实现。建议一轮集中清理。
2. **「设计了但从未接线」反模式**：sandbox(A1)、agent runtime/policy(A2)、orchestrator(A3)、HTML 模板(E4) 都是「写了代码+测试，但没有任何 SKILL/CLI 入口真正调用」。这类靠单测「续命」，掩盖了未使用事实。决策应明确：接线 or 删除。
3. **CLI 命令面与产物 SKILL 脱节**：case-draft/case-edit 的产物链（xmind-gen/archive-gen/source-ref）几乎不被 SKILL.md 显式调用，靠 subagent 隐式操作 → Q7「融入工作流」在产物侧存在文档缺口。
4. **重复的安全/命名逻辑**：命令安全审计（`cli/safety-audit-command` vs `hooks/pre-bash-guard` 内联 PATTERNS）、debug-spec 正则（hook + 两个 lint 三处重复）→ 提取单一来源。
5. **健康样板**：`codex-agents`（纯 symlink 树零重复，专用 lint 守护）、`tests`（零孤儿、1346 pass）、`prompt/_shared`（symlink + 契约测试）是组织得当的范例。

## 验证门（执行任何删除/重组后必跑）

```
bun test                                    # 全量，须保持 1346+ pass / 0 fail
bun run type-check                          # tsc --noEmit，删 lib 后验无悬挂 import
bun run check:skills                        # skill 契约
bun run lint:debris && bun run lint:paths   # 路径/碎片不变量
bun run check                               # biome
```
按 worktree-first 流程：先建 detached worktree，分批 commit，验证通过再 `git merge --no-ff` 回 main。



