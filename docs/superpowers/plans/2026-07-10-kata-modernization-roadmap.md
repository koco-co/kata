# kata 现代化改造路线图

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按已确认设计完成 kata 的 CLI、Skill/插件、格式治理和历史清理，最后以 Codex 真实运行结果验收。

**Architecture:** 四份子计划依赖单向推进：先稳定 contracts 与 CLI，再迁移唯一 Skill 树和平台包，然后建立全仓格式入口，最后执行有摘要保护的迁移与清理。主线程持有公共接口和验收矩阵；每个实现任务交给新的子代理，并依次经过规格审阅和质量审阅。

**Tech Stack:** Bun 1.3、TypeScript 6、JSON Schema 2020-12、AJV、Commander、Playwright、Allure、Python/Ruff、Prettier、Markdownlint、Biome、shfmt、ShellCheck。

## Global Constraints

- 实施开始时必须使用 `superpowers:using-git-worktrees` 建立隔离 worktree。
- 不使用 Goal；执行采用 `superpowers:subagent-driven-development`，公共文件始终串行修改。
- 根级 `skills/` 是唯一 Skill 正文；不得建立 `router/`、`routes.yaml` 或生产路由程序。
- 只保留 `kata` 一个公开可执行文件；根、命令组、叶子命令的 `--help` 都是公开契约。
- 用例 Markdown 与 XMind 只使用 Han 字符、ASCII 字母和数字组成的同名主体。
- 正式命令只从 metadata 读取用例路径，不扫描目录猜测 `archive.md` 或 `cases.xmind`。
- 默认只改 Git 已跟踪文件；未跟踪文件只列出，不格式化、不迁移、不删除。
- Codex 必须真实安装、发现、路由并执行；Claude、Reasonix、Hermes 只做结构与安装包检查。
- 依赖或环境缺失只能进入 `unresolved_blockers`，不能算作通过。
- 纯格式、内容修正、结构迁移和删除分别提交。
- 提交信息使用 `type: emoji English description`，标题不超过 72 个字符。

## Plan Set

1. [CLI 与 contracts 实施计划](2026-07-10-kata-cli-contracts-implementation.md)
2. [Skill 与插件实施计划](2026-07-10-kata-skills-plugins-implementation.md)
3. [格式与内容治理实施计划](2026-07-10-kata-content-governance-implementation.md)
4. [历史迁移与清理实施计划](2026-07-10-kata-cleanup-migration-implementation.md)

---

### Task 1: 建立隔离执行环境与基线

**Files:**
- Read: `docs/superpowers/specs/2026-07-10-kata-*-design.md`
- 在仓库外捕获：NUL status、主工作树路径、baseline commit、捕获时间
- 在仓库外捕获：snapshot 指针与 status SHA-256
- Create: `scripts/modernization/capture-dirty-snapshot.ts`
- Create: `tests/modernization/capture-dirty-snapshot.test.ts`
- 由仓库外快照生成：`docs/migrations/kata-v4/preexisting-dirty.json`
- Create: `docs/migrations/kata-v4/modernization-baseline.md`
- 禁止修改：当前主工作树已有改动路径

**Interfaces:**
- Consumes: 当前 `main`、五份设计文档、用户现有未提交文件。
- Produces: 隔离 worktree、基线命令输出、受保护路径清单。

- [ ] **Step 1: 确认五份实施计划已经冻结在 HEAD**

执行路线图前，先确认本计划与四份子计划都由当前 commit 跟踪，而且没有未提交改动：

```bash
git ls-files --error-unmatch \
  docs/superpowers/plans/2026-07-10-kata-modernization-roadmap.md \
  docs/superpowers/plans/2026-07-10-kata-cli-contracts-implementation.md \
  docs/superpowers/plans/2026-07-10-kata-skills-plugins-implementation.md \
  docs/superpowers/plans/2026-07-10-kata-content-governance-implementation.md \
  docs/superpowers/plans/2026-07-10-kata-cleanup-migration-implementation.md
git diff --quiet -- docs/superpowers/plans
git diff --cached --quiet -- docs/superpowers/plans
```

