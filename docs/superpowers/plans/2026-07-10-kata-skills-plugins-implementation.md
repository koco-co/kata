# kata Skill 与插件实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将九个业务 Skill 与 `using-kata` 迁到唯一根级 `skills/`，以 Skill 自身描述完成路由，并生成 Codex、Claude、Reasonix、Hermes 四个平台安装包。

**Architecture:** 根级 Skill 正文遵循 Agent Skills 渐进加载；机械约束进入 contracts/CLI/tests，模型判断保留在短 SKILL.md 与一层 references。平台适配只描述发现、工具和安装；路由语料仅用于测试，不成为生产 Router。每个 Skill 独立走基线失败、最小改写、前向复测和提交。

**Tech Stack:** Agent Skills、Bun/TypeScript、Codex CLI `codex exec`、Commander、JSON fixtures、ZIP packaging、Playwright、Allure。

## Global Constraints

- 设计来源：`docs/superpowers/specs/2026-07-10-kata-skills-design.md`。
- **REQUIRED SUB-SKILL:** Skill 变更使用 `skill-creator` 与 `superpowers:writing-skills`。
- **REQUIRED BACKGROUND:** 修改任何 Skill 前先遵循 `superpowers:test-driven-development`。
- 用户已确认中文 frontmatter；通用指南中的英文 `Use when...` 不覆盖本项目中文要求。
- `description` 只写触发、排除和转交，不抄正文流程；一至三句，最多 1024 字符。
- 每个 SKILL.md 尽量不超过 200 行，最多 500 行；references 只允许一层。
- 公共正文不得出现 `AskUserQuestion`、`TodoWrite`、`Task`、`spawn_agent` 等平台工具名。
- `agents/openai.yaml` 只在 Codex staging 包生成，不提交到根级 `skills/`。
- 不建立生产 Router；`tests/skills/routes/*.json` 只是评估输入与期望。
- 每完成一个 Skill，必须结束 RED-GREEN-REFACTOR、独立审阅和提交，再开始下一个。
- 两个核心 Skill 的真实环境测试只由 Roadmap Task 6 执行；环境缺失时整体改造保持未完成，不能用 fixture 代替。本文 Task 14 只把测试准备到 `ready_to_run`。
- 每个 Task 开始时执行 worktree 必须干净。提交前生成 `docs/migrations/kata-v4/skill-actions/task-XX.paths.z`：文件使用 NUL 分隔，逐项列出本 Task 实际创建、修改、移动或删除的路径，并包含 manifest 自身。移动必须同时列出源和目标，manifest 不接受 glob、目录递归或计划外路径。
- `tests/skills/eval/run.ts --write-action-manifest` 从 NUL `git status` 生成 manifest；`--check-action-manifest` 核对实际 diff，`--check-staged` 核对暂存区。三个检查任一失败都不能提交。暂存统一使用 `git add --pathspec-from-file=<manifest> --pathspec-file-nul`。
- 公共 `SKILL.md`、`phases/`、`prompts/` 和业务 `references/` 不得出现平台工具名。仅 `skills/using-kata/references/codex-tools.md`、`claude-tools.md`、`reasonix-tools.md`、`hermes-tools.md` 四个适配说明文件豁免；平台中立检查只允许这四个精确路径。
- 每个业务 Skill 的 forward 运行把结果写回对应 `docs/migrations/kata-v4/skill-baselines/<skill>.json`，形成 `no_skill/current_skill/forward` 三段；forward 必须复用相同 raw input 和断言。提交该 Skill 时一并提交更新后的记录。

## 跨计划交接

- Roadmap Task 1 Step 7 在任何 CLI/Skill move 前单独执行本文 Task 0。此时 `packages/cli` 尚未建立，因此 Task 0 先使用自包含测试 helper；CLI 子计划完成后，本文 Task 2 把实现移入 package，原 helper 退化为薄封装，并把临时 response schema 移交给 `packages/contracts`。
- CLI Task 11 先定义 `RouteCheckResult`、`PluginPackInput`、`PluginCheckInput`、`PluginPackageResult` 和 `PluginCheckResult`。本文只能导入这些 DTO，不能重复声明。
- CLI Tasks 8–9 把 Playwright 逻辑移入 `packages/cli`，同时保留三份 package import wrapper 与一条 template symlink。本文 Task 1 在目录 move 后校正它们，Task 12 才删除。
- 本文 Task 14 只准备最终测试。五个真实测试使用非默认发现后缀 `.e2e.ts`；真实 build、Codex install、route、九个 fixture 和两个 live integration 统一由 Roadmap Task 6 从最终干净 HEAD 显式执行这些路径。
- Cleanup 子计划在本文 Task 13 关闭旧入口后即可处理旧 tree；Task 14 由 Roadmap Task 6 在 cleanup 全部提交后执行。`docs/migrations/kata-v4/skill-baselines/`、`bootstrap-baselines/` 与 `skill-actions/` 属于审计记录，不是垃圾候选。

---

### Task 0: 在迁移前保存九个 Skill 的对照基线

**Files:**
- Create: `tests/runtime/helpers/codex.ts`
- Create: `tests/runtime/helpers/temporary-home.ts`
- Create: `tests/skills/eval/response.schema.json`
- Create: `tests/skills/eval/manifest.json`
- Create: `tests/skills/eval/bootstrap-manifest.json`
- Create: `tests/skills/eval/run.ts`
- Create: `tests/skills/eval/run.test.ts`
- Create: `tests/skills/eval/action-manifest.ts`
- Create: `tests/skills/eval/action-manifest.test.ts`
- Create: `docs/migrations/kata-v4/skill-baselines/*.json`
- Create: `docs/migrations/kata-v4/bootstrap-baselines/no-skill.json`
- Create: `docs/migrations/kata-v4/bootstrap-baselines/codex-current.json`
- Create: `docs/migrations/kata-v4/bootstrap-baselines/reasonix-current.json`
- Create: `docs/migrations/kata-v4/bootstrap-baselines/hermes-current.json`
- Create: `docs/migrations/kata-v4/skill-actions/task-00.paths.z`

**Interfaces:**
- Consumes: 当前尚未移动的九个业务 Skill、现有 Codex/Reasonix/Hermes bootstrap，以及每个 Skill 一条最小触发输入和一条边界输入。
- Produces: 九个业务 Skill 的 `no_skill/current_skill` 对照，以及三份旧 bootstrap 与同一份 `no_skill` 对照；后续任务复用同一 runner 做 `red/forward`。

- [ ] **Step 1: 固定评估清单**

`manifest.json` 为九个业务 Skill 分别列出触发与边界输入：

```ts
interface SkillEvalCase {
  id: string;
  skill: string;
  raw_input_fixture: string;
  expected_route: string;
  forbidden_routes: string[];
  required_observations: string[];
  forbidden_observations: string[];
}
```

fixture 使用无凭据、可本地读取的最小材料。不得把期望答案写进 prompt。

`bootstrap-manifest.json` 固定三条完全相同的原始输入：`sql-merge-validate` 明确信号、含义不明的 `.md` 路径，以及 bug+PRD 多信号请求。四个阶段始终复用这三条输入：

```text
no-skill          -> 不挂载 bootstrap
codex-current     -> .agents/skills/using-kata-codex
reasonix-current  -> .reasonix/skills/using-kata-reasonix
hermes-current    -> .hermes/skills/using-kata-hermes
forward           -> skills/using-kata
```

前三份 current 记录必须在任何 move 前生成。Task 2 只能读取这些记录，不能在旧 symlink 已失效后重新解释旧 bootstrap。

- [ ] **Step 2: 先写 Codex helper 与 action manifest 的失败测试**

先用 fake Codex binary 写出期望接口。测试覆盖 stdin、绝对 output schema、`--ignore-user-config`、超时、非零退出、敏感字段遮盖、加载事件解析和临时目录清理；还要证明只复制 `auth.json`，并拒绝把 plugin、Skill 或 config 带入 no-Skill 环境。

action manifest 测试覆盖创建、修改、删除、rename 双路径、中文和空格路径；输出必须为稳定排序的 NUL 路径，并精确等于实际 diff 或暂存区。

helper 的期望行为是：创建权限为 `0700` 的临时 `CODEX_HOME`；认证只从显式 `KATA_E2E_CODEX_HOME_SOURCE` 复制 allowlist 中的 `auth.json`，源文件必须是普通文件且不能是 symlink，目标权限为 `0600`；源目录中的 `config.toml`、`skills/`、`plugins/`、session、日志和其他文件一律不复制。缺少或类型不符时返回 `unavailable`，不能回退到真实用户目录。测试结束删除临时目录，日志不输出认证内容。

先把 response schema 解析成绝对路径，再通过 stdin 传入 prompt：

```text
codex exec --json --ephemeral --ignore-user-config --skip-git-repo-check --output-schema <absolute-schema-path> -C <cwd> -
```

response schema 固定 `selected_skill`、`action`、`observations[]`、`artifacts[]` 和 `unresolved[]`。helper 同时保存退出码、JSONL 事件路径与最后响应路径。`selected_skill` 只是结果字段，不是加载凭据。

`extractLoadedSkillEvidence(events)` 只接受两类加载记录：Codex 原生 `skill.loaded` 元数据，或退出码为 0、且解析后精确读取 catalog 中某个 `SKILL.md` 的只读工具事件。记录包含 `skill`、`resolved_path`、`event_index` 和 `source`；`current-skill`、`red` 与 `forward` 没有这类事件时必须失败，不能采信模型自报的 Skill 名称。`no-skill` 阶段则应记录“没有加载事件”，不能把它伪造成失败。评估 prompt 要求在业务动作前只读加载所选 Skill，以便 JSONL 留下可核对事件。

- [ ] **Step 3: 运行 RED**

运行：

```bash
bun test tests/skills/eval/run.test.ts tests/skills/eval/action-manifest.test.ts tests/runtime/helpers --timeout 30000
```

预期：失败，因为 helper、加载记录解析与 action manifest 实现尚不存在；失败原因不能是测试语法或 fixture 路径错误。

- [ ] **Step 4: 实现最小 helper、runner 与 action manifest**

只实现 Step 2 测试要求的行为。`run.ts` 支持 `no-skill/current-skill/red/forward`、baseline 完整性检查，以及 action manifest 的 write/check-staged；不得读取真实用户 home，也不得把 `selected_skill` 当作加载记录。

```bash
bun test tests/skills/eval/run.test.ts tests/skills/eval/action-manifest.test.ts tests/runtime/helpers --timeout 30000
```

预期：0 fail、0 skip。

- [ ] **Step 5: 运行无 Skill 对照**

runner 为每个 case 创建没有 kata plugin、`AGENTS.md` 或 kata Skill 的临时 cwd，并运行：

```bash
bun tests/skills/eval/run.ts --phase no-skill --manifest tests/skills/eval/manifest.json
```

预期：生成九份业务 `no_skill` 记录。测试只保存实际行为和偏差，不要求模型刻意失败。

- [ ] **Step 6: 运行当前 Skill 基线**

在尚未执行 Task 1 的当前仓库运行同一批 raw input：

```bash
bun tests/skills/eval/run.ts --phase current-skill --manifest tests/skills/eval/manifest.json
```

预期：生成九份业务 `current_skill` 记录；每份包含实际加载记录、工具动作、产物和与期望的差异。任一运行缺失时不得开始迁移。

- [ ] **Step 7: 保存三份旧 bootstrap 对照**

使用同一份 `bootstrap-manifest.json` 先运行 no-Skill，再分别挂载三个旧 bootstrap。旧 bootstrap 只作为评估材料，不复制到新根目录：

```bash
bun tests/skills/eval/run.ts --phase no-skill --manifest tests/skills/eval/bootstrap-manifest.json --output docs/migrations/kata-v4/bootstrap-baselines/no-skill.json
bun tests/skills/eval/run.ts --phase current-skill --runtime codex --bootstrap .agents/skills/using-kata-codex --manifest tests/skills/eval/bootstrap-manifest.json --output docs/migrations/kata-v4/bootstrap-baselines/codex-current.json
bun tests/skills/eval/run.ts --phase current-skill --runtime codex --bootstrap .reasonix/skills/using-kata-reasonix --manifest tests/skills/eval/bootstrap-manifest.json --output docs/migrations/kata-v4/bootstrap-baselines/reasonix-current.json
bun tests/skills/eval/run.ts --phase current-skill --runtime codex --bootstrap .hermes/skills/using-kata-hermes --manifest tests/skills/eval/bootstrap-manifest.json --output docs/migrations/kata-v4/bootstrap-baselines/hermes-current.json
```

预期：四份记录使用完全相同的三条原始输入；每份 current 记录都保存实际加载路径与差异。Reasonix/Hermes bootstrap 在这里由同一个受控 Codex evaluator 读取，只比较 prompt 行为，不代表对应平台端到端通过。任一旧 bootstrap 无法读取或缺少加载记录时，Task 0 保持未完成。

- [ ] **Step 8: 验证 action manifest 并提交基线**

