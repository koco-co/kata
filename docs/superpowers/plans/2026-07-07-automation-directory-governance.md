# 自动化目录结构规范治理 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立自动化目录结构的单一权威规范 + 工具链强制执行，堵住目录结构违规从定义→代理执行→评审→lint 闸门的全线缺口。

**Architecture:** 三层防护——(1) `directory-structure.md` 作为单一权威规范源，prompt 和 lint 代码都引用它；(2) `kata automation scaffold` 创建合规骨架 + `kata automation normalize` 自动修复违规；(3) lint 闸门前置到 §6 阶段，severity 从 warn 升到 fail。

**Tech Stack:** TypeScript (Bun runtime), commander, node:fs/path, existing lint framework (@shared/lint)

## Global Constraints

- 遵循 `CLAUDE.md` 的 worktree 优先工作流
- 遵循项目 Conventional Commits 规范（`type: emoji description`）
- 遵循 `rules/comments.md` 注释规范（内部实现用中文）
- 遵循 `rules/testing.md` 改后即测要求
- `workspace/{project}/.kata/repos/**` 只读
- 所有 CLI 命令用 commander，注册到 `cli/index.ts`

---

### Task 1: 新建单一权威规范文档

**Files:**
- Create: `.claude/skills/playwright-automation/references/directory-structure.md`

**Interfaces:**
- Consumes: 无（纯文档，不依赖其他代码）
- Produces: `directory-structure.md` — 后续所有任务的权威参考，包含 L1–L11（来自 tests-layout.ts）+ L12（来自 feature-root-layout.ts）+ 新 L13（automation/ 顶层盲区）+ 共享代码位置规则

- [ ] **Step 1: 编写 directory-structure.md**