Expected: 三条命令都退出 0。任一计划未跟踪或仍有 diff 时停止，先由主线程提交计划；不得把未跟踪计划复制进执行 worktree。

- [ ] **Step 2: 在任何实现动作前捕获主工作树状态**

在当前主工作树运行：

```bash
SNAPSHOT_POINTER=/tmp/kata-modernization-snapshot-dir.txt
SNAPSHOT_DIR="$(mktemp -d /tmp/kata-modernization.XXXXXX)"
pwd -P > "$SNAPSHOT_DIR/main-worktree.txt"
git rev-parse HEAD > "$SNAPSHOT_DIR/baseline-commit.txt"
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$SNAPSHOT_DIR/captured-at.txt"
git status --porcelain=v1 -z --untracked-files=all > "$SNAPSHOT_DIR/status.z"
shasum -a 256 "$SNAPSHOT_DIR/status.z" > "$SNAPSHOT_DIR/status.sha256"
printf '%s\n' "$SNAPSHOT_DIR" > "$SNAPSHOT_POINTER"
shasum -a 256 -c "$SNAPSHOT_DIR/status.sha256"
printf '%s\n' "$SNAPSHOT_DIR"
```

Expected: 记录 `SNAPSHOT_DIR` 与 SHA-256；四个源文件、摘要文件和固定指针都位于仓库外，捕获动作不改变 Git 状态。不要读取或打印 dirty 文件正文。

- [ ] **Step 3: 用规定的 Skill 建立 worktree**

重新读取 `/tmp/kata-modernization-snapshot-dir.txt`，验证其指向的目录与五份快照文件，再调用 `superpowers:using-git-worktrees`，以 `baseline-commit.txt` 中的 commit 建立隔离目录。把该绝对 snapshot 路径作为 Task 1 后续步骤的显式输入；不要依赖前一 shell 的环境变量，也不要清理、暂存或提交主工作树中的现有文件。

- [ ] **Step 4: 重新读取指针，先测试并实现 snapshot parser**

测试覆盖 modified/deleted/renamed 双路径、untracked file/tree、中文和空格路径。先确认测试因 parser 不存在而失败，再实现：

```ts
export interface DirtySnapshotEntry {
  xy: string;
  path: string;
  original_path: string | null;
  tracked: boolean;
  kind: "modified" | "deleted" | "renamed" | "copied" | "added" | "unmerged" | "untracked";
}

export interface PreexistingDirtySnapshot {
  schema_version: 1;
  captured_at: string;
  source_worktree_root: string;
  git_commit: string;
  status_sha256: string;
  entries: DirtySnapshotEntry[];
  tracked_paths: string[];
  untracked_roots: string[];
  protected_roots: string[];
}

export type DirtySnapshot = PreexistingDirtySnapshot;

export function parsePorcelainV1Z(raw: Uint8Array): DirtySnapshotEntry[];
export function writeDirtySnapshot(input: {
  rawStatusPath: string;
  mainWorktreePath: string;
  baselineCommitPath: string;
  capturedAtPath: string;
  outputPath: string;
}): Promise<PreexistingDirtySnapshot>;
```

`entries` 保留 porcelain 的每个状态；rename/copy 的旧、新路径都进入去重排序后的 `tracked_paths`，未跟踪目录归并为最小 `untracked_roots`，两者的并集形成 `protected_roots`。`captured_at` 由调用方注入 UTC 时间，测试不得依赖系统时钟。

Run:

