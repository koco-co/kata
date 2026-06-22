# 自动化计划

- 需求: 15862 数据质量任务、落标检查任务性能优化，规则 SQL 合并
- 环境: ltqc-local, projectId=92, tenant=pw_test
- 表: pw_test.test_info_1
- Runner: automation/tests/runners/full.spec.ts
- 覆盖方式: 只读校验现有规则集、规则任务、校验实例、已生成报告，不创建或删除规则集/任务。

## 已实现脚本

1. `t01-sql-merge-ruleset-task-contract.ts`
   - 校验规则集管理页面可访问。
   - 校验 test_info_1 规则集存在，schema/source/sourceType 正确。
   - 校验规则包数量不超过 20。
   - 校验目标规则包同时包含可合并和不可合并函数，并可按 filter + ruleStrength 识别强/弱规则可合并候选组。
   - 校验目标规则任务绑定 pw_test.test_info_1，开启检测，并配置 dt=2026-06-04 分区。

2. `t02-sql-merge-monitor-record-detail.ts`
   - 校验目标校验实例存在，绑定目标表、数据源、分区和执行时间。
   - 校验实例详情返回多条规则明细。
   - 校验 SQL 片段包含抽样临时表、目标分区和过滤条件。
   - 校验自定义 SQL 规则没有空 SQL、悬空 where/operator、括号不匹配等明显残缺。
   - 校验校验结果查询页面提供实例筛选和列表入口；目标历史实例由接口断言。

3. `t03-sql-merge-quality-report-contract.ts`
   - 校验已生成报告接口包含 test_info_1 相关报告。
   - 校验数据质量报告页面和已生成报告入口可访问。

## 未覆盖范围

- DB `assets_dq_monitor_rule.merge_group_key` 级别的最终合并判定未纳入 Playwright 脚本。
- 生成后的完整 Spark SQL 是否满足 `SUM(CASE WHEN)`、`LATERAL VIEW STACK`、脏数据表 `rn <= 100` 等最终 SQL 范式，需要使用 sql-merge-validate 或数据库只读凭据单独校验。
- Doris3.x 场景未纳入本轮 runner；当前 env profile 的 active_datasources 仍为 sparkthrift。