```bash
bun tests/skills/eval/run.ts --check-baselines --manifest tests/skills/eval/manifest.json
bun tests/skills/eval/run.ts --check-bootstrap-baselines --manifest tests/skills/eval/bootstrap-manifest.json
bun tests/skills/eval/run.ts --write-action-manifest task-00 --output docs/migrations/kata-v4/skill-actions/task-00.paths.z --allow tests/runtime/helpers tests/skills/eval docs/migrations/kata-v4/skill-baselines docs/migrations/kata-v4/bootstrap-baselines docs/migrations/kata-v4/skill-actions/task-00.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-00.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-00.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-00.paths.z
git commit -m "test: ✅ record pre-migration skill baselines"
```

预期：18 份业务基线与四份 bootstrap 对照齐全，不含认证材料；提交内容与 `task-00.paths.z` 完全一致。

---

### Task 1: 建立根级 Skill 结构检查并迁移唯一正文树

**Files:**
- Create: `packages/cli/src/services/skills/catalog.ts`
- Create: `packages/cli/src/services/skills/audit.ts`
- Create: `tests/skills/catalog.test.ts`
- Create: `tests/skills/migration-shape.test.ts`
- Move: `.claude/skills/case-*`, `.claude/skills/defect-analyze`, `.claude/skills/infra-diagnose`, `.claude/skills/knowledge-curate`, `.claude/skills/playwright-automation`, `.claude/skills/sql-merge-validate`, `.claude/skills/workspace-manage` → `skills/`
- 移动后修改：`skills/playwright-automation/scripts/build-case-tasks.ts`
- 移动后修改：`skills/playwright-automation/scripts/run-tests-notify.ts`
- 移动后修改：`skills/playwright-automation/scripts/report-to-pdf.ts`
- 移动后修改：`skills/playwright-automation/templates/handoff.md.hbs`
- Modify: `tsconfig.base.json`
- Modify: `tsconfig.json`
- Modify exactly: `docs/migrations/kata-v4/skill-actions/task-01-reference-inputs.paths.z` 中列出的 active imports/tests，它们在迁移前引用 `.claude/skills` 或 `@skills/*`
- Create: `docs/migrations/kata-v4/skill-actions/task-01-reference-inputs.paths.z`
- Create: `docs/migrations/kata-v4/skill-actions/task-01.paths.z`

**Interfaces:**
- Consumes: 九个现有 Skill 目录，不改变其含义。
- Produces: `BUSINESS_SKILLS`、`discoverSkills()`、`auditSkillTree()` 与唯一根级正文树；严格结构与平台中立检查在所有 Skill 改完后的 Task 13 执行。

- [ ] **Step 1: 写失败的 catalog 与 shape tests**

先用 `rg --hidden -l -0 --glob '!.git/**'` 扫描 active source、package config 与 tests，把实际引用旧 Skill 路径的文件写入 `task-01-reference-inputs.paths.z`。排除 `docs/superpowers/**`、历史报告和等待 cleanup 的 inert source；manifest 使用 NUL 分隔、稳定排序且不含 glob。迁移只能修改这份清单中的引用文件。

```ts
export const BUSINESS_SKILLS = [
  "case-draft", "case-edit", "case-hotfix", "defect-analyze", "infra-diagnose",
  "knowledge-curate", "playwright-automation", "sql-merge-validate", "workspace-manage",
] as const;

test("discovers exactly nine business skills before bootstrap creation", () => {
  const businessSkills = discoverSkills(repoRoot)
    .filter((skill) => skill.business)
    .map((skill) => skill.name)
    .sort();
  expect(businessSkills).toEqual([...BUSINESS_SKILLS].sort());
});

test("uses real root directories as the canonical source", () => {
  for (const skill of discoverSkills(repoRoot)) {
    expect(realpathSync(skill.directory).startsWith(realpathSync(join(repoRoot, "skills"))))
      .toBe(true);
    expect(lstatSync(skill.directory).isSymbolicLink()).toBe(false);
  }
});
```

迁移阶段只断言目录名等于 frontmatter name、九个目录都是真实目录、catalog 不跟随旧平台 symlink。目录内暂时只允许 Task 1 明列的三份 Playwright package import wrapper 与一条 template symlink；现有 `rules/`、其他 `templates/` 和平台工具名由各 Skill Task 逐一消除，不能在 Task 1 提前要求全部通过。

- [ ] **Step 2: 运行 RED**

```bash
bun test tests/skills/catalog.test.ts tests/skills/migration-shape.test.ts
```

预期：失败，因为根级 `skills/` 和新 service 尚不存在。

- [ ] **Step 3: 实现 catalog 和 audit**

```ts
// packages/cli/src/services/skills/audit.ts
import type { SkillAuditResult } from "../types.ts";

export interface SkillCatalogEntry {
  name: string;
  directory: string;
  skillFile: string;
  description: string;
  business: boolean;
}

export function discoverSkills(root: string): SkillCatalogEntry[];
export function auditSkillTree(root: string): Promise<SkillAuditResult>;
```

`discoverSkills()` 只枚举根级真实目录，不判断用户请求。Task 1 的 migration audit 只筛选 `business: true` 的条目并与 `BUSINESS_SKILLS` 比较，因此 Task 2 加入 `using-kata` 后这条测试仍然成立。Task 2 再增加全量 release audit，精确要求 `using-kata + BUSINESS_SKILLS` 共十项。

- [ ] **Step 4: 移动正文与资源，更新 imports**

直接移动九个业务目录，不复制，也不新建额外 symlink。本 Task 不移动 `.claude/skills/_shared/**` 或 `.claude/prompt/_shared/**`；它们由 `case-draft` Task 4 统一审阅和迁移。

CLI Tasks 8–9 留下的三份 TypeScript wrapper 与一条 Handlebars symlink 会随 `playwright-automation` 一起进入根级 Skill。移动后立即把三个 wrapper 改成稳定的 package import wrapper，不能把它们改成 symlink。`build-case-tasks.ts` 与 `run-tests-notify.ts` 既保留公开 API，也保留直接执行分支；它们不解析参数、不改写 stdin/stdout，把 `runCli()` 返回值原样赋给 `process.exitCode`：

```ts
// skills/playwright-automation/scripts/build-case-tasks.ts
import { runCli } from "../../../packages/cli/src/app.ts";
export { buildCaseTaskList } from "../../../packages/cli/src/domain/automation/case-task-list.ts";
if (import.meta.main) {
  process.exitCode = await runCli(["automation", "tasks", ...Bun.argv.slice(2)]);
}

// skills/playwright-automation/scripts/run-tests-notify.ts
import { runCli } from "../../../packages/cli/src/app.ts";
export * from "../../../packages/cli/src/domain/automation/run.ts";
if (import.meta.main) {
  process.exitCode = await runCli(["automation", "run", ...Bun.argv.slice(2)]);
}

// skills/playwright-automation/scripts/report-to-pdf.ts
export * from "../../../packages/cli/src/domain/runs/report-pdf.ts";
```

`skills/playwright-automation/templates/handoff.md.hbs` 是唯一保留的 symlink，链接内容改为 `../../../packages/cli/src/domain/runs/assets/handoff.md.hbs`。

`migration-shape.test.ts` 要检查前两份 wrapper 的 `import.meta.main` 分支分别转发到 `automation tasks` 与 `automation run`，检查 `report-to-pdf.ts` 只做 package re-export，并确认 template symlink 的 realpath 位于 `packages/cli/` 且没有断链。测试还要直接执行前两份 wrapper 的 `--help`，断言退出码和 CLI 直达命令一致；导入第三份 wrapper 验证公开 API；读取第四项 realpath。四项在 Tasks 1–11 保持可用，只能由 Task 12 删除。

- [ ] **Step 5: 运行 GREEN 与旧辅助测试**

```bash
bun test tests/skills/catalog.test.ts tests/skills/migration-shape.test.ts
bun test packages/cli/tests packages/contracts/tests --timeout 30000
bun run type-check
```

预期：此时恰好有九个业务目录；catalog 只返回根级正文，不读取旧平台 tree；现有 Skill 脚本从新路径运行通过。第十个目录 `using-kata` 只能由 Task 2 创建。旧平台 tree 的引用在 Task 13 关闭，实体由清理计划在用户复核后删除。

- [ ] **Step 6: 提交**

```bash
bun tests/skills/eval/run.ts --write-action-manifest task-01 --output docs/migrations/kata-v4/skill-actions/task-01.paths.z --allow .claude/skills skills packages/cli/src/services/skills tests/skills/catalog.test.ts tests/skills/migration-shape.test.ts tsconfig.base.json tsconfig.json docs/migrations/kata-v4/skill-actions/task-01-reference-inputs.paths.z docs/migrations/kata-v4/skill-actions/task-01.paths.z --allow-from docs/migrations/kata-v4/skill-actions/task-01-reference-inputs.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-01.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-01.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-01.paths.z
git commit -m "refactor: ✨ move kata skills to the canonical root"
```

---

### Task 2: 建立路由评估工具与公共 using-kata

**Files:**
- Create: `skills/using-kata/SKILL.md`
- Create: `skills/using-kata/references/codex-tools.md`
- Create: `skills/using-kata/references/claude-tools.md`
- Create: `skills/using-kata/references/reasonix-tools.md`
- Create: `skills/using-kata/references/hermes-tools.md`
- Create: `packages/cli/src/services/skills/route-check.ts`
- Create: `packages/cli/src/services/runtime/codex.ts`
- Create: `packages/cli/src/services/runtime/temporary-home.ts`
- Move: `tests/skills/eval/response.schema.json` → `packages/contracts/schemas/v1/CodexSkillResponse.v1.schema.json`
- Create: `packages/contracts/src/schema-paths.ts`
- Create: `packages/contracts/tests/fixtures/v1/CodexSkillResponse.json`
- Create: `packages/contracts/tests/package-assets.test.ts`
- Modify: `packages/contracts/package.json`
- Modify: `packages/contracts/scripts/generate-types.ts`
- Modify: `packages/contracts/src/generated/v1.ts`
- Modify: `packages/contracts/src/validators.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/tests/schema-validation.test.ts`
- Modify: `packages/contracts/tests/generated-types.test.ts`
- Modify: `packages/cli/src/services/default-services.ts`
- Modify: `packages/cli/src/commands/skills/index.ts`
- Modify: `tests/runtime/helpers/codex.ts`
- Modify: `tests/runtime/helpers/temporary-home.ts`
- Modify: `tests/skills/eval/run.ts`
- Modify: `tests/skills/eval/run.test.ts`
- Modify: `tests/skills/catalog.test.ts`
- Modify: `tests/skills/migration-shape.test.ts`
- Create: `tests/skills/routes/schema.json`
- Create: `tests/skills/routes/using-kata.json`
- Create: `tests/skills/using-kata.test.ts`
- Create: `packages/cli/tests/services/codex-runtime.test.ts`
- Create: `packages/cli/tests/commands/skills.test.ts`
- Create: `docs/migrations/kata-v4/bootstrap-baselines/canonical-forward.json`
- Create: `docs/migrations/kata-v4/skill-actions/task-02.paths.z`

**Interfaces:**
- Consumes: 平台中立 catalog、Task 0 的 Codex helper 与 bootstrap 对照。
- Produces: 一个公共 bootstrap、`RouteFixture`、package-owned `CodexRuntimeInvoker` 与 `runRouteCheck()`；response schema 成为 `packages/contracts` 资产，测试 helper 只做薄封装。

- [ ] **Step 1: 把旧 bootstrap 缺口写成失败断言**

读取 Task 0 的四份 bootstrap 对照，不重新运行已经失效的旧 symlink。`using-kata.json` 必须复用 `bootstrap-manifest.json` 的三条原始输入，并把已观察到的“8 skills”、重复路由表、过期工具名或多信号循环写成明确的 forbidden assertion。若四份对照没有暴露可复现缺口，停止本 Task，先补一条能让旧 bootstrap 失败的压力场景。

fixture 契约：

```ts
export interface RouteCase {
  id: string;
  input: string;
  kind: "trigger" | "exclude" | "transfer" | "needs_input";
  expectedSkill?: string;
  forbiddenSkills?: string[];
}

export interface RouteFixture {
  skill: string;
  cases: RouteCase[];
}
```

- [ ] **Step 2: 实际运行 RED**

```bash
bun tests/skills/eval/run.ts --phase red --skill using-kata --source bootstrap-baselines --manifest tests/skills/eval/bootstrap-manifest.json --fixture tests/skills/routes/using-kata.json
```

预期：命令非 0，且至少一条已记录的旧 bootstrap 行为违反新断言；不能因为路径不存在、认证缺失或 JSON 无效而失败。

- [ ] **Step 3: 先固定 package schema 与运行时边界，再移动 Codex invoker**

先添加 contracts package 资产测试与 fake runtime 测试，再运行：

```bash
bun test packages/contracts/tests/package-assets.test.ts packages/contracts/tests/schema-validation.test.ts packages/contracts/tests/generated-types.test.ts packages/cli/tests/services/codex-runtime.test.ts
```

预期：失败，因为 package-owned response schema、resolver、受控 runtime payload 和 package invoker 尚不存在；失败不能来自 tgz 解压或 fake binary 语法错误。

先把 Task 0 的临时 response schema 移到 `packages/contracts/schemas/v1/CodexSkillResponse.v1.schema.json`，由既有生成器产出类型与 validator。`packages/contracts/src/schema-paths.ts` 只解析本 package 随包发布的 schema 资产；`package.json` 显式包含并导出 `schemas/v1/*.schema.json`。`package-assets.test.ts` 从打包后的 contracts tgz 解压并调用 resolver，证明它返回安装目录中的绝对路径，不能回退到仓库 `tests/`。`tests/skills/eval/run.ts` 与薄 helper 改用同一 resolver，旧测试路径不再保留副本。

