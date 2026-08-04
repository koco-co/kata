---
source: lanhu
source_url: "https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&corpId=null&versionId=3ad3e69d-1464-4ebc-a48f-ee51c593a070&docId=39a7f277-38a7-4cc3-a489-2cff4eb5c1d4&docType=axure&pageId=1cc95cc9bd9a42e59a8ae854f0ac6004&image_id=39a7f277-38a7-4cc3-a489-2cff4eb5c1d4&parentId=2381f282-5208-4b71-9e26-c1372620013a"
requirement_id: "16212"
evidence_digest: "sha256:fb75c3aabe0e42a0c6a4bb7d98981df6873de5288ef0f3c3bead2511c0088135"
---

# 支持自定义调度周期

## 需求身份与来源

- 需求 ID：16212
- 蓝湖文档：数据资产V7.0.1
- 文档 ID：`39a7f277-38a7-4cc3-a489-2cff4eb5c1d4`
- 版本 ID：`3ad3e69d-1464-4ebc-a48f-ee51c593a070`
- 页面 ID：`1cc95cc9bd9a42e59a8ae854f0ac6004`

## 背景、目标与成功标准

将6.3标品中【数据质量调度】-支持设置自定义调度周期功能迁移至浙商证券6.0定制分支，使浙商证券环境的质量任务可关联自定义调度日期运行，并按日历日期生成任务实例。

## 范围

涉及影响范围：数据质量-规则配置/任务查询。不包含控制台-全局配置-自定义调度日期配置页的用例覆盖(日历前置已存在)。任务停止相关回归纳入。

## 已确认的产品决策

### PD-001 菜单命名以 zszq 活体环境为准

测试用例菜单命名使用规则配置/任务查询(zszq 活体环境真实文案)，不使用蓝湖文本中的规则任务配置/任务实例。

来源：`Q-001`、`knowledge:shuzhan60-test-zszq/dom-dataAssets.md`

### PD-002 测试范围仅限数据质量侧

不覆盖控制台-全局配置-自定义调度日期配置页；用例前置声明所需自定义调度日期已存在。

来源：`Q-002`、`lanhu:1cc95cc9bd9a42e59a8ae854f0ac6004`

### PD-003 任务停止用例纳入回归

将任务查询中任务停止/中途停止/状态筛选相关用例作为回归覆盖纳入。

来源：`Q-003`、`历史用例 CSV`

## 验收标准

AC-001 自定义调度日期命中的日期生成并运行任务实例；AC-002 未命中的日期不生成任务实例；AC-003 年月日与年月日时分格式的「具体时间」配置显隐正确；AC-004 规则配置调度属性可选择自定义调度日期并预览；AC-005 任务停止/中途停止/状态筛选回归通过。

## 需求追踪矩阵

| ID | 需求或验收表述 | 来源 |
| --- | --- | --- |
| FR-001 | 数据质量规则配置(单表校验/多表比对)的调度属性「调度周期」下拉提供「自定义调度日期」选项，位置在「月」与「手动触发」之间。 | `lanhu:1cc95cc9bd9a42e59a8ae854f0ac6004`、`source:customltem/dt-insight-studio@4d22d4ca:views/valid/ruleConfig/edit/stepThree.tsx`、`source:customltem/dt-insight-studio@4d22d4ca:consts/index.ts(PERIOD_TYPE.SCHEDULE_CALENDAR=6)` |
| FR-002 | 选择「自定义调度日期」后展示自定义调度日期下拉选择器与「预览」入口；未选择时预览不可用。 | `source:customltem/dt-insight-studio@4d22d4ca:components/scheduleConf/components/scheduleTime/calendarForm/index.tsx` |
| FR-003 | 所选自定义调度日期为「年月日」格式时展示「具体时间」配置；为「年月日时分」格式时不展示「具体时间」。 | `source:customltem/dt-insight-studio@4d22d4ca:components/scheduleConf/components/scheduleTime/index.tsx(SCHEDULE_CALENDAR 分支)`、`source:customltem/dt-center-assets@20cf405d:CalenderTimeFormat(yyyyMMdd/yyyyMMddHHmm)` |
| FR-004 | 点击「预览」展示所选自定义调度日期的日历网格及该日历下最后一次调度时间。 | `source:customltem/dt-insight-studio@4d22d4ca:components/scheduleConf/components/scheduleCalendarPreview/index.tsx` |
| FR-005 | 质量任务按自定义调度日期生成任务实例：日历日期命中时生成并运行，未命中时不生成。 | `lanhu:1cc95cc9bd9a42e59a8ae854f0ac6004`、`历史用例 CSV(周期内运行/周期外不生成)`、`source:customltem/dt-center-assets@20cf405d:ScheduleTaskService(expendTime/calenderId)` |
| FR-006 | 「年月日」格式日历的任务在所选「具体时间」执行；「年月日时分」格式日历的任务按日历的日期+时间执行。 | `source:customltem/dt-center-assets@20cf405d:CalenderTimeFormat.toTriggerTime(expendTime 拼接规则)` |
| BR-001 | 自定义调度日期下拉展示已存在的自定义调度日期(按名称)；同一质量任务只能选择一个自定义调度日期。 | `source:customltem/dt-insight-studio@4d22d4ca:scheduleConf/defaultScheduleConf(calenderId 单值)` |
| BR-002 | 未选择自定义调度日期时保存被阻止并提示必填。 | `source:customltem/dt-insight-studio@4d22d4ca:calendarForm/index.tsx(rules required)` |
| AC-001 | 自定义调度日期命中的日期，任务实例生成并运行。 | `FR-005`、`历史用例 CSV 110410` |
| AC-002 | 自定义调度日期未命中的日期，不生成任务实例。 | `FR-005`、`历史用例 CSV 110411` |
| AC-003 | 年月日格式与年月日时分格式的「具体时间」配置显隐正确。 | `FR-003`、`历史用例 CSV 110409` |
| AC-004 | 规则配置调度属性可选择自定义调度日期并正确预览。 | `FR-001`、`FR-002`、`FR-004`、`历史用例 CSV 110409` |
| AC-005 | 任务停止/中途停止/状态筛选回归通过。 | `PD-003`、`历史用例 CSV 110412/110413/110414` |