```markdown
# 自动化目录结构规范

本文件是 Playwright 自动化目录结构的单一权威规范。所有 agent prompt 和 lint 工具都必须以本文件为准，不得在各自文件中重复定义。

当本文件与任何其他文件出现冲突时，以本文件为准。

## Feature 根目录白名单

允许的条目（不区分顺序）：

| 条目 | 类型 | 说明 |
|------|------|------|
| `cases/` | 目录 | 用例产物（archive.md, cases.xmind, test-point-checklist.md） |
| `automation/` | 目录 | 自动化脚本 |
| `runs/` | 目录 | 运行结果（Allure、Playwright trace、handoff 等） |
| `inputs/` | 目录 | 输入材料（蓝湖截图、参考文档、CSV 等） |
| `metadata.yaml` | 文件 | Feature 元数据（FeatureMetadata@2） |
| `prd.md` | 文件 | PRD 文档 |
| `README.md` | 文件 | 可选说明 |

严格禁止出现在 feature 根目录：
- `*.ts` `*.json`（脚本和数据文件不属于这里）
- `results/`（应与 runs/ 合并）
- `.debug/`（应放在 automation/tests/.debug/）

## automation/ 顶层

只允许 `tests/` 一个子目录。

严格禁止：
- `*.md`（AUTOMATION-PLAN.md、HANDOFF-*.md 等过程文档应放 runs/ 或随 PR 归档）
- `*.json` `*.yaml`
- `runs/`（运行结果应在 feature 根 runs/ 下）
- `scripts/`（共享脚本放 _shared/）

## automation/tests/ 子目录

只允许以下子目录：

| 目录 | 说明 |
|------|------|
| `cases/` | 用例脚本 |
| `runners/` | 聚合运行入口 |
| `data/` | 测试种子数据 |
| `unit/` | 单元测试 |
| `.debug/` | 调试用临时 spec |

禁止：
- `helpers/`（共享代码放 _shared/）
- `sql/`（seed SQL 放 data/）
- `MANUAL-TRIAGE.md`

## cases/ 命名规则

文件名格式：`t{nn}-{slug}.ts`

- `nn` 为两位数字，从 `01` 起编
- `slug` 为小写字母、数字、连字符组成的简短语义标识
- 完整正则：`^t\d{2}-[a-z0-9-]+\.ts$`

严格禁止出现在 cases/ 下：
- `*.spec.ts`（spec 文件应放 runners/ 或 .debug/）
- 文件名含 `-debug`、`-repro` 或 `diag_` 前缀（调试文件放 .debug/）

示例：
- `t01-login.ts` ✓
- `t02-create-quality-rule.ts` ✓
- `debug-helper.ts` ✗（应放 .debug/）
- `login.spec.ts` ✗（spec 只能放 runners/ 或 .debug/）

## cases/ 索引

- `cases/README.md` 必须存在，枚举 `t{nn}` → 业务场景的映射
- 当 cases 文件数 >= 15 时，必须拆分为 >= 2 个模块子目录

## runners/ 白名单

只允许以下三个文件：

| 文件 | 说明 |
|------|------|
| `smoke.spec.ts` | 冒烟测试，聚合 P0 用例的 import |
| `full.spec.ts` | 全量回归，聚合全部用例的 import |
| `retry-failed.spec.ts` | 失败重跑，仅重跑上次失败的用例 |

严格禁止：
- 任何不在白名单中的 `.spec.ts` 文件
- 在 runner 中直接写 `test()` 或 `test.describe()` 体（runner 只能包含 import 语句）

## 共享代码位置

| 类型 | 路径 |
|------|------|
| 页面对象（Page Object） | `workspace/<project>/_shared/pages/` |
| 工具函数（Helper） | `workspace/<project>/_shared/helpers/` |

严格禁止：
- `automation/tests/helpers/`（feature-local helper）
- 在单个 case 文件中内联可复用的 page object 或 helper

## 禁止项总览

以下行为在任何情况下均被禁止：

1. debug/repro/diag spec 文件出现在 cases/ 或 runners/ 下（应放 .debug/）
2. feature 根目录存在 `.env.local`（应使用 `_shared/env/*.yaml` profile）
3. auth storageState 路径不在 `workspace/<project>/.kata/auth/` 下
4. automation/ 顶层出现 `.md` `.json` `.yaml` 文件
5. automation/tests/ 顶层出现 `t*.ts` case 文件（必须放 cases/）
6. 未在 `_shared/pages/` 或 `_shared/helpers/` 中定义 feature-local helpers
7. runner spec 文件直接包含 `test()` 体
8. `data/` 文件名含变体副本标记 `_vN` 或 `-N.ts`（应用 git history 追溯）
```

- [ ] **Step 2: 提交**

```bash
git add .claude/skills/playwright-automation/references/directory-structure.md
git commit -m "$(cat <<'EOF'
docs: 📝 add automation directory structure authority spec

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 改写 agent-worker.md 传递结构约束

**Files:**
- Modify: `.claude/skills/playwright-automation/prompts/agent-worker.md:24`

**Interfaces:**
- Consumes: `directory-structure.md`（从 Task 1）
- Produces: worker prompt 现在禁止写 automation/ 顶层文件和自建 runner

- [ ] **Step 1: 编辑 agent-worker.md**

File: `.claude/skills/playwright-automation/prompts/agent-worker.md`

在原文第 24 行 "不碰其它用例的 spec" 之后，追加两行约束。原行：

```
> 你只负责分配给你的这一条用例：实现它的 `automation/tests/cases/<id>.spec.ts` 并自跑，不碰其它用例的 spec。
```

改为：

```
> 你只负责分配给你的这一条用例：实现它的 `automation/tests/cases/t{nn}-{slug}.ts` 并自跑，不碰其它用例的 spec。
> 写入前检查目录结构：只写 cases/ 下的单个 case 文件（格式 t{nn}-{slug}.ts，如 t01-login.ts）；不创建 runner、不在 automation/ 顶层写 .md/.json 文件。
> 结构约束详见 references/directory-structure.md。写入不属于 cases/ 的文件前，先在 references/directory-structure.md 中确认该路径在白名单内。
```

注意：把原来的 `cases/<id>.spec.ts` 改成 `cases/t{nn}-{slug}.ts`——directory-structure.md 明确禁止 cases/ 下有 `.spec.ts` 文件，worker prompt 不能自相矛盾。

- [ ] **Step 2: 验证改动不破坏 skill lint**

```bash
bun run check:skills
```
预期：pass，无新增违规

- [ ] **Step 3: 提交**

```bash
git add .claude/skills/playwright-automation/prompts/agent-worker.md
git commit -m "$(cat <<'EOF'
docs: 📝 wire agent-worker to directory-structure authority spec

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 改写 agent-spec-reviewer.md 增加排他性检查

**Files:**
- Modify: `.claude/skills/playwright-automation/prompts/agent-spec-reviewer.md:19-25`

**Interfaces:**
- Consumes: `directory-structure.md`（从 Task 1）
- Produces: reviewer 现在检查 runner 白名单排他性 + automation/ 顶层清洁

- [ ] **Step 1: 编辑 playwright-generate 检查项**

原检查项（第 19–25 行）：

```
- [ ] `automation/tests/runners/smoke.spec.ts` 存在
- [ ] `automation/tests/runners/full.spec.ts` 存在
- [ ] case 文件位于 `automation/tests/cases/`
- [ ] 共享 page object 位于 `_shared/pages/`
- [ ] 没有 feature-local helper 目录
```

改为：

```
- [ ] `automation/tests/runners/smoke.spec.ts` 存在
- [ ] `automation/tests/runners/full.spec.ts` 存在
- [ ] runners/ 不含白名单外 .spec.ts（只允许 smoke/full/retry-failed 三个文件）；详见 references/directory-structure.md#runners-白名单
- [ ] case 文件位于 `automation/tests/cases/`
- [ ] automation/ 顶层无散落 .md .json .yaml 文件；详见 references/directory-structure.md#automation-top
- [ ] 共享 page object 位于 `_shared/pages/`
- [ ] 没有 feature-local helper 目录
```

- [ ] **Step 2: 验证**

```bash
bun run check:skills
bun test .claude/scripts/_shared/tests/lint/agent-shape.test.ts
```
预期：pass

- [ ] **Step 3: 提交**

```bash
git add .claude/skills/playwright-automation/prompts/agent-spec-reviewer.md
git commit -m "$(cat <<'EOF'
docs: 📝 add exclusivity checks to agent-spec-reviewer

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 改写 §6-playwright-generate.md 增加 scaffold + lint 步骤

**Files:**
- Modify: `.claude/skills/playwright-automation/phases/§6-playwright-generate.md:112-114`

**Interfaces:**
- Consumes: `directory-structure.md`（从 Task 1）
- Produces: §6 现在在生成前后跑 scaffold 和 lint

- [ ] **Step 1: 改第 112 行引用并插入步骤**

原第 112 行：

```
- feature 自动化必须遵循 `automation/tests/{cases,runners,data,unit,.debug}` 结构；
```

改为：

```
- feature 自动化必须遵循 `references/directory-structure.md` 定义的结构。
```

在原第 112–114 行之后（即第 114 行 "P0/P1 的具体用例写入" 之前），插入 scaffold + lint 步骤：

```
- 生成脚本前先跑 `kata automation scaffold <feature-dir>` 确保骨架合规。
- 全部 case 写入后跑 `kata cases lint --exit-code --severity fail-only --scope <project>/features/<version>/<feature>` 验证结构合规。lint 不通过不得进入 §7 self-run。
- normalize 不在自动化流程中自动执行（避免误删有效 HANDOFF/PLAN 产物）。人工使用 `kata automation normalize <feature-dir> --dry-run` 检查 + `--apply` 修复。
```

- [ ] **Step 2: 验证**

```bash
bun run check:skills
```
预期：pass

- [ ] **Step 3: 提交**

```bash
git add .claude/skills/playwright-automation/phases/§6-playwright-generate.md
git commit -m "$(cat <<'EOF'
docs: 📝 add scaffold+normalize+lint steps to §6 generate phase

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 改写 §10-quality-gate.md

**Files:**
- Modify: `.claude/skills/playwright-automation/phases/§10-quality-gate.md:11-14`

**Interfaces:**
- Consumes: `directory-structure.md`（从 Task 1）
- Produces: quality-gate 明示 automation/ 顶层清洁检查

- [ ] **Step 1: 追加检查项**

在第 14 行之后（"具体检查项" 那段之后），追加：

```
- `automation/` 顶层无散落 `.md` `.json` `.yaml` 文件（`references/directory-structure.md#automation-top`）。
```

- [ ] **Step 2: 提交**

```bash
git add .claude/skills/playwright-automation/phases/§10-quality-gate.md
git commit -m "$(cat <<'EOF'
docs: 📝 add automation-top cleanup check to quality gate

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 新增 L13 lint — automation/ 顶层散落文件检测

**Files:**
- Modify: `.claude/scripts/_shared/lint/feature-root-layout.ts`（新增 `lintAutomationTopLayout`）
- Modify: `.claude/scripts/_shared/cli/cases-lint.ts`（接入 L13，覆盖 workspace 和 feature scope）
- Create: `.claude/scripts/_shared/tests/lint/feature-root-layout.test.ts`（新增 L13 单测）

**Interfaces:**
- Consumes: `ALLOWED_FEATURE_ROOT_ENTRIES`（现成）, `automationDir()`（现成）, `listFeatureDirs`（现成）
- Produces: `lintAutomationTopLayout(automationDir: string): LintViolation[]` — 检测 automation/ 顶层不在白名单 `["tests"]` 的非隐藏条目

- [ ] **Step 1: 在 feature-root-layout.ts 中新增 lintAutomationTopLayout**

在 `lintFeatureRootLayout` 函数之后追加：

```typescript
const ALLOWED_AUTOMATION_TOP_ENTRIES = new Set(["tests"]);

/** L13: automation/ 顶层只允许 tests/ 目录，散落 .md/.json/.yaml 等文件即为违规。 */
export function lintAutomationTopLayout(automationDir: string): LintViolation[] {
  const violations: LintViolation[] = [];
  if (!existsSync(automationDir)) return violations;
  for (const name of readdirSync(automationDir)) {
    if (name.startsWith(".")) continue;
    if (ALLOWED_AUTOMATION_TOP_ENTRIES.has(name)) continue;
    violations.push({
      rule: "L13",
      file: join(automationDir, name),
      message: `automation/ 顶层散落条目 "${name}"：只允许 tests/ 目录，文档放 runs/，脚本放 _shared/`,
    });
  }
  return violations;
}
```

- [ ] **Step 2: 在 cases-lint.ts 中接入 L13，覆盖两种 scope**

在 `buildCasesCommand` 中，既要在 workspace-wide 扫描中加入 L13，也要在 feature-scoped 时单独针对目标目录运行 L13。

在 `lintFeatureRootLayout` 调用的 workspace-wide 闭包（第 152–154 行附近的 `...projects.map(...)` 块）之后，追加 workspace-wide 的 L13 扫描：

```typescript
            // L13: automation/ 顶层散落文件检查（workspace-wide）
            ...projects.flatMap((project) => {
              const entries = listFeatureDirs(join(workspaceLintRoot, project, "features"));
              return entries.flatMap((entry) =>
                lintAutomationTopLayout(join(entry.dir, "automation")),
              );
            }),