随后把 Task 0 helper 的进程、认证 allowlist、临时 home、schema resolver 和 JSONL 加载记录解析移到：

```ts
// packages/cli/src/services/runtime/codex.ts
export interface CodexInvocationInput {
  cwd: string;
  prompt: string;
  authHomeSource: string;
  skillSource: "none" | "cwd" | "installed-runtime";
  runtimePayload?: {
    kind: "codex-plugin-zip";
    archivePath: string;
    sha256: string;
  };
  timeoutMs: number;
}

export interface CodexRuntimePayloadInstaller {
  install(input: {
    archivePath: string;
    expectedSha256: string;
    targetCodexHome: string;
  }): Promise<{ installedPaths: string[] }>;
}

export interface CodexRuntimeDependencies {
  codexBinary: string;
  resolveResponseSchemaPath: () => string;
  runtimePayloadInstaller?: CodexRuntimePayloadInstaller;
}

export interface LoadedSkillEvidence {
  skill: string;
  resolved_path: string;
  event_index: number;
  source: "skill.loaded" | "readonly-tool-event";
}

export interface RuntimeInvocation {
  exitCode: number;
  stdout: string;
  stderr: string;
  events: unknown[];
  lastMessage: string;
  loaded_skill_evidence: LoadedSkillEvidence[];
}

export function createCodexRuntimeInvoker(
  dependencies: CodexRuntimeDependencies,
): { invoke(input: CodexInvocationInput): Promise<RuntimeInvocation> };
export function extractLoadedSkillEvidence(events: readonly unknown[]): LoadedSkillEvidence[];
```

生产依赖默认从 `packages/contracts` resolver 取得 response schema；只有单元测试可以注入 fake resolver，调用方不能传入任意 schema 路径。invoker 每次只创建一个权限为 `0700` 的临时 `CODEX_HOME`：先复制显式认证 allowlist；`skillSource: "none"` 禁止携带 payload，保持 auth-only；`"cwd"` 禁止携带 payload，只从受控 cwd 读取根级 tree；`"installed-runtime"` 必须携带 ZIP 路径与 SHA-256，并在启动 Codex 前通过注入的 installer 安装到这同一个临时 home。payload 摘要不符、installer 缺失或三种模式组合非法时返回明确错误，绝不能另建 home 或回退到真实 `~/.codex`。

Task 2 的 `createDefaultServices()` 只把显式 `KATA_E2E_CODEX_HOME_SOURCE` 传给 invoker；尚未存在 Task 3 installer 时，`installed-runtime` 明确返回 `unavailable`，`none/cwd` 仍可使用。Task 3 再把安全 plugin installer 注入同一 port。`tests/runtime/helpers/codex.ts` 与 `temporary-home.ts` 改为只转调 package 实现，不保留第二份 spawn、认证或清理逻辑。`codex-runtime.test.ts` 使用 fake binary 与 fake installer 证明 CLI route-check 和测试 helper 得到相同 argv、绝对 package schema 路径、加载记录及错误分类；另断言 `none` 不安装任何载荷，`installed-runtime` 只安装到本次 spawn 使用的 home。

- [ ] **Step 4: 写 `using-kata` 最小正文**

```markdown
---
name: using-kata
description: 在 kata 仓库开始处理请求，或需要判断应使用哪个 kata Skill、映射当前平台工具时使用。具体业务由对应 Skill 处理。
---

# 使用 kata

处理请求前先查看已发现 Skill 的 `name` 与 `description`。

多个 Skill 同时适用时，先比较明确的 URL、ID、目录和文件扩展名，再比较意图。加载后发现不合适时只转交一次；仍不能判断就说明分歧并询问用户。

根据当前平台只读取一份工具说明：

- Codex：`references/codex-tools.md`
- Claude：`references/claude-tools.md`
- Reasonix：`references/reasonix-tools.md`
- Hermes：`references/hermes-tools.md`

不要在这里复制业务 Skill 的完整路由或流程。
```

四份工具说明把询问、计划、子代理、shell、文件编辑、浏览器和 worktree 等通用动作映射到当前平台能力；不存在的工具标成“不支持”，不发明替代名称。这四份文件是平台工具名检查的唯一豁免路径，业务 Skill 不得引用其中的平台专名。

此时修改 Task 1 的 catalog/shape tests，保留“九个 `business: true`”断言，并新增全量发布集合断言：

```ts
test("discovers the complete ten-skill release catalog", () => {
  const allNames = discoverSkills(repoRoot).map((skill) => skill.name).sort();
  expect(allNames).toEqual(["using-kata", ...BUSINESS_SKILLS].sort());
  expect(discoverSkills(repoRoot).filter((skill) => skill.business)).toHaveLength(9);
});
```

`migration-shape.test.ts` 同步断言 `using-kata` 是唯一 `business: false` 的 bootstrap，避免以后新增目录时只让某一阶段的测试通过。

- [ ] **Step 5: 实现测试专用 route evaluator**

```ts
import type { RouteCheckResult } from "../types.ts";

export interface RuntimeInvoker {
  invoke(input: { runtime: string; prompt: string; cwd: string }): Promise<RuntimeInvocation>;
}

export async function runRouteCheck(input: {
  runtime: string;
  fixtures: readonly RouteFixture[];
  invoker: RuntimeInvoker;
}): Promise<RouteCheckResult>;
```

`RouteCheckResult` 必须直接导入 CLI Task 11 已定义的 `packages/cli/src/services/types.ts` DTO，不得在 Skill service、command 或测试中重复声明。evaluator 把原始输入与根级 Skill tree 交给 runtime。Task 2 只实现 `source=root`；Task 3 在 release schema 与安全安装器可用后接入 `source=release-manifest` 的公开 list/audit/route-check 分支，最终测试 helper 只能调用该 service，不能另做一套实现。评分必须使用 `RuntimeInvocation.loaded_skill_evidence`：其中的路径需精确落在 catalog 的某个 `SKILL.md`，且每次最多加载一个业务 Skill。`selected_skill` 只用于核对，不参与加载判定。`kata skills route-check` 只提供评估能力，生产请求仍由平台原生 Skill discovery 处理。

- [ ] **Step 6: 运行 GREEN 与 canonical forward**

```bash
bun test packages/contracts/tests/package-assets.test.ts packages/contracts/tests/schema-validation.test.ts packages/contracts/tests/generated-types.test.ts packages/cli/tests/services/codex-runtime.test.ts tests/skills/catalog.test.ts tests/skills/migration-shape.test.ts tests/skills/using-kata.test.ts packages/cli/tests/commands/skills.test.ts
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/using-kata.json
bun tests/skills/eval/run.ts --phase forward --skill using-kata --source root --manifest tests/skills/eval/bootstrap-manifest.json --output docs/migrations/kata-v4/bootstrap-baselines/canonical-forward.json
```

预期：contracts tgz 内可解析绝对 response schema；catalog 包含 `using-kata + 9 business skills`，恰好十个目录；Task 1 的九业务 Skill 测试仍通过；fake invoker、真实 root-source evaluator 与同输入 forward 都通过；正文没有第二份路由表。缺少受控 Codex 认证或加载事件时保持 Task 未完成。

- [ ] **Step 7: 验证 action manifest 并提交**

```bash
bun tests/skills/eval/run.ts --write-action-manifest task-02 --output docs/migrations/kata-v4/skill-actions/task-02.paths.z --allow skills/using-kata packages/contracts packages/cli/src/services/skills packages/cli/src/services/runtime packages/cli/src/services/default-services.ts packages/cli/src/commands/skills tests/runtime/helpers tests/skills/eval tests/skills/routes tests/skills/catalog.test.ts tests/skills/migration-shape.test.ts tests/skills/using-kata.test.ts packages/cli/tests/services/codex-runtime.test.ts packages/cli/tests/commands/skills.test.ts docs/migrations/kata-v4/bootstrap-baselines/canonical-forward.json docs/migrations/kata-v4/skill-actions/task-02.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-02.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-02.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-02.paths.z
git commit -m "feat: ✨ add the platform-neutral kata bootstrap"
```

---

### Task 3: 实现四平台 adapter、打包、安装和结构检查

**Files:**
- Create: `adapters/types.ts`
- Create: `adapters/registry.ts`
- Create: `adapters/codex/runtime.json`
- Create: `adapters/claude/runtime.json`
- Create: `adapters/reasonix/runtime.json`
- Create: `adapters/reasonix/config.toml.hbs`
- Create: `adapters/hermes/runtime.json`
- Create: `adapters/hermes/config.yaml.hbs`
- Create: `.claude-plugin/plugin.json`
- Modify: `.codex-plugin/plugin.json`
- Create: `packages/cli/src/services/plugins/pack.ts`
- Create: `packages/cli/src/services/plugins/install.ts`
- Create: `packages/cli/src/services/plugins/check.ts`
- Create: `packages/cli/src/services/plugins/release-manifest.ts`
- Create: `packages/contracts/schemas/v1/ReleaseManifest.v1.schema.json`
- Create: `packages/contracts/tests/fixtures/v1/ReleaseManifest.json`
- Modify: `packages/contracts/scripts/generate-types.ts`
- Modify: `packages/contracts/src/generated/v1.ts`
- Modify: `packages/contracts/src/validators.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/tests/schema-validation.test.ts`
- Modify: `packages/contracts/tests/generated-types.test.ts`
- Modify: `packages/contracts/tests/package-assets.test.ts`
- Modify: `packages/cli/src/services/default-services.ts`
- Modify: `packages/cli/src/commands/plugins/index.ts`
- Modify: `packages/cli/src/services/skills/catalog.ts`
- Modify: `packages/cli/src/services/skills/audit.ts`
- Modify: `packages/cli/src/services/skills/route-check.ts`
- Modify: `packages/cli/src/commands/skills/index.ts`
- Create: `scripts/package/build-all.ts`
- Create: `scripts/package/check-all.ts`
- Create: `scripts/package/generate-openai-yaml.ts`
- Create: `tests/runtime/platform-packages.test.ts`
- Create: `packages/cli/tests/commands/plugins.test.ts`
- Create: `packages/cli/tests/services/release-manifest-skills.test.ts`
- Modify: `packages/cli/tests/commands/skills.test.ts`
- Create: `docs/migrations/kata-v4/skill-actions/task-03.paths.z`

**Interfaces:**
- Consumes: 根级 Skill catalog、根版本与 `PluginService` port。
- Produces: 从干净 commit 构建 CLI tgz、四个确定性 ZIP 与严格 release manifest 的能力，只接受显式目标的安全安装器，以及完整实现 `source=release-manifest` 的 SkillService；source-complete production release 只由 Roadmap Task 6 生成一次。

- [ ] **Step 1: 写失败的 package shape tests**

```ts
import type {
  PluginCheckInput,
  PluginCheckResult,
  PluginPackInput,
  PluginPackageResult,
  RuntimeName,
} from "@cli/services/types";

export interface RuntimeAdapter {
  name: RuntimeName;
  packageRootEntries: readonly string[];
  discovery: "manifest" | "target-directory";
  installSubdirectory: string;
  staticOnly: boolean;
}

export async function packRuntime(input: PluginPackInput): Promise<PluginPackageResult>;
export async function checkRuntime(input: PluginCheckInput): Promise<PluginCheckResult>;
export async function computeInputTreeSha256(input: {
  repoRoot: string;
  paths: readonly string[];
}): Promise<string>;
```

`RuntimeName`、`PluginPackInput`、`PluginCheckInput`、`PluginPackageResult` 与 `PluginCheckResult` 必须直接导入 CLI Task 11 的 `packages/cli/src/services/types.ts`，不得在 plugin service、adapter、command 或测试中重复声明。

测试断言：版本和 source commit 只来自根目录与当前 commit；每个 package/check DTO 及 release manifest 都带相同的 `input_tree_sha256`；任一打包输入有未提交修改时 `build-all.ts` 必须非 0 且不覆盖旧 manifest；压缩包无额外顶层目录且可重复构建；不含 `.agents`、旧 `.claude/skills`、tests、runs 或 cache。Codex 包含 `.codex-plugin/`、`skills/`、assets、license、readme；Claude 包含 `.claude-plugin/` 与 `skills/`；Reasonix/Hermes 只能安装到显式目标之下。Manifest 保存精确路径，不使用 glob。CLI tgz 必须包含 `packages/contracts` 的两个 schema 资产；从解压后的安装目录启动 fake Codex 时，invoker 的 `--output-schema` 必须指向解压目录中的 `CodexSkillResponse.v1.schema.json`，不能依赖源码仓库。

- [ ] **Step 2: 运行 RED**

```bash
bun test packages/contracts/tests/schema-validation.test.ts packages/contracts/tests/generated-types.test.ts packages/contracts/tests/package-assets.test.ts tests/runtime/platform-packages.test.ts packages/cli/tests/commands/plugins.test.ts
```

预期：失败，因为严格 release schema、adapter、plugin service 和安装后 schema 解析尚不存在。

- [ ] **Step 3: 实现 adapters 与 Codex metadata generator**

