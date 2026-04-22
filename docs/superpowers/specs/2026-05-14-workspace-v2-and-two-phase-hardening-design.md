---
schema: SuperpowersDesignSpec@1
id: 2026-05-14-workspace-v2-and-two-phase-hardening
status: draft
created_at: 2026-05-14
owners: [koco]
related_skills: [case-draft, playwright-automation, workspace-manage]
---

# kata Workspace v2 与两阶段工作流强化设计

## 1. 概览与目标

### 1.1 一句话目标

把 kata 从「靠约定 + .gitignore 兜底」升级为「契约驱动 + flat-metadata + 单一隐藏根 + 两阶段工作流补强」。一次性 hard cut，不兼容旧布局，不留 deprecation 期。

### 1.2 范围（合一 spec）

1. 两阶段（case-draft / playwright-automation）健康度审计（findings + 修复路径）
2. 目录治理 v2 标准（features 平铺、metadata、_shared、单一 .kata、results 三级隔离）
3. 两阶段工作流补强（4 项业界做法 + helpers/pages 全局化 + manifest 强契约）
4. 一次性迁移脚本 `kata migrate v2`
5. 统一 CLI（gh/docker 风格 `kata <noun> <verb>`），淘汰 `kata-cli` 旧二进制
6. 自动生成的 features INDEX，把目录浏览体验软件化

### 1.3 非目标

- 不重构 `engine/` `plugins/` `tools/` 代码（仅改 workspace + .ai/core 契约 + tools/kata-cli/）
- 不引入新 LLM / agent 框架（保留 Anthropic Skills + workflow.yaml 编排）
- 不重写已有 schemas（PlaywrightAutomationHandoff、SourceRef、AutomationIntent 等保留并扩展）
- 不合并 `dtstack-cli`（独立工具，服务平台 API；通过 `kata env check` 间接调用）

### 1.4 成功判定（spec 验收门槛）

- `workspace/<project>/` 仅剩 3 个顶层：`features/` + `_shared/` + `.kata/`（外加 `project.json` + `tsconfig.json`）
- 任意 feature 路径形如 `features/<YYYY-MM>-<slug>/`，纯 ASCII，metadata 完备
- 任何 workflow 不会创建未在契约中声明的目录/文件
- `cleanup-duplicates.sh` 等历史补救脚本删除完毕
- 根级隐藏目录仅 `.kata/`

---

## 2. 两阶段健康度审计

### 2.1 健康面（已扎实，本次保留）

| 维度 | 现状评价 |
|---|---|
| Skill 编排 | case-draft + playwright-automation 都有完整 workflow.yaml + references/ + skill.yaml；与 Playwright 官方 Test Agents (planner→generator→healer) 同构，方向正确 |
| Handoff 契约 | `PlaywrightAutomationHandoff@1` schema 已定义，含 status/changed_files/run_command/evidence_paths/unresolved_blockers，业界平均水平之上 |
| SourceRef chain | SR-INTENT / SR-ENV / SR-UI-PROBE / SR-SELF-RUN 四级，quality-gate 强制 cases 引用全 3 种，证据可追溯思想到位 |
| Quality gates | 9 项自动化检查覆盖弱断言、env 隔离、runner 结构、session 合规、env profile、cases lint 等，业界领先 |
| Real run 强制 | self-run 必须执行真实 playwright 命令并记录退出码，比 browser-use / Skyvern 等「agent 自陈」更严谨 |
| Iterative review | case-draft 有 atomization-guide / ambiguity-decision-tree / confirmation-package + 最多 3 轮 product-feedback-merge，iterative gating 较成熟 |

### 2.2 关键 findings（按严重度排序，10 项全部纳入本 spec）

#### P0：阻断性

1. **Feature 目录无 lint，命名失控** — 中文 + `【】` 放任，跨平台/CLI/CI 全部受害；无 metadata 元数据校验
2. **运行时产物五处散落** — `tests/.runs/`、`tests/.debug/`、`tests/.task-state.json`、`workspace/<p>/reports/{allure,playwright,bugs}/`、根级 `.kata/.auth/.worktrees/.temp/.runs/`
3. **helpers/pages 反模式** — `tests/helpers/<feature-name>-helpers.ts` 与 feature 名字耦合；跨 feature 复用要么复制要么硬路径相对引用
4. **`prd.md` / `images/` / `tmp/` 仅在部分 feature 出现** — 是约定不是契约

#### P1：工程质量

