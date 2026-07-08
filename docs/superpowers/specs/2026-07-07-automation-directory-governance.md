# 自动化目录结构规范治理

**日期**: 2026-07-07
**触发**: Codex 迭代产物 `【v6411】【岚图汽车】【数据资产】数据质量任务性能优化，规则sql合并` 发现 35 个结构违规，根因是规则传递链路从定义→代理执行→评审→lint 闸门全线存在缺口。
**方案**: B + C 混合 = 单一权威源（directory-structure.md）+ 工具链（scaffold / normalize）+ 闸门前置

## 根因回顾

| # | 根因 | 证据 |
|---|------|------|
| 1 | 结构规则分散在 4 个文件，无单一权威源 | naming-convention.md / §6 / tests-layout.ts / feature-root-layout.ts 各说各的 |
| 2 | agent-worker.md 不传递结构约束，且明确说"不读 SKILL.md" | worker 在黑暗中工作，只被告知写 `automation/tests/cases/<id>.spec.ts` |
| 3 | agent-spec-reviewer.md 只检查存在性（smoke/full 在不在），不检查排他性（多余 runner 不报） | 13 个额外 runner 全部从 reviewer 漏过 |
| 4 | kata cases lint 在 §10 才跑，违规早已落盘 | 30 个严重违规在 §6–§9 已写入 |
| 5 | Codex 迭代可能未执行 §10 闸门 | `codexrun`/`codex-full` 命名的大量 runs 目录，lint 从未阻断 |
| 6 | 单 case worker 的自然行为就是建 runner 独立跑自己 | 没有机制阻止，13 个 runner 是必然结果 |

## 设计原则

1. **单一权威源** — 结构规则只有一份文件说了算，prompt 和 lint 都引用它
2. **闸门前置** — lint 不应等到 §10 才跑，在写入后立即跑
3. **工具强制执行** — 依赖 prompt 纪律不可靠，工具级约束不依赖代理听话
4. **渐进修复** — scaffold 只补不覆盖，normalize 可自动修的自动修，不可自动修的报告

## 改动总览

### B1: 新建权威文档

**文件**: `.claude/skills/playwright-automation/references/directory-structure.md`

**内容**: 汇总现有 lint 代码中已实现的规则，加上当前无检测的盲区规则：

```markdown
# 自动化目录结构规范

## Feature 根目录白名单 (L12)
允许:
  cases/  automation/  runs/  inputs/
  metadata.yaml  prd.md  README.md
禁止:
  *.ts  *.json  results/  .debug/  其他散落文件

## automation/ 顶层 (盲区 → L13)
允许:
  tests/
禁止:
  *.md  *.json  *.yaml  .DS_Store  runs/  scripts/

## automation/tests/ 子目录 (L1)
允许:
  cases/  runners/  data/  unit/  .debug/
禁止:
  helpers/  sql/  MANUAL-TRIAGE.md

## cases/ 命名规则 (L1)
格式: t{nn}-{slug}.ts  (nn 从 01 起，slug 为小写字母数字连字符)
必须匹配: ^t\d{2}-[a-z0-9-]+\.ts$
禁止: *.spec.ts  *-debug*.ts  *-repro*.ts  diag_*.ts

## cases/ 索引 (L2, L3)
- cases/README.md 必须存在，枚举 t{nn} → 业务场景映射
- cases >= 15 时必须拆分为 >= 2 个模块子目录

## runners/ 白名单 (L5)
只允许:
  smoke.spec.ts     — 冒烟（P0 用例 import）
  full.spec.ts      — 全量回归（全部用例 import）
  retry-failed.spec.ts — 失败重跑（仅重跑上次失败用例）
禁止:
  任何其他 .spec.ts
  runner 内写 test() 体（runner 只做聚合 import）

## data/ 命名 (L7)
禁止文件名匹配 _v\d+ 或 -\d+.ts（变体副本，应用 git history）

## unit/ 命名 (L6)
只允许 *.test.ts

## .debug/ (L8)
调试 spec 放 .debug/，需在 .gitignore 中

## 共享代码位置
- 页面对象: workspace/<project>/_shared/pages/
- 工具函数: workspace/<project>/_shared/helpers/
- 禁止: automation/tests/helpers/ (feature-local helper)

## 禁止项总览
- debug/repro/diag spec 文件放在 cases/ 或 runners/ 而不在 .debug/
- feature 根目录有 .env.local
- auth storageState 路径不在 workspace/<project>/.kata/auth/ 下
```

### B2: 改写 agent-worker.md

在第 24 行 ("不碰其它用例的 spec") 之后追加：

```
> 写入前必须检查目录结构：只写 cases/ 下的单个 case 文件；不创建 runner、不写 automation/ 顶层文件。
> 结构约束详见 references/directory-structure.md。写入不属于 cases/ 的文件前，先确认白名单。
```

### B3: 改写 agent-spec-reviewer.md

playwright-generate 检查项改为：

```
- [ ] automation/tests/runners/smoke.spec.ts 存在
- [ ] automation/tests/runners/full.spec.ts 存在
- [ ] runners/ 目录不含白名单外的 .spec.ts (L5)
- [ ] case 文件位于 automation/tests/cases/
- [ ] automation/ 顶层无散落 .md .json 文件
- [ ] feature 根目录无非白名单文件 (L12)
```

### B4: 改写 §6-playwright-generate.md

第 112 行之后插入 scaffold + lint 步骤：

```
- 生成前跑 `kata automation scaffold <feature-dir>` 确保骨架合规
- 全部 case 写入后跑 `kata automation normalize <feature-dir> --dry-run` 报告偏离
- 偏离修复后跑 `kata cases lint --exit-code --severity fail-only --scope <feature-dir>`
```