`generate-openai-yaml.ts` 读取每个 SKILL.md，只在 Codex staging tree 中生成带引号的 YAML：

```yaml
interface:
  display_name: "Case Draft"
  short_description: "根据产品需求、设计稿或功能说明编写并复核可执行的 QA 测试用例"
  default_prompt: "使用 $case-draft 根据这份需求材料编写测试用例。"
policy:
  allow_implicit_invocation: true
```

校验 `short_description` 长度为 25–64 个字符，并要求 `default_prompt` 含 `$skill-name`。根级 Skill 不含 `agents/`。

- [ ] **Step 4: 实现安全安装与检查**

`install` 把每个 archive entry 解析到显式 `--target` 之下，拒绝绝对路径、`..` 和 symlink 越界，且不默认写入真实用户目录。`check` 安装到临时目标，再检查 catalog、manifest、资源链接和版本。

`ReleaseManifest.v1.schema.json` 是 `dist/release-manifest.json` 的唯一长期契约，必须设置 `additionalProperties: false`，并精确约束 schema version、项目版本、`source_commit`、`input_tree_sha256`、CLI tgz、四个平台 ZIP、artifact SHA-256、文件数与 check 结果。schema 分开生成 `ReleaseCliArtifact`（`kind: "cli"`，没有 runtime）与 `ReleaseRuntimeArtifact`（`kind: "runtime"`，runtime 只能是四个平台）；CLI tgz 不能借用 `PluginPackageResult`。生成的 `ReleaseManifest`、两个 artifact 类型和 validator 从 `packages/contracts/src/index.ts` 导出；`packages/cli/src/services/plugins/release-manifest.ts` 只能导入这些导出项来构建和解析 manifest，不能在 CLI、脚本或测试中再写一份 interface/schema。`package-assets.test.ts` 同时证明发布后的 contracts package 可解析这份 schema。

Task 3 还要在 `createDefaultServices()` 中把 Codex runtime payload installer 接到安全的 `PluginService.install()`：先比较 payload SHA-256，再以 `runtime: "codex"` 和 invoker 创建的同一个 `targetCodexHome` 安装。adapter 不得读取真实 home，也不得在 service 外另解压一次；由此让 `installed-runtime` 成为可用模式，`none/cwd` 的隔离规则保持不变。

同一 installer 与 release manifest parser 还要接入 `SkillService` 的 `source=release-manifest`：list/audit 从 manifest 指定的 runtime archive 安装到临时目标后读取 catalog；route-check 在 Codex 上使用该临时 payload 与同一个 `CodexRuntimeInvoker`，其他三个静态 runtime 返回明确的 `needs_input` 及稳定原因，不得落回 root tree。`manifest_path` 缺失、runtime artifact/SHA 不匹配或安装失败都返回真实失败。`release-manifest-skills.test.ts` 用 fake archive/invoker 覆盖 list、audit、Codex route-check、三个静态 runtime 与错误路径；命令测试证明公开 `kata skills ... --source release-manifest --manifest-path ...` 不再走 unavailable adapter。

`build-all.ts` 固定以下精确打包根：

```ts
const RELEASE_INPUT_ROOTS = [
  "package.json",
  "bun.lock",
  "tsconfig.json",
  "tsconfig.base.json",
  "LICENSE",
  "README.md",
  "README-EN.md",
  "packages",
  "skills",
  "adapters",
  ".codex-plugin",
  ".claude-plugin",
  "scripts/package",
] as const;
```

先对这些根一次运行 `git status --porcelain=v1 -z --untracked-files=all -- <roots...>`；只要有一条 tracked、staged 或 untracked 状态记录就立即退出，因此不会漏掉打包根下新建但尚未跟踪的文件。干净检查通过后，再用 `git ls-files -z -- <roots...>` 枚举摘要输入；摘要和 archive 都只能使用这次得到的精确文件清单。

干净检查通过后，把全部输入按 UTF-8 路径字节稳定排序，再对以下 NUL stream 计算一次 SHA-256：

```text
path\0type\0mode\0content-or-link-text-sha256\0
```

普通文件摘要来自原始 bytes，symlink 摘要来自 link text，不跟随目标。这个值就是 `input_tree_sha256`。CLI tgz、四个 ZIP、四个 runtime `PluginPackageResult`、每个 `PluginCheckResult` 与 release manifest 必须使用同一个值；`check-all.ts` 重新计算并逐项比较。通过后才从当前 commit 重建产物，最后写入精确路径、`source_commit`、`input_tree_sha256` 与 artifact SHA-256。

- [ ] **Step 5: 运行单元 GREEN，不生成 release**

```bash
bun test packages/contracts/tests/schema-validation.test.ts packages/contracts/tests/generated-types.test.ts packages/contracts/tests/package-assets.test.ts tests/runtime/platform-packages.test.ts packages/cli/tests/commands/plugins.test.ts packages/cli/tests/commands/skills.test.ts packages/cli/tests/services/codex-runtime.test.ts packages/cli/tests/services/release-manifest-skills.test.ts
```

预期：0 fail；测试只在临时 fixture repo/output 中调用 pack/check 函数，不写 production `dist/`。strict manifest、CLI/runtime artifact 类型、安装后 response schema、同一临时 Codex home、release-manifest SkillService、dirty-input、路径越界、symlink 越界、非确定性和 metadata 失败场景都被覆盖。此时没有生成 production release。

- [ ] **Step 6: 先提交所有打包输入**

```bash
bun tests/skills/eval/run.ts --write-action-manifest task-03 --output docs/migrations/kata-v4/skill-actions/task-03.paths.z --allow adapters .claude-plugin .codex-plugin packages/contracts packages/cli/src/services/plugins packages/cli/src/services/skills packages/cli/src/services/default-services.ts packages/cli/src/commands/plugins packages/cli/src/commands/skills scripts/package tests/runtime/platform-packages.test.ts packages/cli/tests/services/codex-runtime.test.ts packages/cli/tests/services/release-manifest-skills.test.ts packages/cli/tests/commands/plugins.test.ts packages/cli/tests/commands/skills.test.ts docs/migrations/kata-v4/skill-actions/task-03.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-03.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-03.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-03.paths.z
git commit -m "build: 📦 add kata runtime packages"
```

- [ ] **Step 7: 从干净 commit 复测打包能力，不生成 production release**

```bash
git status --short
bun test packages/contracts/tests/package-assets.test.ts tests/runtime/platform-packages.test.ts packages/cli/tests/services/release-manifest-skills.test.ts
test ! -e dist/release-manifest.json
```

预期：`git status --short` 无输出；单元测试在仓库外临时目录生成并校验 fixture archives，production `dist/release-manifest.json` 不存在。唯一 source-complete build 留给 Roadmap Task 6。

---

### Task 4: 以五阶段重构 `case-draft`

**Files:**
- Modify: `skills/case-draft/SKILL.md`
- Create: `skills/case-draft/phases/01-receive-materials.md`
- Create: `skills/case-draft/phases/02-understand-requirement.md`
- Create: `skills/case-draft/phases/03-confirm-scope.md`
- Create: `skills/case-draft/phases/04-draft-cases.md`
- Create: `skills/case-draft/phases/05-verify-delivery.md`
- Rename: `skills/case-draft/prompts/agent-worker.md` → `skills/case-draft/prompts/agent-case-writer.md`
- Modify: `skills/case-draft/prompts/agent-spec-reviewer.md`
- Modify: `skills/case-draft/prompts/agent-quality-reviewer.md`
- Move: `skills/case-draft/rules/naming-convention.md` → `skills/case-draft/references/naming-convention.md`
- 复核后创建：`skills/case-draft/references/case-writing.md`，来源为 `.claude/skills/_shared/case-qa.md`
- 复核后创建：`skills/case-draft/references/case-format-sample.md`，来源为 `.claude/prompt/_shared/case-format-sample.md`
- 复核后创建：`skills/case-draft/references/case-format-sample-xmind.md`，来源为 `.claude/prompt/_shared/case-format-sample.xmind.md`
- 读取并合并：把 `.claude/prompt/_shared/case-qa.md` 合入 `skills/case-draft/references/case-writing.md`；旧文件停止参与运行，交给复核后的清理计划删除
- 复核后创建：`skills/case-draft/references/output-artifacts.md`，来源为 `.claude/prompt/_shared/output-artifacts.md`
- Modify: `skills/case-draft/scripts/auto-fixer.ts`
- Modify: `skills/case-draft/scripts/case-draft.ts`
- Modify: `skills/case-draft/scripts/case-signal-analyzer.ts`
- Modify: `skills/case-draft/scripts/case-strategy-resolver.ts`
- Modify: `skills/case-draft/scripts/discuss.ts`
- Modify: `skills/case-draft/scripts/format-check-script.ts`
- Modify: `skills/case-draft/scripts/format-report-locator.ts`
- Modify: `skills/case-draft/scripts/lib/signal-probe.ts`
- Modify: `skills/case-draft/scripts/lib/strategy-router.ts`
- Modify: `skills/case-draft/scripts/prd-frontmatter.ts`
- Modify: `skills/case-draft/scripts/search-filter.ts`
- Modify: `skills/case-draft/scripts/source-analyze.ts`
- Modify: `skills/case-draft/scripts/test-case-flow.ts`
- Modify: `skills/case-draft/scripts/test-case-flow/project-resolver.ts`
- Modify: `skills/case-draft/scripts/test-case-flow/session.ts`
- Modify: `skills/case-draft/scripts/test-case-flow/source-consent.ts`
- Modify: `skills/case-draft/scripts/test-case-flow/source-resolver.ts`
- Modify: `skills/case-draft/scripts/writer-context-builder.ts`
- Create: `tests/skills/routes/case-draft.json`
- Create: `tests/runtime/fixtures/case-draft/**`
- Verify only: 路径迁移后的现有 case-draft 测试
- Modify: `docs/migrations/kata-v4/skill-baselines/case-draft.json`
- Create: `docs/migrations/kata-v4/skill-actions/task-04.paths.z`

**Interfaces:**
- Consumes: CaseDraft/FeatureMetadata/Run contracts、文件名 helper、cases export service，以及 CLI 持有的 `packages/cli/src/domain/cases/assets/case-document.md.hbs`。
- Produces: 一个五阶段 Skill、`runs/<run-id>/work/case-draft.json` 与同名 Markdown/XMind。

- [ ] **Step 1: 先写 route 与行为失败断言**

`case-draft.json` 至少包含：

```json
{
  "skill": "case-draft",
  "cases": [
    { "id": "lanhu", "kind": "trigger", "input": "https://lanhuapp.com/web/#/item/project/board?pid=fixture", "expectedSkill": "case-draft" },
    { "id": "prd", "kind": "trigger", "input": "根据 docs/fixtures/feature-prd.md 编写测试用例", "expectedSkill": "case-draft" },
    { "id": "existing-xmind", "kind": "transfer", "input": "整理 cases/现有需求.xmind", "expectedSkill": "case-edit", "forbiddenSkills": ["case-draft"] },
    { "id": "missing-source", "kind": "needs_input", "input": "帮我写用例" }
  ]
}
```

读取 `docs/migrations/kata-v4/skill-baselines/case-draft.json`，把每个已记录的 current/no-Skill 缺口写成 route 或行为断言；不要在迁移后重新运行或解释旧 Skill。`tests/runtime/fixtures/case-draft/red.test.ts` 必须覆盖 metadata 驱动路径、同名 Markdown/XMind 和回读一致性，并至少命中一个基线中确实出现的旧行为。

- [ ] **Step 2: 实际运行 RED**

```bash
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/case-draft.json
bun test tests/runtime/fixtures/case-draft/red.test.ts --timeout 600000
```

预期：至少一条命令非 0，失败原因是刚写入的基线缺口断言；不能因为 fixture 缺失、认证缺失或语法错误而失败。若两条命令都通过，停止改写并补充能复现旧缺口的压力场景。

- [ ] **Step 3: 写新的 frontmatter 与主流程**

```yaml
---
name: case-draft
description: 依 Lanhu/Axure 链接、Markdown PRD、设计稿、截图、fixture 或功能描述生成、扩写或复核 QA 测试用例。已有 XMind/CSV/Markdown 用例产物的编辑与转换交给 case-edit；已有用例转 UI 自动化交给 playwright-automation；单条缺陷回归交给 case-hotfix。
---
```

SKILL.md 正文只保留适用范围、五阶段顺序、各阶段读取时机、一次澄清规则、转交或停止条件与完成清单。删除 URL-only 静默分支和固定的 `archive.md/cases.xmind` 文案。

- [ ] **Step 4: 写五个 phase 契约**

每个阶段都使用可观察的输入和输出：

```text
01 接收材料：原始材料 -> 项目、版本、功能目标与 source refs
02 理清需求：材料 -> 已知内容、场景与待确认问题
03 确认范围：待确认问题 -> 已确认范围或 needs_input
04 编写用例：已确认范围 -> 通过 schema 校验的 CaseDraft
05 验证交付：CaseDraft -> metadata、同名 Markdown/XMind 与回读结果
```

`04-draft-cases.md` 把中间文件固定为 `<feature>/runs/<run-id>/work/case-draft.json`；`05` 在渲染前校验 schema，写入后回读两份产物。

- [ ] **Step 5: 统一三个 subagent prompt**