```

在 workspace-wide 扫描之后、`const reports` 之前，新增 feature-scoped 的 L13 扫描分支：

```typescript
      // L13: scoped 模式下直接针对目标 feature 的 automation/ 做检查
      const l13ScopedViolations: CaseLintViolation[] = [];
      if (isFeatureScoped && scopedProject && scopedFeatureId) {
        for (const entry of listFeatureDirs(
          join(workspaceLintRoot, scopedProject, "features"),
        )) {
          if (entry.dirName === scopedFeatureId) {
            for (const v of lintAutomationTopLayout(join(entry.dir, "automation"))) {
              l13ScopedViolations.push({
                file: v.file,
                lineNumber: 1,
                rule: v.rule,
                matched: scopedFeatureId,
                severity: "fail",
                message: v.message,
              });
            }
            break;
          }
        }
      }
```

然后将 `l13ScopedViolations` 合并到最终的 `all` 数组中。

- [ ] **Step 3: 新增 L13 测试**

```typescript
import { expect, test, afterEach } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { lintAutomationTopLayout } from "@shared/lint/feature-root-layout.ts";

const FX = join(import.meta.dirname, "tmp-l13-test");

afterEach(() => {
  if (existsSync(FX)) rmSync(FX, { recursive: true, force: true });
});