5. **manifest.json 信息含量极低** — 仅 `{file-entries: {...}}`，缺 automation_status / source_refs / requirement_atoms / coverage 等
6. **handoff.md 是人读 markdown** — 下游 agent 解析自由格式，LLM 输出漂移即解析失败
7. **生成的 `t*.ts` 无反向溯源注释** — 一个 spec 失败时无法直接看到对应 case / SR-INTENT / page object
8. **SourceRef 前缀无中央注册表** — SR-INTENT/SR-ENV/SR-UI-PROBE/SR-SELF-RUN 散落 4 个 references/*.md 描述，新增前缀无规范化路径

#### P2：体验/运维

9. **看 feature 全貌要 4 处跳** — features/、reports/allure/、reports/playwright/、reports/bugs/
10. **历史包袱可见** — `cleanup-duplicates.sh`、git status 中大量 `D docs/superpowers/specs/*.md`、`.DS_Store` 入仓多处

### 2.3 业界对标差距（5 项全部纳入本 spec）

| 业界做法 | 来源 | kata 现状 |
|---|---|---|
| 生成代码反向溯源注释 | Playwright Test Agents v1.56+ | 缺 |
| Allure 风格 results/<run-id>/ 三级隔离 | Allure / Playwright MCP session-scoped 提案 | 缺（产物分散 5 处） |
| `testInfo.outputPath()` + `.debug/` 替代 `t01-debug.spec.ts` | Playwright 最佳实践 | 缺（gitignore 仅兜底 `t*-debug.spec.ts`） |
| handoff strict JSON + 渲染 md | LangGraph typed state / Skyvern data_extraction_schema | 现仅 md |
| Page object 按 domain 全局分组 | Cucumber 社区共识 | 反模式（feature-coupled） |

---

## 3. 目录治理 v2 标准

### 3.1 顶层结构（workspace/<project>/）

```
workspace/<project>/
├── features/                    # 唯一 feature 物理位置（平铺）
│   ├── INDEX.md                 # CLI 自动生成，禁手改
│   └── <YYYY-MM-slug>/          # 单 feature 目录
├── _shared/                     # 跨 feature 共享资源（_ 前缀避免与 feature 同名）
│   ├── _meta/                   # modules/customers/versions 枚举（lint 引用源）
│   │   ├── modules.yaml
│   │   ├── customers.yaml
│   │   └── versions.yaml
│   ├── pages/                   # page object（按 page domain 分组）
│   ├── helpers/                 # 跨 page 通用 helper（登录、等待、断言）
│   ├── fixtures/                # 共享数据 fixture
│   ├── env/                     # 环境配置 (ci63.yaml, ltqc-*.yaml)
│   ├── knowledge/               # 业务知识
│   ├── rules/                   # 业务规则
│   ├── archive/                 # 老 feature 压缩归档（follow-up，本 spec 不实现）
│   └── published-reports/       # CLI 后处理生成的可发布报告
├── .kata/                       # 项目级隐藏运行时根（可选，详见 3.5）
├── project.json                 # 工作区元数据
└── tsconfig.json
```

旧的 `reports/` `audits/` `history/` `issues/` `regressions/` `knowledge/` `rules/` `shared/` `env/` 全部消失或被收拢。

### 3.2 features/ 平铺规则与 slug 命名

**目录命名正则**（强 lint）：
```
^(\d{4})-(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$
```

- 前缀：`YYYY-MM`（4 位年 + 2 位月，自然时间排序）
- slug：纯小写 ASCII，`-` 分隔，长度 ≤ 60 字符
- 示例：`2026-04-dq-json-config`、`2026-05-mask-batch-create`、`2026-06-multimodal-file-detail`
- 禁止：中文、`【】`、空格、点号、下划线、大写、连续 `-`
- slug 不携带语义维度（不再编码模块/客户/版本，全在 metadata.yaml）

### 3.3 metadata.yaml 强契约

每个 feature 必须有 `metadata.yaml`，schema 由 `.ai/core/schemas/FeatureMetadata.v1.schema.json` 约束：

```yaml
schema: FeatureMetadata@1
id: 2026-04-dq-json-config              # 等于目录名，反向校验
display_name: "【通用配置】json 格式配置"   # 中文人读名（CLI/INDEX 渲染用）
status: active                          # active | archived | draft | blocked
created_at: 2026-04-15
updated_at: 2026-05-10

# 多值标签 — 跨维度不被路径绑架
modules: [dq, generalConfig]            # 来自 _shared/_meta/modules.yaml
customers: [standard, ltqc]             # 来自 _shared/_meta/customers.yaml
versions: [v6.4.10]
owners: [koco]

# 输入声明（决定 feature 内会出现哪些子目录）
inputs:
  - kind: prd                           # prd | lanhu | axure | manual | bug-hotfix
    ref: "prd.file:section-1#sha256:..."
  - kind: lanhu
    ref: "lanhu.fixture:form-page#sha256:..."

# 上游/下游关系
relates_to: [2026-03-dq-rule-task]

# 产物开关
emits:
  cases_xmind: true
  archive: true
  playwright_tests: true
```

**强 lint 规则**（quality-gate 新增 `metadata_present_and_valid`）：
- 文件存在 + schema 校验通过
- `id` == 目录名
- `modules`/`customers`/`versions` 引用必须在 `_shared/_meta/*.yaml` 枚举里
- `status: blocked` 时 playwright-automation 阶段直接拒绝启动

### 3.4 feature 内部子目录契约

```
features/<YYYY-MM-slug>/
├── metadata.yaml                # 必须；强 lint
├── manifest.json                # 必须；强 lint，schema FeatureManifest@2（3.7）
├── archive.md                   # case-draft 完成后产出
├── cases.xmind                  # case-draft 完成后产出
├── prd.md                       # 仅当 inputs.kind 含 prd 时出现
├── inputs/                      # 输入素材统一入口
│   ├── prd-attachments/
│   ├── lanhu-snapshots/
│   └── reference-docs/
├── tests/                       # playwright-automation 阶段产出
│   ├── cases/                   # t01-*.ts ... 单 case 文件
│   ├── data/                    # feature 私有 fixture
│   └── runners/                 # smoke.spec.ts + full.spec.ts（仅 import 聚合）
├── results/                     # 运行时产物（gitignored，详见 3.6）
│   └── <YYYYMMDD-HHmm>-<runId>/
└── .debug/                      # 调试临时（gitignored）
```

**消失的旧子目录**：
- `tests/helpers/` → 全部上提到 `_shared/pages/`、`_shared/helpers/`
- `tests/unit/` → 删除
- `tests/.runs/` → 改名 `results/`，提到 feature 根级
- `tests/.task-state.json` → 移到 `.kata/state/features/<slug>.json`
- `images/`、`tmp/` → 收拢到 `inputs/{lanhu-snapshots,reference-docs}/`
- `playwright-automation-handoff.md`（独立文件） → 内容并入 `manifest.json` + per-run handoff

### 3.5 单一 .kata/ 收拢隐藏目录

**根级**（`/Users/poco/Projects/kata/.kata/`）：
```
.kata/
├── state/                       # 跨会话状态
│   ├── session.json
│   └── features/<slug>.json     # 单 feature 任务状态
├── auth/                        # 旧 .auth/
│   └── <project>/session-<env>.json
├── worktrees/                   # 旧 .worktrees/
├── runs/                        # 旧根级 .runs/（CI/runner fallback）
├── cache/                       # LLM/工具调用缓存
├── temp/                        # 旧 .temp/
└── repos/                       # 旧 workspace/<p>/.repos/
    └── <project>/
```

**项目级**（`workspace/<project>/.kata/`，可选）：
```
workspace/<project>/.kata/
├── state/features/<slug>.json
└── runs/
```

### 3.6 results/<run-id>/ 三级隔离规范

```
features/<slug>/results/<YYYYMMDD-HHmm>-<runId>/
├── handoff.json                 # 本次 run 的 handoff 强 schema
├── handoff.md                   # 从 handoff.json 渲染
├── playwright/                  # Playwright 原始输出
│   ├── results.json
│   ├── traces/
│   ├── videos/
│   └── screenshots/
├── allure-results/              # Allure raw JSON
└── stdout.log + stderr.log
```

- 多次 run 累积，每次 self-run 创建新子目录
- run-id 生成：`<YYYYMMDD-HHmm>-<8字符 git short sha 或 random>`
- `kata results publish <feature> --run=<id>` 把指定 run 渲染到 `_shared/published-reports/<YYYYMM>/<feature-slug>-<runId>/`
- `kata results prune --keep=10` 清理老 run（已 publish 的不删，有 `.published` marker）

### 3.7 manifest.json 强契约（FeatureManifest@2）

```json
{
  "schema": "FeatureManifest@2",
  "feature_id": "2026-04-dq-json-config",
  "case_drafting": {
    "status": "completed",
    "archive_path": "archive.md",
    "xmind_path": "cases.xmind",
    "requirement_atoms": [
      {"id": "RA-001", "source_ref": "prd.file:section-1#sha256:..."}
    ],
    "coverage_matrix_path": "archive.md#coverage-matrix"
  },
  "automation": {
    "status": "ready",
    "intents": [
      {
        "intent_id": "SR-INTENT-202604-JSONCONFIG",
        "case_files": ["tests/cases/t01-key.ts"],
        "automation_status": "ready"
      }
    ],
    "last_handoff_path": "results/20260510-1430-a3f8c9e1/handoff.json",
    "last_run_status": "passing"
  },
  "files": {
    "archive": "archive.md",
    "xmind": "cases.xmind",
    "tests_root": "tests/",
    "latest_results": "results/20260510-1430-a3f8c9e1/"
  }
}
```

**强 lint 规则**：
- schema 校验通过
- `automation.status: ready` ↔ `intents[].automation_status: ready` 至少一条
- `case_drafting.status: completed` 时必须有 archive_path 且文件存在
- INDEX 生成器仅读 manifest.json，不再扫描 archive.md

### 3.8 .gitignore 重写（契约驱动）

旧 .gitignore 大量通配 → 新 4 条核心规则：

```gitignore
# 隐藏运行时根（项目+根级）
.kata/
**/.kata/