原第 112 行改为引用 `directory-structure.md`。

### B5: 改写 §10-quality-gate.md

追加检查项：

```
- automation/ 顶层无散落 .md .json .yaml 文件
```

### B6: automation/ 顶层散落文件的 lint 检测

在 `feature-root-layout.ts` 增加检查：遍历 `automation/` 顶层 entry，不在白名单 `["tests"]` 且非隐藏文件则报 L13。

### B7: lintSpecStructureValid severity 修正

`v2-quality-gates.ts` 第 229 行 `lintSpecStructureValid` 的 severity 从 `"warn"` 改为 `"fail"`。

### C1: kata automation scaffold

**文件**: `.claude/scripts/_shared/cli/automation-scaffold.ts`

```typescript
// kata automation scaffold <feature-dir>
//
// 确保 automation/tests/ 骨架合规，只补充缺失，不覆盖已有文件。
//
// 行为:
// 1. 创建 tests/{cases,runners,data,unit,.debug}/ 缺失的目录
// 2. 写入 runners/smoke.spec.ts 空壳（如不存在）
// 3. 写入 runners/full.spec.ts 空壳（如不存在）
// 4. 写入 cases/README.md 模板（如不存在）
// 5. --force: 覆盖 runners 壳（不覆盖 cases/ 下的实际代码）
```

空壳 `full.spec.ts` 内容（`<archive-path>` 和 `<intent-id>` 从 `metadata.yaml` 读取）：

```typescript
// spec: cases/archive.md
// intent: <intent-id>
// runner: 全量回归 — 聚合该 feature 下所有用例 import
// 此文件由 kata automation scaffold 生成，可手动编辑 import 列表。
```

### C2: kata automation normalize

**文件**: `.claude/scripts/_shared/cli/automation-normalize.ts`

```typescript
// kata automation normalize <feature-dir> [--dry-run]
//
// 修复结构违规，可自动修的自动执行，不可自动修的报告。
//
// 自动修复 (without --dry-run):
// 1. 删除 automation/ 顶层的 *.md *.json *.yaml
// 2. 删除 runners/ 中不在白名单的 .spec.ts
// 3. 报告 feature 根目录的 results/ 非空目录（可能含 Allure 结果）和 .debug/ 目录，需人工确认后手动清理
//
// 报告 (with --dry-run 或不可自动修复):
// 4. cases/ 中命名不规范的 .ts 文件列表
// 5. feature 根目录的 stray 文件列表
// 6. runners/ 中 .spec.ts 含 test() 体的警告
//
// 退出码:
// 0 — 无违规或全部已自动修复
// 1 — 存在不可自动修复的违规
```

### C3: 命令注册

`automation.ts` 注册子命令，在 `index.ts` 注册 `automation` 命令组。

### C4: 测试

- `automation-scaffold.test.ts`: 空目录 scaffold 后结构正确；已有文件不被覆盖；--force 覆盖 runners
- `automation-normalize.test.ts`: dry-run 报告不删除；实际运行删除 stray 文件；白名单 runner 不受影响

## 流程切入

```
§6 playwright-generate
  ├─ kata automation scaffold <feature-dir>       ← 确保骨架
  ├─ worker 写 cases/t{nn}-{slug}.ts
  ├─ kata automation normalize <feature-dir>      ← 清理可能写的垃圾
  └─ kata cases lint --exit-code --scope <dir>    ← 验证

§10 quality-gate
  └─ kata cases lint --exit-code --severity fail-only --scope workspace

§11 handoff
  └─ lint exit-code ≠ 0 → handoff status = FAILED
```

## 改动清单

### 新建文件

| 文件 | 行数 |
|------|------|
| `references/directory-structure.md` | ~60 |
| `cli/automation-scaffold.ts` | ~80 |
| `cli/automation-normalize.ts` | ~120 |
| `cli/automation.ts` | ~20 |
| `tests/cli/automation-scaffold.test.ts` | ~80 |
| `tests/cli/automation-normalize.test.ts` | ~100 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `prompts/agent-worker.md` | +3 行 |
| `prompts/agent-spec-reviewer.md` | +2 项检查 |
| `phases/§6-playwright-generate.md` | +3 行 scaffold 步骤，改引用 |
| `phases/§10-quality-gate.md` | +1 项 |
| `lint/feature-root-layout.ts` | +15 行 (L13) |
| `lint/v2-quality-gates.ts` | severity warn→fail |
| `cli/index.ts` | +1 行注册 |

## 验收标准

1. `directory-structure.md` 覆盖 tests-layout.ts 全部 L1–L11 规则 + feature-root-layout.ts L12 + 新 L13
2. `agent-worker.md` 引用 `directory-structure.md`
3. `agent-spec-reviewer.md` 检查 runner 白名单排他性 + automation/ 顶层清洁
4. `kata automation scaffold <dir>` 在空 feature 目录创建合规骨架
5. `kata automation normalize <dir>` 可删除 automation/ 顶层 stray .md 和多余 runner
6. `kata cases lint` 在 `lintSpecStructureValid` 上 fail（非 warn）
7. `normalize` 命令可在 v6411 目录上报告全部违规、并自动修复可自动修复项（stray .md、多余 runner），不可自动修复项（如 metadata.id 中文）在报告中列出
8. scaffold + normalize + lint 在 §6 就能阻断违规，不必等到 §10

## 不在范围内

- 不修改 agent-quality-reviewer.md（它负责内容质量，不负责结构）
- 不新建 playwright-automation phase（scaffold 步骤嵌入现有 §6）
- 不清理 v6411 现有违规（本 spec 只建机制，清理在实现阶段做）
- 不修改 Codex 侧的 prompt 传递逻辑（scaffold + normalize 工具级约束不依赖平台）