```bash
SNAPSHOT_DIR="$(sed -n '1p' /tmp/kata-modernization-snapshot-dir.txt)"
test -d "$SNAPSHOT_DIR"
test -s "$SNAPSHOT_DIR/main-worktree.txt"
test -s "$SNAPSHOT_DIR/baseline-commit.txt"
test -s "$SNAPSHOT_DIR/captured-at.txt"
test -f "$SNAPSHOT_DIR/status.z"
test -s "$SNAPSHOT_DIR/status.sha256"
shasum -a 256 -c "$SNAPSHOT_DIR/status.sha256"
bun test tests/modernization/capture-dirty-snapshot.test.ts
bun scripts/modernization/capture-dirty-snapshot.ts --snapshot-dir "$SNAPSHOT_DIR" --output docs/migrations/kata-v4/preexisting-dirty.json
```

Expected: test 0 fail；JSON status SHA 与 Step 1 相同。计划写作时观察到 4 个已跟踪变动路径和 6 个未跟踪根，这组数字只用于提醒风险；执行时一律以捕获文件为准。

- [ ] **Step 5: 在隔离 worktree 运行旧实现基线**

Run:

```bash
bun install --frozen-lockfile
bun run check
bun run lint:debris
bun run check:skills
bun test --timeout 30000
```

Expected: 分别记录命令、退出码、pass/fail/skip 和日志路径。旧检查失败时先分类；只有与本次改造无关且已写入基线的失败才可继续，不能把它们说成通过。

- [ ] **Step 6: 提交基线记录**

把命令、退出码、pass/fail/skip、日志路径、snapshot SHA 和仓库外 snapshot 目录写入 `modernization-baseline.md`。暂存 parser、测试和两份记录，然后提交：

```bash
git add scripts/modernization/capture-dirty-snapshot.ts tests/modernization/capture-dirty-snapshot.test.ts docs/migrations/kata-v4/preexisting-dirty.json docs/migrations/kata-v4/modernization-baseline.md
git commit -m "test: ✅ record kata modernization baseline"
```

- [ ] **Step 7: 在任何 CLI/Skill 文件移动前执行 Skill 子计划 Task 0**

执行 `2026-07-10-kata-skills-plugins-implementation.md` 的 Task 0：保存九个业务 Skill 的 no-Skill/current 对照，并在旧目录移动前保存 Codex、Reasonix、Hermes 现有 bootstrap 对同一 `using-kata` fixture 的 current 对照。只有 manifest 声明的全部迁移前记录齐全并提交后，才能进入 Roadmap Task 2；forward 复测留给对应 Skill 任务，其余 Skill Tasks 仍等待 CLI contracts 完成。

---

### Task 2: 执行 CLI 与 contracts 子计划

**Files:**
- Plan: `docs/superpowers/plans/2026-07-10-kata-cli-contracts-implementation.md`
- Create: `packages/contracts/**`
- Create: `packages/cli/**`
- Move: `.claude/packages/dtstack/**` to `packages/dtstack/**`

**Interfaces:**
- Consumes: Task 1 基线。
- Produces: v1 contracts、39 个叶子命令、统一帮助/输出/退出码、动态文件名、metadata/run/Handoff 接口。

- [ ] **Step 1: 逐 Task 执行 CLI 子计划**

每个 Task 使用新的实现子代理；完成后先做规格审阅，再做质量审阅。未经两次审阅，不进入下一 Task。

- [ ] **Step 2: 运行 CLI 子项目验收**

Run:

```bash
bun test packages/contracts/tests packages/cli/tests packages/dtstack/tests --timeout 30000
bun run contracts:generate
bun run contracts:generate --check
bun ./packages/cli/bin/kata --help
```

Expected: 0 fail；生成类型没有漂移；根帮助列出 11 个命令组；此时尚未接入的 Skill/格式/清理 handler 必须以明确的内部依赖错误存在于开发分支，不得发布。

---

### Task 3: 执行 Skill 与插件子计划

