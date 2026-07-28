# 需求确认记录

- 环境：`ltqc-lindorm-dev.yaml`。
- 数据质量指标项目：使用质量项目「集成测试」，不是默认的 `lindorm_test` 或之前的临时项目；运行时按项目名称解析项目 ID。
- 数据源：SparkThrift 与 Doris 使用同名数据库 `dtstack_smoke`；真实数据源名称由环境配置提供。
- 调试表映射：`TABLE1=test_schema3`、`TABLE2=test_schema4`、`${TABLE}=test_return2`；三张表由环境预先创建，自动化不执行重建、插入、更新或删除。
- 数据质量自动化矩阵：SparkThrift 全通过、SparkThrift 全不通过、Doris 全通过、Doris 全不通过；规则按本用例配置。
- 数据质量调试使用 `skip_precondition_setup=true`，全量运行保持默认 `false`。
- 计算逻辑配置：必须点击「设置」进入配置页；平台对 STRING 字段自动补充 `cast`。多表示例使用 `(test_return2.id+test_schema3.id)*cast(test_return2.age as double)`。
- 数据模型按 XMind 全量覆盖 Doris/SparkThrift 建表变体、数据开发访客提交和管理员审批流程。
- 业务记录使用带 run 标识的唯一名称并保留，避免覆盖其他历史记录。
- 2026-07-27 调试观察：`test_return2` 已存在规则集后，平台在新建规则集下拉中隐藏该表；当前 `dt='2025-11-07'` 与 `dt='2025-11-08'` 的最小表行数/空值数探针均未得到预期“校验通过”，需先核对表内准备数据后再宣称四场景通过。
