---
title: 数据质量模块业务规则（产品级）
type: module
tags: [数据质量, 规则类型, 统计函数, 校验语义, 规则集, 多表比对, 自定义SQL, 字段类型约束]
status: verified
source: 源码 customltem/dt-center-assets + customltem/dt-insight-studio @ main(65f8e9ec8) 2026-06-24；live zszq 2026-06-23；用户口述 2026-04~2026-06；用户反馈 2026-06-29；用户确认迁移前置数据规则 2026-07-30
updated: 2026-07-30
---

# 数据质量模块业务规则（产品级）

本文件记录数据质量（DQ）模块**与客户无关的产品级规则语义**：规则类型、统计函数、校验语义、规则集/多表比对/自定义SQL 机制、字段类型约束。**生成用例或 Playwright 脚本前必读本文件 + 对应环境的 `sites/<host>/dom-dataAssets.md`。**

- **菜单/页面/按钮文案是环境定制的**，不在本文件，一律以 `sites/<host>/dom-dataAssets.md` 或用户截图为准（岚图 ltqc 与标品 zszq 菜单结构不同，见 §9）。
- **规则枚举/语义的源码出处**见 `source-repo-map.md`；落用例前如对语义存疑，按该表用 `kata repos grep|show` 查源码枚举，不要臆测。

## 1. 规则类型（RuleTaskType）与生效级别

源码 `RuleTaskType` 共 9 种：完整性(1)/准确性(2,@Deprecated)/规范性(3)/唯一性(4)/自定义SQL(5)/统计性(6)/一致性(7)/时效性(8)/合理性(9)。
- 出处：`customltem/dt-center-assets/common/src/main/java/com/dtstack/assets/common/enums/RuleTaskType.java`；前端 `customltem/dt-insight-studio/apps/dataAssets/src/consts/index.ts`（`RULE_TYPE`）。
- **zszq 标品「添加规则」下拉实际暴露 5 种**：完整性校验 / 准确性校验 / 规范性校验 / 唯一性校验 / 自定义SQL（live 2026-06-23）。其余类型是否暴露随环境/版本，未实证前不写进用例。

生效级别（`RULE_FIELD_TYPE`，consts/index.ts L2565）：字段级(0) / 表级(1) / 表行数对比(3) / 表内容对比(4)。
- UI 字段名叫「规则类型 = 字段级 / 表级」（不是「生效范围」）；只有完整性有字段级/表级切换，准确性/规范性/唯一性恒字段级。
- 多表比对走表行数对比/表内容对比，独立向导，不在单表「规则类型」里。

## 2. 统计函数清单（按规则类型）

以 **zszq 标品 live 文案为用例书写基线**，括号内是源码 `FunctionType` 枚举（`customltem/dt-center-assets/common/.../enums/FunctionType.java`，前端 consts `STATISTICS_FUNC`）。源码枚举是全集，各环境实际暴露以 DOM 为准。

| 规则类型 | 生效级别 | 统计函数（用例文案） |
| ---- | ---- | ---- |
| 完整性 | 字段级 | 空值数(NULL_COUNT) / 空值率(NULL_PERCENT) / 空串数(EMPTY_COUNT) / 空串率(EMPTY_PERCENT) |
| 完整性 | 表级 | 表行数(LINE_COUNT)（切表级后仅此一项） |
| 准确性 | 恒字段级 | 求和(SUM) / 求平均(AVG) / 负值比(MINUS_PERCENT) / 零值比(ZERO_PERCENT) / 正值比(PLUS_PERCENT)。**无最大值/最小值** |
| 规范性 | 恒字段级 | 数值-取值范围(VALUE_RANGE) / 数值-枚举范围 / 数值-枚举个数(DISTINCT_COUNT) / 格式-身份证号(PERSONAL_ID) / 格式-手机号(PHONE_NUMBER) / 格式-邮箱(EMAIL) / 字符串-最大长度(MAX_LEN) / 字符串-最小长度(MIN_LEN)。**带前缀；无「数据精度」「空值数/重复数」** |
| 唯一性 | 恒字段级 | 重复数(REPEAT_COUNT) / 重复率(REPEAT_PERCENT) / 非重复个数(UNIQUE_COUNT) / 非重复占比(UNIQUE_PERCENT)。**无前缀** |
| 自定义SQL | —— | 用户填 SQL，见 §5 |

## 3. 校验语义（写用例时最易错，逐条实证）

