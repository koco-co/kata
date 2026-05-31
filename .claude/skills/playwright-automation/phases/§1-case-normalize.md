# case-normalize

## Contents

- 输入优先级
- 读取时机
- 协议
- 禁止

## 输入优先级

1. **主源：** `features/<featureId>/manifest.json#automation.intents[]` 中 `automation_status: ready` 的项，直接逐条迭代。
2. **case-draft 归档：** 当 `archive.md` + `test-point-checklist.md` 存在且 `case_drafting.status == completed` 时，从归档归一化。
3. **源材料 bootstrap：** 仅当 feature 目录缺少 case-draft 自动化基线，但同一目标目录内含 `prd.md` 与 `inputs/lanhu-snapshots/` 时使用。
   - 发出 `source_backed_bootstrap`，并在读取这些源文件前先进入 `env-preflight`。
   - 进入 env 前的源材料检查只能做精确路径存在性判断：`test -f <target>/prd.md`、`test -d <target>/inputs/lanhu-snapshots` 或等价的精确目标元数据。
   - 不得 list、glob、find、读取或枚举截图文件名。
   - 此路径用于 `/playwright-automation <title>` 这类短提示——用户期望先确认环境再做真实 UI probe。
4. **兜底：** 仅当用户传入裸 `archive.md` 路径、裸 PRD 路径，或尚无 feature 目录的 Lanhu 链接时，才像以前一样做自由推断。
5. **硬停：** 若 feature 目录存在但既无 case-draft 自动化基线也无源材料，不得从无关 PRD/截图推断 UI。返回 `blocked_by_case_draft_required` 并要求先完成 `/case-draft`。

兜底路径会发出 `manifest_missing_fallback_inference` 告警，便于追踪使用情况并逐步迁移残留项。

## 读取时机

进入 `case-normalize` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 协议

用户输入的是一条短提示，通常格式为：

```
需求: {feature_path_or_name}
环境: {base_url}
租户: {tenant_name}
质量项目: {project_name}
离线项目: {project_name}
cookie: {cookie_string}
```

### 第一步：识别需求目录

1. 从需求字段提取需求名称或路径
2. 检查 `workspace/dataAssets/features/` 下是否有匹配目录：
   - 若给出完整路径前缀 → 直接定位
   - 若只给名称，先抽取 2-6 个标题关键词，使用带 `-g` 限定的内容搜索。
   - 示例：`rg -n "内置规则丰富|合理性|单表|字段值|计算关系|字段值的计算关系对比" workspace/dataAssets/features -g "manifest.json" -g "metadata.yaml" -g "archive.md" -g "prd.md"`。
   - 从搜索输出中按标题精确度选择命中目录；不得优先选择 `unresolved-*` 或历史 `unresolved--*` 阻塞草稿目录，除非用户明确输入该目录名。
   - 若搜索输出中某目录的 `prd.md`、`metadata.yaml` 或 `manifest.json` 命中行包含用户标题的核心连续短语，该目录为唯一精确目标。
   - 核心连续短语示例：`【内置规则丰富】合理性，单表，字段值的计算关系对比` 或 `15529【内置规则丰富】合理性，单表，字段值的计算关系对比`。
   - 不得选择只匹配“单表/字段值/对比”等泛化词的历史 archive 目录。
   - 对于输入 `【内置规则丰富】合理性，单表，字段值的计算关系对比`，必须选择 `workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare/`，不得选择 `workspace/dataAssets/features/2025-09-dq-single-table-field-compare/`。
   - 禁止通过 `ls workspace/dataAssets/features/ | head`、`ls ... | grep`、`ls -t ...`、`find workspace/dataAssets/features` 或 Glob 枚举目录名来定位需求
3. 读取目标需求目录下的文件结构：
   - 只检查当前需求目录下的 `archive.md`、`test-point-checklist.md`、`prd.md`、`inputs/lanhu-snapshots/` 是否存在；`prd.md` 与 `inputs/lanhu-snapshots/` 的 source-backed 判断只能用 exact-path existence checks（如 `test -f <target>/prd.md`、`test -d <target>/inputs/lanhu-snapshots`），不得读取 `prd.md` 正文或截图内容，不得 `ls`/Glob/find/read `inputs/`、`inputs/lanhu-snapshots/**` 或枚举截图文件名
   - 读取 `manifest.json` 检查 `case_drafting.status` 与 `automation.status`
   - 读取 `tests/cases/`、`tests/runners/` 检查已有自动化；如发现 feature-local helper 目录，只记录为迁移/质量门禁问题，不得复用或扩展
   - **禁止**批量读取 `workspace/dataAssets/features/` 下其他历史 feature 目录