# Feature 运行产物
workspace/*/features/*/results/
workspace/*/features/*/.debug/

# 系统
.DS_Store
*.log
```

- 旧 `cleanup-duplicates.sh` 删除
- CI 加 `.gitignore` 行数 > 25 时 fail（防止再次膨胀）

---

## 4. 两阶段工作流强化

### 4.1 case-draft 强化点

#### 4.1.1 atomization → manifest 直写
`requirement-atomize` 步骤同时写 `manifest.json#case_drafting.requirement_atoms[]`；archive.md 仅作为人读视图（从 manifest 渲染）。

#### 4.1.2 inputs/ 统一入口
`source-intake` 把所有素材落到 `features/<slug>/inputs/{lanhu-snapshots,prd-attachments,reference-docs}/`，强制命名规则；禁止 `1-u1.png` 这种数字编号。

#### 4.1.3 automation-handoff 输出双轨
- `manifest.json#automation.intents[]` ← case-draft 写入（agent 读，schema 强约束）
- `archive.md#automation-handoff` ← 渲染章节（人读，禁手改，加 `<!-- generated -->` 头）
- 不再有独立 `playwright-automation-handoff.md` 文件

#### 4.1.4 confirmation-package 落点规范
保留 `confirmation-package.md` / `unresolved-summary.md`，但加 `status` frontmatter（pending/resolved/abandoned）；quality-gate 检查 `automation.status: ready` 时不能有 pending confirmation。