**Files:**
- Plan: `docs/superpowers/plans/2026-07-10-kata-skills-plugins-implementation.md`
- Create: `skills/**`, `adapters/**`, `.claude-plugin/**`, `tests/skills/**`, `tests/runtime/**`
- Modify: `.codex-plugin/plugin.json`, `AGENTS.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: Task 2 的 contracts、CLI、plugin/skills command interfaces。
- Produces: 唯一 Skill 树、四个平台安装包、路由 fixture、Codex fixture 和两个核心 Skill 集成入口。

- [ ] **Step 1: 只执行 Skill 子计划 Task 1–13**

Task 0 已在任何迁移前完成。本阶段严格停在 Skill Task 13，不提前执行 Task 14。每个 Skill 读取对应 no-Skill/current 记录，先写 route/behavior 断言并实际看到预期失败，再改写，再用相同原始输入让新代理运行 forward 复测。不得同时批量改写多个 Skill。

- [ ] **Step 2: 完成四平台打包能力的临时 fixture 检查**

Run:

```bash
bun test packages/contracts/tests/package-assets.test.ts tests/runtime/platform-packages.test.ts packages/cli/tests/services/release-manifest-skills.test.ts
test ! -e dist/release-manifest.json
```

Expected: 测试只在仓库外临时目录构造 fixture archives；四个平台结构、安装边界与 release-manifest SkillService 都通过，production `dist/release-manifest.json` 仍不存在。source-complete production build、Codex 真实安装与运行统一留给 Task 6，其他三项不得标记为端到端通过。

---

### Task 4: 执行格式与内容治理子计划

**Files:**
- Plan: `docs/superpowers/plans/2026-07-10-kata-content-governance-implementation.md`
- Modify: tool configs, tracked source, tracked `workspace/**`, CI

**Interfaces:**
- Consumes: Task 2 的 `workspace format/check` command shell、Task 3 的最终 Skill/入口文档。
- Produces: 可复现工具链、全 tracked-file 清单、机械格式批次、中文复核记录。

- [ ] **Step 1: 先实现检查器，再做批量格式化**

禁止先格式化 2,000 余个文件再补测试。每种文件类型都要先用坏 fixture 看到失败，再实现验证器。

- [ ] **Step 2: 核对覆盖数与幂等性**

Run:

```bash
set +e
bun ./packages/cli/bin/kata workspace check --format json > /tmp/kata-roadmap-workspace-check.json
CHECK_EXIT=$?
bun ./packages/cli/bin/kata workspace format --dry-run --format json > /tmp/kata-roadmap-format-check.json
FORMAT_EXIT=$?
set -e
test "$CHECK_EXIT" -eq 0 -o "$CHECK_EXIT" -eq 4
test "$FORMAT_EXIT" -eq 0 -o "$FORMAT_EXIT" -eq 4
git diff --check
```

Expected: 四类 tracked-file 数量之和等于实时 `git ls-files -z` 数量；未跟踪文件不在分母；第二次格式化不产生 diff。主工作树仍有受保护路径时，两条 workspace 命令按内容治理契约返回 `needs_input`/exit 4，本 Task 不得把它记作通过。

---

### Task 5: 执行历史迁移与清理子计划

**Files:**
- Plan: `docs/superpowers/plans/2026-07-10-kata-cleanup-migration-implementation.md`
- Create: `docs/migrations/kata-v4/cleanup-plan.json`, `cleanup-report.json`, `cleanup-report.md`
- 第二份计划复核后删除：`scripts/migrations/kata-v4/**`、`tests/migrations/kata-v4/**`、`docs/migrations/kata-v4/payloads/**` 下逐项列出的已跟踪文件

**Interfaces:**
- Consumes: Tasks 2-4 的稳定路径、schema、Skill 包和检查命令。
- Produces: 两份分别经用户复核的不可变清理计划、精确迁移/删除、两组执行记录与报告。

- [ ] **Step 1: 执行清理子计划 Task 1–10，只生成首次计划**

逐项完成清理 contracts、安全边界、分类器、执行引擎、CLI、垃圾源修复和三类迁移映射；Task 10 生成首次计划后立即停止，不执行任何 action。

Task 10 已经生成并冻结 plan；路线图只读复核该产物，禁止再次调用 `workspace clean --plan`：

```bash
bun scripts/migrations/kata-v4/index.ts verify-controls \
  --plan docs/migrations/kata-v4/cleanup-plan.json \
  --phase awaiting-confirmation
test -s docs/migrations/kata-v4/cleanup-plan.json
test -s docs/migrations/kata-v4/cleanup-plan.md
shasum -a 256 docs/migrations/kata-v4/cleanup-plan.json
```

Expected: 命令全程只读并退出 0；plan 与 preview 已存在，每个动作包含基准 commit、路径、类型、SHA-256、分类、原因、引用和目标路径；confirmation、journal 和 report 尚未出现。这里输出的 plan SHA 就是 Step 2 交给用户复核的值，不能通过二次生成改变 plan_id 或 SHA。

- [ ] **Step 2: 暂停并请用户复核清理计划**

在用户明确确认前，不运行 `--apply`。正式 apply 期间不得有其他写入代理运行。

- [ ] **Step 3: 只执行一次清理子计划 Task 11，再完成 Tasks 12–13**

严格执行 `2026-07-10-kata-cleanup-migration-implementation.md` Task 11 Step 2 的一次命令和状态断言，不在路线图另发第二次 apply。`0 + passed/passed` 与 `4 + passed/needs_input` 都表示首次 plan 已消费；第一次写入前完成全部 preflight，任一基准、确认、dirty 状态、类型或 SHA 变化时整体退出且零写入。成功后按 Tasks 12–13 核对、分主题提交并建立长期 gate。

- [ ] **Step 4: 完成清理子计划的第二次收尾复核**

只执行清理子计划 Task 14。该 Task 只有在迁移类 blocker 清空后才能生成 `cleanup-finalize-plan.json`；再次向用户报告其 plan_id、baseline commit、SHA-256 和逐文件动作，获得明确确认后才可 apply。首次 plan 的确认不能代替第二次确认，两个 plan 都不得成功执行两次。

---

### Task 6: 最终端到端验收与交付

**Files:**
- Create: `docs/migrations/kata-v4/final-verification.json`
- 验证：最终源码、安装包与 fixture

**Interfaces:**
- Consumes: Tasks 2-5 的全部产物。
- Produces: 可逐项核对的最终验证报告；无隐含跳过。

- [ ] **Step 1: 只执行一次 Skill 子计划 Task 14，提交最终测试定义**

Tasks 2–5 全部完成后，执行 `2026-07-10-kata-skills-plugins-implementation.md` Task 14。该 Task 只补齐 helper、九个 fixture、两个 live test、final-suite manifest 与 final-gate capture/verify 工具，运行 fake/unit/shape 检查并提交；不得构建 release、启动真实 `codex exec`，也不得连接 live 环境。Roadmap Task 3 没有执行过它，因此这里是唯一一次实现与提交。

- [ ] **Step 2: 运行静态、类型与单元检查，单独判定受保护路径**

Run:

```bash
bun install --frozen-lockfile
set +e
bun run ci -- --format json --output /tmp/kata-final-ci.json
CI_EXIT=$?
printf '%s\n' "$CI_EXIT" > /tmp/kata-final-ci.exit
set -e
test "$CI_EXIT" -eq 0 -o "$CI_EXIT" -eq 4
bun scripts/ci/run.ts --check-report /tmp/kata-final-ci.json --exit-code "$CI_EXIT"
```

Expected: 聚合器始终执行六项检查，并记录各自退出码与 pass/fail/skip。除 workspace check 外都必须通过；只有受保护路径仍待处理时，聚合器才可返回 4 与 `needs_input`。此时整个交付仍是 `needs_input`，不能称为通过；其他任何非零退出都令本任务失败。

- [ ] **Step 3: 从干净的 source-complete HEAD 构建并验证 Codex**

确认 Tasks 2–5 与 Skill Task 14 的实现都已提交，执行 worktree 没有 tracked/untracked 改动。把此时的 commit 固定为包的 `source_complete_commit`；不得在构建后补改测试、helper 或任何打包输入。

Run:

```bash
test -z "$(git status --porcelain=v1 --untracked-files=all)"
SOURCE_COMPLETE_COMMIT="$(git rev-parse HEAD)"
printf '%s\n' "$SOURCE_COMPLETE_COMMIT" > /tmp/kata-source-complete-commit.txt
set +e
bun scripts/package/build-all.ts > /tmp/kata-release-build.log 2>&1
RELEASE_BUILD_EXIT=$?
bun scripts/package/check-all.ts \
  --manifest dist/release-manifest.json \
  --expected-source-commit "$SOURCE_COMPLETE_COMMIT" \
  > /tmp/kata-release-check.log 2>&1
RELEASE_CHECK_EXIT=$?
bun test tests/runtime/codex-install.e2e.ts tests/runtime/codex-routes.e2e.ts tests/runtime/codex-fixtures.e2e.ts \
  --timeout 600000 \
  --reporter=junit \
  --reporter-outfile=/tmp/kata-codex-package-suite.junit.xml \
  > /tmp/kata-codex-package-suite.log 2>&1
CODEX_PACKAGE_SUITE_EXIT=$?
printf '%s\n' "$RELEASE_BUILD_EXIT" > /tmp/kata-release-build.exit
printf '%s\n' "$RELEASE_CHECK_EXIT" > /tmp/kata-release-check.exit
printf '%s\n' "$CODEX_PACKAGE_SUITE_EXIT" > /tmp/kata-codex-package-suite.exit
set -e
```

Expected: 三个真实退出码都写入固定 sidecar；通过时均为 0。build 脚本拒绝任何影响 CLI、Skill、adapter 或包结构的未提交输入；manifest 的 `source_commit` 等于 `source_complete_commit`，并记录输入树摘要、CLI tgz 与四个平台 ZIP 的精确路径、版本和 SHA-256。测试只读取 manifest 指定的产物；临时 `CODEX_HOME` 安装公共 CLI 与 Codex 插件；10 个 Skill 被真实发现；9 个业务 fixture 0 fail、0 skip，JUnit 可回读。Claude、Reasonix、Hermes 只记录静态检查。任一失败仍保留 sidecar/log/result，最终报告必须记为 failed，不能手改数值。

- [ ] **Step 4: 执行两个核心 Skill 的真实集成**

Run:

```bash
set +e
bun test tests/runtime/live/case-draft.e2e.ts \
  --timeout 600000 \
  --reporter=junit \
  --reporter-outfile=/tmp/kata-case-draft-live.junit.xml \
  > /tmp/kata-case-draft-live.log 2>&1
CASE_DRAFT_LIVE_EXIT=$?
bun test tests/runtime/live/playwright-automation.e2e.ts \
  --timeout 1200000 \
  --reporter=junit \
  --reporter-outfile=/tmp/kata-playwright-live.junit.xml \
  > /tmp/kata-playwright-live.log 2>&1
PLAYWRIGHT_LIVE_EXIT=$?
printf '%s\n' "$CASE_DRAFT_LIVE_EXIT" > /tmp/kata-case-draft-live.exit
printf '%s\n' "$PLAYWRIGHT_LIVE_EXIT" > /tmp/kata-playwright-live.exit
set -e
```

Expected: 两个退出码 sidecar 与 JUnit 均保留。通过时 `case-draft` 在仓库外临时 feature 中生成并回读同名 Markdown/XMind；`playwright-automation` 的 `full.spec.ts` 退出 0、收集数大于 0、Allure 属于本次临时 run、变更型用例有业务记录、无未说明 skip。final report 保存临时产物绝对路径与业务记录名/ID，source-complete worktree 仍保持干净。环境缺失或任一 gate 未满足时，`codex_end_to_end_verified.passed=false`，整个交付保持 `needs_input` 或 `failed`，不能把 fixture 结果替代真实集成。

- [ ] **Step 5: 回答四个最终问题**

先补齐固定 gate 的只读检查并保存日志；失败也要保留退出码，不能通过改写允许退出码把它变成通过：

```bash
set +e
git diff --exit-code -- docs/superpowers/specs > /tmp/kata-design-specs-clean.log 2>&1
DESIGN_EXIT=$?
bun scripts/modernization/verify-cleanup-confirmations.ts \
  --migration-plan docs/migrations/kata-v4/cleanup-plan.json \
  --migration-confirmation docs/migrations/kata-v4/cleanup-confirmation.json \
  --migration-report docs/migrations/kata-v4/cleanup-report.json \
  --finalize-plan docs/migrations/kata-v4/cleanup-finalize-plan.json \
  --finalize-confirmation docs/migrations/kata-v4/cleanup-finalize-confirmation.json \
  --finalize-report docs/migrations/kata-v4/cleanup-finalize-report.json \
  > /tmp/kata-cleanup-confirmations.log 2>&1
CLEANUP_CONFIRMATIONS_EXIT=$?
bun test tests/skills/shape.test.ts tests/skills/platform-neutral.test.ts tests/skills/entry-docs.test.ts \
  --reporter=junit \
  --reporter-outfile=/tmp/kata-skill-structure.junit.xml \
  > /tmp/kata-skill-structure.log 2>&1
SKILL_STRUCTURE_EXIT=$?
bun ./packages/cli/bin/kata skills audit \
  --runtime codex \
  --source release-manifest \
  --manifest-path dist/release-manifest.json \
  --format json \
  > /tmp/kata-release-skill-audit.json \
  2> /tmp/kata-release-skill-audit.log
RELEASE_SKILL_AUDIT_EXIT=$?
bun ./packages/cli/bin/kata workspace check --language --format json \
  > /tmp/kata-language-check.json \
  2> /tmp/kata-language-check.log
LANGUAGE_EXIT=$?
set -e
printf '%s\n' "$DESIGN_EXIT" > /tmp/kata-design-specs-clean.exit
printf '%s\n' "$CLEANUP_CONFIRMATIONS_EXIT" > /tmp/kata-cleanup-confirmations.exit
printf '%s\n' "$SKILL_STRUCTURE_EXIT" > /tmp/kata-skill-structure.exit
printf '%s\n' "$RELEASE_SKILL_AUDIT_EXIT" > /tmp/kata-release-skill-audit.exit
printf '%s\n' "$LANGUAGE_EXIT" > /tmp/kata-language-check.exit
```

再由已测试的 gate 工具读取所有固定 sidecar/JUnit/CLI/CI 文件和两组 cleanup 原文件，创建 `final-verification.json`。capture 不按数组顺序猜 phase，也不接受调用方传入 exit/count；它重算文件摘要并自动写入 checks：

```bash
bun scripts/modernization/final-gates.ts capture \
  --suite tests/runtime/final-suite.json \
  --source-commit "$(sed -n '1p' /tmp/kata-source-complete-commit.txt)" \
  --release-manifest dist/release-manifest.json \
  --output docs/migrations/kata-v4/final-verification.json
```

committed suite 中的固定 gate 如下；argv 的 timeout、JUnit 输出路径、manifest 路径与 source commit 参数也由 suite 精确固定。报告不能新增 gate、改变 section、路径或命令：

| Section | 必需 gate | 命令主体（suite 保存完整 argv） |
|---|---|---|
| `all_questions_confirmed` | `design_specs_clean` | `git diff --exit-code -- docs/superpowers/specs` |
| `all_questions_confirmed` | `cleanup_confirmations` | `bun scripts/modernization/verify-cleanup-confirmations.ts` |
| `all_skills_follow_best_practices` | `skill_structure` | `bun test tests/skills/shape.test.ts` |
| `all_skills_follow_best_practices` | `release_skill_audit` | `bun ./packages/cli/bin/kata skills audit --runtime codex --source release-manifest` |
| `codex_end_to_end_verified` | `release_build` | `bun scripts/package/build-all.ts` |
| `codex_end_to_end_verified` | `release_check` | `bun scripts/package/check-all.ts` |
| `codex_end_to_end_verified` | `codex_package_suite` | `bun test tests/runtime/codex-install.e2e.ts tests/runtime/codex-routes.e2e.ts tests/runtime/codex-fixtures.e2e.ts` |
| `codex_end_to_end_verified` | `case_draft_live` | `bun test tests/runtime/live/case-draft.e2e.ts` |
| `codex_end_to_end_verified` | `playwright_live` | `bun test tests/runtime/live/playwright-automation.e2e.ts` |
| `prompts_are_accurate_clear_natural` | `final_ci` | `bun run ci` |
| `prompts_are_accurate_clear_natural` | `language_check` | `bun ./packages/cli/bin/kata workspace check --language --format json` |

capture 之后只允许补充四个 section 的 `artifacts/unresolved/passed` 与顶层 `unresolved_blockers/overall_status`；checks 和 cleanup_confirmations 不得手改。四项 `passed` 缺少固定 gate、实际数量或可回读产物路径时都必须保持 `false`。任一 section 的 `unresolved` 或顶层 `unresolved_blockers` 非空时，`all_questions_confirmed.passed=false`；若所有已执行检查符合约定但仍缺用户输入或外部条件，则 `overall_status=needs_input`。实际校验或测试失败优先记为 `failed`，不能伪装成环境 blocker。只有四项均为 true、两次清理确认三方一致、plan_id/confirmation_ref 分别不同、确认时间满足各自 plan 且 finalize 更晚、所有 blocker 清空时，`overall_status` 才能是 `passed`。

每个自动生成的 `checks[]` 条目包含 `gate`、`argv`、`exit_path`、`exit_code`、`passed`、`failed`、`skipped`、`result_path/result_sha256`（适用时）与 `log_path/log_sha256`；所有固定 gate 只接受 exit 0、`passed >= 1`、`failed=0`、`skipped=0`。`artifacts[]` 使用仓库相对路径或明确的临时绝对路径，且提交前必须仍可读取。不能用一句“已检查”代替命令与数量。

- [ ] **Step 6: 提交最终验证记录**

```bash
bun scripts/modernization/final-gates.ts verify \
  --suite tests/runtime/final-suite.json \
  --report docs/migrations/kata-v4/final-verification.json \
  --source-commit "$(sed -n '1p' /tmp/kata-source-complete-commit.txt)"
test "$(git rev-parse HEAD)" = "$(sed -n '1p' /tmp/kata-source-complete-commit.txt)"
test "$(git status --porcelain=v1 --untracked-files=all)" = "?? docs/migrations/kata-v4/final-verification.json"
git add docs/migrations/kata-v4/final-verification.json
test "$(git diff --cached --name-only)" = "docs/migrations/kata-v4/final-verification.json"
git commit -m "test: ✅ record kata modernization verification"
test "$(git rev-parse HEAD^)" = "$(sed -n '1p' /tmp/kata-source-complete-commit.txt)"
```

该提交只增加不参与打包的审计报告，因此 release manifest 仍以其父提交 `source_complete_commit` 为可复现来源。若提交前后改动任何 CLI、Skill、adapter、依赖锁或打包输入，先作废报告，提交源变更，再从新的干净 HEAD 重新执行 Steps 2–5；不能只改 manifest 中的 commit 字段。