4. 若需求目录不存在 → 输出 `blocked_by_case_conflict`，注明缺失路径
5. 若需求目录存在但缺少 `archive.md`、`test-point-checklist.md` 和 `manifest.automation.intents[].automation_status=ready` 中任一自动化输入基线，且同目录存在 `prd.md` 与 `inputs/lanhu-snapshots/`：
   - 输出 `source_backed_bootstrap`
   - 说明当前只有需求源材料，尚无最终 case-draft；下一步必须进入 `env-preflight`，默认推荐 `ltqc-local.yaml`（若存在）并通过 askuser 确认环境
   - 本阶段不得读取 `prd.md` 正文、截图内容、历史 feature、env profile 或跨目录 tests；env profile 读取留给 `env-preflight`
   - 进入 `source_backed_bootstrap` 后，确认环境前不得把读取 PRD/截图和读取 env profile 放在同一轮并行执行；必须先完成环境确认触点，等待用户回复“确认”或环境文件名；确认前不得执行 `ls <target>/inputs`、`ls <target>/inputs/lanhu-snapshots`、Glob `inputs/lanhu-snapshots/**`、find 或任何截图文件名枚举
   - 后续 `ui-plan` 可在环境确认后读取当前目标目录的 `prd.md` 与 `inputs/lanhu-snapshots/**`，并必须把它们标记为 `case_claim/design_source`，不得作为 observed UI 事实
6. 若需求目录存在但缺少 case-draft 自动化基线，且缺少 `prd.md` 或 `inputs/lanhu-snapshots/`：
   - 输出 `blocked_by_case_draft_required`
   - 说明必须先完成 `/case-draft`，生成 `archive.md`、测试点清单或 ready automation intent
   - 不得读取 `prd.md`、`inputs/`、`inputs/lanhu-snapshots/`、截图、历史 feature、env profile 或 tests 内容
   - 不得读取截图做 OCR，不得安装依赖，不得进入 `ui-plan`、`env-preflight` 或 `playwright-generate`

### 第二步：解析 Archive MD

1. 读取 `archive.md`（如存在），提取：
   - `suite_name` / `description` → 用作自动化意图描述
   - `case_count` → 了解规模
   - 测试用例列表 → 了解具体验证点
   - `通用前置条件` → 提取环境依赖、数据准备要求
2. **禁止**将 Archive MD 中的文字描述直接当作真实 UI 证据
3. Archive MD 中的页面描述仅作为 "what to test" 的意图来源，不作为 selector/页面结构的证据
4. 若 `archive.md` 不存在但已进入 `source_backed_bootstrap`，不要在 case-normalize 阶段读取 PRD/截图；记录缺失 archive，并把读取需求源推迟到 env-preflight 之后的 ui-plan。
5. 若既没有 archive，也不是 `source_backed_bootstrap`，不能用其他 PRD、Lanhu 截图或 OCR 结果替代 archive；本阶段必须停止并返回 `blocked_by_case_draft_required`。

### 第三步：检查已有自动化产物

1. 检查 `tests/cases/` 下已有 spec：
   - 已有文件 → 进入 **调试/修复模式**，以现有文件为基线
   - 无文件 → 进入 **生成模式**，先落 P0 case
2. 检查 `tests/runners/` 下已有 runner：
   - 缺少 `smoke.spec.ts` 或 `full.spec.ts` → 规划创建
3. 检查 `_shared/pages/` 与 `_shared/helpers/` 下已有共享对象 → 规划复用或扩展；禁止新增或修改 feature-local helper 目录
4. **禁止**覆写未读过的已有 spec 文件

### 第四步：范围过滤 — 排除不可自动化的 Archive 用例

对 archive.md 中提取的每个测试点，逐一做可行性评估：

