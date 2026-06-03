# CI 安全网 + 残留清理 设计（2026-06-03）

> 状态：设计待用户复核（brainstorming 产出，未转 implementation plan）
> 关联：本设计承接并补充 `docs/audit/2026-06-02-runtime-audit.md`（其 D/A/B/C 批次已执行合并于 `e7e457f1d`）。

## 一句话结论

运行时死代码已被 D/A/B/C 批次清掉，**剩下的高价值问题不在"存在价值"层，而在"工程闸门"层**：完整的测试/类型/lint/skill 契约闸门**从未被 CI 真正执行**，且 `bun run ci` 因 type-check 死链结构上跑不过。本设计在已完成清理之上，补四批互补改动：**接通 CI 安全网（Tier 1）→ 修闸门质量（Tier 3）→ 清漏网死代码（Tier 2）→ 纠正说谎文档（Tier 4）**。

## 背景与基线（当前 HEAD `5b1c90878`，均已实测）

| 闸门 | 当前结果 | 说明 |
|---|---|---|
| `bun test` | ✅ 1398 pass / 1 skip / 0 fail（1399 tests / 167 files / ~87s） | 测试本身健康 |
| `bun run check`（biome） | ✅ exit 0，但 153 warnings + 6 infos | 正确性规则被降级为 warn，一个都不挡 |
| `check:skills` / `lint:debris` | ✅ pass | runtime sync / detach / structure / 碎片不变量 |
| `tsc --noEmit` | 🔴 198 errors | 非绿基线（清理后从 202 降到 198） |

198 个 type 错误的实测分布：

```
120  codemod/fixtures/*.fixture.ts   故意写坏的转换样本（tsconfig 未排除）
~10  lint/fixtures/.../*.fixture.ts  故意违规的 lint 样本
 16  tests/lib/progress-store.test.ts  本批次 B1 直接删除
~48  真实测试文件                     xmind/gen 12 · xmind/patch 7 · history-convert 6 ·
                                      case-signal-analyzer 6 · writer-context-builder 5 ·
                                      project-resolver 4 … 多为 "possibly undefined" 数组访问
  4  生产源码                         cli/index.ts:79(commander 类型) · cli/index.ts:132(_hidden) ·
                                      cli/repo-sync.ts:195 · knowledge-curate/.../write.ts:204
```

注：`biome.json` 的 `files.includes` 已含 `!!**/*.fixture.ts`，所以 153 个 biome warning **不**来自 fixture；但 `tsconfig.json` 未排除 fixture，故 type-check 被 ~130 个 fixture 噪声污染。

## 与 `docs/audit/2026-06-02-runtime-audit.md` 的对账（不重复已完成工作）

| 本设计项 | 项目审计是否覆盖 | 关系 |
|---|---|---|
| Tier 1 全部（CI 未接闸门 / `bun run ci` 死链 / `lint:agents` 空门） | 否（审计只查"存在价值"，不查 CI 接线） | 净新增 |
| Tier 3 全部（biome warn 降级 / type-check fixture 噪声 + 修绿） | 否 | 净新增 |
| Tier 4 · CHANGELOG 虚构子系统 | 否（审计查了 CONTRIBUTING / plugin README / cli/README，未查根 CHANGELOG） | 净新增 |
| Tier 4 · 架构 SVG 过时 | 部分：审计 A8 删了旧 `kata-runtime-flow.svg`，把 `kata-project-overview.svg` 当"更新版"保留 | 净新增：连保留的这张也过时 |
| Tier 2 · `lib/features/paths.ts` 死副本 | 否（审计 lib-modules 区未抓到） | 净新增 |
| Tier 2 · `progress-store` 孤岛 | 部分：审计 E3 列为"重组到 `lib/progress/`" | **supersede E3 该项**：B 批次删了消费者 `cli/progress.ts` 后它已变死代码，应删而非重组 |

> **被否决的候选**：`exceljs` 依赖。初判"未用"，但全仓核验发现 `workspace/dataAssets/features/.../tests/cases/*.ts` 用 `import ExcelJS from "exceljs"` 解析 Excel（审计范围排除 workspace 才漏判）。**保留 exceljs，不删。**

## 范围

**本设计做（Tier 1–4）：**
- Tier 1：接通 CI 安全网。
- Tier 2：删两处经全仓核验的死代码。
- Tier 3：让 type-check 修到全绿当硬闸门 + biome 正确性规则提到 error。
- Tier 4：纠正 CHANGELOG 与架构 SVG。

**本设计不做（沿用项目审计的开放项，属可选优化）：**
- E3 目录重组（`lib/scan-report/`、`lib/enhanced-doc/` 子目录化、tests 镜像）——`progress-*` 项除外（已转为 B1 删除）。
- E4 未接线但有测试的旁路能力定位决策（case-draft/scripts 9 脚本、defect-analyze HTML 模板、xmind-patch/source-ref 等 CLI、dtstack direct DB 模式）。
- 我审计里 Tier 5 的其余机会性项（enhanced-doc-store 拆分、cli→lib→cli 倒置、config.json 加载收敛、knowledge-guard 补测试、api.ts 旧命名、路由表跨 runtime 内容同步测试、Bun 版本 pin 等）——记录在案，不在本批。

