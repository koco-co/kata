---
title: 浙商证券（标品）数据质量表单事实（向导字段/必填项/自定义调度日期组件）
type: module
tags: [数据质量, 浙商证券, zszq, 标品, 单表校验, 多表比对, 规则集, 调度属性, 自定义调度日期, 表单字段, 起调周期]
status: verified
source: customltem/dt-insight-studio@dataAssets/feat_6.0.x_zszq_16212（前端 2026-08-04）+ customltem/dt-center-assets@release_6.0.x_zszq（后端）+ live shuzhan60-test-zszq 探测（sites/shuzhan60-test-zszq/dom-dataAssets.md）
updated: 2026-08-05
---

# 浙商证券（标品）数据质量表单事实（向导字段/必填项/自定义调度日期组件）

本文件记录 **zszq/标品** 数据质量向导的表单字段、必填项与组件行为，**与岚图 ltqc 定制不同**。写 zszq/标品数据质量用例或 lint 字段集时必读；ltqc 表单见 `modules/data-quality.md` 与 `sites/shuzhan63-test-ltqc.k8s.dtstack.cn/dom-dataAssets.md`。

- 菜单基线（概览/规则配置/任务查询/实时校验/项目管理）与页面 DOM 见 `sites/shuzhan60-test-zszq/dom-dataAssets.md`。
- 源码出处：前端 `customltem/dt-insight-studio@dataAssets/feat_6.0.x_zszq_16212`（2026-08-04，需求 16212 自定义调度周期移植分支）；后端 `customltem/dt-center-assets@release_6.0.x_zszq`。**前端单表/多表向导 stepThree 为同一调度表单组件**。

## 1. 单表校验规则向导（`views/valid/ruleConfig/edit/`）

步骤：**① 监控对象 → ② 监控规则 → ③ 调度属性**。

### ① 监控对象（stepOne.tsx）字段与必填

| 字段 | 必填 | 说明 |
| ---- | ---- | ---- |
| 规则名称 | *（≤50 字） | placeholder「请填写规则名称」 |
| 选择数据源 | * | 可搜索下拉；文案 `<名称>（STAR_ROCKS_3X）` |
| 选择Catalog | 仅 TRINO 数据源显示，* | 条件渲染 `isTypeEqual(dataSourceType, TRINO)` |
| 选择Schema | **仅 TRINO / KINGBASEES8 / SAPHANA1X 显示**，* | 条件渲染 `[TRINO, KINGBASEES8, SAPHANA1X].includes(dataSourceType)`；**StarRocks 3.x 无此字段** |
| 选择数据表 | * | |
| 选择分区 | 仅分区表（havePart） | Radio：手动输入分区 / 选择已有分区；手动输入格式 `分区字段=分区值，如column=${bdp.system.bizdate}` |
| 收藏 + 数据预览 | 非表单项 | 表名选中后出现「收藏」checkbox；「数据预览」链接（预览功能关闭时置灰） |

> **没有「选择数据库」字段**。StarRocks 3.x 监控对象字段集 = `规则名称 / 选择数据源 / 选择数据表（+ 选择分区）`。

### ② 监控规则（stepTwo.tsx → dashboard/components/ruleList/ruleForm.tsx）

「添加规则」下拉 5 大规则：完整性校验 / 准确性校验 / 规范性校验 / 唯一性校验 / 自定义SQL。规则块字段（以完整性字段级为例）：

| 字段 | 必填 | 说明 |
| ---- | ---- | ---- |
| 规则类型 | * | 字段级 / 表级（仅完整性显示；准确性/规范性/唯一性恒字段级无此字段） |
| 字段 | * | 多选（准确性/规范性单选）；表级无此字段 |
| 统计函数 | * | 随大规则/规则类型变化 |
| 过滤条件 | 可空 | 旁有「全局参数」链接 |
| 校验方法 | * | 固定值等 |
| 期望值 | * | 比较符下拉 + 数值（如 `= 0`） |
| 强弱规则 | 默认弱规则 | 无必填规则，`initialValue || WEAK` |
| 规则描述 | 可空 | ≤50 字 |

块操作：克隆；编辑态有 保存 / 取消。

### ③ 调度属性（stepThree.tsx，与多表比对「执行配置」共用）

两个区块：

**调度配置**：

| 字段 | 必填 | 说明 |
| ---- | ---- | ---- |
| 调度周期 | * | 下拉来自后端字典 `allDict.periodType`（非前端 consts）；「自定义调度日期」= PERIOD_TYPE.SCHEDULE_CALENDAR=6 |
| 生效日期 | *（非手动触发时显示） | EffectTime 组件；开始/结束日期，默认 [当天, +100 年]；文案「生效日期的开始时间不能晚于结束时间」 |
| 周期专属组件 | 随周期 | 时/天/周/月/自定义调度日期各渲染专属配置（见 §3） |
| 规则拼接包 | *（`isRulePackage` 为真时显示） | 单表向导 stepThree 传 `isRulePackage`（true）→ **单表校验也显示**；多值（强弱规则混合）默认 2，单规则默认 1 |
| 资源组 | *（仅 SparkThrift2.x 显示） | `+dataSourceType === DATA_SOURCE.SPARKTHRIFT2X` 才渲染；StarRocks 3.x 无此字段 |

**告警配置**：