test("L13: clean automation/ passes", () => {
  mkdirSync(join(FX, "automation", "tests"), { recursive: true });
  const violations = lintAutomationTopLayout(join(FX, "automation"));
  expect(violations).toEqual([]);
});

test("L13: stray .md in automation/ is flagged", () => {
  mkdirSync(join(FX, "automation", "tests"), { recursive: true });
  writeFileSync(join(FX, "automation", "HANDOFF.md"), "# handoff");
  const violations = lintAutomationTopLayout(join(FX, "automation"));
  expect(violations.some((v) => v.file.endsWith("HANDOFF.md"))).toBe(true);
});

test("L13: stray runs/ and scripts/ subdirs are flagged", () => {
  mkdirSync(join(FX, "automation", "runs"), { recursive: true });
  mkdirSync(join(FX, "automation", "scripts"), { recursive: true });
  const violations = lintAutomationTopLayout(join(FX, "automation"));
  expect(violations.length).toBe(2);
});

test("L13: hidden files are skipped", () => {
  mkdirSync(join(FX, "automation", "tests"), { recursive: true });
  writeFileSync(join(FX, "automation", ".DS_Store"), "");
  const violations = lintAutomationTopLayout(join(FX, "automation"));
  expect(violations).toEqual([]);
});

test("L13: missing automation/ dir returns no violations", () => {
  const violations = lintAutomationTopLayout(join(FX, "automation"));
  expect(violations).toEqual([]);
});
```

- [ ] **Step 4: 运行 lint 验证**

```bash
bun test .claude/scripts/_shared/tests/lint/feature-root-layout.test.ts
```
预期：pass（现有测试无回归 + 新 L13 测试 5 pass）

- [ ] **Step 5: 提交**

```bash
git add .claude/scripts/_shared/lint/feature-root-layout.ts .claude/scripts/_shared/cli/cases-lint.ts
git commit -m "$(cat <<'EOF'
feat: 🧩 add L13 lint for automation/ top-level stray files

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: lintSpecStructureValid severity — 分阶段升级

**Files:**
- Modify: `.claude/scripts/_shared/lint/v2-quality-gates.ts:229`

**Interfaces:**
- Consumes: `lintFeatureTests`（现成，不变）
- Produces: 第一阶段：feature-scoped 时为 fail，workspace-wide 保持 warn；第二阶段迁移完成后全仓 fail

- [ ] **Step 1: 分析现状**

当前第 229 行：

```typescript
        violation(item.file, `spec_structure_valid:${item.rule}`, item.message, "warn"),
```

`lintSpecStructureValid` 在 `buildCasesCommand` 里是通过 `workspaceWideReports` 数组调用的（第 149 行），而 `workspaceWideReports` 被 `isFeatureScoped` 保护——feature scoped 时这个数组为空，所以 §6 的单 feature lint 根本跑不到 `spec_structure_valid` 规则。

**结论：** 直接改 `"warn"` → `"fail"` 不会在 §6 的 scoped lint 中生效（因为根本没有被调用），只会让 workspace-wide `kata cases lint --exit-code` 全仓炸掉。需要同时解决两个问题：让 scoped lint 能跑到 `spec_structure_valid` + 分阶段升级 severity。

- [ ] **Step 2: 保证 spec_structure_valid 在 scoped lint 中运行**

在 `buildCasesCommand` 的 `workspaceWideReports` 数组上方，新增不受 `isFeatureScoped` 保护的 speccify 检查分支。在 `const workspaceWideReports = isFeatureScoped ? [] : [` 这行之前插入：

```typescript
      // spec_structure_valid 在两种 scope 下都运行：workspace-wide 时通过
      // lintSpecStructureValid 扫描全仓（保持 warn），scoped 时针对单 feature
      // 的 automation/tests/ 目录跑 lintFeatureTests 并以 fail 级阻断。
      const specStructureReports: Array<{ violations: Array<CaseLintViolation | Violation> }> =
        [];
      if (isFeatureScoped && scopedProject && scopedFeatureId) {
        // feature scoped: 直接针对目标 feature 的 tests/ 目录跑 lintFeatureTests
        for (const entry of listFeatureDirs(
          join(workspaceLintRoot, scopedProject, "features"),
        )) {
          if (entry.dirName === scopedFeatureId) {
            const testsDir = join(entry.dir, "automation", "tests");
            if (existsSync(testsDir)) {
              const report = lintFeatureTests(testsDir);
              for (const item of report.violations) {
                specStructureReports.push({
                  violations: [
                    violation(
                      item.file,
                      `spec_structure_valid:${item.rule}`,
                      item.message,
                      "fail", // scoped 时 fail
                    ),
                  ],
                });
              }
            }
            break;
          }
        }
      } else {
        // workspace-wide: 保持 warn
        specStructureReports.push({
          violations: lintSpecStructureValid(workspaceLintRoot).violations,
        });
      }
```

然后将 `...specStructureReports` 加入 `const reports` 数组。

- [ ] **Step 2 备选方案（更简单）**