## 关键设计决策（已与用户确认）

1. **type-check 终态 = 修到全绿当硬闸门**（而非 baseline-diff 或 advisory）。理由：排除 fixture + 删 progress-store.test 后只剩 4 个生产错误 + ~48 个测试空安全错误，有界且审计已定位，修绿后 CI 直接把 `tsc --noEmit` 当硬门，无需维护 baseline 文件或包装脚本。
2. **架构 SVG = 重画一张准确的**（而非仅删图）。按当前 `.claude/**` 单 runtime + adapter 架构重绘。
3. **执行方式**：detached worktree + 分批 commit + 每批 `bun test` & `bun run check`，多任务走 `superpowers:subagent-driven-development`。
4. **批次依赖顺序**：B1 → B2 → B3，B4 可并行。B3（接 CI 跑 `bun run ci`）必须等 B2 把 type-check 修绿，否则 `&&` 链仍在第 9 步断。

## 批次设计

### B1 · Tier 2 删漏网死代码（依赖：无 / 工作量 S）

删除前置校验（每个目标删前在 worktree 内重跑一次，确认仍零消费者）：
- `progress-store`：全仓（含 `workspace/`）零消费者、未经 `api.ts` barrel 导出、唯一 `import` 在自测——已实测确认。消费者 `cli/progress.ts` 已在 B 批次删除。
- `lib/features/paths.ts`：全仓零消费者，且与 `lib/paths.ts` 行为分叉（不认 `KATA_WORKSPACE_ROOT` 覆盖），是隐藏正确性陷阱。

删除清单：
- `.claude/scripts/_shared/lib/progress-store.ts`（632 行）
- `.claude/scripts/_shared/lib/progress-types.ts`（88 行）
- `.claude/scripts/_shared/tests/lib/progress-store.test.ts`（789 行，连带消掉 16 个 type 错误）
- `.claude/scripts/_shared/lib/features/paths.ts`
- `.claude/scripts/_shared/tests/features/paths.test.ts`
- 同步检查并移除 `lint/path-treatment.ts` 中对 `progress-store` 测试路径的 allowlist 行（若存在）。

验证：`bun test` 仍 0 fail；`bun run type-check` 错误数应降至 ~182；`bun run check` 无新增 warning；`check:skills`/`lint:debris`/`lint:paths` pass。

### B2 · Tier 3 闸门质量（依赖：B1 / 工作量 M–L，本批最重）

**B2a — type-check 修到全绿：**
1. `tsconfig.json` 的 `exclude` 增加故意写坏的 fixture 目录：`.claude/scripts/_shared/tests/codemod/fixtures/**` 与 `.claude/scripts/_shared/tests/lint/fixtures/**`（仅排除"故意非法"的 fixture，不排除真实测试）。预期掉 ~130。
2. 修 4 个生产源码错误：`cli/index.ts:79`、`cli/index.ts:132`、`cli/repo-sync.ts:195`、`knowledge-curate/scripts/knowledge-curate/write.ts:204`。
3. 修剩余 ~48 个真实测试文件的空安全错误（`possibly undefined` 数组访问等），逐文件加守卫或非空断言收敛。
4. 目标：`bun run type-check` = **0 error**。

**B2b — biome 正确性规则提到 error：**
1. 先清掉 70 未用变量 + 2 未用 import + 3 未用参数（`biome check --fix` 能自动修 unused imports；unused vars 手动删）。
2. 把 `biome.json` 里这些规则从 `warn` 提到 `error`：`noUnusedVariables`、`noUnusedImports`、`noImplicitAnyLet`、`noAssignInExpressions`、`noRedeclare`、`noFallthroughSwitchClause`、`noUnsafeOptionalChaining`。
3. **保持 warn**（需独立 burn-down 计划，不在本批）：`noNonNullAssertion`(47)、`noExplicitAny`(16)、`noTemplateCurlyInString`(1)。
4. 目标：`bun run check` exit 0 且对上述规则的回归会 fail。

验证：`bun run type-check` 0 error；`bun run check` exit 0；`bun test` 仍 0 fail；`check:skills` pass。

### B3 · Tier 1 接通 CI 安全网（依赖：B2 修绿 / 工作量 M）