### 3.1 多字段是 AND/OR 可配（`logic` 字段）

- 一个规则块可多选字段；字段间关系由 `MonitorRule.logic`（值 `and`/`or`）决定。出处：`customltem/dt-center-assets/dao/src/main/java/com/dtstack/assets/model/valid/MonitorRule.java`（`logic` 字段）；前端 `.../views/valid/ruleConfig/edit/stepTwo.tsx`。
- **完整性多字段按 AND**：同一行**所有所选字段都命中条件**才算一条违规。例：security_name、account_no 两字段空值数=0，只有两字段在同一行**都为 NULL** 才计违规；某行只单字段为空不计入。空值率/空串数/空串率多字段同理（分子=两字段同时命中的行数）。
- 写多字段用例时：测试数据要专门造一行让所有字段同时命中（触发违规），并保留单字段命中的行证明它们不计入；预期只点中"同时命中"的那行。

### 3.2 字段类型约束（统计函数对字段类型挑剔）

源码按 `support_column_type` 限制（`customltem/dt-center-assets/sql/increment/202603301500_v6.3.x.sql`；前端 `DATA_FIELD_TYPE` consts/index.ts L3026）：
- **数值字段**（TINYINT/SMALLINT/INT/BIGINT/FLOAT/DOUBLE/DECIMAL/NUMERIC…）：规范性「数值-取值范围 / 数值-枚举范围 / 数值-枚举个数」、准确性「负值比/零值比/正值比/求和/求平均」**只接受数值字段**。
  - **「数值-枚举范围」的枚举集合填数值**（如 `1, 2`），不是文本（不是 `买入, 卖出`）。建表时该列要建成数值类型（如 TINYINT，业务含义放列注释 `1=买入 2=卖出`）。
- **字符串字段**：格式-身份证/手机/邮箱、字符串-最大/最小长度。
- **日期字段**：日期/日期时间格式、时效性时间差。
- **子规则支持性以任务运行结果为准**：字段可选择、规则可配置或保存成功，只能说明 UI 允许创建规则，不能证明该字段类型支持该子规则。执行质量任务后，若实例运行失败，代表该字段类型不支持该子规则；若实例进入正常业务校验并展示「校验通过」或「校验不通过」，代表该字段类型支持该子规则。写用例时，不得把“页面能否配置”写成支持性判断；需要验证不支持边界时，必须单独执行该规则并预期运行失败，避免混入主修复任务影响正向路径。

### 3.3 期望值 / 校验方法 / 状态

- 期望值 = **比较符下拉（`=` `<` `>` `<=` `>=`）+ 值**，如「= 0」「<= 10%」。
- 校验方法（`VerifyType`，`.../enums/VerifyType.java`）：固定值(1) / 一天·七天·三十天波动 / 占比 / IQR / Z-score 等；用例默认「固定值」。
- 实例状态：**校验通过 / 校验异常**（规则不通过或运行失败都归校验异常）；执行按钮文案「立即执行」。详见 `sites/shuzhan60-test-zszq/dom-dataAssets.md`。

## 4. 自定义SQL / 规则集校验SQL：返回违规明细行

- **用户填写的自定义SQL（CUSTOMSQL）/ 规则集导入文件的「校验SQL」，必须返回"不符合规则要求的明细数据"**（`SELECT 列 FROM 表 WHERE 违规条件`），返回的行即违规明细；期望值=0 表示违规明细行数为 0 才通过。
  - 正确：`SELECT order_id, trade_amount FROM <表> WHERE trade_amount < 0`
  - 错误：`SELECT COUNT(1) ...`（聚合）。COUNT 形态是**内置统计函数规则**系统内部自动生成的 SQL（源码模板 `SELECT count(1) AS val FROM ${table} WHERE ${condition}`），与用户填的自定义SQL 不是一回事。