### 4.2 playwright-automation 强化点

#### 4.2.1 case-normalize 改为读 manifest
优先读 `manifest.json#automation.intents[]`；缺失时回退自由推断（兼容用户直接传 .md 的场景）。

#### 4.2.2 生成脚本反向溯源注释（强制）
每个 `t*.ts` 头部必须有：
```ts
// spec: features/<slug>/archive.md#case=<case-id>
// intent: SR-INTENT-<id>
// probe: SR-UI-PROBE-<id>
// page: _shared/pages/<page-domain>-page.ts
// generated_at: 2026-05-10T14:30:00Z
```

quality-gate 新增 `case_traceability_header`：grep 校验 + 引用可解析。

#### 4.2.3 helpers 全局化（page object 上提）
- 不允许 `features/<slug>/tests/helpers/` 创建新 helper
- 所有 page object 落 `_shared/pages/<page-domain>-page.ts`
- 同 page 已有 page object 时禁止重新生成
- 生成新 page object 时同步 `_shared/pages/INDEX.md`

quality-gate 新增 `no_feature_local_helpers`：扫 `features/*/tests/helpers/` 必须为空。

#### 4.2.4 .debug 严格隔离
- 调试用 spec 落 `features/<slug>/.debug/probe-<timestamp>.spec.ts`
- 截图、HAR、临时 trace 用 `testInfo.outputPath()` 落 `.debug/`
- repair-loop 结束后 `.debug/` 自动 rm（成功路径）或保留（失败路径）

quality-gate 新增 `no_debug_in_cases`：`tests/cases/**` 不允许 `*-debug*` `*-repro*` `diag_*` 命名。

#### 4.2.5 self-run 输出规范
- 输出目录 `features/<slug>/results/<run-id>/`
- 必须落 `handoff.json`
- 命令模板：
```
KATA_DATAASSETS_ENV=<env> KATA_ACTIVE_PROJECT=<project> \
  npx playwright test 'features/<slug>/tests/runners/full.spec.ts' \
  --output=features/<slug>/results/<run-id>/playwright \
  --reporter=line,json,allure
```
- run-id 由 self-run step 自身生成

### 4.3 Handoff 双轨

#### 4.3.1 handoff.json 强 schema（PlaywrightAutomationHandoff@2）

```json
{
  "schema": "PlaywrightAutomationHandoff@2",
  "feature_id": "2026-04-dq-json-config",
  "run_id": "20260510-1430-a3f8c9e1",
  "status": "passed | partial | blocked_by_product | blocked_by_env | failed",
  "intent_id": "SR-INTENT-202604-JSONCONFIG",
  "source_refs": {
    "intent": "SR-INTENT-...",
    "env": "SR-ENV-PREFLIGHT-...",
    "probe": "SR-UI-PROBE-...",
    "self_run": "SR-SELF-RUN-..."
  },
  "run_command": "...",
  "run_exit_code": 0,
  "results": {
    "total": 46, "passed": 45, "failed": 1, "skipped": 0,
    "report_paths": {
      "playwright_json": "results/<run-id>/playwright/results.json",
      "allure": "results/<run-id>/allure-results/",
      "stdout": "results/<run-id>/stdout.log"
    }
  },
  "quality_gates": [
    {"name": "case_traceability_header", "status": "passed"},
    {"name": "no_feature_local_helpers", "status": "passed"}
  ],
  "unresolved_blockers": [
    {"kind": "product", "case": "t01-key.ts", "evidence_path": "results/<run-id>/playwright/screenshots/t01-fail.png"}
  ],
  "next_actions": ["..."]
}
```

#### 4.3.2 handoff.md 从 json 渲染
由 `kata handoff render` 生成，头部强制：
```markdown
<!-- generated by kata handoff render; do not edit -->
<!-- source: handoff.json -->
<!-- schema: PlaywrightAutomationHandoff@2 -->
```

quality-gate 新增 `handoff_double_track`：json + md 同步 + schema 校验。

### 4.4 SourceRef 中央注册表

新文件 `.ai/core/schemas/SourceRefRegistry.v1.yaml`：

```yaml
schema: SourceRefRegistry@1
prefixes:
  - prefix: SR-INTENT
    description: Automation intent identified during case-drafting
    generated_by: skill:case-draft
    generated_at_step: automation-handoff
    pattern: '^SR-INTENT-[A-Z0-9-]+$'
    consumed_by: [skill:playwright-automation]

  - prefix: SR-ENV-PREFLIGHT
    description: Environment preflight evidence
    generated_by: skill:playwright-automation
    generated_at_step: env-preflight
    pattern: '^SR-ENV-PREFLIGHT-[A-Z0-9-]+$'

  - prefix: SR-UI-PROBE
    description: Live UI probe evidence
    generated_by: skill:playwright-automation
    generated_at_step: ui-probe
    pattern: '^SR-UI-PROBE-[A-Z0-9-]+$'

  - prefix: SR-SELF-RUN
    description: Self-run evidence
    generated_by: skill:playwright-automation
    generated_at_step: self-run
    pattern: '^SR-SELF-RUN-[A-Z0-9-]+$'
```