| 排除条件 | 判定方法 | 处理 |
|----------|----------|------|
| **环境/租户不匹配** | 用例前置条件或步骤中提及不同的 base_url、tenant、环境名称（如"泸州老窖环境"、"生产环境"） | 从自动化范围中排除，记入 `handoff.excluded_cases`（`reason_category: tenant_mismatch`） |
| **依赖手动操作** | 步骤包含人工操作（如"新增元数据同步任务，立即执行"需要创建资源、等待后台任务完成） | 如果无法用 API + 浏览器操作组合实现，标记为 `requires_data_prep`，放入 deferred |
| **依赖外部系统** | 步骤涉及第三方系统（如数据库表清理、外部调度） | 标记为 `blocked_by_data_dependency`，从自动化范围排除 |
| **仅可手动验证** | 预期结果无法通过 DOM 断言验证（如"表中有数据"需要检查 DB） | 排除，记录为 `offline_verification` |
| **P0 级复杂 E2E** | P0 case 涉及多步资源创建 + 状态轮询 + 条件分支 | 必须按用例步骤忠实自动化；不得简化为「进入页面验证元素存在」的 surface 契约测试。当前环境确实无法忠实实现并跑通时，标记 `blocked_by_*` 并记入 `handoff.excluded_cases`（含 `reason_category` + 原因） |

**排除的用例必须记入 handoff 的 `excluded_cases` 字段**（每条含 `case_id` + `reason_category`（`env`/`data_prep`/`external_system`/`tenant_mismatch`/`ui_missing`）+ 原因；表格中 `offline_verification` 类归 `external_system`），不得静默丢弃，也不得用 surface 断言假通过代替。

### 第五步：提取 UiAutomationIntent

输出到 `UiAutomationIntent@1` schema，包含：

```yaml
metadata:
  feature_path: workspace/dataAssets/features/{feature_name}/
  source: user_prompt / archive_md
  mode: archive_backed / source_backed_bootstrap
  source_ref: SR-INTENT-{nnn}
intent:
  description: 从 Archive MD description 或用户上下文提取的一句话测试意图
  case_count: N  # 从 archive.md case_count 或估算
  scope: P0 / P0+P1 / full_regression
  priority_cases:
    - id: "P0-1"
      description: "基座验证：登录态、项目切换、概览页可直达"
    - id: "P0-2"
      description: "核心功能入口验证"
  excluded_cases:
    - id: "P0-3"
      description: "原计划 P0 E2E：创建同步任务并校验状态流转（requires_data_prep，需要后台任务完成）"
      reason: "requires_data_prep / different_environment"
    - id: "P1-4"
      description: "泸州老窖环境脏数据清理（不同 tenant，非当前目标环境）"
      reason: "different_environment|tenant_mismatch"
  existing_scripts:
    smoke: path_or_null
    full: path_or_null
    helpers: [path_or_null]
environment:
  base_url: 从用户输入提取
  tenant_name: 从用户输入提取
  project_name: 从用户输入提取
  automation_mode: generate / repair / debug
```

### 第五步：只读限制确认

- 当前阶段已读取的文件：SKILL.md + phases/§1-case-normalize.md + 目标 feature 目录下 `archive.md` + 已有 `tests/` 文件
- **禁止**读取的文件：
  - `workspace/dataAssets/features/` 下除目标目录外的任何其他 feature
  - `workspace/{project}/_shared/env/*.yaml`（将在 env-preflight 阶段读取）
  - `workspace/*/.kata/repos/**`（只在需要源码佐证时按需读取）
  - `phases/**` 下除 §1-case-normalize.md 外的其他步骤规范，以及 `references/**` 下的跨阶段参考
- 硬约束：读取不超过目标 feature 目录 + SKILL.md + 本阶段规范

## 禁止

- 不得把用户文字当作真实 UI 事实。
- 不得弱化断言来换取通过。
- 不得修改 `workspace/{project}/.kata/repos/**`。
- 不得批量读取无关历史 feature。
- 不得在 case-normalize 阶段读取 `_shared/env/*.yaml`（这是 env-preflight 的职责）。
- 不得在 case-normalize 阶段读取 Lanhu 截图、运行 OCR、创建临时 Python/Node 环境，或为了理解 UI 安装新依赖。
- 不得在缺少 case-draft 输出且缺少同目录 `prd.md`/`inputs/lanhu-snapshots/` 源材料时跳到 env-preflight、ui-plan 或 playwright-generate。
- 不得在 `case_drafting.status != completed` 或缺少 `archive.md` 时读取无关 `prd.md`、跨目录 `inputs/`、截图或历史测试内容；`source_backed_bootstrap` 只能在环境确认后读取当前目标目录的源材料。
- 不得在 `source_backed_bootstrap` 环境确认前读取当前目标目录的 `prd.md` 正文、`inputs/lanhu-snapshots/**` 或图片内容；不得 `ls`/Glob/find/read `inputs/`、`inputs/lanhu-snapshots/**` 或枚举截图文件名。
