<!-- 填写示例（内容为脱敏虚构，仅展示格式与详细程度，并非真实缺陷）。 -->

# Bug 分析报告：枚举值个数统计规则在空表上运行时抛出 NPE，而非按 0 处理

- 日期：2026-07-21
- 输入：任务运行日志堆栈（rule-engine 服务，taskId=AUTO_20260721_1032）
- 结论：目标表为空时枚举统计结果为 null，阈值比较未做空值兜底，触发 NullPointerException

## 证据

- 日志原文：`java.lang.NullPointerException: Cannot invoke "java.lang.Long.longValue()" because the return value of "com.xxx.rule.EnumCountMetric.value()" is null`（rule-engine，`MetricComparator.java:88`）
- 任务状态：「失败」，告警信息为堆栈首行，无字段名提示（`task_run` 表，id=AUTO_20260721_1032）

## 实际行为

对空表 `user_profile`（0 行）配置「枚举值个数 ≤ 5」规则后，任务运行失败，告警信息为 NPE 堆栈首行。

## 预期行为

经与需求确认，枚举值个数为 0 时应按 0 参与阈值比较，规则应运行成功，并按阈值判断是否告警。

## 复现步骤

1. 创建空表 `empty_t`（无任何行）。
2. 新建单表校验规则：字段任意、统计函数「枚举值个数」、比较符「小于等于」、阈值 5。
3. 手动触发运行 → 必现 NPE。

## 影响范围

所有使用「枚举值个数」统计函数且目标表为空的规则均受影响；问题自 v6.4.11 起引入（该函数为该版本新增）。非空表不受影响。

## 根因

`EnumCountMetric.value()` 在 COUNT(DISTINCT ...) 无结果行时返回 null（`EnumCountMetric.java:41`），`MetricComparator.java:88` 直接拆箱比较，未做空值兜底。

## 建议

- 修复方向：`value()` 在结果为空时统一返回 0L，或比较前判空并按 0 处理。
- 补充：异常流用例应覆盖空表场景（当前用例集缺失，已在 test-points 未覆盖清单登记）。