每份 prompt 只使用以下标题，并填写本任务特有内容：

```markdown
## 任务目的
## 输入材料
## 允许修改的范围
## 必须完成的动作
## 返回格式
## 停止条件
```

writer 只编辑分配给自己的草稿片段；spec reviewer 对照来源内容和范围；quality reviewer 检查中文是否自然，以及步骤和预期是否可执行。prompt 以相对路径引用必读文件，不复制整个 Skill。

- [ ] **Step 6: 接入 contracts 与动态产物**

脚本先让模型生成 CaseDraft JSON，再由 CLI 校验并渲染。任何脚本都不得按 `archive.md` 或 `cases.xmind` 猜路径；两条路径只由 metadata 决定。失败时保留 `work/case-draft.json`；成功时把它的 SHA-256 写入 RunResult。

- [ ] **Step 7: 运行 GREEN**

```bash
bun test packages/cli/tests/e2e/case-artifact-flow.test.ts tests/runtime/fixtures/case-draft --timeout 600000
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/case-draft.json
bun ./packages/cli/bin/kata skills audit --runtime codex
```

预期：route 4/4；fixture 写出 metadata 和同名 Markdown/XMind，文件名没有空格或标点；回读结果等于 CaseDraft；0 skip。

- [ ] **Step 8: 前向测试并审阅**

让新代理只读取根级 Skill，并复用基线中的原始输入：

```bash
bun tests/skills/eval/run.ts --phase forward --skill case-draft --source root --update-baseline docs/migrations/kata-v4/skill-baselines/case-draft.json
```

把实际澄清内容、CaseDraft 和产物与 fixture 断言逐项比较；发现漏洞后修正并重新运行 GREEN 与 forward。

- [ ] **Step 9: 验证 action manifest 并提交**

```bash
bun tests/skills/eval/run.ts --write-action-manifest task-04 --output docs/migrations/kata-v4/skill-actions/task-04.paths.z --allow skills/case-draft tests/skills/routes/case-draft.json tests/runtime/fixtures/case-draft docs/migrations/kata-v4/skill-baselines/case-draft.json docs/migrations/kata-v4/skill-actions/task-04.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-04.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-04.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-04.paths.z
git commit -m "refactor: ✨ rebuild case-draft as a five-stage skill"
```

---

### Task 5: 重构 `case-edit`

**Files:**
- Modify: `skills/case-edit/SKILL.md`
- Modify: `skills/case-edit/references/apply-corrections.md`
- Modify: `skills/case-edit/references/archive-xmind-sync.md`
- Modify: `skills/case-edit/scripts/history-convert.ts`
- Create: `tests/skills/routes/case-edit.json`
- Create: `tests/runtime/fixtures/case-edit/**`
- Modify: `docs/migrations/kata-v4/skill-baselines/case-edit.json`
- Create: `docs/migrations/kata-v4/skill-actions/task-05.paths.z`

**Interfaces:**
- Consumes: metadata 路径与 `CaseDocument` 转换 API。
- Produces: 在 Markdown、XMind、CSV 之间保持语义的编辑和转换流程。

- [ ] **Step 1: 先写 route 与 round-trip 失败断言**

route fixture 覆盖已有 `.xmind`、已有 `.csv`、只有 PRD 时转交 `case-draft`、功能目录转交 `playwright-automation`，以及含义不明的 `.md` 先询问它是需求还是用例。先读取已保存的对照：

```bash
bun tests/skills/eval/run.ts --show-baseline --skill case-edit
```

把已观察到的缺口写入 route fixture，并先写 round-trip 断言：

```ts
test("round-trips Markdown XMind CSV without semantic drift", async () => {
  const source = fixtureCaseDocument();
  expect(await roundTripAllFormats(source)).toEqual(source);
});
```

- [ ] **Step 2: 实际运行 RED**

```bash
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/case-edit.json
bun test tests/runtime/fixtures/case-edit --timeout 30000
```

预期：命令因已记录的 route 或语义漂移缺口而非 0；不能把缺少文件或测试语法错误当作 RED。若全部通过，先补充能复现旧缺口的场景。

- [ ] **Step 3: 写最小 frontmatter 与正文**

```yaml
---
name: case-edit
description: 拿到既有用例产物文件（.xmind、.csv 或 metadata 指向的 Markdown）时，用于编辑、同步、归档、标准化或格式转换，并保持语义不变。依 PRD 生成新用例交给 case-draft；只给需求功能目录转自动化交给 playwright-automation。
---
```

正文顺序为：解析显式产物或 metadata → 读取 CaseDocument → 执行语义编辑或仅格式转换 → round-trip 比较 → 只有输出路径变化时才更新 metadata。不得按固定文件名猜测产物。

- [ ] **Step 4: 最小修改 converter**

只调用 CLI Task 7 已提供的公开 cases API，并实现让 RED 断言通过所需的最小适配。若公开 API 缺失，停止本 Task，回到 CLI Task 7 补测试与实现；不得在本 Task 修改 `packages/cli` 或另建一份 converter。

- [ ] **Step 5: 运行 GREEN**

```bash
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/case-edit.json
bun test tests/runtime/fixtures/case-edit packages/cli/tests/e2e/case-artifact-flow.test.ts
bun ./packages/cli/bin/kata skills audit --runtime codex
```

预期：全部 route 通过；仅格式转换时语义 hash 不变；0 skip。

- [ ] **Step 6: 用同一输入运行 forward**

```bash
bun tests/skills/eval/run.ts --phase forward --skill case-edit --source root --update-baseline docs/migrations/kata-v4/skill-baselines/case-edit.json
```

预期：新代理的加载记录指向 `skills/case-edit/SKILL.md`，并通过与 RED 完全相同的原始输入和断言。

- [ ] **Step 7: 验证 action manifest 并提交**

```bash
bun tests/skills/eval/run.ts --write-action-manifest task-05 --output docs/migrations/kata-v4/skill-actions/task-05.paths.z --allow skills/case-edit tests/skills/routes/case-edit.json tests/runtime/fixtures/case-edit docs/migrations/kata-v4/skill-baselines/case-edit.json docs/migrations/kata-v4/skill-actions/task-05.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-05.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-05.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-05.paths.z
git commit -m "refactor: ✨ make case-edit metadata driven"
```

---

### Task 6: 重构 `case-hotfix`

**Files:**
- Modify: `skills/case-hotfix/SKILL.md`
- Modify: `skills/case-hotfix/references/hotfix-archive-format.md`
- Create: `tests/skills/routes/case-hotfix.json`
- Create: `tests/runtime/fixtures/case-hotfix/**`
- Modify: `docs/migrations/kata-v4/skill-baselines/case-hotfix.json`
- Create: `docs/migrations/kata-v4/skill-actions/task-06.paths.z`

**Interfaces:**
- Consumes: bug ID、ZenTao URL、缺陷描述与动态 Markdown 路径。
- Produces: 一条可执行的 hotfix 回归用例，不使用固定 archive 名称。

- [ ] **Step 1: 先写 route 与行为失败断言**

断言 `bug-view-123.html` 与数字 bug ID 触发本 Skill；原始堆栈转交 `defect-analyze`；完整 PRD 转交 `case-draft`；缺少修复范围时返回 `needs_input`。先读取已保存的对照，再把至少一个已观察到的缺口写入 `case-hotfix.json` 或行为 fixture：

```bash
bun tests/skills/eval/run.ts --show-baseline --skill case-hotfix
```

- [ ] **Step 2: 实际运行 RED**

```bash
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/case-hotfix.json
bun test tests/runtime/fixtures/case-hotfix --timeout 30000
```

预期：至少一条命令因刚写入的旧行为缺口而非 0；若全部通过，停止改写并补充压力场景。

- [ ] **Step 3: 写清楚 Skill 边界**

```yaml
---
name: case-hotfix
description: 拿到 bug ID、ZenTao bug URL、缺陷描述或修复说明时，用于编写一条聚焦修复路径、可直接执行的 hotfix 回归用例。异常堆栈或静态缺陷分析交给 defect-analyze；完整 PRD 用例设计交给 case-draft。
---
```

正文顺序为：读取 bug 与修复范围 → 找出修复路径和回归边界 → 缺少修复状态或范围时只询问一次 → 只生成一条用例 → 校验步骤与预期 → 写入 metadata 指定的 Markdown。reference 只描述字段，不写固定的 `archive.md` 文件名。

- [ ] **Step 4: 运行 GREEN**

```bash
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/case-hotfix.json
bun test tests/runtime/fixtures/case-hotfix
bun ./packages/cli/bin/kata skills audit --runtime codex
```

预期：route matrix 通过；fixture 只包含一条可执行用例；0 skip。

- [ ] **Step 5: 用同一输入运行 forward**

```bash
bun tests/skills/eval/run.ts --phase forward --skill case-hotfix --source root --update-baseline docs/migrations/kata-v4/skill-baselines/case-hotfix.json
```

预期：新代理加载 `case-hotfix`，并通过与 RED 相同的 route 和行为断言。

- [ ] **Step 6: 验证 action manifest 并提交**

```bash
bun tests/skills/eval/run.ts --write-action-manifest task-06 --output docs/migrations/kata-v4/skill-actions/task-06.paths.z --allow skills/case-hotfix tests/skills/routes/case-hotfix.json tests/runtime/fixtures/case-hotfix docs/migrations/kata-v4/skill-baselines/case-hotfix.json docs/migrations/kata-v4/skill-actions/task-06.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-06.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-06.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-06.paths.z
git commit -m "refactor: ✨ focus case-hotfix on one regression path"
```

---

### Task 7: 重构 `defect-analyze`

**Files:**
- Modify: `skills/defect-analyze/SKILL.md`
- Modify: `skills/defect-analyze/scripts/defect-report.ts`
- Modify: `skills/defect-analyze/scripts/scan-report.ts`
- Move: `skills/defect-analyze/templates/bug-report-zentao.html.hbs` → `skills/defect-analyze/assets/bug-report-zentao.html.hbs`
- Move: `skills/defect-analyze/templates/conflict-report.html.hbs` → `skills/defect-analyze/assets/conflict-report.html.hbs`
- Move: `skills/defect-analyze/templates/scan-report.html.hbs` → `skills/defect-analyze/assets/scan-report.html.hbs`
- Create: `tests/skills/routes/defect-analyze.json`
- Create: `tests/runtime/fixtures/defect-analyze/**`
- Modify: `docs/migrations/kata-v4/skill-baselines/defect-analyze.json`
- Create: `docs/migrations/kata-v4/skill-actions/task-07.paths.z`

**Interfaces:**
- Consumes: 堆栈、控制台或 HTTP 失败，冲突标记，以及代码 diff 或分支对。
- Produces: 带根因和下一条可执行动作的缺陷、冲突或静态扫描结果。

- [ ] **Step 1: 先写 route 与三模式失败断言**

route fixture 覆盖堆栈、带冲突标记的文本、分支 diff、已登记 ZenTao URL 转交 `case-hotfix`，以及模糊的“有问题”返回 `needs_input`。读取已保存的对照，把至少一个实际缺口写入 route 或三模式行为 fixture：

```bash
bun tests/skills/eval/run.ts --show-baseline --skill defect-analyze
```

- [ ] **Step 2: 实际运行 RED**

```bash
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/defect-analyze.json
bun test tests/runtime/fixtures/defect-analyze --timeout 30000
```

预期：至少一条命令因旧 Skill 的 route、模式选择或虚构复现结果而非 0；不能因 fixture 缺失或语法错误失败。若全部通过，先补充压力场景。

- [ ] **Step 3: 写精确 frontmatter 与三分支正文**

```yaml
---
name: defect-analyze
description: 收到异常堆栈、控制台或 HTTP 失败、带冲突标记的文本，或代码 diff/分支对时，用于根因分诊、冲突解决或静态缺陷扫描。已登记的 ZenTao bug URL 或 ID 交给 case-hotfix。
---
```

正文先根据可观察输入在 `runtime-failure | merge-conflict | static-diff` 中只选一个，再只加载对应脚本或 template。输出始终分开写已确认内容、推断、缺少的信息和下一条可执行命令；没有实际运行时，不声称已经复现。

- [ ] **Step 4: 最小修改脚本并运行 GREEN**

```bash
bun test tests/runtime/fixtures/defect-analyze --timeout 30000
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/defect-analyze.json
bun ./packages/cli/bin/kata skills audit --runtime codex
```

预期：三种模式生成不同且符合 contract 的结果；已登记 bug 正确转交；0 skip。

- [ ] **Step 5: 用同一输入运行 forward**

让新代理复用 RED 的原始输入，确认它不会虚构复现结果：

```bash
bun tests/skills/eval/run.ts --phase forward --skill defect-analyze --source root --update-baseline docs/migrations/kata-v4/skill-baselines/defect-analyze.json
```

- [ ] **Step 6: 验证 action manifest 并提交**

```bash
bun tests/skills/eval/run.ts --write-action-manifest task-07 --output docs/migrations/kata-v4/skill-actions/task-07.paths.z --allow skills/defect-analyze tests/skills/routes/defect-analyze.json tests/runtime/fixtures/defect-analyze docs/migrations/kata-v4/skill-baselines/defect-analyze.json docs/migrations/kata-v4/skill-actions/task-07.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-07.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-07.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-07.paths.z
git commit -m "refactor: ✨ clarify defect analysis modes"
```