| 字段 | 必填 | 说明 |
| ---- | ---- | ---- |
| 告警方式 | 可空 | Checkbox.Group（各告警通道需先在控制台配置默认通道） |
| WebHook | 勾选钉钉告警时 * | `hasDDAlarm` 时显示 |
| 通知人 | 告警方式非空时 * | `channelIds.length` 时显示 |
| 任务关联 | 仅 RDOS 部署且非手动触发 | 与关联任务互影响运行状态 |

> **没有「超时时间」「无需生成报告」「报告名称」**（ltqc 字段）；提交按钮「新建」（编辑态「保存」）。

## 2. 多表比对规则向导（`views/valid/dataCheck/edit/`）

步骤：**① 选择左侧表 → ② 选择右侧表 → ③ 选择字段 → ④ 执行配置**（④ = `ruleConfig/edit/stepThree.tsx` 同一调度表单）。

- ① 选择左侧表（stepOne.tsx）：`规则名称`(*) / `选择数据源`(*) / `选择Catalog`(仅TRINO) / `选择Schema`(仅TRINO/KB/SAPHANA) / `选择左侧表`(*) / `输入增量时间字段`(可空)。
- ② 选择右侧表（stepTwo.tsx）：`选择数据源`(*) / `选择Catalog`(仅TRINO) / `选择Schema`(条件) / `选择右侧表`(*) / `输入增量时间字段`(可空)。**无规则名称**（在①步已填）。
- ③ 选择字段（stepThree.tsx）：左右字段映射 + 「同行映射」「同名映射」按钮；匹配条件复选（记录数差异/数值差异百分比/数值差异绝对值/忽略小数点/字符不区分大小写/空值与NULL等价）；「是否强规则」UI 存在但无实际语义（不作测试点，用户确认 2026-06-25）。

## 3. 自定义调度日期（需求 16212 移植，`views/valid/components/scheduleTime/`）

- 调度周期下拉新增「自定义调度日期」（`consts/index.ts` `PERIOD_TYPE.SCHEDULE_CALENDAR=6`），位于「月」与「手动触发」之间（需求 FR-001）。
- `scheduleTime/index.tsx` SCHEDULE_CALENDAR 分支：渲染 `CalendarForm`（自定义调度日期下拉 + 预览）+ `AdjustCycleItemForm`（**「起调周期」时/分配置**）。**无条件渲染起调周期，不随日历格式显隐**——与 6.3 标品「年月日时分隐藏具体时间」不同（见 PRD PD-004 / 用例 TP-002）。
- `CalendarForm`：字段 label「自定义调度日期」（required「自定义调度日期不能为空」）；选项 = 日历名称；未选时「预览」按钮置灰（`disabled={!calenderId}`）。
- `scheduleCalendarPreview`：弹窗展示日历网格（`ScheduleCalendar`）+ 底部文案「`<日历名>`的最后一次调度日期：YYYY-MM-DD」（距当天 ≤10 天标红 `#FF5F5C`）；数据来自 `API.getCalendarOverview({calenderId})`（后端 `showCalenderTime` → `ConsoleCalenderTimeShowVO`）。
- 日历维护在控制台-全局配置-自定义调度日期配置（引擎侧 DAGScheduleX CalenderController/UploadController），数据资产前端无 CRUD；用例前置声明日历已存在。

## 4. 规则集向导（`views/valid/ruleConfig/RuleGroupCreate/`）

步骤：① 基础信息 → ② 规则内容 → ③ 调度配置。

- ① 基础信息（stepOne.tsx）：`规则集名称`(*)（≤128 字）/ `校验数据源`(*) / `选择Catalog`(仅TRINO) / `选择Schema`(条件) / `规则集描述`(可空)。**数据源字段 label 是「校验数据源」不是「选择数据源」**；**无「选择数据库/选择数据表」**（表经②步导入）。
- ② 规则内容（stepTwo.tsx）：「导入规则」从规则库导入规则到规则集。
- ③ 调度配置（stepThree.tsx）：调度属性表单（同 §1 ③）。

## 5. 后端差异（`dt-center-assets@release_6.0.x_zszq`）

- `PeriodType` 枚举仅 MIN(0 分钟)/HOUR(1 小时)/DAY(2 天)/WEEK(3 周)/MONTH(4 月)/TRIGGER(5 手动触发)——**无周期 6**；`PeriodType.periodType(6)` 会抛 `MONITOR_ERROR_12`。需求 16212 前端已加周期 6，**后端迁移未见**（截至 2026-08-05，无 feat 分支/提交）；按日历生成任务实例的用例（TP-006~008）须待后端合入部署后执行。
- 前端提交 `dataAssets/feat_6.0.x_zszq_16212`（672de31d6d，2026-08-04）仅含前端：scheduleCalendar/calendarForm/scheduleCalendarPreview/scheduleTimeSelect + consts 周期 6。
- 保存成功 Toast：「添加成功！」（`actions/ruleConfig/index.ts` addMonitor）；跳转回 `/dq/rule`。

## 6. lint 字段集映射

`cli/lib/cases/content-lint.ts` `resolveCaseCustomer`：feature 目录含「岚图汽车」→ ltqc 字段集；含「浙商证券/标品」或内容含 ltqc 专属菜单/字段 → zszq 字段集。zszq 表单 lint 基线：

- `case_monitor_object_form`：`规则名称 / 选择数据源 / 选择Schema(可空) / 选择数据表 / 选择分区(可空)`。
- `case_schedule_form`：`调度周期 / 生效日期(可空) / 告警方式(可空)`。
- `case_rule_set_form`：`规则集名称 / 校验数据源 / 规则集描述`。
- `case_monitor_task_form`、`case_rule_package_import`：zszq 无此流程，字段集为空不触发。