如果上述改动太大，更简单的方案：不修改 lintSpecStructureValid 内部逻辑，而是在 `cases-lint.ts` 的 `const reports` 数组中，也将 `lintSpecStructureValid(workspaceLintRoot)` 放进不受 `isFeatureScoped` 保护的位置，但对 scoped 结果直接应用 fail severity。

实际上最简方式：保持 `v2-quality-gates.ts` 当前 warn severity 不变，只改 `lintSpecStructureValid` 的调用位置从 `workspaceWideReports` 移到不受 scoped 保护的区域，并在 feature-scoped 时把 severity 覆写为 fail。

```typescript
      // 如果 feature scoped，直接针对目标 tests/ 目录跑 lintFeatureTests，fail 级阻断
      const specStructureViolations: CaseLintViolation[] = [];
      if (isFeatureScoped && scopedProject && scopedFeatureId) {
        for (const entry of listFeatureDirs(
          join(workspaceLintRoot, scopedProject, "features"),
        )) {
          if (entry.dirName === scopedFeatureId) {
            const testsDir = join(entry.dir, "automation", "tests");
            if (existsSync(testsDir)) {
              for (const item of lintFeatureTests(testsDir).violations) {
                specStructureViolations.push({
                  file: item.file,
                  lineNumber: 1,
                  rule: `spec_structure_valid:${item.rule}`,
                  matched: item.file,
                  severity: "fail",
                  message: item.message,
                });
              }
            }
            break;
          }
        }
      }
```

此方案选择后者（更简单），最终效果：
- `kata cases lint --scope <single-feature>` → spec_structure_valid 检查以 fail 级阻断
- `kata cases lint --scope workspace` → spec_structure_valid 保持 warn，不阻断全仓

等后续迁移工具成熟、历史违规清理后，再把 workspace-wide 的 severity 改为 fail。

- [ ] **Step 3: 跑 lint 测试验证无回归**

```bash
bun test .claude/scripts/_shared/tests/lint/v2-quality-gates.test.ts
bun test .claude/scripts/_shared/tests/lint/tests-layout.test.ts
```
预期：pass

- [ ] **Step 4: 提交**

```bash
git add .claude/scripts/_shared/lint/v2-quality-gates.ts
git commit -m "$(cat <<'EOF'
fix: 🩹 make spec_structure_valid fail for scoped lint, warn for workspace-wide

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 新建 kata automation scaffold 命令

**Files:**
- Create: `.claude/scripts/_shared/cli/automation-scaffold.ts`
- Create: `.claude/scripts/_shared/cli/automation.ts`
- Modify: `.claude/scripts/_shared/cli/index.ts`
- Test: `.claude/scripts/_shared/tests/cli/automation-scaffold.test.ts`

**Interfaces:**
- Consumes: 无外部依赖；使用 `node:fs` mkdir/writeFile
- Produces:
  - `automation.ts`: `export function buildAutomationCommand(): Command` — commander 命令组
  - `automation-scaffold.ts`: `export function scaffoldAutomation(featureDir: string, opts: { force?: boolean }): ScaffoldResult`
  - `ScaffoldResult = { created: string[], skipped: string[], overwritten: string[] }`

- [ ] **Step 1: 编写 automation-scaffold.ts**

```typescript
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface ScaffoldResult {
  created: string[];
  skipped: string[];
  overwritten: string[];
}

const SUBDIRS = ["cases", "runners", "data", "unit", ".debug"];

const SMOKE_SPEC = `// smoke test — 聚合 P0 用例 import
// 此文件由 kata automation scaffold 生成，可手动编辑 import 列表。
`;

const FULL_SPEC = `// full regression — 聚合该 feature 下所有用例 import
// 此文件由 kata automation scaffold 生成，可手动编辑 import 列表。
`;

const CASES_README = `# 用例索引

<!-- t{nn} → 业务场景映射，由 case-draft 或 playwright-automation 维护 -->
`;

export function scaffoldAutomation(
  featureDir: string,
  opts: { force?: boolean } = {},
): ScaffoldResult {
  const result: ScaffoldResult = { created: [], skipped: [], overwritten: [] };
  const testsDir = join(featureDir, "automation", "tests");

  // 当前只创建平铺 cases/ 目录。L2 规则（cases >= 15 时需模块子目录）在 scaffold 中不
  // 自动处理——模块拆分依赖 case-draft/playwright-automation 分配用例时的人为决策。
  // scaffold 确保骨架目录存在；模块子目录结构由后续 kata cases lint 中的 L2 warn 提示。
  for (const sub of SUBDIRS) {
    const dir = join(testsDir, sub);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      result.created.push(dir);
    }
  }

  // runners/smoke.spec.ts
  const smoke = join(testsDir, "runners", "smoke.spec.ts");
  if (!existsSync(smoke)) {
    writeFileSync(smoke, SMOKE_SPEC);
    result.created.push(smoke);
  } else if (opts.force) {
    writeFileSync(smoke, SMOKE_SPEC);
    result.overwritten.push(smoke);
  } else {
    result.skipped.push(smoke);
  }

  // runners/full.spec.ts
  const full = join(testsDir, "runners", "full.spec.ts");
  if (!existsSync(full)) {
    writeFileSync(full, FULL_SPEC);
    result.created.push(full);
  } else if (opts.force) {
    writeFileSync(full, FULL_SPEC);
    result.overwritten.push(full);
  } else {
    result.skipped.push(full);
  }

  // cases/README.md
  const readme = join(testsDir, "cases", "README.md");
  if (!existsSync(readme)) {
    writeFileSync(readme, CASES_README);
    result.created.push(readme);
  } else {
    result.skipped.push(readme);
  }

  return result;
}
```

- [ ] **Step 2: 编写 commander 包装 automation.ts**

```typescript
import { Command } from "commander";
import { scaffoldAutomation } from "./automation-scaffold.ts";