- 出处：`customltem/dt-center-assets/dao/.../valid/dto/MonitorRuleDTO.java`（`customizeSql`/`isCustomizeSql`）；FunctionType.CUSTOM_SQL(0)。
- **明细查询 SQL 避免 JOIN，一律用子查询替代**：自定义SQL 与规则集导入「校验SQL」保存时都会被后端解析建脏数据表（`TidbSqlOperator.createCustomDirtyTable` / `createCollectionDirtyTable` → `getSqlParseResult`，脏数据存储开启时触发）。SR3.x（zszq）环境实测：含 `JOIN` 的校验SQL 触发 SqlParser `NoSuchMethodError: JoinCall.getConditionNodeList()`（疑 SqlParser jar 版本问题），保存即 500 失败。写明细查询时：
  - 查重复：`SELECT 列 FROM 表 WHERE 字段 IN (SELECT 字段 FROM 表 GROUP BY 字段 HAVING COUNT(1) > 1)`，不写自连接 JOIN。
  - 查跨表缺失/孤儿：`SELECT 列 FROM 表 WHERE 字段 NOT IN (SELECT 字段 FROM 维表)` 或 `NOT EXISTS (...)`，不写 LEFT JOIN。
  - 真要做跨表字段一致性比对：走专用**多表比对**功能（§6），别在单表自定义SQL 里手写 JOIN。

## 5. 规则集（RuleSet）：文件导入 + 独立执行

- **规则集与单表监控规则无关**，是独立的配置与执行入口。导入并保存后**直接执行**（在「规则集」区/列表对该规则集点「立即执行」→ 任务查询看实例），**不需要也不应该**再去「新建监控规则-单表校验规则」里引用它。
- 规则集向导：① 基础信息（规则集名称/校验数据源/规则集描述）→ ② 规则内容（「导入规则」**上传 Excel 模板文件**）→ ③ 调度配置 → 保存。
- **导入文件模板列（逐字，来自用户截图 2026-06）**：`* 规则名称`、`规则描述`、`* 表名`、`表中文名`、`字段名`、`字段中文名`、`* 校验SQL(请输入不符合规则要求的明细数据查询SQL)`。带 `*` 为必填；每条规则靠「校验SQL」定义（返回违规明细行，见 §4）。
- 源码侧另有按 packageIds 选包的 `RulePackageImport` 组件（`.../ruleConfig/edit/components/rulePackageImport/`、stepTwo.tsx）；与上述 Excel 文件导入可能是不同入口，**以用户截图的文件模板为用例基线**，源码选包式入口待 live 区分。表结构 `assets_dq_monitor_rule_set`（`.../model/valid/MonitorRuleSet.java`）。

## 6. 多表比对

- 独立向导：① 选择左侧表 → ② 选择右侧表 → ③ 选择字段 → ④ 执行配置。术语是**左侧表 / 右侧表**（不是主表/比对表）。
- 匹配条件、字段映射等逐字文案见 `sites/shuzhan60-test-zszq/dom-dataAssets.md`「多表比对向导」节。

## 7. 数据源选型与前置条件 SQL

- 数据源选型优先级（无特定要求时）：sparkthrift2.x > doris3.x > hive2.x。**特定需求按需求指定**（如 StarRocks 3.x 适配需求一律用 StarRocks 3.x，建表用 OLAP DDL）。
- 用例正文/前置里**数据源名、库/schema 名一律用占位符**（`${DataSourceA}` / `${SchemaA}` / 质量项目 `${ProjectA}`），只有表名允许具体；数据源类型枚举（如 `STAR_ROCKS_3X`）保留。
- 前置条件需写可重入建表 SQL（`DROP TABLE IF EXISTS` + `CREATE TABLE` + `INSERT`），按所选数据源方言；多数据源矩阵时表名保持一致、类型按方言调整。

## 8. 项目管理

- 数据质量做任何配置前先有质量项目；数据源「引入」后还需对其做「质量项目授权」才能在 DQ 选到。完整引入链路（数据源中心→应用授权→平台管理引入→质量项目授权）见 `sites/<host>/dom-dataAssets.md`。

## 9. 客户/环境差异（岚图 vs 标品）

- §1~§8 的语义产品通用；**菜单/字段文案、容量上限、维表关联等定制项随环境不同**，以 `sites/<host>/dom-dataAssets.md` 为准。
- **岚图汽车专属**（源码 `customltem/`，仅岚图）：菜单为「规则库配置/规则集管理/规则任务管理/校验结果查询/数据质量报告/通用配置」；「通用配置→报告关联维表设置」有车辆数/车系/车型/动力类型关联字段；规则集容量 20 包 × 每包 10 规则；JSON 格式校验（完整性=key 存在性、有效性=value 正确性）。这些**不适用标品**。
- **标品（如浙商证券 zszq）**：左导航「概览/规则配置/任务查询/实时校验/项目管理」，规则集+多表比对都在「规则配置」页内，无独立「质量报告」菜单。详见 `sites/shuzhan60-test-zszq/dom-dataAssets.md`。

