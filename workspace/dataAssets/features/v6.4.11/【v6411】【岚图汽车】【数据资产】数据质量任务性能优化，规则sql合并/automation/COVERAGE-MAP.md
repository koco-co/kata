# 自动化覆盖映射 — v6411 数据质量任务 SQL 合并

> 需求 72 条用例（doris3.x 36 + sparkthrift 36）。本表映射每条到自动化层或排除原因。
> 环境 ltqc，数据源 SparkThrift2.x（pw_test.test_info_1~8）。截至 2026-06-24。
> 全部 sparkthrift 用例已端到端转脚本：full.spec.ts 41 tests 全绿。

## sparkthrift 端到端覆盖（full.spec.ts 全绿 41 tests，四层）

SQL 合并被测链路按 archive「校验功能」用例步骤拆成四层，逐层 read-only 真实核验：

| 层 | 脚本 | tests | archive 步骤 | 核验内容 |
| -- | ---- | ----- | ------------ | -------- |
| 配置层 | t01/t05/t06/t08 | 12 | 步骤1-36 规则集/规则包/规则任务 | 规则集、6 个规则包、可合并候选组、test_info_2~8 一表一集配置 |
| **生成合并SQL层** | **t09** | **16** | **步骤37-38 规则SQL查看** | **每个规则任务生成的合并 SQL：拼接包数、STACK(N)/SUM(CASE WHEN) 合并、抽样表、分区谓词、CAST、脏数据管道** |
| 运行时实例层 | t10 | 2 | 步骤39/41 实例详情/查看明细 | 已落库校验实例详情含合并子规则执行 SQL，引用源表、无 SQL 缺陷 |
| 报告层 | t03/t07/t11 | 11 | 步骤40-42 查看质量报告 | 各场景命名质量报告已生成（有效性/完整性 通过·不通过、各表场景报告） |

### t09 生成合并SQL层 —— 16 个规则任务的合并 SQL 实测（被测核心）

| 表 | 规则任务 | 拼接包 | 抽样 | 分区 | 合并证据 |
| --- | --- | --- | --- | --- | --- |
| test_info_1 | 可合并+不可合并/不同过滤/多规则包 | 10 | on | ✓ | STACK(5) |
| test_info_2 | 可合并+不可合并/不同过滤/单规则包 | 1 | on | ✓ | STACK(11) |
| test_info_3 | 可合并+不可合并/相同过滤/多规则包 | 9 | on | ✓ | STACK(6) |
| test_info_4 | 可合并+不可合并/相同过滤/单规则包 | 1 | on | ✓ | STACK(11) |
| test_info_5 | 不可合并部分规则 | 1 | on | ✓ | SUM(CASE WHEN)×2 + 余各自扫描 |
| test_info_6 | 完整性+有效性/含强弱/多规则包 | 1 | on | ✓ | STACK(10) |
| test_info_7 | 可合并完整性规则 | 1 | on | ✓ | STACK(4) |
| test_info_8 | 完整性+有效性/含强弱/单规则包 | 2 | on | ✓ | STACK(6) |
| test_info_8 | 完整性+有效性/string强转int | 1 | on | ✓ | STACK(8)+CAST |
| test_info_8 | 完整性+有效性/相同过滤条件 | 1 | on | ✓ | STACK(9) |
| test_info_8 | 完整性可合并规则 | 1 | off | ✓ | SUM(CASE WHEN)×3 |
| test_info_8 | 可合并有效性规则 | 1 | on | ✓ | STACK(5) |
| test_info_1 | 有效性校验/抽样关闭/全通过 | 1 | off | ✓ | STACK(4)·直扫源表 |
| test_info_1 | 完整性校验/多字段/抽样开启-全不通过 | 1 | off※ | ✓ | SUM(CASE WHEN)×3 |
| test_info_1 | 完整性校验/多字段/抽样关闭-全通过 | 1 | off | — | SUM(CASE WHEN)×3 |
| test_info_1 | 完整性可合并规则 | 2 | off | ✓ | SUM(CASE WHEN)×2 |

**合并断言锚点**：同 select 内多个 `SUM(CASE WHEN ...)` 并行计算 + `LATERAL VIEW STACK(N)`
拆回多行（archive 步骤38：源表只扫一次、合并子规则并行计算、拆成多行）；抽样开启生成
`*_temp_sample_table`、关闭直扫源表；分区含 `dt='yyyy-MM-dd'`；每包都落 `dtstack_dq_monitor_temp_data`。

※ 观察项：test_info_1「完整性校验-多字段-抽样开启-全不通过」任务名含「抽样开启」，但其后端
生成 SQL 实测无临时抽样表（sampling=off）。按生成 SQL 实测值断言，名/SQL 不一致已上报待产品确认。

## 环境受阻排除（无法真实自动化）

| 排除项 | 数量 | 原因 | 证据 |
| ------ | ---- | ---- | ---- |
| `doris3.x` section 全部 | 36 | 环境无 doris 版 test_info_1 规则集（盘点规则集，对象表 test_info_1~8 全为 SparkThrift2.x；环境 Doris3.x 数据源规则集是其它对象表，非 archive 用例对象） | `runs/preflight-02/.../inventory-result.json` |

## 未覆盖的运行时数据维度（端到端但依赖运行时数据/外部手段）

- **运行结果精确值（全通过/全不通过 的子规则 haveDirty 命中数、merge_group_key）**：t10 已核验实例
  详情的执行 SQL 结构与无缺陷，但「全通过/全不通过」的精确数据结果依赖当次校验数据，且 merge_group_key
  需 DB 只读凭据，建议用 `sql-merge-validate` skill 直查库核验，未纳入断言以免脆。
- **立即执行实时触发**：`immediatelyExecuted` 同步接口 nginx 5min 504，不主动触发；t10 改读「日调度
  已产出实例」核验运行时证据。校验实例为日调度产物，若环境运行时数据缺失则 t10 为真实失败信号。

## 小结

- 真实自动化：8 个脚本文件、full.spec.ts **41 个 test**，覆盖 SQL 合并的**配置层 + 生成合并SQL层 +
  运行时实例层 + 报告层**，全部 36 条 sparkthrift 用例端到端。
- 环境受阻排除：doris3.x section 36 条（环境无 doris 版规则集）。
- 边界诚实：生成合并SQL层是被测特性的真实产物（read-only 拉取后端生成的合并 SQL，绕开 504）；运行结果
  精确数据值与 merge_group_key 需 DB/sql-merge-validate，未纳入断言。
