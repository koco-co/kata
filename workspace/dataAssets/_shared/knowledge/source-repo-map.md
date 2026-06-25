# 开发版本 → 源码仓库映射

| 开发版本关键词 | 前端 | 后端 |
|---|---|---|
| 6.3岚图定制化分支 | customltem/dt-insight-studio@dataAssets/release_6.3.x_ltqc | customltem/dt-center-assets@release_6.3.x_ltqc |
| 6.0浙商证券定制（release_6.0.x_zszq） | customltem/dt-insight-studio | customltem/dt-center-assets |

> source-confirm 步骤优先查本表；未命中再 LLM 语义兜底；任何情况都过一轮 AskUser 人工确认。
> 仓库在 `workspace/dataAssets/.kata/repos/` 下，一律只读（仅 read/grep 与 `git fetch`）；本地 checkout 当前在 main，定制分支需 `git fetch` 后按 `origin/release_6.0.x_zszq` 读。

## 数据质量规则语义源码出处（查 DQ 规则/统计函数语义时按此跳转）

后端 `customltem/dt-center-assets/`：
- 规则类型枚举：`common/src/main/java/com/dtstack/assets/common/enums/RuleTaskType.java`（完整性/准确性/规范性/唯一性/自定义SQL/统计性/一致性/时效性/合理性）
- 统计函数枚举：`common/src/main/java/com/dtstack/assets/common/enums/FunctionType.java`（NULL_COUNT/REPEAT_COUNT/SUM/VALUE_RANGE/DISTINCT_COUNT/CUSTOM_SQL… 全集）
- 校验方法枚举：`common/src/main/java/com/dtstack/assets/common/enums/VerifyType.java`（固定值/波动/占比/IQR/Z-score）
- 规则模型（多字段 `logic` and/or、`customizeSql`）：`dao/src/main/java/com/dtstack/assets/model/valid/MonitorRule.java`
- 自定义SQL DTO：`dao/src/main/java/com/dtstack/assets/model/valid/dto/MonitorRuleDTO.java`
- 规则集模型：`dao/src/main/java/com/dtstack/assets/model/valid/MonitorRuleSet.java`
- 内置函数 SQL 模板 / `support_column_type` 字段类型约束：`sql/increment/202603301500_v6.3.x.sql`

前端 `customltem/dt-insight-studio/apps/dataAssets/src/`：
- 规则类型/统计函数/字段级表级常量：`consts/index.ts`（`RULE_TYPE` ~L2521、`STATISTICS_FUNC` ~L2354、`RULE_FIELD_TYPE` ~L2565、`DATA_FIELD_TYPE` ~L3026 数值/字符/日期类型分类）
- 规则配置第二步（多规则、规则包导入）：`views/valid/ruleConfig/edit/stepTwo.tsx`
- 规则包导入组件：`views/valid/ruleConfig/edit/components/rulePackageImport/index.tsx`

> 字段类型约束要点：数值-取值范围/枚举范围/枚举个数、负/零/正值比仅接受数值字段；格式类仅字符串；日期/时效仅日期字段（见 `modules/data-quality.md` §3.2）。