export function buildAutomationCommand(): Command {
  const automation = new Command("automation").description("自动化目录结构管理");

  automation
    .command("scaffold <feature-dir>")
    .description("创建自动化测试骨架（只补充缺失，不覆盖已有文件）")
    .option("--force", "覆盖 runners 壳文件")
    .action(async (featureDir: string, opts: { force?: boolean }) => {
      const result = scaffoldAutomation(featureDir, { force: opts.force ?? false });
      if (result.created.length)
        console.log(`created: ${result.created.map((p) => p.replace(featureDir + "/", "")).join(", ")}`);
      if (result.overwritten.length)
        console.log(`overwritten: ${result.overwritten.map((p) => p.replace(featureDir + "/", "")).join(", ")}`);
      if (result.skipped.length)
        console.log(`skipped (exists): ${result.skipped.map((p) => p.replace(featureDir + "/", "")).join(", ")}`);
    });

  return automation;
}
```

- [ ] **Step 3: 在 index.ts 中注册**

在 index.ts 的 import 区追加：

```typescript
import { buildAutomationCommand } from "@shared/cli/automation.ts";
```

在 noun-verb 命令注册区（`buildHandoffCommand()` 之后）追加：

```typescript
kata.addCommand(buildAutomationCommand());
```

- [ ] **Step 4: 编写测试**

```typescript
import { expect, test, afterEach } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { scaffoldAutomation } from "@shared/cli/automation-scaffold.ts";

const TMP = join(import.meta.dirname, "tmp-scaffold-test");