---

### Task 8: 重构 `knowledge-curate`

**Files:**
- Modify: `skills/knowledge-curate/SKILL.md`
- Modify: `skills/knowledge-curate/scripts/knowledge-curate.ts`
- Modify: `skills/knowledge-curate/scripts/knowledge-curate/cli.ts`
- Modify: `skills/knowledge-curate/scripts/knowledge-curate/index-data.ts`
- Modify: `skills/knowledge-curate/scripts/knowledge-curate/maintenance.ts`
- Modify: `skills/knowledge-curate/scripts/knowledge-curate/read.ts`
- Modify: `skills/knowledge-curate/scripts/knowledge-curate/update.ts`
- Modify: `skills/knowledge-curate/scripts/knowledge-curate/write.ts`
- Create: `tests/skills/routes/knowledge-curate.json`
- Create: `tests/runtime/fixtures/knowledge-curate/**`
- Modify: `docs/migrations/kata-v4/skill-baselines/knowledge-curate.json`
- Create: `docs/migrations/kata-v4/skill-actions/task-08.paths.z`

**Interfaces:**
- Consumes: 项目业务术语、规则、查询或更新意图。
- Produces: `<project>/_shared/knowledge/` 下的查询结果或原子更新，并留下审计记录。

- [ ] **Step 1: 先写 route 与原子更新失败断言**

route fixture 覆盖“记一下这个规则”“这个业务术语是什么”、源码实现问题排除、PRD 用例请求转交 `case-draft`，以及缺少项目时返回 `needs_input`。读取已保存的对照，并先写 query 不落盘、create、update、去重、无效项目和不生成 `.bak` 的行为断言：

```bash
bun tests/skills/eval/run.ts --show-baseline --skill knowledge-curate
```

- [ ] **Step 2: 实际运行 RED**

```bash
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/knowledge-curate.json
bun test tests/runtime/fixtures/knowledge-curate packages/cli/tests/knowledge-curate.test.ts
```

预期：至少一条命令因已观察到的 route、非原子更新、重复记录或 `.bak` 副作用而非 0；若全部通过，停止改写并补充压力场景。

- [ ] **Step 3: 写清楚 Skill 边界**

```yaml
---
name: knowledge-curate
description: 查询、记录或维护项目业务知识、规则、术语和模块说明，或回答项目语境中的“XX 是什么”时使用。源码实现、测试用例、静态扫描和 UI 自动化分别交给对应 Skill。
---
```

正文顺序为：确定一个项目 → 选择 query/create/update → 读取索引与相关主题 → 写入前展示语义变化 → 原子写入并记录审计 → 重新读取。项目或规则含义不清时只询问一次，不猜测。

- [ ] **Step 4: 最小修改脚本**

只实现让 RED 断言通过所需的 query/create/update、去重、项目校验和原子写入；不得保留隐藏的 `.bak` 兼容分支。

- [ ] **Step 5: 运行 GREEN**

```bash
bun test tests/runtime/fixtures/knowledge-curate packages/cli/tests/knowledge-curate.test.ts
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/knowledge-curate.json
bun ./packages/cli/bin/kata skills audit --runtime codex
```

预期：query/create/update 全部通过；没有 backup copy；0 skip。

- [ ] **Step 6: 用同一输入运行 forward**

```bash
bun tests/skills/eval/run.ts --phase forward --skill knowledge-curate --source root --update-baseline docs/migrations/kata-v4/skill-baselines/knowledge-curate.json
```

- [ ] **Step 7: 验证 action manifest 并提交**

```bash
bun tests/skills/eval/run.ts --write-action-manifest task-08 --output docs/migrations/kata-v4/skill-actions/task-08.paths.z --allow skills/knowledge-curate tests/skills/routes/knowledge-curate.json tests/runtime/fixtures/knowledge-curate docs/migrations/kata-v4/skill-baselines/knowledge-curate.json docs/migrations/kata-v4/skill-actions/task-08.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-08.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-08.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-08.paths.z
git commit -m "refactor: ✨ streamline project knowledge curation"
```

---

### Task 9: 重构 `infra-diagnose`

**Files:**
- Modify: `skills/infra-diagnose/SKILL.md`
- Modify: `skills/infra-diagnose/references/diagnostic-playbook.md`
- Modify: `skills/infra-diagnose/references/knowledge-format.md`
- Modify: `skills/infra-diagnose/references/ssh-protocol.md`
- Create: `tests/skills/routes/infra-diagnose.json`
- Create: `tests/runtime/fixtures/infra-diagnose/**`
- Modify: `docs/migrations/kata-v4/skill-baselines/infra-diagnose.json`
- Create: `docs/migrations/kata-v4/skill-actions/task-09.paths.z`

**Interfaces:**
- Consumes: 连通性错误，以及已授权的主机和环境信息。
- Produces: 只读诊断；用户明确要求时执行授权范围内的修复，并写入脱敏知识记录。

- [ ] **Step 1: 先写 route、授权与脱敏失败断言**

route fixture 覆盖 JDBC no-route、timeout、refused，纯前端控制台错误转交 `defect-analyze`，业务术语查询转交 `knowledge-curate`，缺少 host 或授权时返回 `needs_input`。行为测试只使用隔离的本地 SSH fixture，不连接生产主机；它必须证明未授权时不修复，输出和知识文件不含凭据。先读取已保存的对照：

```bash
bun tests/skills/eval/run.ts --show-baseline --skill infra-diagnose
```

- [ ] **Step 2: 实际运行 RED**

```bash
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/infra-diagnose.json
bun test tests/runtime/fixtures/infra-diagnose --timeout 120000
```

预期：至少一条命令因已记录的 route、越权修复或脱敏缺口而非 0；若全部通过，先补充压力场景。

- [ ] **Step 3: 写清楚 Skill 边界**

```yaml
---
name: infra-diagnose
description: 出现数据源、数据库或服务器连通性错误，并允许通过 SSH 排查时使用。纯前端运行错误交给 defect-analyze；只维护业务知识交给 knowledge-curate。
---
```

正文顺序为：确认目标与授权 → 从只读检查开始（host、route、port、process、logs）→ 区分 DNS、network、firewall、service、auth → 提出修复方案 → 只在授权范围内执行 → 重验原始连接 → 记录脱敏结果。不得把 password 或 token 写入输出和知识文件。

- [ ] **Step 4: 运行 GREEN 与 secret scan**

```bash
bun test tests/runtime/fixtures/infra-diagnose --timeout 120000
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/infra-diagnose.json
rg -n 'password:|token:|cookie:' tests/runtime/fixtures/infra-diagnose/output
```

预期：fixture 和 route matrix 通过；secret scan 无输出。

- [ ] **Step 5: 用同一输入运行 forward**

让新代理复用 RED 输入，确认它在授权前不修复，并报告实际检查项：

```bash
bun tests/skills/eval/run.ts --phase forward --skill infra-diagnose --source root --update-baseline docs/migrations/kata-v4/skill-baselines/infra-diagnose.json
```

- [ ] **Step 6: 验证 action manifest 并提交**

```bash
bun tests/skills/eval/run.ts --write-action-manifest task-09 --output docs/migrations/kata-v4/skill-actions/task-09.paths.z --allow skills/infra-diagnose tests/skills/routes/infra-diagnose.json tests/runtime/fixtures/infra-diagnose docs/migrations/kata-v4/skill-baselines/infra-diagnose.json docs/migrations/kata-v4/skill-actions/task-09.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-09.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-09.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-09.paths.z
git commit -m "refactor: ✨ make infrastructure diagnosis authorization aware"
```

---

### Task 10: 重构 `sql-merge-validate`

**Files:**
- Modify: `skills/sql-merge-validate/SKILL.md`
- Modify: `skills/sql-merge-validate/references/merge-rules.md`
- Modify: `skills/sql-merge-validate/references/rule-dictionary.md`
- Modify: `skills/sql-merge-validate/references/std-check-merge.md`
- Modify: `skills/sql-merge-validate/scripts/common.py`
- Modify: `skills/sql-merge-validate/scripts/comparator.py`
- Modify: `skills/sql-merge-validate/scripts/db_metadata.py`
- Modify: `skills/sql-merge-validate/scripts/expectation.py`
- Modify: `skills/sql-merge-validate/scripts/fetch_dq.py`
- Modify: `skills/sql-merge-validate/scripts/run.py`
- Modify: `skills/sql-merge-validate/scripts/sql_extractor.py`
- Modify: `skills/sql-merge-validate/scripts/std_expectation.py`
- Move: `skills/sql-merge-validate/scripts/tests/` → `tests/runtime/fixtures/sql-merge-validate/python/`
- Create: `tests/skills/routes/sql-merge-validate.json`
- Create: `tests/runtime/fixtures/sql-merge-validate/**`
- Modify: `docs/migrations/kata-v4/skill-baselines/sql-merge-validate.json`
- Create: `docs/migrations/kata-v4/skill-actions/task-10.paths.z`

**Interfaces:**
- Consumes: monitor/task ID 与明确的合并预期。
- Produces: 每个规则包的 PASS/FAIL、规范化 SQL 比较和 blocker 分类。

- [ ] **Step 1: 先写 route 与 Python 失败断言**

读取已保存的对照，把 ID、缺少 expectation 和非本领域请求写入 route fixture。Python 测试仍在原目录时，先证明当前 import-time failure；RED 前不得先移动它：

```bash
bun tests/skills/eval/run.ts --show-baseline --skill sql-merge-validate
python -m unittest discover -s skills/sql-merge-validate/scripts/tests -v
```

预期：命令因当前 import 行为失败或提前退出，而不是因为目标目录不存在。若原目录测试通过，停止改写，先补充一个能复现已记录缺口的测试。

- [ ] **Step 2: 实际运行 route RED**

```bash
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/sql-merge-validate.json
```

预期：命令因已记录的 route 或缺少 expectation 行为而非 0；不能因认证或 fixture 语法失败。

- [ ] **Step 3: 写清楚 Skill 边界**

```yaml
---
name: sql-merge-validate
description: 收到数据质量监控任务 monitorId 或落标任务 ID，并要求核对规则 SQL 合并结果时使用。只做静态缺陷扫描或编写测试用例时，转交 defect-analyze 或对应 case Skill。
---
```

正文顺序为：校验 ID 与 expectation → 获取全部规则包 → 在不改变语义的前提下规范化 SQL → 比较要求的合并维度 → 逐包输出 PASS/FAIL → 把确认的缺陷转交 `defect-analyze`。缺少 expectation 时返回 `needs_input`，不猜默认值。

- [ ] **Step 4: 移动测试并去掉 import-time exit**

确认原目录 RED 后，再把 `skills/sql-merge-validate/scripts/tests/` 移到 `tests/runtime/fixtures/sql-merge-validate/python/`。修改最少的 import 与入口代码，让测试 discovery 能完整收集所有规则包；不要把失败改成 skip。

- [ ] **Step 5: 运行 GREEN**

```bash
python -m unittest discover -s tests/runtime/fixtures/sql-merge-validate/python -v
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/sql-merge-validate.json
bun test tests/runtime/fixtures/sql-merge-validate
```

预期：Python discovery 完成；所有 fixture 规则包都有结果；0 skipped packages。

- [ ] **Step 6: 用同一输入运行 forward**

只给新代理同一份 task ID fixture 与 expectation，确认它检查每个规则包，不把输出折叠成一条摘要：

```bash
bun tests/skills/eval/run.ts --phase forward --skill sql-merge-validate --source root --update-baseline docs/migrations/kata-v4/skill-baselines/sql-merge-validate.json
```

- [ ] **Step 7: 验证 action manifest 并提交**

```bash
bun tests/skills/eval/run.ts --write-action-manifest task-10 --output docs/migrations/kata-v4/skill-actions/task-10.paths.z --allow skills/sql-merge-validate tests/skills/routes/sql-merge-validate.json tests/runtime/fixtures/sql-merge-validate docs/migrations/kata-v4/skill-baselines/sql-merge-validate.json docs/migrations/kata-v4/skill-actions/task-10.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-10.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-10.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-10.paths.z
git commit -m "refactor: ✨ make SQL merge validation deterministic"
```

---

### Task 11: 重构 `workspace-manage`

**Files:**
- Modify: `skills/workspace-manage/SKILL.md`
- Modify: `skills/workspace-manage/scripts/create-project.ts`
- Modify: `skills/workspace-manage/scripts/init-wizard.ts`
- Move: `skills/workspace-manage/templates/project-skeleton/knowledge/overview.md` → `skills/workspace-manage/assets/project-skeleton/knowledge/overview.md`
- Move: `skills/workspace-manage/templates/project-skeleton/knowledge/terms.md` → `skills/workspace-manage/assets/project-skeleton/knowledge/terms.md`
- Move: `skills/workspace-manage/templates/project-skeleton/rules/README.md` → `skills/workspace-manage/assets/project-skeleton/rules/README.md`
- Create: `tests/skills/routes/workspace-manage.json`
- Create: `tests/runtime/fixtures/workspace-manage/**`
- Modify: `docs/migrations/kata-v4/skill-baselines/workspace-manage.json`
- Create: `docs/migrations/kata-v4/skill-actions/task-11.paths.z`