# 数据质量模块业务规则（产品级）

本文件记录数据质量（DQ）模块**与客户无关的产品级规则语义**：规则类型、统计函数、校验语义、规则集/多表比对/自定义SQL 机制、字段类型约束。**生成用例或 Playwright 脚本前必读本文件 + 对应环境的 `sites/<host>/dom-dataAssets.md`。**

- **菜单/页面/按钮文案是环境定制的**，不在本文件，一律以 `sites/<host>/dom-dataAssets.md` 或用户截图为准（岚图 ltqc 与标品 zszq 菜单结构不同，见 §9）。
- **规则枚举/语义的源码出处**见 `source-repo-map.md`；落用例前如对语义存疑，按该表用 `kata repos grep|show` 查源码枚举，不要臆测。

## 1. 规则类型（RuleTaskType）与生效级别

源码 `RuleTaskType` 共 9 种：完整性(1)/准确性(2,@Deprecated)/规范性(3)/唯一性(4)/自定义SQL(5)/统计性(6)/一致性(7)/时效性(8)/合理性(9)。
- 出处：`customltem/dt-center-assets/common/src/main/java/com/dtstack/assets/common/enums/RuleTaskType.java`；前端 `customltem/dt-insight-studio/apps/dataAssets/src/consts/index.ts`（`RULE_TYPE`）。
- **zszq 标品「添加规则」下拉实际暴露 5 种**：完整性校验 / 准确性校验 / 规范性校验 / 唯一性校验 / 自定义SQL（live 2026-06-23）。其余类型是否暴露随环境/版本，未实证前不写进用例。

生效级别（`RULE_FIELD_TYPE`，consts/index.ts L2565）：字段级(0) / 表级(1) / 表行数对比(3) / 表内容对比(4)。
- UI 字段名叫「规则类型 = 字段级 / 表级」（不是「生效范围」）；只有完整性有字段级/表级切换，准确性/规范性/唯一性恒字段级。
- 多表比对走表行数对比/表内容对比，独立向导，不在单表「规则类型」里。

## 2. 统计函数清单（按规则类型）

以 **zszq 标品 live 文案为用例书写基线**，括号内是源码 `FunctionType` 枚举（`customltem/dt-center-assets/common/.../enums/FunctionType.java`，前端 consts `STATISTICS_FUNC`）。源码枚举是全集，各环境实际暴露以 DOM 为准。

| 规则类型 | 生效级别 | 统计函数（用例文案） |
| ---- | ---- | ---- |
| 完整性 | 字段级 | 空值数(NULL_COUNT) / 空值率(NULL_PERCENT) / 空串数(EMPTY_COUNT) / 空串率(EMPTY_PERCENT) |
| 完整性 | 表级 | 表行数(LINE_COUNT)（切表级后仅此一项） |
| 准确性 | 恒字段级 | 求和(SUM) / 求平均(AVG) / 负值比(MINUS_PERCENT) / 零值比(ZERO_PERCENT) / 正值比(PLUS_PERCENT)。**无最大值/最小值** |
| 规范性 | 恒字段级 | 数值-取值范围(VALUE_RANGE) / 数值-枚举范围 / 数值-枚举个数(DISTINCT_COUNT) / 格式-身份证号(PERSONAL_ID) / 格式-手机号(PHONE_NUMBER) / 格式-邮箱(EMAIL) / 字符串-最大长度(MAX_LEN) / 字符串-最小长度(MIN_LEN)。**带前缀；无「数据精度」「空值数/重复数」** |
| 唯一性 | 恒字段级 | 重复数(REPEAT_COUNT) / 重复率(REPEAT_PERCENT) / 非重复个数(UNIQUE_COUNT) / 非重复占比(UNIQUE_PERCENT)。**无前缀** |
| 自定义SQL | —— | 用户填 SQL，见 §5 |

## 3. 校验语义（写用例时最易错，逐条实证）

### 3.1 多字段是 AND/OR 可配（`logic` 字段）

- 一个规则块可多选字段；字段间关系由 `MonitorRule.logic`（值 `and`/`or`）决定。出处：`customltem/dt-center-assets/dao/src/main/java/com/dtstack/assets/model/valid/MonitorRule.java`（`logic` 字段）；前端 `.../views/valid/ruleConfig/edit/stepTwo.tsx`。
- **完整性多字段按 AND**：同一行**所有所选字段都命中条件**才算一条违规。例：security_name、account_no 两字段空值数=0，只有两字段在同一行**都为 NULL** 才计违规；某行只单字段为空不计入。空值率/空串数/空串率多字段同理（分子=两字段同时命中的行数）。
- 写多字段用例时：测试数据要专门造一行让所有字段同时命中（触发违规），并保留单字段命中的行证明它们不计入；预期只点中"同时命中"的那行。