afterEach(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

test("scaffold creates all expected dirs and files in empty feature", () => {
  const featureDir = join(TMP, "empty-feature");
  mkdirSync(join(featureDir, "automation"), { recursive: true });

  const result = scaffoldAutomation(featureDir);

  expect(result.created.length).toBe(8); // 5 dirs + 2 runner shells + 1 README
  expect(result.overwritten.length).toBe(0);
  expect(result.skipped.length).toBe(0);

  // 验证目录
  for (const sub of ["cases", "runners", "data", "unit", ".debug"]) {
    expect(existsSync(join(featureDir, "automation", "tests", sub))).toBe(true);
  }

  // 验证文件
  expect(existsSync(join(featureDir, "automation", "tests", "runners", "smoke.spec.ts"))).toBe(true);
  expect(existsSync(join(featureDir, "automation", "tests", "runners", "full.spec.ts"))).toBe(true);
  expect(existsSync(join(featureDir, "automation", "tests", "cases", "README.md"))).toBe(true);
});

test("scaffold skips existing runners unless --force", () => {
  const featureDir = join(TMP, "existing-feature");
  const runnersDir = join(featureDir, "automation", "tests", "runners");
  mkdirSync(runnersDir, { recursive: true });
  writeFileSync(join(runnersDir, "smoke.spec.ts"), "// custom");

  const result = scaffoldAutomation(featureDir);

  expect(result.skipped.some((p) => p.endsWith("smoke.spec.ts"))).toBe(true);

  // content preserved
  expect(readFileSync(join(runnersDir, "smoke.spec.ts"), "utf-8")).toBe("// custom");
});

test("scaffold --force overwrites runners only", () => {
  const featureDir = join(TMP, "force-feature");
  const runnersDir = join(featureDir, "automation", "tests", "runners");
  mkdirSync(runnersDir, { recursive: true });
  writeFileSync(join(runnersDir, "smoke.spec.ts"), "// custom");

  const result = scaffoldAutomation(featureDir, { force: true });

  expect(result.overwritten.some((p) => p.endsWith("smoke.spec.ts"))).toBe(true);
  expect(readFileSync(join(runnersDir, "smoke.spec.ts"), "utf-8")).toContain("kata automation scaffold");
});
```

- [ ] **Step 5: 运行测试**

```bash
bun test .claude/scripts/_shared/tests/cli/automation-scaffold.test.ts
```
预期：3 pass

- [ ] **Step 6: 提交**

```bash
git add .claude/scripts/_shared/cli/automation-scaffold.ts \
        .claude/scripts/_shared/cli/automation.ts \
        .claude/scripts/_shared/cli/index.ts \
        .claude/scripts/_shared/tests/cli/automation-scaffold.test.ts
git commit -m "$(cat <<'EOF'
feat: 🧩 add kata automation scaffold command

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: 新建 kata automation normalize 命令

**Files:**
- Create: `.claude/scripts/_shared/cli/automation-normalize.ts`
- Modify: `.claude/scripts/_shared/cli/automation.ts`（注册 normalize 子命令）
- Test: `.claude/scripts/_shared/tests/cli/automation-normalize.test.ts`

**Interfaces:**
- Consumes: 无外部依赖；使用 `node:fs` + `node:path`
- Produces:
  - `automation-normalize.ts`: `export function normalizeAutomation(featureDir: string, opts: { dryRun?: boolean; apply?: boolean }): NormalizeReport`
  - `NormalizeReport = { removed: string[], unfixable: { path: string; reason: string }[], violations: number }`
  - 默认 `dryRun=true`（只报告不删除），`--apply` 才执行修复
  - 修复时移入 `runs/<ts>/normalized/` 而非直接删除

- [ ] **Step 1: 编写 automation-normalize.ts**

```typescript
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const RUNNERS_ALLOWED = new Set(["smoke.spec.ts", "full.spec.ts", "retry-failed.spec.ts"]);

const AUTOMATION_TOP_ALLOWED = new Set(["tests", ".DS_Store"]);

export interface NormalizeReport {
  moved: string[];
  unfixable: { path: string; reason: string }[];
  violations: number;
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listTopEntries(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir);
}

/** 生成备份目标目录：runs/<timestamp>/normalized/ */
function backupDir(featureDir: string): string {
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "")
    .slice(0, 15);
  return join(featureDir, "runs", `${ts}-normalized`);
}

export function normalizeAutomation(
  featureDir: string,
  opts: { dryRun?: boolean; apply?: boolean } = {},
): NormalizeReport {
  // dryRun 默认为 true；apply 明示时才真正修复
  const shouldDelete = opts.apply === true && opts.dryRun !== true;
  const report: NormalizeReport = { moved: [], unfixable: [], violations: 0 };
  const automationDir = join(featureDir, "automation");
  const testsDir = join(automationDir, "tests");
  const runnersDir = join(testsDir, "runners");

  // 1. 清理 automation/ 顶层的 stray .md .json .yaml
  if (existsSync(automationDir)) {
    for (const name of listTopEntries(automationDir)) {
      if (AUTOMATION_TOP_ALLOWED.has(name)) continue;
      const full = join(automationDir, name);
      if (isDir(full)) {
        report.unfixable.push({
          path: full,
          reason: `automation/ 顶层不应有子目录 "${name}"，请手动移除`,
        });
        report.violations++;
      } else if (/\.(md|json|yaml)$/.test(name)) {
        if (shouldDelete) {
          const target = join(backupDir(featureDir), "automation", name);
          mkdirSync(join(backupDir(featureDir), "automation"), { recursive: true });
          renameSync(full, target);
        }
        report.moved.push(full);
        report.violations++;
      } else {
        report.unfixable.push({
          path: full,
          reason: `automation/ 顶层不允许文件 "${name}"，请手动移除或移动到正确位置`,
        });
        report.violations++;
      }
    }
  }

  // 2. 清理 runners/ 中不在白名单的 .spec.ts
  if (existsSync(runnersDir)) {
    for (const name of listTopEntries(runnersDir)) {
      if (!name.endsWith(".spec.ts")) continue;
      if (RUNNERS_ALLOWED.has(name)) continue;
      const full = join(runnersDir, name);
      if (shouldDelete) {
        const target = join(backupDir(featureDir), "runners", name);
        mkdirSync(join(backupDir(featureDir), "runners"), { recursive: true });
        renameSync(full, target);
      }
      report.moved.push(full);
      report.violations++;
    }
  }

  // 3. 检查 feature 根目录的 stray 文件（只报告，不自动删除）
  const ALLOWED_ROOT = new Set([
    "metadata.yaml", "prd.md", "README.md",
    "cases", "automation", "runs", "inputs",
    ".DS_Store",
  ]);
  for (const name of listTopEntries(featureDir)) {
    if (ALLOWED_ROOT.has(name)) continue;
    if (name.startsWith(".")) continue;
    const full = join(featureDir, name);
    report.unfixable.push({
      path: full,
      reason: `feature 根目录不允许 "${name}"，用例进 cases/，自动化进 automation/，结果进 runs/`,
    });
    report.violations++;
  }

  return report;
}
```

- [ ] **Step 2: 在 automation.ts 中注册 normalize 子命令**

```typescript
import { normalizeAutomation } from "./automation-normalize.ts";

  automation
    .command("normalize <feature-dir>")
    .description("检测并修复自动化目录结构违规（默认 dry-run，--apply 才执行修复）")
    .option("--apply", "执行修复（stray 文件移动到 runs/<ts>/normalized/ 备份）")
    .action(async (featureDir: string, opts: { apply?: boolean }) => {
      const dryRun = !opts.apply;
      const report = normalizeAutomation(featureDir, { dryRun, apply: !!opts.apply });
      if (dryRun) {
        console.log("[dry-run] 将移动以下文件到 runs/<ts>/normalized/：");
        for (const p of report.moved) console.log(`  ${p}`);
        console.log("[dry-run] 不可自动修复：");
        for (const u of report.unfixable) console.log(`  ${u.path} — ${u.reason}`);
        if (report.moved.length === 0 && report.unfixable.length === 0) {
          console.log("  (无违规)");
        }
        console.log(`\n[normailize] violations=${report.violations}`);
        if (report.moved.length > 0) {
          console.log("\n使用 --apply 执行修复（文件将移入 runs/<ts>/normalized/ 备份）。");
        }
      } else {
        const backup = backupDir(featureDir);
        for (const p of report.moved) console.log(`moved: ${p} → ${backup}`);
        for (const u of report.unfixable) console.log(`unfixable: ${u.path} — ${u.reason}`);
        console.log(`\n[normalize] violations=${report.violations} | moved=${report.moved.length} | backup=${backup}`);
      }
      if (report.unfixable.length > 0) process.exit(1);
    });
```

- [ ] **Step 3: 编写测试**

```typescript
import { expect, test, afterEach } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { normalizeAutomation } from "@shared/cli/automation-normalize.ts";

const TMP = join(import.meta.dirname, "tmp-normalize-test");

afterEach(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

test("default (dryRun) reports but does not move or delete", () => {
  const featureDir = join(TMP, "bad-feature");
  mkdirSync(join(featureDir, "automation", "tests", "runners"), { recursive: true });
  const strayMd = join(featureDir, "automation", "AUTOMATION-PLAN.md");
  writeFileSync(strayMd, "# plan");

  // 默认不传 apply，只有 dryRun
  const report = normalizeAutomation(featureDir, { dryRun: true, apply: false });

  expect(report.moved.length).toBeGreaterThan(0);
  expect(report.moved.some((p) => p.endsWith("AUTOMATION-PLAN.md"))).toBe(true);
  expect(existsSync(strayMd)).toBe(true); // dry-run 不移
});

test("--apply moves stray .md to runs/normalized/ backup", () => {
  const featureDir = join(TMP, "bad-feature");
  mkdirSync(join(featureDir, "automation", "tests", "runners"), { recursive: true });
  mkdirSync(join(featureDir, "runs"), { recursive: true });
  const strayMd = join(featureDir, "automation", "HANDOFF-20260705.md");
  writeFileSync(strayMd, "# handoff");

  const report = normalizeAutomation(featureDir, { dryRun: false, apply: true });

  // 原文件已移走
  expect(existsSync(strayMd)).toBe(false);
  // 备份目录已创建
  const runDirs = readdirSync(join(featureDir, "runs"));
  const normalizedDir = runDirs.find((d) => d.endsWith("-normalized"));
  expect(normalizedDir).toBeDefined();
  // 文件在备份目录中
  expect(existsSync(join(featureDir, "runs", normalizedDir!, "automation", "HANDOFF-20260705.md"))).toBe(true);
  expect(report.moved.length).toBe(1);
});

test("--apply moves extra runners to backup", () => {
  const featureDir = join(TMP, "bad-feature");
  mkdirSync(join(featureDir, "automation", "tests", "runners"), { recursive: true });
  mkdirSync(join(featureDir, "automation", "tests", "cases"), { recursive: true });
  writeFileSync(join(featureDir, "automation", "tests", "runners", "smoke.spec.ts"), "// ok");
  writeFileSync(join(featureDir, "automation", "tests", "runners", "full.spec.ts"), "// ok");
  writeFileSync(join(featureDir, "automation", "tests", "runners", "v6411-ui-rebuild.spec.ts"), "// extra");

  const report = normalizeAutomation(featureDir, { dryRun: false, apply: true });

  expect(report.moved.some((p) => p.endsWith("v6411-ui-rebuild.spec.ts"))).toBe(true);
  // whitelist runners 不受影响
  expect(existsSync(join(featureDir, "automation", "tests", "runners", "smoke.spec.ts"))).toBe(true);
  expect(existsSync(join(featureDir, "automation", "tests", "runners", "full.spec.ts"))).toBe(true);
});

test("clean feature passes with zero violations", () => {
  const featureDir = join(TMP, "clean-feature");
  mkdirSync(join(featureDir, "automation", "tests", "runners"), { recursive: true });
  mkdirSync(join(featureDir, "automation", "tests", "cases"), { recursive: true });
  writeFileSync(join(featureDir, "automation", "tests", "runners", "smoke.spec.ts"), "// ok");
  writeFileSync(join(featureDir, "automation", "tests", "runners", "full.spec.ts"), "// ok");

  const report = normalizeAutomation(featureDir);

  expect(report.violations).toBe(0);
});
```

注意：测试需要 import `readdirSync`（第 2 行），以及 `NormalizeReport` 的字段名从 `removed` 改为 `moved`。

- [ ] **Step 4: 运行测试**

```bash
bun test .claude/scripts/_shared/tests/cli/automation-normalize.test.ts
```
预期：4 pass

- [ ] **Step 5: 提交**

```bash
git add .claude/scripts/_shared/cli/automation-normalize.ts \
        .claude/scripts/_shared/cli/automation.ts \
        .claude/scripts/_shared/tests/cli/automation-normalize.test.ts
git commit -m "$(cat <<'EOF'
feat: 🧩 add kata automation normalize command (dry-run by default, --apply moves to backup)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: 全量测试 + lint 终验

**Files:**
- （无新建，只验证）

- [ ] **Step 1: 跑 skill 同步检查**

```bash
bun run check:skills
```
预期：pass

- [ ] **Step 2: 跑全量测试**

```bash
bun test
```
预期：无新增失败

- [ ] **Step 3: 跑 lint**

```bash
bun run check
```
预期：无新增违规

- [ ] **Step 4: 对 v6411 目录跑 normalize --dry-run 做冒烟验证**

```bash
# dry-run 先看报告
bun run kata automation normalize "workspace/dataAssets/features/v6.4.11/【v6411】【岚图汽车】【数据资产】数据质量任务性能优化，规则sql合并" --dry-run
```
预期：列出所有可自动修复项（stray .md、多余 runner）和不可自动修复项（results/、.debug/、metadata.id 等）

- [ ] **Step 5: 提交**

```bash
# 如果以上全部通过，只有 bun.lock 或其他无关文件变更时才提交
git status
# 预期：working tree clean（所有改动已在上述 Task 中提交）
```