**Interfaces:**
- Consumes: 能力或帮助问题，以及 workspace init/check/finish/repair 请求。
- Produces: 功能菜单或由 CLI 支撑的 workspace 生命周期结果。

- [ ] **Step 1: 先写 route 与帮助一致性失败断言**

route fixture 覆盖“kata 能干嘛/功能菜单”、initialize/check/finish workspace、编辑 XMind 转交 `case-edit`、业务知识转交 `knowledge-curate`、UI 自动化转交 `playwright-automation`。先读取对照，再写断言证明菜单只能来自当前 CLI help，不能包含已删除命令：

```bash
bun tests/skills/eval/run.ts --show-baseline --skill workspace-manage
```

- [ ] **Step 2: 实际运行 RED**

```bash
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/workspace-manage.json
bun test tests/runtime/fixtures/workspace-manage packages/cli/tests/commands/features.test.ts packages/cli/tests/commands/workspace.test.ts
```

预期：至少一条命令因已记录的 route、过期菜单或工作区生命周期缺口而非 0；若全部通过，停止改写并补充压力场景。

- [ ] **Step 3: 写清楚 Skill 边界**

```yaml
---
name: workspace-manage
description: 回答 kata 能力、功能菜单和命令帮助，或创建、初始化、自检、收尾、修复项目工作区时使用。用例、业务知识和 UI 自动化请求转交对应 Skill。
---
```

能力问题从生成的 `kata --help` 或命令组 help 回答；生命周期请求使用 `features` 或 `workspace` 命令。SKILL.md 不复制命令表；需要精确参数时直接运行 `--help`。

- [ ] **Step 4: 接入新 CLI 并运行 GREEN**

```bash
bun test tests/runtime/fixtures/workspace-manage packages/cli/tests/commands/features.test.ts packages/cli/tests/commands/workspace.test.ts
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/workspace-manage.json
bun ./packages/cli/bin/kata skills audit --runtime codex
```

预期：菜单中的命令都存在于 registry；临时 workspace 可 initialize/check/finish；0 skip。

- [ ] **Step 5: 用同一输入运行 forward**

让新代理复用 RED 输入，确认它只从当前 help 回答，不虚构已删除命令：

```bash
bun tests/skills/eval/run.ts --phase forward --skill workspace-manage --source root --update-baseline docs/migrations/kata-v4/skill-baselines/workspace-manage.json
```

- [ ] **Step 6: 验证 action manifest 并提交**

```bash
bun tests/skills/eval/run.ts --write-action-manifest task-11 --output docs/migrations/kata-v4/skill-actions/task-11.paths.z --allow skills/workspace-manage tests/skills/routes/workspace-manage.json tests/runtime/fixtures/workspace-manage docs/migrations/kata-v4/skill-baselines/workspace-manage.json docs/migrations/kata-v4/skill-actions/task-11.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-11.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-11.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-11.paths.z
git commit -m "refactor: ✨ align workspace management with kata CLI"
```

---

### Task 12: 以六阶段重构 `playwright-automation`

**Files:**
- Modify: `skills/playwright-automation/SKILL.md`
- Delete: `skills/playwright-automation/phases/§1-case-normalize.md`
- Delete: `skills/playwright-automation/phases/§2-env-preflight.md`
- Delete: `skills/playwright-automation/phases/§3-ui-plan.md`
- Delete: `skills/playwright-automation/phases/§4-ui-probe.md`
- Delete: `skills/playwright-automation/phases/§5-plan-reconcile.md`
- Delete: `skills/playwright-automation/phases/§6-playwright-generate.md`
- Delete: `skills/playwright-automation/phases/§7-self-run.md`
- Delete: `skills/playwright-automation/phases/§8-run-triage.md`
- Delete: `skills/playwright-automation/phases/§9-repair-loop.md`
- Delete: `skills/playwright-automation/phases/§10-quality-gate.md`
- Delete: `skills/playwright-automation/phases/§11-handoff.md`
- Delete: `skills/playwright-automation/phases/§12-case-feedback.md`
- Create: `skills/playwright-automation/phases/01-read-cases.md`
- Create: `skills/playwright-automation/phases/02-check-environment.md`
- Create: `skills/playwright-automation/phases/03-probe-ui.md`
- Create: `skills/playwright-automation/phases/04-generate-scripts.md`
- Create: `skills/playwright-automation/phases/05-run-and-repair.md`
- Create: `skills/playwright-automation/phases/06-handoff.md`
- Rename: `skills/playwright-automation/prompts/agent-worker.md` → `skills/playwright-automation/prompts/agent-automation-writer.md`
- Modify: `skills/playwright-automation/prompts/agent-precondition.md`
- Modify: `skills/playwright-automation/prompts/agent-quality-reviewer.md`
- Modify: `skills/playwright-automation/prompts/agent-spec-reviewer.md`
- Modify: `skills/playwright-automation/references/cli-essentials.md`
- Modify: `skills/playwright-automation/references/db-runtime-sql.md`
- Modify: `skills/playwright-automation/references/directory-structure.md`
- Modify: `skills/playwright-automation/references/execution-protocol.md`
- Delete: `skills/playwright-automation/scripts/build-case-tasks.ts`
- Delete: `skills/playwright-automation/scripts/run-tests-notify.ts`
- Delete: `skills/playwright-automation/scripts/report-to-pdf.ts`
- Delete: `skills/playwright-automation/templates/handoff.md.hbs`
- Remove references: CLI Tasks 8–9 已移入 `packages/cli` 的 case-task、run、handoff、PDF 和 template 文件
- Create: `tests/skills/routes/playwright-automation.json`
- Create: `tests/runtime/fixtures/playwright-automation/**`
- Modify: `docs/migrations/kata-v4/skill-baselines/playwright-automation.json`
- Create: `docs/migrations/kata-v4/skill-actions/task-12.paths.z`

**Interfaces:**
- Consumes: metadata、AutomationIntent、CaseTaskList、Run/RunResult/Handoff、Playwright 与 Allure service。
- Produces: 六阶段 UI 自动化流程与严格完成结果。

- [ ] **Step 1: 先写 route、intent 与完成门失败断言**

route fixture 覆盖功能目录、Markdown 用例、已有 Playwright 脚本修复、失败 run、只有 XMind 时转交 `case-edit`，以及只要求手动浏览器时转交或返回 `needs_input`。行为 fixture 先写以下失败断言：选中用例缺少 intent；变更型用例被标为只读；数据质量 payload 缺少规则数；`full.spec.ts` 收集 0 个测试；Allure 过期；缺少业务记录。读取已保存的对照：

```bash
bun tests/skills/eval/run.ts --show-baseline --skill playwright-automation
```

同时在 RED 前把 fresh-run 完成测试写入 `tests/runtime/fixtures/playwright-automation/completion.test.ts`；它只调用 CLI 公开 API，不修改 CLI Task 已有测试：

```ts
test("rejects a passing exit code with stale evidence", async () => {
  const result = fixtureRunResult({ exitCode: 0, allureRunId: "old", businessRecords: [] });
  expect(() => buildHandoff({ featureDir, run: currentRun, result })).toThrow(/current run|business record/);
});

test("reconciles selected cases and collected tests separately", () => {
  expect(validateCounts({
    case_counts: { declared: 2, executed: 2, passed: 2, failed: 0, skipped: 0 },
    test_counts: { collected: 3, passed: 3, failed: 0, skipped: 0 },
  })).toEqual({ ok: true });
});
```

- [ ] **Step 2: 实际运行 RED**

```bash
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/playwright-automation.json
bun test packages/cli/tests/domain/automation-intent.test.ts packages/cli/tests/domain/case-task-list.test.ts packages/cli/tests/domain/handoff.test.ts tests/runtime/fixtures/playwright-automation --timeout 600000
```

预期：至少一条命令因已记录的 route、intent 或完成门缺口而非 0；不能因 fixture 缺失、认证缺失或语法错误失败。若全部通过，停止改写并补充压力场景。

- [ ] **Step 3: 写精确 frontmatter 与六阶段 SKILL.md**

```yaml
---
name: playwright-automation
description: 拿到需求用例目录、metadata 指向的 Markdown 用例、PRD、Lanhu、Playwright 脚本或运行失败结果，并需要生成或修复可真实运行的 UI 自动化时使用。已有用例格式转换交给 case-edit；只做静态扫描交给 defect-analyze。
---
```

正文只列出：

```text
读取用例 -> 检查环境 -> 探查页面 -> 生成脚本 -> 运行修复 -> 汇总交付
```

正文说明各阶段的读取时机；用例内容不匹配时只转交 `case-edit` 一次；并保留设计中的五项完成检查。字段和规则矩阵不得复制到正文。

- [ ] **Step 4: 把 12 个 phase 合并为 6 个文件**

```text
§1                 -> 01-read-cases.md
§2                 -> 02-check-environment.md
§3 + §4 + §5       -> 03-probe-ui.md
§6                 -> 04-generate-scripts.md
§7 + §8 + §9 + §10 -> 05-run-and-repair.md
§11 + §12          -> 06-handoff.md
```

`01` 要求每个选中用例都有通过 schema 校验的 intent。`02` 生成带 run ID 前缀的记录名，禁止复用旧 ID。`03` 记录实际 UI route 和字段。`04` 每个 worker 只负责一份用例文件，主代理持有 runner、fixture 和 page object。`05` 依次运行 case → group → full，并区分产品、脚本、数据、权限和环境问题。`06` 对齐计数、当前 Allure 和业务记录。

确认新 phase、prompt 和 reference 已全部改用 `packages/cli` 的公开 API 后，删除 Task 1 保留的三份 package import wrapper 与一条 template symlink。结构测试必须同时断言四个源路径不存在、package 目标仍存在、正文没有旧引用；不得留下第二层兼容 wrapper。

- [ ] **Step 5: 固定 source audit 与 UI-only 契约**

生成前，AutomationIntent 必须带上适用的 UI 长度、规则数、重复 fingerprint、规则包数、datasource、sampling、partition、filter 和 strong/weak 设置。缺值时停止并返回 `needs_input` 或 `blocked`；通用 generator 不能代填。

create、edit、save、import、execute、publish、delete、status-check 都必须经过可见 UI。DB 脚本可以准备数据，但不能执行产品动作；每个 backend API shortcut 都要获得用户针对该动作的明确授权。

- [ ] **Step 6: 统一 subagent prompt**

四份 prompt 都使用六个标准标题。writer 只能编辑分配给自己的一条用例；precondition agent 只返回已准备数据，不执行产品变更；spec reviewer 核对来源约束；quality reviewer 检查 selector、assertion、运行记录，以及是否吞掉异常。

- [ ] **Step 7: 运行 hermetic GREEN**

```bash
bun test packages/cli/tests/domain/automation-intent.test.ts packages/cli/tests/domain/case-task-list.test.ts packages/cli/tests/domain/handoff.test.ts tests/runtime/fixtures/playwright-automation --timeout 600000
bun ./packages/cli/bin/kata skills route-check --runtime codex --source root --fixture tests/skills/routes/playwright-automation.json
bun ./packages/cli/bin/kata skills audit --runtime codex
```

预期：本地测试站点通过 UI 创建一条记录；`full.spec.ts` 退出 0 且收集数大于 0；新 Allure 属于当前 run；没有未说明的 skip。

- [ ] **Step 8: 用同一输入运行 forward**

只给新代理根级 Skill、metadata 和 fixture site。确认它先探查再生成，把共享文件留给主代理，并拒绝 API 变更捷径。发现漏洞后修正并重新运行 GREEN 与 forward：

```bash
bun tests/skills/eval/run.ts --phase forward --skill playwright-automation --source root --update-baseline docs/migrations/kata-v4/skill-baselines/playwright-automation.json
```

- [ ] **Step 9: 验证 action manifest 并提交**

```bash
bun tests/skills/eval/run.ts --write-action-manifest task-12 --output docs/migrations/kata-v4/skill-actions/task-12.paths.z --allow skills/playwright-automation tests/skills/routes/playwright-automation.json tests/runtime/fixtures/playwright-automation docs/migrations/kata-v4/skill-baselines/playwright-automation.json docs/migrations/kata-v4/skill-actions/task-12.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-12.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-12.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-12.paths.z
git commit -m "refactor: ✨ rebuild Playwright automation as six stages"
```

预期：`task-12.paths.z` 明列上述四个 source deletion；暂存区与 manifest 完全一致。

---

### Task 13: 收敛平台入口文档并停止引用旧 Skill trees

**Files:**
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `.claude/settings.json`
- Modify: `.claude/rules/comments.md`
- Modify: `.claude/rules/git-workflow.md`
- Modify: `.claude/rules/priority.md`
- Modify: `.claude/rules/project-workflow-rules.md`
- Modify: `.claude/rules/repo-readonly.md`
- Modify: `.claude/rules/testing.md`
- Modify: `.claude/rules/workspace-boundary.md`
- Create: `tests/skills/entry-docs.test.ts`
- Create: `tests/skills/no-legacy-runtime-references.test.ts`
- Create: `tests/skills/shape.test.ts`
- Create: `tests/skills/platform-neutral.test.ts`
- Create: `docs/migrations/kata-v4/skill-actions/task-13.paths.z`