新前缀必须先在此注册再使用；`cases_lint` quality-gate 升级为读 registry 校验前缀。

### 4.5 quality-gate 全量更新（保留 9 + 升级 1 + 新增 6 = 共 15 项）

| 序号 | 名称 | 新增/保留 | 检查内容 |
|---|---|---|---|
| 1 | no_weak_assertions | 保留 | 禁 test.skip / try-catch / 弱守卫 |
| 2 | no_env_local | 保留 | 禁止存在 `.env.local` |
| 3 | runner_is_aggregator | 保留 | smoke/full.spec.ts 仅聚合 |
| 4 | cases_in_cases_dir | 保留 | case 在 tests/cases/ 下 |
| 5 | session_compliant | 保留 | session 文件合规 |
| 6 | env_profile_compliance | 保留 | base_url + tenant 对应 env 配置 |
| 7 | cases_lint | **升级** | 改为读 SourceRefRegistry 校验前缀 |
| 8 | no_dangling_helpers | 保留 | helpers/ 中函数被引用 |
| 9 | spec_structure_valid | 保留 | 结构检查 |
| 10 | metadata_present_and_valid | **新增** | metadata.yaml schema + lint |
| 11 | manifest_present_and_valid | **新增** | manifest.json schema + 状态一致性 |
| 12 | case_traceability_header | **新增** | 生成 spec 头部 4 行注释 |
| 13 | no_feature_local_helpers | **新增** | features/*/tests/helpers/ 必须空 |
| 14 | no_debug_in_cases | **新增** | tests/cases/ 不准 debug/repro/diag 命名 |
| 15 | handoff_double_track | **新增** | handoff.json + handoff.md 同步 |

### 4.6 workflow.yaml 步骤变更摘要

**case-draft-from-prd.workflow.yaml**：
- `requirement-atomize`：新增产出 `manifest.json#case_drafting.requirement_atoms[]`
- `source-intake`：新增 `inputs/` 目录约束
- `automation-handoff`：写入 `manifest.json#automation.intents[]`，不再生成独立 handoff md

**playwright-automation.workflow.yaml**：
- `case-normalize`：优先读 manifest，回退自由推断
- `playwright-generate`：注入反向溯源注释 + 禁本地 helpers
- `repair-loop`：调试产物落 `.debug/`
- `self-run`：输出 `results/<run-id>/`，落 handoff.json
- `handoff`：调用 `kata handoff render` 生成 handoff.md
- `quality-gate`：跑 15 项检查（含 6 项新增 + 1 项升级）

---

## 5. CLI 与索引能力

### 5.1 CLI 风格定稿

模仿 `gh` / `docker` (v17+) / `az` / `stripe` / `supabase` 的 `<binary> <noun> <verb>`：
- 一个二进制 `kata`
- 名词在前、动词在后，无 colon、无 alias、无 deprecation 期
- 子命令两段式，不超过两层嵌套
- 全 kebab-case

### 5.2 命令清单

```
kata features  new | ls | show | lint | index
kata cases     lint | validate
kata results   publish | prune | path
kata handoff   render
kata migrate   v2
kata env       check
```

### 5.3 `kata features new <slug>`

```bash
kata features new dq-json-config \
  --display-name="【通用配置】json 格式配置" \
  --modules=dq,generalConfig \
  --customers=standard \
  --inputs=prd,lanhu
```

职责：
- 校验 slug 正则 + 长度
- 校验 `modules`/`customers` 在枚举内
- 创建 `features/<YYYY-MM>-<slug>/` + 空骨架
- 生成 `metadata.yaml` + 空 `manifest.json`
- 按 `--inputs` 创建 `inputs/{prd-attachments,lanhu-snapshots}/.gitkeep`
- 调用 `kata features index` 增量更新 INDEX
- 不创建 `tests/` `results/` `.debug/`（由后续 skill 自动）
- 冲突保护：目录已存在或同月同 slug 报错

### 5.4 `kata features ls --filter`

```bash
kata features ls --module=dq --status=active
kata features ls --customer=ltqc --version=v6.4
kata features ls --owner=koco --created-after=2026-04
kata features ls --automation-status=ready --last-run=failing
kata features ls --format=table | json | md
```

实现要点：
- 扫 `features/*/manifest.json` + `metadata.yaml` 构建索引
- 大型仓加 `<repo>/.kata/cache/features-index.json`（项目级缓存，TTL 1h，mtime 失效）
- 多维 AND，同维多值 OR

### 5.5 `kata features index` 生成 INDEX.md

输出示例：

```markdown
<!-- generated by kata features index; do not edit -->
<!-- last_generated: 2026-05-14T10:23:00Z -->
<!-- feature_count: 113 -->

# Features Index