1. **新增 `.github/workflows/ci.yml`**：在 `push`（main）+ `pull_request` 触发，步骤 `actions/checkout@v4` → `oven-sh/setup-bun@v2`（**pin `bun-version` 到 1.3.x，对齐 CLAUDE.md 的 Bun ≥ 1.3**）→ `bun install` → `bun run ci`。设为 main 的必需状态检查。
2. **修 `lint:agents` 空门**：`.claude/agents/` 不存在，`kata agents audit` 永远 `scanned=0` 静默通过。处理：让 `kata agents audit` 在目标目录缺失时**报错而非静默通过**（杜绝空绿）；因本项目确无 `.claude/agents/`，把 `lint:agents` 从 `ci` 链移除。（若原意是审计 adapter agent 目录，则改为 repoint——实现时向用户确认一句。）
3. **type-check 进 ci**：B2 修绿后，`ci` 链里现有的 `&& bun run type-check &&` 即成真硬闸门，无需改动；顺带确认 `CONTRIBUTING.md` 写的"`bun run ci` 是合并门"此时变为真实可过。
4. **顺带修 CI 正确性小项**（同属 CI 接线，cheap）：
   - `features-index.yml` / `features-lint.yml` 里裸 `kata ...` 在 GitHub `run:` 步不在 PATH → 改 `bun run`/`bunx kata` 或 `echo "$PWD/node_modules/.bin" >> $GITHUB_PATH`。
   - `schema-check.yml` 去掉重复的 path glob，并加 `pull_request` 触发（或直接由新 `ci.yml` 覆盖其 schema 测试，二选一，避免冗余跑）。

验证：本地 `bun run ci` 端到端跑通（lint → debris → paths → check:skills → 三 runtime skill 审计 → type-check → test → test:plugins → test:tools 全绿）；ci.yml 经 `act` 或一次 PR 实跑确认绿。

### B4 · Tier 4 纠正说谎文档（依赖：无，可与 B1–B3 并行 / 工作量 S）

1. **`CHANGELOG.md`**：
   - 删 `## Unreleased` 里虚构子系统的 4 条（`contracts/routes/*.yaml`、`contracts/skill-graph.yaml`、Blackboard schema、`SKILL + Router + Graph + Workflow + Blackboard` tagline）及谎称 `check:skills` 覆盖这些检查的那条。
   - 新增 `## 4.0.0-alpha.1 (2026-06-03)`，按真实工作写：收敛为 `.claude/**` 单 runtime、多 runtime adapter（codex symlink / reasonix / hermes external_dirs）、README/docs 重写、runtime 死代码清理（−14k）。对齐 README 版本徽章。
2. **`assets/diagrams/kata-project-overview.svg`**：重绘为当前架构，删除所有过时标签（`SKILL + Router + Graph + Workflow + Blackboard`、`skill-manifest.yaml`、`manifest.routing.*`、`workflows/*.yaml`、`Blackboard`、`AGENTS.md`、`agents/openai.yaml`、`bun test --cwd engine`）。新图素材：`.claude/**`（skills + `scripts/_shared` 的 kata CLI + plugins + rules）、adapter 目录（`.agents`/`.codex-plugin` symlink、`.reasonix`、`.hermes` external_dirs）、质量门（`bun run ci`）。与两个 README 第 128 行起的正文保持一致。

验证：`lint:debris`（stale-path 不变量）pass；两个 README 引用的 SVG 路径不变、图内不再出现不存在的路径/命令；`bun run check` 对 .md 无影响。

## 最终验证门（合并前在 worktree + 合并后在 main 双跑）

```
bun run ci      # 端到端：lint + debris + paths + check:skills + 3×skill 审计 + type-check(现 0) + test + test:plugins + test:tools
```

逐项目标：`bun test` ≥ 1398 pass / 0 fail（删 progress-store.test 后 total 略降）；`tsc --noEmit` = **0 error**；`bun run check` exit 0 且正确性规则可 fail；`check:skills` 三项 pass（runtime-detach 契约不破）。汇报时写清确切命令、退出码、pass/fail/skip 数与未验证范围。

## 风险与前置条件

- **前置：主工作树有别的会话留下的未提交改动**（`case-qa.md`、`output-artifacts.md`、`project-workflow-rules.md`）。建 worktree 前必须协调——**不得**把它们当本任务改动扫进 `chore: save pre-worktree local changes`。等并行会话提交、或向用户确认归属后再开工。
- **B2 是最大风险点**：改 ~48 个测试文件的空安全。优先用真实守卫而非满地非空断言（否则只是把 type 错误换成运行期隐患）；每改一批跑全量 `bun test`。
- **B2b 提 error 前**必须先清掉全部相关 warning（含未触及文件），否则 `bun run check` 立刻变红。
- **runtime-detach 子串契约**（`check:skills`）：B4 改 CLAUDE.md/rules 措辞有踩 `runtime-detach.ts` 子串校验的风险——本批 B4 只动 CHANGELOG/SVG，不动 CLAUDE.md/rules，规避之。
- **SVG 重绘是主观项**：保持最小、准确、与 README 正文一致即可，不追求美观。

## 下一步

用户复核本 spec 后，转 `superpowers:writing-plans` 产出逐任务实现计划，再按 `superpowers:subagent-driven-development` 执行。


