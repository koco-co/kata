# 用例标准化规格包（codex 必读）

## 你的角色

你是 QA 用例标准化执行者。逐条**语义级**改写用例，禁止脚本机械转换/正则批量替换。

## 关键路径常量

- 仓库根: `/Users/poco/Projects/kata`（下称 `$ROOT`）
- 轨道 A feature: `$ROOT/workspace/dataAssets/features/2099-01-lt-dq-main-flow`（下称 `$FA`）
- 轨道 B feature: `$ROOT/workspace/dataAssets/features/2099-01-lt-dq-launched-reqs`（下称 `$FB`）
- 源码根: `$ROOT/workspace/dataAssets/.kata/repos/customltem`（下称 `$REPOS`）

## 真值源优先级

1. **源码**（后端 `$REPOS/dt-center-assets`、前端 `$REPOS/dt-insight-studio`）：规则行为、字段名、按钮名、toast 文案
2. **已有用例**（launched-reqs / main-flow 现有内容）：语义复用
3. **DOM**：`$ROOT/workspace/dataAssets/_shared/env/ltqc-local.yaml` 与 `_shared/knowledge/sites/**`

冲突时以源码为准。

## 源码锚点（核心参考）

### 后端 (dt-center-assets)

| 文件 | 用途 |
|------|------|
| `$REPOS/dt-center-assets/common/src/main/java/com/dtstack/assets/common/enums/FunctionType.java` | **全部小规则枚举**（LINE_COUNT/NULL_COUNT/REPEAT_COUNT 等） |
| `$REPOS/dt-center-assets/dao/src/main/java/com/dtstack/assets/model/valid/Function.java` | 规则函数数据模型 |
| `$REPOS/dt-center-assets/common/src/main/java/com/dtstack/assets/common/enums/SingleVerifyType.java` | 唯一性子类型 |
| `$REPOS/dt-center-assets/common/src/main/java/com/dtstack/assets/common/enums/RuleTaskType.java` | 规则任务类型 |

### 前端 (dt-insight-studio)

| 文件 | 用途 |
|------|------|
| `$REPOS/dt-insight-studio/apps/dataAssets/src/consts/index.ts` | **RULE_TYPE 枚举 + STATISTICS_FUNC 枚举**（8 大规则 + 小规则函数） |
| `$REPOS/dt-insight-studio/apps/dataAssets/src/views/valid/ruleBase/constants.ts` | 规则库视图相关常量（RuleScope、关联范围等） |

### 8 大规则与前端类型对应

| 大规则 | RULE_TYPE 值 | 枚举名 |
|--------|-------------|-------|
| 完整性 | 1 | COMPLETENESS |
| 有效性（规范性） | 3 | NORMATIVE |
| 唯一性 | 4 | UNIQUENESS |
| 自定义 SQL | 5 | CUSTOMSQL |
| 统计性 | 6 | STATISTIC |
| 一致性 | 7 | CONSISTENCY |
| 时效性 | 8 | TIMELINESS |
| 合理性 | 9 | RATIONALITY |

注：ACCURACY(2) 在当前版本已被注释暂不展示。

## 格式硬规则

- 章节层级：`## 模块 → ### 菜单/页面 → #### 功能点（可选）→ ##### 【Pn】用例`
- 用例标题：必带 `【Pn】` 前缀；禁止 TC-ID/SR-/RA- 等机器标识；自然中文动宾句
- 括号语义：`【】` 仅用于 `【Pn】`；`「」` 用于所有 UI/菜单/选项/字段名
- 每条用例：≥1 前置条件、≥1 步骤，每步预期具体可验；禁止「页面正常打开」类空断言；一例一验证目标
- 可读换行：前置条件 / 操作步骤 / 预期结果 分段；多步骤分行编号
- 前置 SQL：有数据依赖的用例给可执行 SQL，`DROP TABLE IF EXISTS` + `CREATE TABLE` + `INSERT` 三段可重入，放 ` ```代码块``` `；岚图默认数据源 SparkThrift2.x（STRING 类型），需要时给 doris3.x 变体
- 已知 bug：任何 SQL/代码注释不得泄漏成 markdown 标题（`#` 开头），必须包进代码块

## 业务约束（数据质量）

- 业务流：规则库配置 → 规则集管理 → 规则任务管理 → 校验结果查询 → 数据质量报告
- 不得跳过规则集直接在规则任务建规则
- 数据源选型：sparkthrift2.x > doris3.x > hive2.x
- 按钮名以源码/DOM 为准（参考 `$ROOT/workspace/dataAssets/_shared/rules/case-writing.md` 第 5 节易错对照）

## 输出要求

- 只写被分配的那一个 fragment 文件，不碰其他文件
- fragment 内只放人类可读用例内容，无机器标识
- 完成后在 fragment 末尾追加一行注释：`<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->`