## By Status
- [Active (78)](#active)
- [Archived (32)](#archived)
- [Draft (3)](#draft)

## By Module
- [dq (42)](#module-dq) — 数据质量
- [security (18)](#module-security) — 数据安全
- ...

## Active

### 2026-05
| ID | Display Name | Modules | Customers | Automation | Last Run |
|---|---|---|---|---|---|
| [2026-05-dq-json-config](2026-05-dq-json-config/) | 【通用配置】json 格式配置 | dq | standard | ready | passing |

## Module: dq
- [2026-05-dq-json-config](2026-05-dq-json-config/) — active
- [2026-04-dq-rule-task-multi](2026-04-dq-rule-task-multi/) — archived
```

触发时机：pre-commit hook（feature 变更触发）/ CI（main 分支）/ 用户手动

### 5.6 `kata results path` / `publish` / `prune`

`kata results path <slug> --new-run` 由 self-run step 调用，分配新 run 目录并生成 run-id：
```bash
kata results path 2026-05-dq-json-config --new-run
# stdout: workspace/dataAssets/features/2026-05-dq-json-config/results/20260514-1023-7c3a8e1f
```
仅产出路径字符串（供 `--output=` 注入），不创建目录（playwright 启动时自动创建）。


```bash
kata results publish 2026-05-dq-json-config --run=20260512-1430-a3f8c9e1
# → workspace/<project>/_shared/published-reports/2026-05/2026-05-dq-json-config-a3f8c9e1/

kata results prune 2026-05-dq-json-config --keep=10
kata results prune --all --keep=5
```
- `publish` 在目标 run 目录下落 `.published` marker 文件（含 publish 时间 + 目标路径）
- `prune` 保留最近 N 次 + 所有带 `.published` marker 的 run（不会误删已分享的报告）

### 5.7 `kata handoff render`

由 playwright-automation 的 `handoff` step 调用：
```bash
kata handoff render 2026-05-dq-json-config --run=20260512-1430-a3f8c9e1
# 读 features/<slug>/results/<run-id>/handoff.json
# 写 features/<slug>/results/<run-id>/handoff.md
```
模板内置在 CLI（不放 `_shared/`），保证渲染一致。

### 5.8 与 workflow.yaml 集成

**case-draft-from-prd.workflow.yaml**：
- 起步增 `kata features new`（如 feature 不存在）
- `automation-handoff` 后增 `kata features lint <slug>`
- 末尾增 `kata features index`

**playwright-automation.workflow.yaml**：
- `case-normalize` 前增 `kata features lint <slug>`
- `self-run` 输出路径用 `kata results path <slug> --new-run`
- `handoff` step = `kata handoff render`
- `quality-gate` step 跑 15 项检查

### 5.9 CLI 包结构

- 单一包 `tools/kata-cli/`（路径名保留），导出二进制 `kata`
- TypeScript + Bun
- `package.json#bin: { kata: "..." }`
- 旧 `kata-cli` 二进制名 + 所有子命令在迁移 PR 当天删除，无别名、无 deprecation
- `dtstack-cli`（`tools/dtstack-sdk/`）独立保留，通过 `kata env check` 间接调用

---

## 6. 一次性迁移方案 `kata migrate v2`

### 6.1 迁移前置（任一失败即中止，0 修改）

| 检查项 | 失败处理 |
|---|---|
| `git status` 干净 | 中止，提示先 commit/stash |
| 当前分支 ≠ main | 中止，必须在 `migrate/v2-layout` |
| 所有 features 有可读输入素材 | 中止，列出缺失 feature |
| 无运行中 Playwright/dev server | 中止 |
| Bun + Node 版本满足 engines | 中止 |
| 磁盘空间 > 2x workspace 大小 | 中止 |
| 显式 `--confirm-hard-cut` 标志 | 中止 |

### 6.2 迁移阶段（10 个原子阶段）

1. **snapshot** — `git tag pre-migrate-v2-<timestamp>`，复制 `workspace/` 到 `workspace.bak/`，写 `migration-report.json` 起点
2. **features 改名** — 用 `tools/kata-cli/src/migrate/feature-slug-map.yaml` 人工映射 + 启发式生成 slug；冲突报错
3. **metadata.yaml 生成** — 推断 display_name/modules/customers/owners/created_at；同步初始化 `_shared/_meta/*.yaml` 枚举
4. **manifest.json 升级** — v1（file-entries）→ v2（FeatureManifest@2），状态字段从 archive.md / tests/cases/ 推断
5. **feature 内部重组** — `images/+tmp/` → `inputs/`；`tests/.runs/` → `results/`；`.task-state.json` → `.kata/state/`；`.debug/` 提升一级；`tests/unit/` 删除；handoff md → manifest
6. **helpers/pages 上提** — AST 改写 import；同名 helper 自动合并 + 冲突写报告供人工 review
7. **workspace 顶层收拢** — `reports/{allure,playwright,bugs}/` → `features/<slug>/results/`；`audits/history/issues/regressions/` → 评估后入 feature 或 `_shared/archive/`；`knowledge/rules/shared/env/` → `_shared/`；`.repos/` → `.kata/repos/`
8. **根级隐藏目录收拢** — 旧根级 `.auth/`、`.worktrees/`、`.temp/`、`.runs/` 移入 `.kata/{auth,worktrees,temp,runs}/`；旧 `.kata/`（含 `_desktop/` 与 `session.json`）的内容并入 `.kata/state/`
9. **契约 + 工具更新** — 重写 `.gitignore`（4 条）；增 `FeatureMetadata.v1` `FeatureManifest.v2` `PlaywrightAutomationHandoff.v2` `SourceRefRegistry.v1`；删 `cleanup-duplicates.sh` + 旧 `kata-cli` + 旧 handoff md；重写 workflow.yaml + references；重渲染 `.claude/` `.agents/`
10. **验证 + 自删除** — `kata features lint --all` + `kata features index` + `bun run typecheck` + 选定 feature smoke `--list`；写 `migration-report.json` 终点；删除迁移脚本本体；输出 commit 模板

### 6.3 Dry-run 模式

`--dry-run` 跑全 10 阶段不写盘，输出预期变更清单 JSON + Markdown 报告：
- 重命名映射表
- metadata.yaml 推断结果
- manifest.json 升级摘要
- 冲突 / 模糊项

人工编辑 `feature-slug-map.yaml` + 解决方案后重跑 dry-run，直到 0 冲突；仅当 `--confirm-hard-cut` 真跑。

### 6.4 回滚

单一回滚路径：
```bash
git reset --hard pre-migrate-v2-<timestamp>
rm -rf workspace
mv workspace.bak workspace
```
迁移脚本仅「全成功 / 全失败」两态；`workspace.bak/` 由用户验收后手动删除。

### 6.5 迁移 PR 内容（单 PR，按 commit 拆 review）

1. `chore: add migrate v2 script and slug map (no behavior change)`
2. `chore(workspace): rename and restructure features per v2 layout`
3. `feat(metadata): generate metadata.yaml for all features`
4. `feat(manifest): upgrade all manifest.json to FeatureManifest@2`
5. `refactor(helpers): hoist page objects to _shared/pages/`
6. `chore(workspace): consolidate reports/audits/history into features and _shared`
7. `chore(root): consolidate hidden dirs into single .kata/`
8. `feat(schemas): add v2 schemas and SourceRefRegistry`
9. `feat(workflows): rewrite case-draft and playwright-automation workflows`
10. `feat(cli): unify into single kata binary (gh/docker style)`
11. `chore: regenerate .claude/ and .agents/ runtime projection`
12. `chore: remove cleanup-duplicates.sh and migrate script self-delete`

### 6.6 迁移完成验收清单

- [ ] `workspace/<project>/` 顶层仅 `features/` + `_shared/` + `.kata/` + `project.json` + `tsconfig.json`
- [ ] 所有 feature 目录符合 `^\d{4}-\d{2}-[a-z0-9-]+$`
- [ ] `kata features lint --all` 通过
- [ ] `features/INDEX.md` 生成正确
- [ ] `.gitignore` ≤ 20 行
- [ ] 选定 feature `kata cases lint` 通过
- [ ] 选定 feature `npx playwright test --list` 通过
- [ ] 根级隐藏目录仅 `.kata/`
- [ ] 旧 `kata-cli` 二进制消失，`kata` 唯一入口
- [ ] `cleanup-duplicates.sh` 消失
- [ ] 迁移脚本本身已 git rm
- [ ] `migration-report.json` 存档供回查（1 个月后删）

---

## 7. 验收标准、风险与未决项

### 7.1 可量化成功指标

| 指标 | 现状 | v2 目标 |
|---|---|---|
| workspace/<project>/ 顶层目录数 | 11+ | 3 + 2 文件 |
| 根级隐藏目录数 | 5 | 1 |
| .gitignore 行数 | ~60 | ≤ 20 |
| feature 目录命名违规率 | ~100% | 0% |
| feature 缺 metadata.yaml 比例 | 100% | 0% |
| feature-coupled helpers 数 | ~50+ | 0 |
| handoff 仅 markdown 的 feature 比例 | ~100% | 0% |
| quality-gate 检查项 | 9 | 15 |
| 生成 spec 缺反向溯源注释比例 | ~100% | 0% |
| 用户面向 CLI 入口 | `kata-cli`（混乱命名 + colon 子命令）+ `dtstack-cli`（独立工具） | `kata`（gh/docker 风格统一）+ `dtstack-cli`（独立保留） |
| `kata` 命令风格一致性 | 混合 colon (`cases:lint`) 与 hyphen 子命令 | 全 `<noun> <verb>` 两段式，无 colon、无 alias |
| 历史补救脚本 | 1 | 0 |

### 7.2 测试与 evals 调整

**新增 fixtures**：
- `.ai/core/evals/contracts/feature-metadata/` — 合规 / 缺字段 / 枚举越界 / id 不匹配 / status=blocked（5 个）
- `.ai/core/evals/contracts/feature-manifest/` — 状态一致 / case_drafting 不一致 / automation.ready 但无 intent / handoff 路径失效 / schema 校验失败（5 个）
- `.ai/core/evals/contracts/handoff-double-track/` — 双轨完整 / 仅 json / 仅 md（3 个）
- `.ai/core/evals/cli/features-ls-filter/` — 单维 / 多维 AND / 同维 OR / 时间 / 无结果 / 缓存命中（6 个）
- `.ai/core/evals/cli/migrate-v2-dry-run/` — 含中文目录 + 旧 helpers + 旧 reports 的微型 workspace 跑 dry-run

**升级**：
- `case-draft-from-prd/happy-path.json` 输入产物路径改为 v2 布局
- 添加 `case-draft/blocked-by-metadata.json`
- 添加 `playwright-automation/manifest-driven-handoff.json`

**测试矩阵**：15 项 gate × 3 状态 = 45 case，每项至少 1 pass + 1 fail。

### 7.3 CI 加固

`.github/workflows/` 新增 / 升级：
1. `features-lint.yml` — push/PR 跑 `kata features lint --all`
2. `features-index.yml` — main push 后自动跑 `kata features index` + commit INDEX
3. `schema-check.yml` — `.ai/core/schemas/**` 变更触发全 fixture 校验
4. `gitignore-no-bloat.yml` — `.gitignore` > 25 行时 fail
5. `migrate-script-removed.yml` — 守护 `tools/kata-cli/src/migrate/v2/` 不回归

### 7.4 文档同步（仅必要的）

**重写**（不留 v1→v2 迁移说明，只写 v2 现状）：
- `CLAUDE.md` / `AGENTS.md` — 更新 workspace 边界声明（3 个顶层）
- `README.md` / `README-EN.md` — 截图 / 路径示例更新
- `INSTALL.md` — 起步流程更新（`kata features new` 替代 ad-hoc 创建）
- 新增 `.ai/core/docs/layout-v2.md` — 单一权威 v2 布局参考

**删除**：
- 旧已删 specs 的 git tombstone（Stage 9 涵盖）

### 7.5 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 中文 → slug 自动转换有歧义 | 高 | 中 | dry-run 报告必含 slug 映射表；要求 0 冲突才允许真跑 |
| Helper 上提合并冲突 | 中 | 高 | dry-run 列出冲突 → 人工指定保留版本；合并后跑全 feature smoke |
| AST 改写 import 路径漏改 | 低 | 中 | Stage 6 后跑 `bun run typecheck`，编译错误 = 漏改 |
| reports/audits/history 内容无法分配 | 中 | 低 | 兜底落 `_shared/published-reports/_unassigned/`，人工二次分发 |
| `.kata/auth` 切换后 session 失效 | 低 | 低 | env-preflight 自动重新登录；首次 v2 时手工跑一次 login |
| 用户回滚需要数据 | 低 | 中 | `workspace.bak/` 保留 7-30 天；git tag 永久 |
| 15 项 gate 误阻断历史 feature | 中 | 中 | archived 时跳过部分 gate（如 case_traceability_header） |
| `.ai/core` 渲染漂移 | 中 | 高 | CI 加 `runtime-projection-diff.yml`：渲染后 git diff 非空则 fail |

### 7.6 未决项（spec 写完前需补的小决策）

1. **`_shared/_meta/*.yaml` 初始枚举** — 迁移脚本 Stage 3 自动从历史目录名启发式提取，人工 review 一次定稿；不在 spec 硬编码
2. **archived feature 何时降级** — metadata 写 `archived_at`；满 6 个月后 `kata features archive --vacuum` 压缩入 `_shared/archive/<YYYY>/`，仅留 metadata 摘要；本 spec 不实现，列入 follow-up
3. **CLI 中文输出** — 默认中文（用户在中国大陆，CLAUDE.local.md 明确），加 `--lang=en` 切换；属实现细节
4. **二进制兼容期** — 无（与 hard cut 一致），`dtstack-cli` 不动（独立工具）
5. **`tools/kata-cli/` 目录命名** — 保留（npm/bun 包路径），导出二进制名 `kata`

### 7.7 后续 follow-up（不在本 spec）

- `kata features archive --vacuum` 老 feature 压缩归档
- Web 版 INDEX（替代 Markdown，含搜索/多维度面板）
- `kata results compare <run-a> <run-b>` 跨 run 回归对比
- `dtstack-cli` 与 `kata env` 接口收敛
- AI agent 框架升级（LangGraph typed state），仅当多 case 并行/复杂修复回路出现时考虑

---

## 附录 A：术语表

- **Feature** — 一个测试需求单元，对应 `workspace/<project>/features/<YYYY-MM-slug>/` 目录
- **Slug** — feature 目录的 ASCII 短名（如 `dq-json-config`）
- **metadata.yaml** — feature 多维标签清单（FeatureMetadata@1）
- **manifest.json** — feature 全状态索引（FeatureManifest@2）
- **handoff.json/md** — playwright-automation 一次 self-run 的双轨交付报告
- **SourceRef** — 证据引用，含 4 类前缀（INTENT/ENV-PREFLIGHT/UI-PROBE/SELF-RUN）
- **Quality gate** — 15 项自动化检查，阻断 workflow 完成
- **`_shared/`** — workspace 内跨 feature 共享资源根
- **`.kata/`** — workspace 内 + 仓库根级唯一隐藏运行时根

## 附录 B：参考资料

- Playwright Test Agents (官方, v1.56+) — planner/generator/healer 三段式
- Allure Report — `allure-results/` 与 `allure-report/` 分离
- Anthropic Skills — progressive disclosure + orchestrator 范式
- Cucumber Step Organization — page object 按 domain 分组反模式
- Nx / Bazel — tags-based 多维过滤
- spec-kit — `specs/NNNN-slug/` + frontmatter 元数据
- Astro Content Collections — flat content + 索引页生成
- Linear / Notion — 多维 property + saved views
- gh / docker / az / stripe / supabase CLI — `<binary> <noun> <verb>` 风格