### 3.2 字段类型约束（统计函数对字段类型挑剔）

源码按 `support_column_type` 限制（`customltem/dt-center-assets/sql/increment/202603301500_v6.3.x.sql`；前端 `DATA_FIELD_TYPE` consts/index.ts L3026）：
- **数值字段**（TINYINT/SMALLINT/INT/BIGINT/FLOAT/DOUBLE/DECIMAL/NUMERIC…）：规范性「数值-取值范围 / 数值-枚举范围 / 数值-枚举个数」、准确性「负值比/零值比/正值比/求和/求平均」**只接受数值字段**。
  - **「数值-枚举范围」的枚举集合填数值**（如 `1, 2`），不是文本（不是 `买入, 卖出`）。建表时该列要建成数值类型（如 TINYINT，业务含义放列注释 `1=买入 2=卖出`）。
- **字符串字段**：格式-身份证/手机/邮箱、字符串-最大/最小长度。
- **日期字段**：日期/日期时间格式、时效性时间差。
- **子规则支持性以任务运行结果为准**：字段可选择、规则可配置或保存成功，只能说明 UI 允许创建规则，不能证明该字段类型支持该子规则。执行质量任务后，若实例运行失败，代表该字段类型不支持该子规则；若实例进入正常业务校验并展示「校验通过」或「校验不通过」，代表该字段类型支持该子规则。写用例时，不得把“页面能否配置”写成支持性判断；需要验证不支持边界时，必须单独执行该规则并预期运行失败，避免混入主修复任务影响正向路径。

### 3.3 期望值 / 校验方法 / 状态

- 期望值 = **比较符下拉（`=` `<` `>` `<=` `>=`）+ 值**，如「= 0」「<= 10%」。
- 校验方法（`VerifyType`，`.../enums/VerifyType.java`）：固定值(1) / 一天·七天·三十天波动 / 占比 / IQR / Z-score 等；用例默认「固定值」。
- 实例状态：**校验通过 / 校验异常**（规则不通过或运行失败都归校验异常）；执行按钮文案「立即执行」。详见 `sites/shuzhan60-test-zszq/dom-dataAssets.md`。

## 4. 自定义SQL / 规则集校验SQL：返回违规明细行

- **用户填写的自定义SQL（CUSTOMSQL）/ 规则集导入文件的「校验SQL」，必须返回"不符合规则要求的明细数据"**（`SELECT 列 FROM 表 WHERE 违规条件`），返回的行即违规明细；期望值=0 表示违规明细行数为 0 才通过。
  - 正确：`SELECT order_id, trade_amount FROM <表> WHERE trade_amount < 0`
  - 错误：`SELECT COUNT(1) ...`（聚合）。COUNT 形态是**内置统计函数规则**系统内部自动生成的 SQL（源码模板 `SELECT count(1) AS val FROM ${table} WHERE ${condition}`），与用户填的自定义SQL 不是一回事。
- 出处：`customltem/dt-center-assets/dao/.../valid/dto/MonitorRuleDTO.java`（`customizeSql`/`isCustomizeSql`）；FunctionType.CUSTOM_SQL(0)。
- **明细查询 SQL 避免 JOIN，一律用子查询替代**：自定义SQL 与规则集导入「校验SQL」保存时都会被后端解析建脏数据表（`TidbSqlOperator.createCustomDirtyTable` / `createCollectionDirtyTable` → `getSqlParseResult`，脏数据存储开启时触发）。SR3.x（zszq）环境实测：含 `JOIN` 的校验SQL 触发 SqlParser `NoSuchMethodError: JoinCall.getConditionNodeList()`（疑 SqlParser jar 版本问题），保存即 500 失败。写明细查询时：
  - 查重复：`SELECT 列 FROM 表 WHERE 字段 IN (SELECT 字段 FROM 表 GROUP BY 字段 HAVING COUNT(1) > 1)`，不写自连接 JOIN。
  - 查跨表缺失/孤儿：`SELECT 列 FROM 表 WHERE 字段 NOT IN (SELECT 字段 FROM 维表)` 或 `NOT EXISTS (...)`，不写 LEFT JOIN。
  - 真要做跨表字段一致性比对：走专用**多表比对**功能（§6），别在单表自定义SQL 里手写 JOIN。