**Interfaces:**
- Consumes: 最终根级 Skill、平台 adapter 与公共 CLI help。
- Produces: 精简的 Codex/Claude 入口文档，以及只读取根级 `skills/` 的生产依赖图。

- [ ] **Step 1: 写失败的 exclusivity tests**

```ts
test("entry docs do not duplicate business workflows", async () => {
  for (const path of ["AGENTS.md", "CLAUDE.md"]) {
    const text = await Bun.file(path).text();
    expect(text).not.toContain("接收材料 → 理清需求");
    expect(text).not.toContain("full.spec.ts 通过、feature run");
    expect(text).not.toContain("## 命令索引");
  }
});

test("production entrypoints do not reference legacy skill trees", async () => {
  for (const path of productionEntrypointFiles(repoRoot)) {
    const text = await Bun.file(path).text();
    for (const legacy of [".claude/skills", ".agents/skills", ".reasonix/skills", ".hermes/skills"]) {
      expect(text).not.toContain(legacy);
    }
  }
});
```

- [ ] **Step 2: 运行 RED**

```bash
bun test tests/skills/entry-docs.test.ts tests/skills/no-legacy-runtime-references.test.ts tests/skills/shape.test.ts tests/skills/platform-neutral.test.ts
```

预期：失败，因为现有入口文档仍复制 route 或业务门槛，生产 manifest/settings 仍引用旧 Skill tree。

- [ ] **Step 3: 改写 entry docs**

`AGENTS.md` 只保留 Codex 激活方式、仓库开发约束、验证措辞、worktree 和常用检查命令。`CLAUDE.md` 只保留 Claude plugin 激活、hook、权限和相同的公共检查入口。两者都指向 `using-kata` 或 CLI，不复制 route。删除 AGENTS 中的 Playwright 业务门槛前，先确认它们已进入对应 phase、contract 和 test。

- [ ] **Step 4: 关闭旧引用，登记清理候选**

把 settings、rule 和 manifest 更新到根级 Skill，并把列出的 Claude rule 收敛为平台行为。严格测试只允许 `phases`、`prompts`、`references`、`scripts`、`assets`，reference 只嵌套一层，并检查行数和重复正文 hash。

平台工具名检查默认扫描全部 `SKILL.md`、`phases/`、`prompts/` 和 `references/`；只跳过以下四个精确文件：

```ts
const PLATFORM_TOOL_REFERENCE_EXCEPTIONS = new Set([
  "skills/using-kata/references/codex-tools.md",
  "skills/using-kata/references/claude-tools.md",
  "skills/using-kata/references/reasonix-tools.md",
  "skills/using-kata/references/hermes-tools.md",
]);
```

任何其他排除目录、basename 规则或 glob 都应让测试失败。旧 bootstrap、symlink tree 和旧 shape test 此时只停止参与运行与打包，不在本 Task 删除；历史清理计划会把每个实体及摘要写入用户复核的 `cleanup-plan.json` 后再删除。

- [ ] **Step 5: 运行 GREEN**

```bash
bun test tests/skills/entry-docs.test.ts tests/skills/no-legacy-runtime-references.test.ts tests/skills/shape.test.ts tests/skills/platform-neutral.test.ts tests/runtime/platform-packages.test.ts
bun run type-check
bun ./packages/cli/bin/kata skills audit --runtime codex
```

预期：生产依赖图与四个平台包只读取根级 `skills/`；入口文档没有业务流程副本；四个工具说明是唯一平台专名豁免；旧实体保持 inert，等待用户复核后的 cleanup。

- [ ] **Step 6: 验证 action manifest 并提交**

```bash
bun tests/skills/eval/run.ts --write-action-manifest task-13 --output docs/migrations/kata-v4/skill-actions/task-13.paths.z --allow AGENTS.md CLAUDE.md .claude/settings.json .claude/rules tests/skills/entry-docs.test.ts tests/skills/no-legacy-runtime-references.test.ts tests/skills/shape.test.ts tests/skills/platform-neutral.test.ts docs/migrations/kata-v4/skill-actions/task-13.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-13.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-13.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-13.paths.z
git commit -m "refactor: ✨ retire legacy skill runtime references"
```

---

### Task 14: 准备最终 Codex fixture 与 helper，不执行真实环境

**Files:**
- Modify: `tests/runtime/helpers/codex.ts`
- Modify: `tests/runtime/helpers/temporary-home.ts`
- Create: `tests/runtime/helpers/release-artifacts.ts`
- Create: `tests/runtime/codex-install.e2e.ts`
- Create: `tests/runtime/codex-routes.e2e.ts`
- Create: `tests/runtime/codex-fixtures.e2e.ts`
- Create: `tests/runtime/live/case-draft.e2e.ts`
- Create: `tests/runtime/live/playwright-automation.e2e.ts`
- Create: `tests/runtime/final-suite.json`
- Create: `tests/runtime/final-suite-shape.test.ts`
- Create: `scripts/modernization/final-gates.ts`
- Create: `tests/modernization/final-gates.test.ts`
- Modify exactly: `tests/skills/eval/manifest.json` 中列出的九个精确 fixture root
- Create: `docs/migrations/kata-v4/skill-actions/task-14.paths.z`

**Interfaces:**
- Consumes: Task 2 的 package-owned Codex invoker、release manifest schema、route fixture、九个 hermetic fixture，以及 Cleanup Task 13 的持久 confirmation verifier。
- Produces: Roadmap Task 6 可直接执行的测试定义、fixture、严格 blocker、精确 artifact reader，以及从真实 sidecar/JUnit/CLI/CI 结果捕获并复核最终 gate 的持久工具；本 Task 不产生真实 Codex 通过结论。

- [ ] **Step 1: 先写最终测试套件的结构断言**

```ts
test("declares every final Codex gate without skip or todo", async () => {
  const suite = await readFinalSuiteDefinition(repoRoot);
  expect(suite.businessFixtures).toHaveLength(9);
  expect(suite.routeFixtures).toEqual(readAllRouteFixtureIds(repoRoot));
  expect(await scanForbiddenModifiers(suite)).toEqual([]);
  expect(suite.realExecutionOwner).toBe("roadmap-task-6");
});
```

`final-suite.json` 精确列出九个业务 fixture、全部 route fixture、两个 live test、`real_execution_owner: "roadmap-task-6"`、禁止的 skip/todo 列表，以及十一个固定 final gate 的 section、完整 argv 模板、exit sidecar、result/log 路径和 result kind。它们必须逐项对应 Roadmap Task 6 Steps 2–5 的实际命令；只允许 release-check argv 中一个 `{source_complete_commit}` token，报告不能自定义 gate 或路径。结构测试只静态读取这份 manifest 与测试源码，不 import 或执行 `codex-*.e2e.ts` 和 `live/*.e2e.ts`。它还要断言：五个真实文件都使用 `.e2e.ts`，不会被默认 `bun test` 发现；最终测试只从 `dist/release-manifest.json` 读取精确 CLI tgz/Codex ZIP 路径、artifact SHA-256、`source_commit` 与 `input_tree_sha256`；不使用 glob；所有 Codex 调用都经过 `packages/cli/src/services/runtime/codex.ts`；真实加载以 JSONL 加载事件为准；两个 live test 在缺少环境变量时明确失败并写 blocker，不调用 `.skip()` 或 `.todo()`。

- [ ] **Step 2: 运行 RED**

```bash
bun test tests/runtime/final-suite-shape.test.ts tests/runtime/helpers tests/modernization/final-gates.test.ts --timeout 30000
```

预期：失败，因为 release artifact reader、最终 gate reader、最终测试定义或完整 fixture 尚不存在；不能以认证或外部环境缺失作为本地 RED。

- [ ] **Step 3: 实现精确 release artifact reader**

`release-artifacts.ts` 直接导入 contracts 生成的 release artifact 类型，以及 CLI Task 11 中只适用于 runtime 检查的 DTO；解析 release manifest schema，校验 source commit、input tree、artifact 类型、精确路径和 SHA-256，再返回 CLI tgz 与 Codex ZIP。它不触发构建，也不猜测目录：

```ts
import type { ReleaseCliArtifact, ReleaseRuntimeArtifact } from "@kata/contracts";
import type { PluginCheckResult } from "@cli/services/types";
import { computeInputTreeSha256 } from "@cli/services/plugins/release-manifest";

export interface VerifiedReleaseArtifacts {
  sourceCommit: string;
  inputTreeSha256: string;
  cli: ReleaseCliArtifact;
  codex: ReleaseRuntimeArtifact & { runtime: "codex" };
  checks: PluginCheckResult[];
}

export async function readVerifiedReleaseArtifacts(
  manifestPath: string,
  expectedHead: string,
  repoRoot: string,
): Promise<VerifiedReleaseArtifacts>;
```

helper 调用 Task 3 的 `computeInputTreeSha256()`，不另写 hash 算法；CLI artifact 不含 runtime，Codex artifact 必须精确为 `runtime: "codex"`。manifest、artifact 或 check result 任一值不同都立即失败。

`final-gates.ts` 从 committed `final-suite.json` 读取固定 policy，提供 `capture` 与 `verify` 两个命令。它从每个固定 `.exit` 文件读取真实退出码；Bun test gate 从固定 JUnit XML 汇总 tests/failures/errors/skipped，CLI gate 从严格 `CliResult` JSON 派生数量，CI gate 从 `CiRunReport` 派生六项状态，single gate 只按真实退出码记 1 pass 或 1 fail。每个结果文件与 log 都重算 SHA-256。非零 exit 且 result 缺失时，capture 只能记录 `failed=1` 与 `missing_result` unresolved；exit 0 却缺 result 直接拒绝。`capture` 自动写入十一个 checks 与两组 cleanup triplet，只把 artifacts、unresolved 和四项 passed 留给执行者填写；`verify` 重新读取所有 sidecar/result/log，要求 report checks 与派生值逐字段相同，并调用持久 cleanup confirmation verifier。

`final-gates.test.ts` 用临时文件覆盖：真实 exit 非 0 但报告写 0、伪造 pass/fail/skip、替换/删除 JUnit 或 JSON、修改 log、额外/缺失/重复 gate、argv 漂移、重复 confirmation_ref、确认早于 plan、finalize 确认不晚于 migration。任何一种都必须失败；缺少外部环境只能保留真实非零结果与未解决项，不能改成 passed。

- [ ] **Step 4: 写最终测试定义与九个 fixture**

`codex-install.e2e.ts` 从已校验产物安装到临时 prefix/home，并通过公开 `SkillService source=release-manifest` 断言十个 Skill 各自留下可观察的包内 sentinel 与加载记录。`codex-routes.e2e.ts` 只调用公开 `kata skills route-check --runtime codex --source release-manifest --manifest-path ...`，遍历全部 trigger/exclude/transfer/needs_input；不得在 helper 中复制 manifest-source evaluator。`codex-fixtures.e2e.ts` 遍历九个业务 fixture，并执行真实脚本、CLI 和产物检查。两个 live `.e2e.ts` 只从显式 `KATA_E2E_*` 读取环境，不打印值；缺失时抛出带变量名的 blocker。

五个 `.e2e.ts` 都把临时 Codex home、fixture workspace、feature run、Allure 和生成产物写到测试创建的仓库外临时根，并在结果中返回绝对 artifact path；不得写入 source-complete worktree。Playwright 的业务记录仍由产品 UI 创建，结果记录其唯一名称或 ID。测试结束保留被 final-verification 引用的临时交付目录，其余临时认证和 session 必须删除。

测试文件在这里仅完成实现，不在本 Task 运行。不得启动 `codex exec`、不得安装到任何真实或临时 Codex home、不得连接 live 环境；真实 build、install、route、fixture 和 live 执行全部由 Roadmap Task 6 持有。

- [ ] **Step 5: 只运行 fake/unit 与结构 GREEN**

```bash
bun test tests/runtime/final-suite-shape.test.ts tests/skills/eval/run.test.ts packages/cli/tests/services/codex-runtime.test.ts tests/modernization/final-gates.test.ts --timeout 30000
bun run type-check
```

预期：0 fail、0 skip；fake binary、manifest 解析和 suite 结构通过。输出必须明确写 `ready_to_run`，不能写 Codex install、route、fixture 或 live 已通过。

- [ ] **Step 6: 验证 action manifest 并提交测试实现**

```bash
bun tests/skills/eval/run.ts --write-action-manifest task-14 --output docs/migrations/kata-v4/skill-actions/task-14.paths.z --allow tests/runtime tests/modernization/final-gates.test.ts scripts/modernization/final-gates.ts tests/skills/eval/manifest.json docs/migrations/kata-v4/skill-actions/task-14.paths.z
bun tests/skills/eval/run.ts --check-action-manifest docs/migrations/kata-v4/skill-actions/task-14.paths.z
git add --pathspec-from-file=docs/migrations/kata-v4/skill-actions/task-14.paths.z --pathspec-file-nul
bun tests/skills/eval/run.ts --check-staged docs/migrations/kata-v4/skill-actions/task-14.paths.z
git commit -m "test: ✅ prepare final kata Codex verification"
```

预期：提交只包含 helper、测试定义、fixture、final gate 工具/测试、manifest 更新与 `task-14.paths.z`。真实执行结果不进入本提交；Roadmap Task 6 在所有源码和 cleanup 提交完成后，从最终干净 HEAD 重新构建并执行这些测试。