## 5. 规则集（RuleSet）：文件导入 + 独立执行

- **规则集与单表监控规则无关**，是独立的配置与执行入口。导入并保存后**直接执行**（在「规则集」区/列表对该规则集点「立即执行」→ 任务查询看实例），**不需要也不应该**再去「新建监控规则-单表校验规则」里引用它。
- 规则集向导：① 基础信息（规则集名称/校验数据源/规则集描述）→ ② 规则内容（「导入规则」**上传 Excel 模板文件**）→ ③ 调度配置 → 保存。
- **导入文件模板列（逐字，来自用户截图 2026-06）**：`* 规则名称`、`规则描述`、`* 表名`、`表中文名`、`字段名`、`字段中文名`、`* 校验SQL(请输入不符合规则要求的明细数据查询SQL)`。带 `*` 为必填；每条规则靠「校验SQL」定义（返回违规明细行，见 §4）。
- 源码侧另有按 packageIds 选包的 `RulePackageImport` 组件（`.../ruleConfig/edit/components/rulePackageImport/`、stepTwo.tsx）；与上述 Excel 文件导入可能是不同入口，**以用户截图的文件模板为用例基线**，源码选包式入口待 live 区分。表结构 `assets_dq_monitor_rule_set`（`.../model/valid/MonitorRuleSet.java`）。

## 6. 多表比对

- 独立向导：① 选择左侧表 → ② 选择右侧表 → ③ 选择字段 → ④ 执行配置。术语是**左侧表 / 右侧表**（不是主表/比对表）。
- 匹配条件、字段映射等逐字文案见 `sites/shuzhan60-test-zszq/dom-dataAssets.md`「多表比对向导」节。

## 7. 数据源选型与前置条件 SQL

- 数据源选型优先级（无特定要求时）：sparkthrift2.x > doris3.x > hive2.x。**特定需求按需求指定**（如 StarRocks 3.x 适配需求一律用 StarRocks 3.x，建表用 OLAP DDL）。
- 用例正文/前置里**数据源名、库/schema 名一律用占位符**（`${DataSourceA}` / `${SchemaA}` / 质量项目 `${ProjectA}`），只有表名允许具体；数据源类型枚举（如 `STAR_ROCKS_3X`）保留。
- 前置条件需写可重入建表 SQL（`DROP TABLE IF EXISTS` + `CREATE TABLE` + `INSERT`），按所选数据源方言；多数据源矩阵时表名保持一致、类型按方言调整。
- 涉及 NULL、空串、非法值、重复键、脏数据、边界值或回溯时间字段时，SQL 必须同时包含完整建表语句和覆盖目标状态的插入语句，不能只用自然语言描述数据状态。
- 能通过 UI 构造的数据优先写可执行 UI 步骤；SQL 用作不可从 UI 构造状态的准备或兜底。涉及产品内部表时，先从初始化 SQL、Mapper 或实体类确认真实 schema，不臆造字段。

## 8. 项目管理

- 数据质量做任何配置前先有质量项目；数据源「引入」后还需对其做「质量项目授权」才能在 DQ 选到。完整引入链路（数据源中心→应用授权→平台管理引入→质量项目授权）见 `sites/<host>/dom-dataAssets.md`。

## 9. 客户/环境差异（岚图 vs 标品）

- §1~§8 的语义产品通用；**菜单/字段文案、容量上限、维表关联等定制项随环境不同**，以 `sites/<host>/dom-dataAssets.md` 为准。
- **岚图汽车专属**（源码 `customltem/`，仅岚图）：菜单为「规则库配置/规则集管理/规则任务管理/校验结果查询/数据质量报告/通用配置」；「通用配置→报告关联维表设置」有车辆数/车系/车型/动力类型关联字段；规则集容量 20 包 × 每包 10 规则；JSON 格式校验（完整性=key 存在性、有效性=value 正确性）。这些**不适用标品**。
- **标品（如浙商证券 zszq）**：左导航「概览/规则配置/任务查询/实时校验/项目管理」，规则集+多表比对都在「规则配置」页内，无独立「质量报告」菜单。详见 `sites/shuzhan60-test-zszq/dom-dataAssets.md`。
